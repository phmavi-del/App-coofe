const {
    createConnection
} = require("../core/connection");


const {
    validateSalesReturnInput
} = require("../validation/sales-return.validation");


const {
    getSalesById,
    getCustomerById,
    getWarehouseById,
    getUserById,
    getCashRegisterById,
    getBankAccountById,
    getSalesInvoiceItemById,
    getSalesReturnByNumber,
    insertSalesReturn,
    insertSalesReturnItem,
    insertSalesReturnPayment
} = require("../repositories/sales.repository");


const {
    getInventoryMovementsBySalesInvoiceItem
} = require("../repositories/inventory.repository");


const {
    applyInventoryMovementInTransaction
} = require("./inventory.service");


const {
    createJournalEntryInTransaction
} = require("./accounting.service");


function assertCustomer(
    db,
    customerId
) {
    if (
        customerId === null
    ) {
        return null;
    }


    const customer =
        getCustomerById(
            db,
            customerId
        );


    if (
        !customer
    ) {
        throw new Error(
            "مشتری پیدا نشد."
        );
    }


    if (
        !customer.is_active
    ) {
        throw new Error(
            "مشتری غیرفعال است."
        );
    }


    if (
        !customer.account_id
    ) {
        throw new Error(
            "مشتری به حساب دریافتنی متصل نیست."
        );
    }


    return customer;
}


function assertWarehouse(
    db,
    warehouseId
) {
    const warehouse =
        getWarehouseById(
            db,
            warehouseId
        );


    if (
        !warehouse
    ) {
        throw new Error(
            "انبار پیدا نشد."
        );
    }


    if (
        !warehouse.is_active
    ) {
        throw new Error(
            "انبار غیرفعال است."
        );
    }


    if (
        !warehouse.account_id
    ) {
        throw new Error(
            "انبار به حساب حسابداری متصل نیست."
        );
    }


    return warehouse;
}


