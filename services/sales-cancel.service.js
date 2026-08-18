const {
    createConnection
} = require("../core/connection");


const {
    validateSalesCancellationInput
} = require("../validation/sales-cancel.validation");


const {
    getSalesInvoiceForCancellation,
    getSalesInvoiceItemsForCancellation,
    getSalesPaymentsForCancellation,
    getSalesReturnsForCancellation,
    getCustomerSettlementsForCancellation,
    getCustomerAccountForCancellation,
    getCustomerVisitsForCancellation,
    getUserForCancellation,
    getCashTransactionsForCancellation,
    getBankTransactionsForCancellation,
    getInventoryMovementsBySalesInvoiceItemForCancellation,
    getPostedSalesJournalForCancellation,
    getExistingSalesCancellationJournal,
    getExistingSalesCancellationCashTransactions,
    getExistingSalesCancellationBankTransactions,
    insertSalesCancellationCashTransaction,
    insertSalesCancellationBankTransaction,
    updateCustomerTotalsAfterSalesCancellation,
    deleteCustomerVisitForSalesCancellation,
    updateSalesInvoiceCancelled
} = require("../repositories/sales-cancel.repository");


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
        getUserForCancellation(
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
            "فاکتور فروش پیدا نشد."
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
                "این فاکتور قبلاً لغو شده است."
            );
        }


        if (
            invoice.status ===
            "returned"
        ) {
            throw new Error(
                "فاکتور برگشت‌شده قابل لغو نیست."
            );
        }


        throw new Error(
            "فقط فاکتور فروش تکمیل‌شده قابل لغو است."
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
            "این فاکتور دارای برگشت فروش است و قابل لغو کامل نیست."
        );
    }
}


function assertNoCustomerSettlement(
    settlements
) {
    if (
        settlements.length > 0
    ) {
        throw new Error(
            "این فاکتور دارای تسویه بدهی مشتری است و قابل لغو کامل نیست."
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
            "سند حسابداری اصلی فروش پیدا نشد."
        );
    }


    if (
        journals.length > 1
    ) {
        throw new Error(
            "بیش از یک سند حسابداری اصلی برای این فاکتور پیدا شد."
        );
    }


    const journal =
        journals[0];


    if (
        journal.lines.length < 2
    ) {
        throw new Error(
            "سند حسابداری فروش معتبر نیست."
        );
    }


    return journal;
}


function assertPaymentTransactions(
    payments,
    cashTransactions,
    bankTransactions
) {
    const actualPayments =
        payments.filter(
            (
                payment
            ) =>
                Number(
                    payment.is_actual_payment
                ) === 1
        );


    const actualCashPayments =
        actualPayments.filter(
            (
                payment
            ) =>
                payment.payment_method ===
                "cash"
        );


    const actualCardPayments =
        actualPayments.filter(
            (
                payment
            ) =>
                payment.payment_method ===
                "card"
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
        actualCardPayments.length
    ) {
        throw new Error(
            "تعداد تراکنش‌های بانک با پرداخت‌های کارت فاکتور یکسان نیست."
        );
    }


    for (
        const payment
        of actualCashPayments
    ) {
        const matches =
            cashTransactions.filter(
                (
                    transaction
                ) =>
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
        of actualCardPayments
    ) {
        const matches =
            bankTransactions.filter(
                (
                    transaction
                ) =>
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
                `تراکنش بانکی مربوط به پرداخت ${payment.amount} فاکتور پیدا نشد یا تکراری است.`
            );
        }
    }
}


