const {
    createConnection
} = require("../core/connection");

const {
    validateCustomerSettlementInput
} = require("../validation/customer-settlement.validation");

const {
    getCustomerById,
    getSalesInvoiceById,
    getCashRegisterById,
    getBankAccountById,
    updateSalesInvoiceSettlement,
    insertCashTransaction,
    insertBankTransaction,
    insertCustomerSettlement,
    getExistingSettlementByReference
} = require("../repositories/customer-settlement.repository");

const {
    createJournalEntryInTransaction
} = require("./accounting.service");


function assertCustomer(
    db,
    customerId
) {
    const customer =
        getCustomerById(
            db,
            customerId
        );

    if (!customer) {
        throw new Error(
            "مشتری پیدا نشد."
        );
    }

    if (!customer.is_active) {
        throw new Error(
            "مشتری غیرفعال است."
        );
    }

    if (!customer.account_id) {
        throw new Error(
            "مشتری به حساب دریافتنی متصل نیست."
        );
    }

    return customer;
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
            "صندوق پیدا نشد."
        );
    }

    if (!cash.is_active) {
        throw new Error(
            "صندوق غیرفعال است."
        );
    }

    if (!cash.account_id) {
        throw new Error(
            "صندوق به حسابداری متصل نیست."
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
            "حساب بانکی پیدا نشد."
        );
    }

    if (!bank.is_active) {
        throw new Error(
            "حساب بانکی غیرفعال است."
        );
    }

    if (!bank.account_id) {
        throw new Error(
            "حساب بانکی به حسابداری متصل نیست."
        );
    }

    return bank;
}


function calculatePaymentStatus(
    totalAmount,
    paidAmount
) {
    if (paidAmount <= 0) {
        return "unpaid";
    }

    if (paidAmount >= totalAmount) {
        return "paid";
    }

    return "partial";
}


function settleCustomerInvoice(
    input
) {
    const data =
        validateCustomerSettlementInput(
            input
        );

    const db =
        createConnection();

    try {

        const transaction =
            db.transaction(() => {

                const customer =
                    assertCustomer(
                        db,
                        data.customer_id
                    );

                const invoice =
                    getSalesInvoiceById(
                        db,
                        data.sales_invoice_id
                    );

                if (!invoice) {
                    throw new Error(
                        "فاکتور فروش پیدا نشد."
                    );
                }

                if (
                    invoice.customer_id !==
                    customer.id
                ) {
                    throw new Error(
                        "فاکتور متعلق به این مشتری نیست."
                    );
                }

                if (
                    invoice.status !==
                    "completed"
                ) {
                    throw new Error(
                        "فقط فاکتور فروش تکمیل‌شده قابل تسویه است."
                    );
                }

                if (
                    invoice.remaining_amount <= 0
                ) {
                    throw new Error(
                        "این فاکتور بدهی ندارد."
                    );
                }

                if (
                    data.amount >
                    invoice.remaining_amount
                ) {
                    throw new Error(
                        `مبلغ تسویه از مانده فاکتور بیشتر است. مانده: ${invoice.remaining_amount}`
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
                    "card"
                ) {
                    bank =
                        assertBank(
                            db,
                            data.bank_account_id
                        );
                }


                const newPaidAmount =
                    invoice.paid_amount +
                    data.amount;

                const newRemainingAmount =
                    invoice.total_amount -
                    newPaidAmount;

                const newPaymentStatus =
                    calculatePaymentStatus(
                        invoice.total_amount,
                        newPaidAmount
                    );


const existingSettlement =
    getExistingSettlementByReference(
        db,
        data.payment_method,
        data.bank_account_id,
        data.cash_register_id,
        data.reference_number,
        data.terminal_reference
    );

if (existingSettlement) {
    throw new Error(
        "این تراکنش تسویه قبلاً ثبت شده است."
    );
}


                updateSalesInvoiceSettlement(
                    db,
                    invoice.id,
                    newPaidAmount,
                    newRemainingAmount,
                    newPaymentStatus
                );


insertCustomerSettlement(
    db,
    {
        customer_id:
            customer.id,

        sales_invoice_id:
            invoice.id,

        payment_method:
            data.payment_method,

        cash_register_id:
            data.cash_register_id,

        bank_account_id:
            data.bank_account_id,

        amount:
            data.amount,

        settlement_date:
            data.payment_date,

        reference_number:
            data.reference_number,

        terminal_reference:
            data.terminal_reference,

        description:
            data.description
    }
);



                if (cash) {
                    insertCashTransaction(
                        db,
                        cash.id,
                        data.amount,
                        invoice.id,
                        `دریافت بدهی مشتری - فاکتور ${invoice.invoice_number}`
                    );
                }


                if (bank) {
                    insertBankTransaction(
                        db,
                        bank.id,
                        data.amount,
                        invoice.id,
                        `دریافت بدهی مشتری - فاکتور ${invoice.invoice_number}`
                    );
                }


                if (cash) {
                    createJournalEntryInTransaction(
                        db,
                        {
                            entry_date:
                                data.payment_date ||
                                undefined,

                            reference_type:
                                "customer_settlement",

                            reference_id:
                                invoice.id,

                            description:
                                `تسویه بدهی مشتری - فاکتور ${invoice.invoice_number}`,

                            status:
                                "posted",

                            lines: [
                                {
                                    account_id:
                                        cash.account_id,

                                    debit:
                                        data.amount,

                                    credit:
                                        0,

                                    description:
                                        "دریافت نقدی بدهی مشتری"
                                },
                                {
                                    account_id:
                                        customer.account_id,

                                    debit:
                                        0,

                                    credit:
                                        data.amount,

                                    description:
                                        "کاهش حساب دریافتنی مشتری"
                                }
                            ]
                        }
                    );
                }


                if (bank) {
                    createJournalEntryInTransaction(
                        db,
                        {
                            entry_date:
                                data.payment_date ||
                                undefined,

                            reference_type:
                                "customer_settlement",

                            reference_id:
                                invoice.id,

                            description:
                                `تسویه بدهی مشتری - فاکتور ${invoice.invoice_number}`,

                            status:
                                "posted",

                            lines: [
                                {
                                    account_id:
                                        bank.account_id,

                                    debit:
                                        data.amount,

                                    credit:
                                        0,

                                    description:
                                        "دریافت کارت‌خوان از مشتری"
                                },
                                {
                                    account_id:
                                        customer.account_id,

                                    debit:
                                        0,

                                    credit:
                                        data.amount,

                                    description:
                                        "کاهش حساب دریافتنی مشتری"
                                }
                            ]
                        }
                    );
                }


                return {
                    invoiceId:
                        invoice.id,

                    invoiceNumber:
                        invoice.invoice_number,

                    customerId:
                        customer.id,

                    amount:
                        data.amount,

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


        return transaction();

    } finally {
        db.close();
    }
}


module.exports = {
    settleCustomerInvoice
};