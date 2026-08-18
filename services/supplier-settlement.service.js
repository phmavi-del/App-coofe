const {
    createConnection
} = require("../core/connection");


const {
    validateSupplierSettlementInput
} = require("../validation/supplier-settlement.validation");


const {
    getSupplierById,
    getPurchaseInvoiceById,
    getCashRegisterById,
    getBankAccountById,
    updatePurchaseInvoiceSettlement,
    insertCashTransaction,
    insertBankTransaction,
    insertSupplierSettlement,
    getExistingSettlementByReference,
    getSupplierSettlementById,
    getSupplierSettlementsByInvoiceId
} = require("../repositories/supplier-settlement.repository");


const {
    createJournalEntryInTransaction
} = require("./accounting.service");


function roundMoney(
    value
) {
    return Math.round(
        Number(value) || 0
    );
}


function assertSupplier(
    db,
    supplierId
) {
    const supplier =
        getSupplierById(
            db,
            supplierId
        );


    if (!supplier) {
        throw new Error(
            "تأمین‌کننده پیدا نشد."
        );
    }


    if (!supplier.is_active) {
        throw new Error(
            "تأمین‌کننده غیرفعال است."
        );
    }


    if (!supplier.account_id) {
        throw new Error(
            "تأمین‌کننده به حساب حسابداری متصل نیست."
        );
    }


    return supplier;
}


function assertCash(
    db,
    cashRegisterId
) {
    const cash =
        getCashRegisterById(
            db,
            cashRegisterId
        );


    if (!cash) {
        throw new Error(
            "صندوق پرداخت پیدا نشد."
        );
    }


    if (!cash.is_active) {
        throw new Error(
            "صندوق پرداخت غیرفعال است."
        );
    }


    if (!cash.account_id) {
        throw new Error(
            "صندوق به حساب حسابداری متصل نیست."
        );
    }


    return cash;
}


function assertBank(
    db,
    bankAccountId
) {
    const bank =
        getBankAccountById(
            db,
            bankAccountId
        );


    if (!bank) {
        throw new Error(
            "حساب بانکی پرداخت پیدا نشد."
        );
    }


    if (!bank.is_active) {
        throw new Error(
            "حساب بانکی پرداخت غیرفعال است."
        );
    }


    if (!bank.account_id) {
        throw new Error(
            "حساب بانکی به حساب حسابداری متصل نیست."
        );
    }


    return bank;
}


function calculatePaymentStatus(
    totalAmount,
    paidAmount
) {
    if (
        paidAmount <= 0
    ) {
        return "unpaid";
    }


    if (
        paidAmount >=
        totalAmount
    ) {
        return "paid";
    }


    return "partial";
}


function assertPurchaseInvoice(
    invoice,
    supplier
) {
    if (!invoice) {
        throw new Error(
            "فاکتور خرید پیدا نشد."
        );
    }


    if (
        Number(
            invoice.supplier_id
        ) !==
        Number(
            supplier.id
        )
    ) {
        throw new Error(
            "فاکتور خرید متعلق به این تأمین‌کننده نیست."
        );
    }


    if (
        invoice.status !==
        "completed"
    ) {
        if (
            invoice.status ===
            "cancelled"
        ) {
            throw new Error(
                "فاکتور خرید لغو شده قابل تسویه نیست."
            );
        }


        if (
            invoice.status ===
            "returned"
        ) {
            throw new Error(
                "فاکتور خرید برگشت‌شده قابل تسویه نیست."
            );
        }


        throw new Error(
            "فقط فاکتور خرید تکمیل‌شده قابل تسویه است."
        );
    }


    const totalAmount =
        roundMoney(
            invoice.total_amount
        );

    const paidAmount =
        roundMoney(
            invoice.paid_amount
        );

    const remainingAmount =
        roundMoney(
            invoice.remaining_amount
        );


    if (
        totalAmount < 0 ||
        paidAmount < 0 ||
        remainingAmount < 0
    ) {
        throw new Error(
            "مبالغ مالی فاکتور خرید معتبر نیستند."
        );
    }


    if (
        paidAmount >
        totalAmount
    ) {
        throw new Error(
            "مبلغ پرداخت‌شده فاکتور خرید از مبلغ کل بیشتر است."
        );
    }


    if (
        remainingAmount !==
        totalAmount - paidAmount
    ) {
        throw new Error(
            "مانده فاکتور خرید با مبلغ کل و پرداخت‌شده سازگار نیست."
        );
    }


    if (
        remainingAmount <= 0
    ) {
        throw new Error(
            "این فاکتور خرید بدهی قابل تسویه ندارد."
        );
    }


    return {
        ...invoice,

        total_amount:
            totalAmount,

        paid_amount:
            paidAmount,

        remaining_amount:
            remainingAmount
    };
}


