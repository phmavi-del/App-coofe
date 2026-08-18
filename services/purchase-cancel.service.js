const {
    createConnection
} = require("../core/connection");


const {
    validatePurchaseCancellationInput
} = require("../validation/purchase-cancel.validation");


const {
    getPurchaseInvoiceForCancellation,
    getPurchaseInvoiceItemsForCancellation,
    getPurchasePaymentsForCancellation,
    getPurchaseReturnsForCancellation,
    getCashTransactionsForCancellation,
    getBankTransactionsForCancellation,
    getInventoryMovementsForPurchaseItemForCancellation,
    getPostedPurchaseJournalForCancellation,
    getExistingPurchaseCancellationJournal,
    getExistingPurchaseCancellationCashTransactions,
    getExistingPurchaseCancellationBankTransactions,
    insertPurchaseCancellationCashTransaction,
    insertPurchaseCancellationBankTransaction,
    getUserForPurchaseCancellation,
    updatePurchaseInvoiceCancelled
} = require("../repositories/purchase-cancel.repository");


const {
    applyInventoryMovementInTransaction
} = require("./inventory.service");


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


function assertUser(
    db,
    userId
) {
    const user =
        getUserForPurchaseCancellation(
            db,
            userId
        );

    if (!user) {
        throw new Error(
            "کاربر لغوکننده پیدا نشد."
        );
    }

    if (
        !user.is_active ||
        user.is_locked
    ) {
        throw new Error(
            "کاربر لغوکننده فعال نیست."
        );
    }

    return user;
}


function assertInvoice(
    invoice
) {
    if (!invoice) {
        throw new Error(
            "فاکتور خرید پیدا نشد."
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
                "این فاکتور خرید قبلاً لغو شده است."
            );
        }

        if (
            invoice.status ===
            "returned"
        ) {
            throw new Error(
                "این فاکتور خرید برگشت کامل شده و قابل لغو نیست."
            );
        }

        throw new Error(
            "فقط فاکتور خرید تکمیل‌شده قابل لغو است."
        );
    }

    return invoice;
}


function assertNoPreviousReturn(
    returns
) {
    if (
        returns.length > 0
    ) {
        throw new Error(
            "این فاکتور خرید دارای برگشت خرید است و قابل لغو کامل نیست."
        );
    }
}


function assertJournal(
    journals
) {
    if (
        journals.length === 0
    ) {
        throw new Error(
            "سند حسابداری اصلی خرید پیدا نشد."
        );
    }

    if (
        journals.length > 1
    ) {
        throw new Error(
            "بیش از یک سند حسابداری اصلی برای این فاکتور خرید پیدا شد."
        );
    }

    const journal =
        journals[0];

    if (
        journal.lines.length < 2
    ) {
        throw new Error(
            "سند حسابداری خرید معتبر نیست."
        );
    }

    return journal;
}


function assertPaymentTransactions(
    payments,
    cashTransactions,
    bankTransactions
) {
    const actualCashPayments =
        payments.filter(
            payment =>
                payment.payment_method ===
                "cash"
        );

    const actualBankPayments =
        payments.filter(
            payment =>
                payment.payment_method ===
                "bank"
        );

    if (
        cashTransactions.length !==
        actualCashPayments.length
    ) {
        throw new Error(
            "تعداد تراکنش‌های صندوق با پرداخت‌های نقدی فاکتور یکسان نیست."
        );
    }

    if (
        bankTransactions.length !==
        actualBankPayments.length
    ) {
        throw new Error(
            "تعداد تراکنش‌های بانک با پرداخت‌های بانکی فاکتور یکسان نیست."
        );
    }


    for (
        const payment
        of actualCashPayments
    ) {
        const matches =
            cashTransactions.filter(
                transaction =>
                    Number(
                        transaction.cash_register_id
                    ) ===
                    Number(
                        payment.cash_register_id
                    ) &&

                    Number(
                        transaction.amount
                    ) ===
                    Number(
                        payment.amount
                    )
            );

        if (
            matches.length !== 1
        ) {
            throw new Error(
                `تراکنش صندوق مربوط به پرداخت ${payment.amount} فاکتور پیدا نشد یا تکراری است.`
            );
        }
    }


    for (
        const payment
        of actualBankPayments
    ) {
        const matches =
            bankTransactions.filter(
                transaction =>
                    Number(
                        transaction.bank_account_id
                    ) ===
                    Number(
                        payment.bank_account_id
                    ) &&

                    Number(
                        transaction.amount
                    ) ===
                    Number(
                        payment.amount
                    )
            );

        if (
            matches.length !== 1
        ) {
            throw new Error(
                `تراکنش بانک مربوط به پرداخت ${payment.amount} فاکتور پیدا نشد یا تکراری است.`
            );
        }
    }
}