function getExpectedActualPaymentAmount(
    payments
) {
    return roundMoney(
        payments
            .filter(
                (
                    payment
                ) =>
                    Number(
                        payment.is_actual_payment
                    ) === 1
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
}


function assertInvoicePaymentTotals(
    invoice,
    payments
) {
    const actualPaidAmount =
        getExpectedActualPaymentAmount(
            payments
        );


    if (
        actualPaidAmount !==
        roundMoney(
            invoice.paid_amount
        )
    ) {
        throw new Error(
            `مبلغ پرداخت واقعی فاکتور با مجموع پرداخت‌های واقعی یکسان نیست. فاکتور: ${invoice.paid_amount}، پرداخت‌ها: ${actualPaidAmount}`
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
            `مجموع پرداخت/نسیه فاکتور با مبلغ کل آن یکسان نیست. فاکتور: ${invoice.total_amount}، پرداخت‌ها: ${totalPaymentAmount}`
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
        const movements =
            getInventoryMovementsBySalesInvoiceItemForCancellation(
                db,
                item.id
            );


        if (
            item.track_inventory &&
            movements.length === 0
        ) {
            throw new Error(
                `حرکت انبار مرتبط با قلم «${item.product_name}» پیدا نشد.`
            );
        }


        if (
            !item.track_inventory
        ) {
            continue;
        }


        for (
            const movement
            of movements
        ) {
            let reverseMovementType;


            if (
                movement.movement_type ===
                "sale"
            ) {
                reverseMovementType =
                    "sale_return";
            } else if (
                movement.movement_type ===
                "production_out"
            ) {
                reverseMovementType =
                    "production_in";
            } else {
                throw new Error(
                    `نوع حرکت انبار «${movement.movement_type}» برای لغو فروش قابل Reverse نیست.`
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
                            reverseMovementType,

                        quantity:
                            Number(
                                movement.quantity
                            ),

                        unit_cost:
                            Number(
                                movement.unit_cost
                            ),

                        reference_type:
                            "sales_cancel",

                        reference_id:
                            invoice.id,

                        sales_invoice_item_id:
                            item.id,

                        description:
                            `لغو فروش ${invoice.invoice_number}`
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
                    reverseMovementType
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
            Number(
                payment.is_actual_payment
            ) !== 1
        ) {
            continue;
        }


        if (
            payment.payment_method ===
            "cash"
        ) {
            const transactionId =
                insertSalesCancellationCashTransaction(
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
                            `برگشت دریافت نقدی ناشی از لغو فروش ${invoice.invoice_number}`,

                        transaction_date:
                            cancellationDate
                    }
                );


            reversedCash.push(
                transactionId
            );

        } else if (
            payment.payment_method ===
            "card"
        ) {
            const transactionId =
                insertSalesCancellationBankTransaction(
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
                            `برگشت دریافت بانکی ناشی از لغو فروش ${invoice.invoice_number}`,

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


function reverseCustomerTotals(
    db,
    invoice
) {
    if (
        invoice.customer_id ===
        null
    ) {
        return null;
    }


    if (
        !invoice.customer_account_id
    ) {
        throw new Error(
            "حساب مشتری برای لغو فروش پیدا نشد."
        );
    }


    const account =
        getCustomerAccountForCancellation(
            db,
            invoice.customer_id
        );


    if (!account) {
        throw new Error(
            "customer_accounts مربوط به مشتری پیدا نشد."
        );
    }


    const totalPurchases =
        roundMoney(
            invoice.total_amount
        );


    const totalPaid =
        roundMoney(
            invoice.paid_amount
        );


    if (
        Number(
            account.total_purchases
        ) <
        totalPurchases
    ) {
        throw new Error(
            "مجموع خرید ثبت‌شده مشتری برای Reverse لغو فروش کافی نیست."
        );
    }


    if (
        Number(
            account.total_paid
        ) <
        totalPaid
    ) {
        throw new Error(
            "مجموع پرداخت ثبت‌شده مشتری برای Reverse لغو فروش کافی نیست."
        );
    }


    const changes =
        updateCustomerTotalsAfterSalesCancellation(
            db,
            invoice.customer_id,
            totalPurchases,
            totalPaid
        );


    if (
        changes !== 1
    ) {
        throw new Error(
            "به‌روزرسانی حساب مشتری برای لغو فروش انجام نشد."
        );
    }


    return {
        totalPurchasesReversed:
            totalPurchases,

        totalPaidReversed:
            totalPaid
    };
}


function reverseCustomerVisit(
    db,
    invoice
) {
    if (
        invoice.customer_id ===
        null
    ) {
        return null;
    }


    const visits =
        getCustomerVisitsForCancellation(
            db,
            invoice.id
        );


    if (
        visits.length > 1
    ) {
        throw new Error(
            "بیش از یک بازدید مشتری برای این فاکتور پیدا شد."
        );
    }


    if (
        visits.length === 0
    ) {
        throw new Error(
            "بازدید مشتری مربوط به این فاکتور پیدا نشد."
        );
    }


    const deleted =
        deleteCustomerVisitForSalesCancellation(
            db,
            visits[0].id
        );


    if (
        deleted !== 1
    ) {
        throw new Error(
            "حذف بازدید مشتری مربوط به لغو فروش انجام نشد."
        );
    }


    return visits[0];
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
            (
                line
            ) => ({
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
                    `Reverse لغو فروش: ${
                        line.description ||
                        invoice.invoice_number
                    }`
            })
        );


    const description =
        reason
            ? `لغو فروش ${invoice.invoice_number} - ${reason}`
            : `لغو فروش ${invoice.invoice_number}`;


    return createJournalEntryInTransaction(
        db,
        {
            entry_date:
                cancellationDate,

            reference_type:
                "sales_cancel",

            reference_id:
                invoice.id,

            description,

            status:
                "posted",

            lines
        }
    );
}


function createSalesCancellation(
    input
) {
    const data =
        validateSalesCancellationInput(
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
                            getSalesInvoiceForCancellation(
                                db,
                                data.sales_invoice_id
                            )
                        );


                    if (
                        invoice.customer_id !==
                            null &&
                        Number(
                            invoice.customer_account_id
                        ) <= 0
                    ) {
                        throw new Error(
                            "حساب حسابداری مشتری برای این فاکتور پیدا نشد."
                        );
                    }


                    const existingJournal =
                        getExistingSalesCancellationJournal(
                            db,
                            invoice.id
                        );


                    if (
                        existingJournal
                    ) {
                        throw new Error(
                            "برای این فاکتور قبلاً سند لغو فروش ایجاد شده است."
                        );
                    }


                    const existingCash =
                        getExistingSalesCancellationCashTransactions(
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
                        getExistingSalesCancellationBankTransactions(
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
                        getSalesReturnsForCancellation(
                            db,
                            invoice.id
                        );


                    assertNoPreviousReturn(
                        returns
                    );


                    const settlements =
                        getCustomerSettlementsForCancellation(
                            db,
                            invoice.id
                        );


                    assertNoCustomerSettlement(
                        settlements
                    );


                    const items =
                        getSalesInvoiceItemsForCancellation(
                            db,
                            invoice.id
                        );


                    if (
                        items.length === 0
                    ) {
                        throw new Error(
                            "فاکتور فروش هیچ قلمی ندارد."
                        );
                    }


                    const payments =
                        getSalesPaymentsForCancellation(
                            db,
                            invoice.id
                        );


                    if (
                        payments.length === 0
                    ) {
                        throw new Error(
                            "پرداخت‌های فاکتور فروش پیدا نشد."
                        );
                    }


                    assertInvoicePaymentTotals(
                        invoice,
                        payments
                    );


                    const journal =
                        assertJournal(
                            getPostedSalesJournalForCancellation(
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


                    const reverseCustomer =
                        reverseCustomerTotals(
                            db,
                            invoice
                        );


                    const removedVisit =
                        reverseCustomerVisit(
                            db,
                            invoice
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
                        updateSalesInvoiceCancelled(
                            db,
                            invoice.id
                        );


                    if (
                        invoiceChanges !== 1
                    ) {
                        throw new Error(
                            "فاکتور فروش برای لغو به‌روزرسانی نشد."
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
                            reverseJournalId,

                        customer_totals_reversed:
                            reverseCustomer,

                        customer_visit_removed:
                            removedVisit
                                ? removedVisit.id
                                : null
                    };
                }
            );


        return transaction();

    } finally {
        db.close();
    }
}


module.exports = {
    createSalesCancellation
};