function settleSupplierInvoice(
    input
) {
    const data =
        validateSupplierSettlementInput(
            input
        );


    const db =
        createConnection();


    try {

        const transaction =
            db.transaction(() => {

                const supplier =
                    assertSupplier(
                        db,
                        data.supplier_id
                    );


                const invoice =
                    assertPurchaseInvoice(
                        getPurchaseInvoiceById(
                            db,
                            data.purchase_invoice_id
                        ),
                        supplier
                    );


                const amount =
                    roundMoney(
                        data.amount
                    );


                if (
                    amount <= 0
                ) {
                    throw new Error(
                        "مبلغ تسویه باید بیشتر از صفر باشد."
                    );
                }


                if (
                    amount >
                    invoice.remaining_amount
                ) {
                    throw new Error(
                        `مبلغ تسویه از بدهی فعلی تأمین‌کننده بیشتر است. مانده قابل تسویه: ${invoice.remaining_amount}`
                    );
                }


                let cash = null;
                let bank = null;


                if (
                    data.payment_method ===
                    "cash"
                ) {
                    cash =
                        assertCash(
                            db,
                            data.cash_register_id
                        );
                }


                if (
                    data.payment_method ===
                    "bank"
                ) {
                    bank =
                        assertBank(
                            db,
                            data.bank_account_id
                        );
                }


                const existingSettlement =
                    getExistingSettlementByReference(
                        db,
                        data.payment_method,
                        data.bank_account_id,
                        data.cash_register_id,
                        data.reference_number,
                        data.terminal_reference
                    );


                if (
                    existingSettlement
                ) {
                    throw new Error(
                        "این تراکنش تسویه قبلاً ثبت شده است."
                    );
                }


                const newPaidAmount =
                    invoice.paid_amount +
                    amount;


                const newRemainingAmount =
                    invoice.total_amount -
                    newPaidAmount;


                const newPaymentStatus =
                    calculatePaymentStatus(
                        invoice.total_amount,
                        newPaidAmount
                    );


                const settlementId =
                    insertSupplierSettlement(
                        db,
                        {
                            supplier_id:
                                supplier.id,

                            purchase_invoice_id:
                                invoice.id,

                            payment_method:
                                data.payment_method,

                            cash_register_id:
                                data.cash_register_id,

                            bank_account_id:
                                data.bank_account_id,

                            amount,

                            settlement_date:
                                data.settlement_date,

                            reference_number:
                                data.reference_number,

                            terminal_reference:
                                data.terminal_reference,

                            description:
                                data.description
                        }
                    );


                const invoiceChanges =
                    updatePurchaseInvoiceSettlement(
                        db,
                        invoice.id,
                        newPaidAmount,
                        newRemainingAmount,
                        newPaymentStatus
                    );


                if (
                    invoiceChanges !==
                    1
                ) {
                    throw new Error(
                        "وضعیت مالی فاکتور خرید به‌روزرسانی نشد."
                    );
                }


                if (cash) {

                    insertCashTransaction(
                        db,
                        cash.id,
                        amount,
                        settlementId,
                        data.description ||
                        `تسویه بدهی تأمین‌کننده - فاکتور ${invoice.invoice_number}`
                    );


                    createJournalEntryInTransaction(
                        db,
                        {
                            entry_date:
                                data.settlement_date ||
                                undefined,

                            reference_type:
                                "supplier_settlement",

                            reference_id:
                                settlementId,

                            description:
                                `تسویه بدهی تأمین‌کننده - فاکتور ${invoice.invoice_number}`,

                            status:
                                "posted",

                            lines: [
                                {
                                    account_id:
                                        supplier.account_id,

                                    debit:
                                        amount,

                                    credit:
                                        0,

                                    description:
                                        "کاهش بدهی تأمین‌کننده"
                                },

                                {
                                    account_id:
                                        cash.account_id,

                                    debit:
                                        0,

                                    credit:
                                        amount,

                                    description:
                                        "پرداخت از صندوق به تأمین‌کننده"
                                }
                            ]
                        }
                    );
                }


                if (bank) {

                    insertBankTransaction(
                        db,
                        bank.id,
                        amount,
                        settlementId,
                        data.description ||
                        `تسویه بدهی تأمین‌کننده - فاکتور ${invoice.invoice_number}`
                    );


                    createJournalEntryInTransaction(
                        db,
                        {
                            entry_date:
                                data.settlement_date ||
                                undefined,

                            reference_type:
                                "supplier_settlement",

                            reference_id:
                                settlementId,

                            description:
                                `تسویه بدهی تأمین‌کننده - فاکتور ${invoice.invoice_number}`,

                            status:
                                "posted",

                            lines: [
                                {
                                    account_id:
                                        supplier.account_id,

                                    debit:
                                        amount,

                                    credit:
                                        0,

                                    description:
                                        "کاهش بدهی تأمین‌کننده"
                                },

                                {
                                    account_id:
                                        bank.account_id,

                                    debit:
                                        0,

                                    credit:
                                        amount,

                                    description:
                                        "پرداخت بانکی به تأمین‌کننده"
                                }
                            ]
                        }
                    );
                }


                return {
                    settlementId,

                    supplierId:
                        supplier.id,

                    supplierName:
                        supplier.name,

                    invoiceId:
                        invoice.id,

                    invoiceNumber:
                        invoice.invoice_number,

                    amount,

                    paymentMethod:
                        data.payment_method,

                    previousPaidAmount:
                        invoice.paid_amount,

                    newPaidAmount,

                    previousRemainingAmount:
                        invoice.remaining_amount,

                    newRemainingAmount,

                    paymentStatus:
                        newPaymentStatus
                };
            });


        const result =
            transaction();


        const resultDb =
            createConnection();


        try {

            const settlement =
                getSupplierSettlementById(
                    resultDb,
                    result.settlementId
                );


            if (!settlement) {
                throw new Error(
                    "تسویه تأمین‌کننده پس از ثبت پیدا نشد."
                );
            }


            return {
                ...result,

                settlement
            };

        } finally {

            resultDb.close();
        }

    } finally {

        db.close();
    }
}


function getSupplierSettlement(
    settlementId
) {
    const db =
        createConnection();


    try {

        return getSupplierSettlementById(
            db,
            settlementId
        );

    } finally {

        db.close();
    }
}


function getSupplierSettlementsForInvoice(
    purchaseInvoiceId
) {
    const db =
        createConnection();


    try {

        return getSupplierSettlementsByInvoiceId(
            db,
            purchaseInvoiceId
        );

    } finally {

        db.close();
    }
}


module.exports = {
    settleSupplierInvoice,
    getSupplierSettlement,
    getSupplierSettlementsForInvoice
};