function assertUser(
    db,
    userId
) {
    const user =
        getUserById(
            db,
            userId
        );


    if (
        !user
    ) {
        throw new Error(
            "کاربر ثبت‌کننده پیدا نشد."
        );
    }


    if (
        !user.is_active ||
        user.is_locked
    ) {
        throw new Error(
            "کاربر ثبت‌کننده فعال نیست."
        );
    }


    return user;
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


    if (
        !cash
    ) {
        throw new Error(
            "صندوق پیدا نشد."
        );
    }


    if (
        !cash.is_active
    ) {
        throw new Error(
            "صندوق غیرفعال است."
        );
    }


    if (
        !cash.account_id
    ) {
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


    if (
        !bank
    ) {
        throw new Error(
            "حساب بانکی پیدا نشد."
        );
    }


    if (
        !bank.is_active
    ) {
        throw new Error(
            "حساب بانکی غیرفعال است."
        );
    }


    if (
        !bank.account_id
    ) {
        throw new Error(
            "حساب بانکی به حسابداری متصل نیست."
        );
    }


    return bank;
}


function getPreviousReturnSummary(
    db,
    salesInvoiceItemId
) {
    return db
        .prepare(`
            SELECT
                COALESCE(
                    SUM(sri.quantity),
                    0
                ) AS returned_quantity,

                COALESCE(
                    SUM(sri.discount_amount),
                    0
                ) AS returned_discount,

                COALESCE(
                    SUM(sri.tax_amount),
                    0
                ) AS returned_tax,

                COALESCE(
                    SUM(sri.line_total),
                    0
                ) AS returned_total

            FROM sales_return_items sri

            INNER JOIN sales_returns sr
                ON sr.id =
                   sri.sales_return_id

            WHERE sri.sales_invoice_item_id = ?

              AND sr.status = 'completed'
        `)
        .get(
            salesInvoiceItemId
        );
}


function roundMoney(
    value
) {
    return Math.round(
        Number(value) || 0
    );
}


function createSalesReturn(
    input
) {
    const data =
        validateSalesReturnInput(
            input
        );


    const db =
        createConnection();


    try {
        const transaction =
            db.transaction(() => {

                /*
                 * ------------------------------------------------
                 * 1. فاکتور
                 * ------------------------------------------------
                 */

                const invoice =
                    getSalesById(
                        db,
                        data.sales_invoice_id
                    );


                if (
                    !invoice
                ) {
                    throw new Error(
                        "فاکتور فروش پیدا نشد."
                    );
                }


                if (
                    invoice.status !==
                    "completed"
                ) {
                    throw new Error(
                        "فقط فاکتور فروش تکمیل‌شده قابل برگشت است."
                    );
                }


                /*
                 * ------------------------------------------------
                 * 2. انبار
                 * ------------------------------------------------
                 */

                const warehouse =
                    assertWarehouse(
                        db,
                        data.warehouse_id
                    );


                if (
                    warehouse.id !==
                    invoice.warehouse_id
                ) {
                    throw new Error(
                        "انبار برگشت با انبار فاکتور یکسان نیست."
                    );
                }


                /*
                 * ------------------------------------------------
                 * 3. کاربر
                 * ------------------------------------------------
                 */

                const user =
                    assertUser(
                        db,
                        data.created_by_user_id
                    );


                /*
                 * ------------------------------------------------
                 * 4. مشتری
                 * ------------------------------------------------
                 */

                const customer =
                    assertCustomer(
                        db,
                        invoice.customer_id
                    );


                /*
                 * ------------------------------------------------
                 * 5. شماره برگشت
                 * ------------------------------------------------
                 */

                const existingReturn =
                    getSalesReturnByNumber(
                        db,
                        data.return_number
                    );


                if (
                    existingReturn
                ) {
                    throw new Error(
                        "شماره برگشت قبلاً ثبت شده است."
                    );
                }


                /*
                 * ------------------------------------------------
                 * 6. محاسبه اقلام برگشتی
                 * ------------------------------------------------
                 */

                const preparedItems =
                    [];


                let totalReturnAmount =
                    0;


                let totalReturnDiscount =
                    0;


                let totalReturnTax =
                    0;


                let totalReturnedCost =
                    0;


                for (
                    const inputItem
                    of data.items
                ) {

                    const invoiceItem =
                        getSalesInvoiceItemById(
                            db,
                            Number(
                                inputItem
                                    .sales_invoice_item_id
                            )
                        );


                    if (
                        !invoiceItem
                    ) {
                        throw new Error(
                            "قلم فاکتور فروش پیدا نشد."
                        );
                    }


                    if (
                        invoiceItem.sales_invoice_id !==
                        invoice.id
                    ) {
                        throw new Error(
                            "قلم انتخاب‌شده متعلق به این فاکتور نیست."
                        );
                    }


                    const requestedQuantity =
                        Number(
                            inputItem.quantity
                        );


                    if (
                        !Number.isFinite(
                            requestedQuantity
                        ) ||
                        requestedQuantity <= 0
                    ) {
                        throw new Error(
                            `مقدار برگشت برای «${invoiceItem.product_name}» معتبر نیست.`
                        );
                    }


                    const previous =
                        getPreviousReturnSummary(
                            db,
                            invoiceItem.id
                        );


                    const previousQuantity =
                        Number(
                            previous.returned_quantity
                        );


                    const originalQuantity =
                        Number(
                            invoiceItem.quantity
                        );


                    if (
                        originalQuantity <= 0
                    ) {
                        throw new Error(
                            `مقدار اولیه قلم «${invoiceItem.product_name}» معتبر نیست.`
                        );
                    }


                    const remainingQuantity =
                        originalQuantity -
                        previousQuantity;


                    if (
                        remainingQuantity <= 0
                    ) {
                        throw new Error(
                            `قلم «${invoiceItem.product_name}» قبلاً به‌طور کامل برگشت داده شده است.`
                        );
                    }


                    if (
                        requestedQuantity >
                        remainingQuantity
                    ) {
                        throw new Error(
                            `مقدار قابل برگشت برای «${invoiceItem.product_name}» فقط ${remainingQuantity} است.`
                        );
                    }


                    const isFinalReturn =
                        Math.abs(
                            requestedQuantity -
                            remainingQuantity
                        ) < 0.000001;


                    const ratio =
                        requestedQuantity /
                        originalQuantity;


                    let discountAmount;
                    let taxAmount;
                    let lineTotal;


                    /*
                     * در برگشت نهایی، باقی‌مانده واقعی
                     * استفاده می‌شود تا خطای rounding جمع نشود.
                     */

                    if (
                        isFinalReturn
                    ) {

                        discountAmount =
                            roundMoney(
                                Number(
                                    invoiceItem.discount_amount
                                ) -
                                Number(
                                    previous.returned_discount
                                )
                            );


                        taxAmount =
                            roundMoney(
                                Number(
                                    invoiceItem.tax_amount
                                ) -
                                Number(
                                    previous.returned_tax
                                )
                            );


                        lineTotal =
                            roundMoney(
                                Number(
                                    invoiceItem.line_total
                                ) -
                                Number(
                                    previous.returned_total
                                )
                            );

                    } else {

                        discountAmount =
                            roundMoney(
                                Number(
                                    invoiceItem.discount_amount
                                ) *
                                ratio
                            );


                        taxAmount =
                            roundMoney(
                                Number(
                                    invoiceItem.tax_amount
                                ) *
                                ratio
                            );


                        lineTotal =
                            roundMoney(
                                Number(
                                    invoiceItem.line_total
                                ) *
                                ratio
                            );
                    }


                    if (
                        lineTotal <= 0
                    ) {
                        throw new Error(
                            "مبلغ قلم برگشتی معتبر نیست."
                        );
                    }


                    /*
                     * ------------------------------------------------
                     * موجودی
                     * ------------------------------------------------
                     */

                    const movements =
                        getInventoryMovementsBySalesInvoiceItem(
                            db,
                            invoiceItem.id
                        );


                    if (
                        invoiceItem.track_inventory &&
                        movements.length === 0
                    ) {
                        throw new Error(
                            `حرکت انبار مرتبط با قلم «${invoiceItem.product_name}» پیدا نشد.`
                        );
                    }


                    const returnRatio =
                        requestedQuantity /
                        originalQuantity;


                    let itemCost =
                        0;


                    for (
                        const movement
                        of movements
                    ) {

                        const reverseQuantity =
                            Number(
                                movement.quantity
                            ) *
                            returnRatio;


                        if (
                            reverseQuantity <= 0
                        ) {
                            continue;
                        }


                        itemCost +=
                            reverseQuantity *
                            Number(
                                movement.unit_cost
                            );
                    }


                    preparedItems.push({
                        invoiceItem,

                        quantity:
                            requestedQuantity,

                        discountAmount,

                        taxAmount,

                        lineTotal,

                        movements,

                        itemCost
                    });


                    totalReturnAmount +=
                        lineTotal;


                    totalReturnDiscount +=
                        discountAmount;


                    totalReturnTax +=
                        taxAmount;


                    totalReturnedCost +=
                        itemCost;
                }


                totalReturnAmount =
                    roundMoney(
                        totalReturnAmount
                    );


                totalReturnDiscount =
                    roundMoney(
                        totalReturnDiscount
                    );


                totalReturnTax =
                    roundMoney(
                        totalReturnTax
                    );


                /*
                 * ------------------------------------------------
                 * 7. مبالغ قابل بازپرداخت
                 *
                 * مهم:
                 * paid_amount و remaining_amount فاکتور
                 * قبلاً بعد از برگشت‌های قبلی کاهش یافته‌اند.
                 * بنابراین دیگر previousRefund را دوباره
                 * از آنها کم نمی‌کنیم.
                 * ------------------------------------------------
                 */

                const availableActualRefund =
                    Math.max(
                        0,
                        roundMoney(
                            Number(
                                invoice.paid_amount
                            )
                        )
                    );


                const availableCreditRefund =
                    customer
                        ? Math.max(
                            0,
                            roundMoney(
                                Number(
                                    invoice.remaining_amount
                                )
                            )
                        )
                        : 0;


                let refundAmount =
                    0;


                let actualRefundAmount =
                    0;


                let creditRefundAmount =
                    0;


                /*
                 * ------------------------------------------------
                 * 8. اعتبارسنجی و آماده‌سازی پرداخت‌ها
                 * ------------------------------------------------
                 */

                for (
                    const payment
                    of data.payments
                ) {

                    const amount =
                        roundMoney(
                            payment.amount
                        );


                    if (
                        amount <= 0
                    ) {
                        throw new Error(
                            "مبلغ بازپرداخت معتبر نیست."
                        );
                    }


                    if (
                        payment.payment_method ===
                        "cash"
                    ) {

                        const cash =
                            assertCash(
                                db,
                                Number(
                                    payment.cash_register_id
                                )
                            );


                        if (
                            actualRefundAmount +
                            amount >
                            availableActualRefund
                        ) {
                            throw new Error(
                                "مبلغ بازپرداخت نقدی/کارت بیشتر از مبلغ پرداخت‌شده مشتری است."
                            );
                        }


                        payment._accountId =
                            cash.account_id;

                    } else if (
                        payment.payment_method ===
                        "card"
                    ) {

                        const bank =
                            assertBank(
                                db,
                                Number(
                                    payment.bank_account_id
                                )
                            );


                        if (
                            actualRefundAmount +
                            amount >
                            availableActualRefund
                        ) {
                            throw new Error(
                                "مبلغ بازپرداخت نقدی/کارت بیشتر از مبلغ پرداخت‌شده مشتری است."
                            );
                        }


                        payment._accountId =
                            bank.account_id;

                    } else if (
                        payment.payment_method ===
                        "credit"
                    ) {

                        if (
                            !customer
                        ) {
                            throw new Error(
                                "بازپرداخت به حساب مشتری نیاز به مشتری دارد."
                            );
                        }


                        if (
                            creditRefundAmount +
                            amount >
                            availableCreditRefund
                        ) {
                            throw new Error(
                                "مبلغ کاهش حساب دریافتنی بیشتر از مانده بدهی مشتری است."
                            );
                        }


                        payment._accountId =
                            customer.account_id;

                    } else {

                        throw new Error(
                            "روش بازپرداخت معتبر نیست."
                        );
                    }


                    refundAmount +=
                        amount;


                    if (
                        payment.payment_method ===
                        "credit"
                    ) {
                        creditRefundAmount +=
                            amount;

                    } else {
                        actualRefundAmount +=
                            amount;
                    }
                }


                refundAmount =
                    roundMoney(
                        refundAmount
                    );


                actualRefundAmount =
                    roundMoney(
                        actualRefundAmount
                    );


                creditRefundAmount =
                    roundMoney(
                        creditRefundAmount
                    );


                /*
                 * ------------------------------------------------
                 * 9. مبلغ پرداخت باید دقیقاً با مبلغ برگشت برابر باشد.
                 *
                 * در ساختار حسابداری فعلی حساب بدهی/بستانکاری
                 * جداگانه برای مبلغ برگشت‌نشده وجود ندارد.
                 * بنابراین کمتر یا بیشتر بودن refundAmount
                 * باعث سند نامتوازن می‌شود.
                 * ------------------------------------------------
                 */

                if (
                    refundAmount !==
                    totalReturnAmount
                ) {
                    throw new Error(
                        "مجموع مبالغ بازپرداخت باید دقیقاً برابر مبلغ برگشت باشد."
                    );
                }


                const refundStatus =
                    "refunded";


                /*
                 * ------------------------------------------------
                 * 10. وضعیت جدید فاکتور
                 * ------------------------------------------------
                 */

                const returnedBeforeThisReturn =
                    db
                        .prepare(`
                            SELECT
                                COALESCE(
                                    SUM(total_amount),
                                    0
                                ) AS total

                            FROM sales_returns

                            WHERE sales_invoice_id = ?

                              AND status = 'completed'
                        `)
                        .get(
                            invoice.id
                        );


                const cumulativeReturnedAmount =
                    roundMoney(
                        Number(
                            returnedBeforeThisReturn.total || 0
                        ) +
                        totalReturnAmount
                    );


                const netInvoiceTotal =
                    Math.max(
                        0,
                        roundMoney(
                            Number(
                                invoice.total_amount
                            ) -
                            cumulativeReturnedAmount
                        )
                    );


                const newPaidAmount =
                    Math.max(
                        0,
                        roundMoney(
                            Number(
                                invoice.paid_amount
                            ) -
                            actualRefundAmount
                        )
                    );


                const newRemainingAmount =
                    Math.max(
                        0,
                        roundMoney(
                            Number(
                                invoice.remaining_amount
                            ) -
                            creditRefundAmount
                        )
                    );


                let newPaymentStatus;


                if (
                    netInvoiceTotal <= 0
                ) {
                    newPaymentStatus =
                        "paid";

                } else if (
                    newRemainingAmount <= 0
                ) {
                    newPaymentStatus =
                        newPaidAmount > 0
                            ? "paid"
                            : "unpaid";

                } else if (
                    newPaidAmount <= 0
                ) {
                    newPaymentStatus =
                        "unpaid";

                } else {
                    newPaymentStatus =
                        "partial";
                }


                /*
                 * ------------------------------------------------
                 * 11. ثبت خود برگشت
                 * ------------------------------------------------
                 */

                const returnId =
                    insertSalesReturn(
                        db,
                        {
                            return_number:
                                data.return_number,

                            sales_invoice_id:
                                invoice.id,

                            customer_id:
                                invoice.customer_id,

                            warehouse_id:
                                warehouse.id,

                            created_by_user_id:
                                user.id,

                            return_date:
                                data.return_date,

                            status:
                                "completed",

                            total_amount:
                                totalReturnAmount,

                            refund_amount:
                                refundAmount,

                            refund_status:
                                refundStatus,

                            notes:
                                data.notes
                        }
                    );


                /*
                 * ------------------------------------------------
                 * 12. ثبت اقلام و برگشت موجودی
                 * ------------------------------------------------
                 */

                for (
                    const prepared
                    of preparedItems
                ) {

                    insertSalesReturnItem(
                        db,
                        {
                            sales_return_id:
                                returnId,

                            sales_invoice_item_id:
                                prepared.invoiceItem.id,

                            product_id:
                                prepared.invoiceItem.product_id,

                            quantity:
                                prepared.quantity,

                            unit_id:
                                prepared.invoiceItem.unit_id,

                            unit_price:
                                prepared.invoiceItem.unit_price,

                            discount_amount:
                                prepared.discountAmount,

                            tax_amount:
                                prepared.taxAmount,

                            line_total:
                                prepared.lineTotal
                        }
                    );


                    for (
                        const movement
                        of prepared.movements
                    ) {

                        const reverseQuantity =
                            Number(
                                movement.quantity
                            ) *
                            (
                                prepared.quantity /
                                Number(
                                    prepared.invoiceItem.quantity
                                )
                            );


                        if (
                            reverseQuantity <= 0
                        ) {
                            continue;
                        }


                        applyInventoryMovementInTransaction(
                            db,
                            {
                                warehouse_id:
                                    movement.warehouse_id,

                                product_id:
                                    movement.product_id,

                                movement_type:
                                    "sale_return",

                                quantity:
                                    reverseQuantity,

                                unit_cost:
                                    Number(
                                        movement.unit_cost
                                    ),

                                reference_type:
                                    "sales_return",

                                reference_id:
                                    returnId,

                                sales_invoice_item_id:
                                    prepared
                                        .invoiceItem
                                        .id,

                                description:
                                    `برگشت فروش ${invoice.invoice_number}`
                            }
                        );
                    }
                }


                /*
                 * ------------------------------------------------
                 * 13. ثبت پرداخت‌های برگشت
                 * ------------------------------------------------
                 */

                for (
                    const payment
                    of data.payments
                ) {

                    insertSalesReturnPayment(
                        db,
                        {
                            sales_return_id:
                                returnId,

                            payment_method:
                                payment.payment_method,

                            cash_register_id:
                                payment.cash_register_id ??
                                null,

                            bank_account_id:
                                payment.bank_account_id ??
                                null,

                            amount:
                                roundMoney(
                                    payment.amount
                                ),

                            payment_date:
                                data.return_date,

                            reference_number:
                                payment.reference_number ??
                                null,

                            terminal_reference:
                                payment.terminal_reference ??
                                null,

                            notes:
                                payment.notes ??
                                null
                        }
                    );


                    if (
                        payment.payment_method ===
                        "cash"
                    ) {

                        db.prepare(`
                            INSERT INTO cash_transactions (
                                cash_register_id,
                                transaction_type,
                                amount,
                                direction,
                                reference_type,
                                reference_id,
                                description
                            )
                            VALUES (
                                ?,
                                'refund',
                                ?,
                                'out',
                                'sales_return',
                                ?,
                                ?
                            )
                        `).run(
                            payment.cash_register_id,

                            roundMoney(
                                payment.amount
                            ),

                            returnId,

                            `بازپرداخت برگشت فروش ${invoice.invoice_number}`
                        );

                    } else if (
                        payment.payment_method ===
                        "card"
                    ) {

                        db.prepare(`
                            INSERT INTO bank_transactions (
                                bank_account_id,
                                transaction_type,
                                amount,
                                direction,
                                reference_type,
                                reference_id,
                                description
                            )
                            VALUES (
                                ?,
                                'refund',
                                ?,
                                'out',
                                'sales_return',
                                ?,
                                ?
                            )
                        `).run(
                            payment.bank_account_id,

                            roundMoney(
                                payment.amount
                            ),

                            returnId,

                            `بازپرداخت برگشت فروش ${invoice.invoice_number}`
                        );
                    }
                }


                /*
                 * ------------------------------------------------
                 * 14. سند حسابداری
                 * ------------------------------------------------
                 */

                const netRevenueReturn =
                    roundMoney(
                        totalReturnAmount -
                        totalReturnTax
                    );


                const journalLines =
                    [];


                if (
                    netRevenueReturn > 0
                ) {

                    journalLines.push({
                        account_id:
                            getAccountId(
                                db,
                                "401"
                            ),

                        debit:
                            netRevenueReturn,

                        credit:
                            0,

                        description:
                            "برگشت درآمد فروش"
                    });
                }


                if (
                    totalReturnTax > 0
                ) {

                    journalLines.push({
                        account_id:
                            getAccountId(
                                db,
                                "203"
                            ),

                        debit:
                            totalReturnTax,

                        credit:
                            0,

                        description:
                            "برگشت مالیات فروش"
                    });
                }


                for (
                    const payment
                    of data.payments
                ) {

                    journalLines.push({
                        account_id:
                            payment._accountId,

                        debit:
                            0,

                        credit:
                            roundMoney(
                                payment.amount
                            ),

                        description:
                            payment.payment_method ===
                            "credit"
                                ? "کاهش حساب دریافتنی مشتری"
                                : "بازپرداخت به مشتری"
                    });
                }


                const roundedReturnedCost =
                    roundMoney(
                        totalReturnedCost
                    );


                if (
                    roundedReturnedCost > 0
                ) {

                    journalLines.push({
                        account_id:
                            warehouse.account_id,

                        debit:
                            roundedReturnedCost,

                        credit:
                            0,

                        description:
                            "افزایش موجودی ناشی از برگشت"
                    });


                    journalLines.push({
                        account_id:
                            getAccountId(
                                db,
                                "502"
                            ),

                        debit:
                            0,

                        credit:
                            roundedReturnedCost,

                        description:
                            "برگشت بهای تمام‌شده فروش"
                    });
                }


                if (
                    journalLines.length < 2
                ) {
                    throw new Error(
                        "سند حسابداری برگشت معتبر نیست."
                    );
                }


                const totalDebit =
                    roundMoney(
                        journalLines.reduce(
                            (
                                sum,
                                line
                            ) =>
                                sum +
                                Number(
                                    line.debit
                                ),
                            0
                        )
                    );


                const totalCredit =
                    roundMoney(
                        journalLines.reduce(
                            (
                                sum,
                                line
                            ) =>
                                sum +
                                Number(
                                    line.credit
                                ),
                            0
                        )
                    );


                if (
                    totalDebit !==
                    totalCredit
                ) {
                    throw new Error(
                        `سند برگشت متوازن نیست. بدهکار: ${totalDebit}، بستانکار: ${totalCredit}`
                    );
                }


                createJournalEntryInTransaction(
                    db,
                    {
                        entry_date:
                            data.return_date,

                        reference_type:
                            "sales_return",

                        reference_id:
                            returnId,

                        description:
                            `ثبت حسابداری برگشت فروش ${invoice.invoice_number}`,

                        status:
                            "posted",

                        lines:
                            journalLines
                    }
                );


                /*
                 * ------------------------------------------------
                 * 15. به‌روزرسانی حساب مشتری
                 * ------------------------------------------------
                 */

                if (
                    customer
                ) {

                    db.prepare(`
                        INSERT OR IGNORE INTO customer_accounts (
                            customer_id,
                            points_balance,
                            credit_balance,
                            total_purchases,
                            total_paid
                        )
                        VALUES (
                            ?,
                            0,
                            0,
                            0,
                            0
                        )
                    `).run(
                        customer.id
                    );


                    db.prepare(`
                        UPDATE customer_accounts
                        SET
                            total_purchases =
                                MAX(
                                    0,
                                    total_purchases - ?
                                ),

                            total_paid =
                                MAX(
                                    0,
                                    total_paid - ?
                                ),

                            updated_at =
                                CURRENT_TIMESTAMP

                        WHERE customer_id = ?
                    `).run(
                        totalReturnAmount,

                        actualRefundAmount,

                        customer.id
                    );
                }


                /*
                 * ------------------------------------------------
                 * 16. به‌روزرسانی فاکتور
                 * ------------------------------------------------
                 */

                db.prepare(`
                    UPDATE sales_invoices
                    SET
                        paid_amount = ?,
                        remaining_amount = ?,
                        payment_status = ?,
                        status = ?,
                        updated_at =
                            CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(
                    newPaidAmount,

                    newRemainingAmount,

                    newPaymentStatus,

                    netInvoiceTotal <= 0
                        ? "returned"
                        : "completed",

                    invoice.id
                );


                /*
                 * ------------------------------------------------
                 * 17. کنترل نهایی مقدار برگشت‌نشده اقلام
                 * ------------------------------------------------
                 */

                const hasUnreturnedItem =
                    db
                        .prepare(`
                            SELECT 1
                            FROM sales_invoice_items sii

                            WHERE sii.sales_invoice_id = ?

                              AND sii.quantity >
                                  COALESCE(
                                      (
                                          SELECT
                                              SUM(
                                                  sri.quantity
                                              )

                                          FROM sales_return_items sri

                                          INNER JOIN sales_returns sr
                                              ON sr.id =
                                                 sri.sales_return_id

                                          WHERE
                                              sri.sales_invoice_item_id =
                                                  sii.id

                                            AND sr.status =
                                                'completed'
                                      ),
                                      0
                                  )

                            LIMIT 1
                        `)
                        .get(
                            invoice.id
                        );


                if (
                    !hasUnreturnedItem
                ) {

                    db.prepare(`
                        UPDATE sales_invoices
                        SET
                            status = 'returned',
                            updated_at =
                                CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).run(
                        invoice.id
                    );
                }


                /*
                 * ------------------------------------------------
                 * 18. خروجی
                 * ------------------------------------------------
                 */

                return {
                    id:
                        returnId,

                    return_number:
                        data.return_number,

                    sales_invoice_id:
                        invoice.id,

                    total_amount:
                        totalReturnAmount,

                    refund_amount:
                        refundAmount,

                    refund_status:
                        refundStatus,

                    total_cost:
                        roundedReturnedCost
                };
            });


        return transaction();

    } finally {
        db.close();
    }
}


function getAccountId(
    db,
    code
) {
    const account =
        db
            .prepare(`
                SELECT
                    id
                FROM accounts
                WHERE code = ?
                  AND is_active = 1
            `)
            .get(
                code
            );


    if (
        !account
    ) {
        throw new Error(
            `حساب ${code} پیدا نشد.`
        );
    }


    return account.id;
}


module.exports = {
    createSalesReturn
};