function assertInvoicePaymentTotals(
    invoice,
    payments
) {
    const actualPaidAmount =
        roundMoney(
            payments
                .filter(
                    payment =>
                        payment.payment_method ===
                            "cash" ||

                        payment.payment_method ===
                            "bank"
                )
                .reduce(
                    (
                        total,
                        payment
                    ) =>
                        total +
                        Number(
                            payment.amount
                        ),
                    0
                )
        );


    if (
        actualPaidAmount !==
        roundMoney(
            invoice.paid_amount
        )
    ) {
        throw new Error(
            `مبلغ پرداخت واقعی فاکتور با مجموع پرداخت‌های نقدی/بانکی یکسان نیست. فاکتور: ${invoice.paid_amount}، پرداخت‌ها: ${actualPaidAmount}`
        );
    }


    const totalPaymentAmount =
        roundMoney(
            payments.reduce(
                (
                    total,
                    payment
                ) =>
                    total +
                    Number(
                        payment.amount
                    ),
                0
            )
        );


    if (
        totalPaymentAmount !==
        roundMoney(
            invoice.total_amount
        )
    ) {
        throw new Error(
            `مجموع پرداخت/نسیه فاکتور با مبلغ کل فاکتور یکسان نیست. فاکتور: ${invoice.total_amount}، پرداخت‌ها: ${totalPaymentAmount}`
        );
    }
}


function reverseInventoryForInvoice(
    db,
    invoice,
    items
) {
    const reversedMovements = [];


    for (
        const item
        of items
    ) {
        if (
            !item.track_inventory
        ) {
            continue;
        }


        const movements =
            getInventoryMovementsForPurchaseItemForCancellation(
                db,
                item.id
            );


        if (
            movements.length === 0
        ) {
            throw new Error(
                `حرکت انبار مرتبط با قلم «${item.product_name}» پیدا نشد.`
            );
        }


        for (
            const movement
            of movements
        ) {
            if (
                movement.movement_type !==
                "purchase"
            ) {
                throw new Error(
                    `نوع حرکت انبار «${movement.movement_type}» برای Reverse خرید معتبر نیست.`
                );
            }


            const result =
                applyInventoryMovementInTransaction(
                    db,
                    {
                        warehouse_id:
                            movement.warehouse_id,

                        product_id:
                            movement.product_id,

                        movement_type:
                            "purchase_return",

                        quantity:
                            Number(
                                movement.quantity
                            ),

                        unit_cost:
                            Number(
                                movement.unit_cost
                            ),

                        reference_type:
                            "purchase_cancel",

                        reference_id:
                            invoice.id,

                        description:
                            `لغو خرید ${invoice.invoice_number}`
                    }
                );


            reversedMovements.push({
                originalMovementId:
                    movement.id,

                movementId:
                    result.movementId,

                productId:
                    movement.product_id,

                quantity:
                    Number(
                        movement.quantity
                    ),

                unitCost:
                    Number(
                        movement.unit_cost
                    ),

                movementType:
                    "purchase_return"
            });
        }
    }


    return reversedMovements;
}


function reverseCashAndBank(
    db,
    invoice,
    payments,
    cancellationDate
) {
    const cashTransactions =
        getCashTransactionsForCancellation(
            db,
            invoice.id
        );

    const bankTransactions =
        getBankTransactionsForCancellation(
            db,
            invoice.id
        );


    assertPaymentTransactions(
        payments,
        cashTransactions,
        bankTransactions
    );


    const reversedCash = [];
    const reversedBank = [];


    for (
        const payment
        of payments
    ) {
        if (
            payment.payment_method ===
            "cash"
        ) {
            const transactionId =
                insertPurchaseCancellationCashTransaction(
                    db,
                    {
                        cash_register_id:
                            payment.cash_register_id,

                        amount:
                            roundMoney(
                                payment.amount
                            ),

                        reference_id:
                            invoice.id,

                        description:
                            `برگشت پرداخت نقدی ناشی از لغو خرید ${invoice.invoice_number}`,

                        transaction_date:
                            cancellationDate
                    }
                );


            reversedCash.push(
                transactionId
            );

        } else if (
            payment.payment_method ===
            "bank"
        ) {
            const transactionId =
                insertPurchaseCancellationBankTransaction(
                    db,
                    {
                        bank_account_id:
                            payment.bank_account_id,

                        amount:
                            roundMoney(
                                payment.amount
                            ),

                        reference_id:
                            invoice.id,

                        description:
                            `برگشت پرداخت بانکی ناشی از لغو خرید ${invoice.invoice_number}`,

                        transaction_date:
                            cancellationDate
                    }
                );


            reversedBank.push(
                transactionId
            );
        }
    }


    return {
        cashTransactionIds:
            reversedCash,

        bankTransactionIds:
            reversedBank
    };
}


function createReverseJournal(
    db,
    invoice,
    journal,
    cancellationDate,
    reason
) {
    const lines =
        journal.lines.map(
            line => ({
                account_id:
                    Number(
                        line.account_id
                    ),

                debit:
                    Number(
                        line.credit
                    ),

                credit:
                    Number(
                        line.debit
                    ),

                description:
                    `Reverse لغو خرید: ${
                        line.description ||
                        invoice.invoice_number
                    }`
            })
        );


    const description =
        reason
            ? `لغو خرید ${invoice.invoice_number} - ${reason}`
            : `لغو خرید ${invoice.invoice_number}`;


    return createJournalEntryInTransaction(
        db,
        {
            entry_date:
                cancellationDate,

            reference_type:
                "purchase_cancel",

            reference_id:
                invoice.id,

            description,

            status:
                "posted",

            lines
        }
    );
}


function createPurchaseCancellation(
    input
) {
    const data =
        validatePurchaseCancellationInput(
            input
        );


    const db =
        createConnection();


    try {
        const transaction =
            db.transaction(
                () => {
                    const user =
                        assertUser(
                            db,
                            data.cancelled_by_user_id
                        );


                    const invoice =
                        assertInvoice(
                            getPurchaseInvoiceForCancellation(
                                db,
                                data.purchase_invoice_id
                            )
                        );


                    if (
                        !invoice.supplier_id
                    ) {
                        throw new Error(
                            "فاکتور خرید برای لغو باید تأمین‌کننده داشته باشد."
                        );
                    }


                    if (
                        !invoice.supplier_account_id
                    ) {
                        throw new Error(
                            "حساب تأمین‌کننده برای لغو خرید پیدا نشد."
                        );
                    }


                    const existingJournal =
                        getExistingPurchaseCancellationJournal(
                            db,
                            invoice.id
                        );


                    if (
                        existingJournal
                    ) {
                        throw new Error(
                            "برای این فاکتور قبلاً سند لغو خرید ایجاد شده است."
                        );
                    }


                    const existingCash =
                        getExistingPurchaseCancellationCashTransactions(
                            db,
                            invoice.id
                        );


                    if (
                        existingCash
                    ) {
                        throw new Error(
                            "برای این فاکتور قبلاً Reverse صندوق ثبت شده است."
                        );
                    }


                    const existingBank =
                        getExistingPurchaseCancellationBankTransactions(
                            db,
                            invoice.id
                        );


                    if (
                        existingBank
                    ) {
                        throw new Error(
                            "برای این فاکتور قبلاً Reverse بانک ثبت شده است."
                        );
                    }


                    const returns =
                        getPurchaseReturnsForCancellation(
                            db,
                            invoice.id
                        );


                    assertNoPreviousReturn(
                        returns
                    );


                    const items =
                        getPurchaseInvoiceItemsForCancellation(
                            db,
                            invoice.id
                        );


                    if (
                        items.length === 0
                    ) {
                        throw new Error(
                            "فاکتور خرید هیچ قلمی ندارد."
                        );
                    }


                    const payments =
                        getPurchasePaymentsForCancellation(
                            db,
                            invoice.id
                        );


                    if (
                        payments.length === 0
                    ) {
                        throw new Error(
                            "پرداخت‌های فاکتور خرید پیدا نشد."
                        );
                    }


                    assertInvoicePaymentTotals(
                        invoice,
                        payments
                    );


                    const journal =
                        assertJournal(
                            getPostedPurchaseJournalForCancellation(
                                db,
                                invoice.id
                            )
                        );


                    const reverseInventory =
                        reverseInventoryForInvoice(
                            db,
                            invoice,
                            items
                        );


                    const reversePayments =
                        reverseCashAndBank(
                            db,
                            invoice,
                            payments,
                            data.cancellation_date
                        );


                    const reverseJournalId =
                        createReverseJournal(
                            db,
                            invoice,
                            journal,
                            data.cancellation_date,
                            data.reason
                        );


                    const invoiceChanges =
                        updatePurchaseInvoiceCancelled(
                            db,
                            invoice.id
                        );


                    if (
                        invoiceChanges !== 1
                    ) {
                        throw new Error(
                            "فاکتور خرید برای لغو به‌روزرسانی نشد."
                        );
                    }


                    return {
                        id:
                            invoice.id,

                        invoice_number:
                            invoice.invoice_number,

                        status:
                            "cancelled",

                        cancelled_by_user_id:
                            user.id,

                        cancelled_by_name:
                            user.full_name,

                        cancellation_date:
                            data.cancellation_date,

                        reason:
                            data.reason ||
                            null,

                        reversed_inventory_movements:
                            reverseInventory.length,

                        reversed_cash_transactions:
                            reversePayments
                                .cashTransactionIds
                                .length,

                        reversed_bank_transactions:
                            reversePayments
                                .bankTransactionIds
                                .length,

                        reverse_journal_id:
                            reverseJournalId
                    };
                }
            );


        return transaction();

    } finally {
        db.close();
    }
}


module.exports = {
    createPurchaseCancellation
};