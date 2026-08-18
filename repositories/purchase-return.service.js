const {
    createConnection
} = require("../core/connection");


const {
    validatePurchaseReturnInput
} = require("../validation/purchase-return.validation");


const {
    getPurchaseById,
    getPurchaseInvoiceItemForReturn,
    getPreviousReturnedQuantity,
    getPreviousReturnedTotal,
    getPurchaseReturnByNumber,
    insertPurchaseReturn,
    insertPurchaseReturnItem,
    updatePurchaseInvoiceAfterReturn,
    getPurchaseReturnById
} = require("../repositories/purchase-return.repository");


const {
    getSupplierById,
    getWarehouseById,
    getUserById
} = require("../repositories/purchase.repository");


const {
    convertQuantity
} = require("./unit-conversion.service");


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


function assertSupplier(
    db,
    supplierId
) {
    if (
        supplierId === null ||
        supplierId === undefined
    ) {
        throw new Error(
            "تأمین‌کننده فاکتور خرید مشخص نیست."
        );
    }


    const supplier =
        getSupplierById(
            db,
            supplierId
        );


    if (
        !supplier
    ) {
        throw new Error(
            "تأمین‌کننده پیدا نشد."
        );
    }


    if (
        !supplier.is_active
    ) {
        throw new Error(
            "تأمین‌کننده غیرفعال است."
        );
    }


    if (
        !supplier.account_id
    ) {
        throw new Error(
            "تأمین‌کننده به حساب حسابداری متصل نیست."
        );
    }


    return supplier;
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


function getPurchaseTaxAccountId(
    db
) {
    const account =
        db
            .prepare(`
                SELECT
                    id
                FROM accounts
                WHERE code = '104'
                  AND is_active = 1
            `)
            .get();


    if (
        !account
    ) {
        throw new Error(
            "حساب مالیات خرید پیدا نشد."
        );
    }


    return account.id;
}


function calculatePaymentStatus(
    totalAmount,
    paidAmount
) {
    if (
        totalAmount <= 0
    ) {
        return "paid";
    }


    if (
        paidAmount <= 0
    ) {
        return "unpaid";
    }


    if (
        paidAmount >= totalAmount
    ) {
        return "paid";
    }


    return "partial";
}


function createPurchaseReturn(
    input
) {
    const data =
        validatePurchaseReturnInput(
            input
        );


    const db =
        createConnection();


    try {

        const transaction =
            db.transaction(() => {

                /*
                 * ------------------------------------------------
                 * 1. فاکتور خرید
                 * ------------------------------------------------
                 */

                const invoice =
                    getPurchaseById(
                        db,
                        data.purchase_invoice_id
                    );


                if (
                    !invoice
                ) {
                    throw new Error(
                        "فاکتور خرید پیدا نشد."
                    );
                }


                if (
                    invoice.status !==
                    "completed"
                ) {
                    throw new Error(
                        "فقط فاکتور خرید تکمیل‌شده قابل برگشت است."
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
                        "انبار برگشت با انبار فاکتور خرید یکسان نیست."
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
                 * 4. تأمین‌کننده
                 * ------------------------------------------------
                 */

                const supplier =
                    assertSupplier(
                        db,
                        invoice.supplier_id
                    );


                /*
                 * ------------------------------------------------
                 * 5. چون schema برگشت خرید فعلی Refund ندارد،
                 *    فقط از بخش بدهی قابل برگشت است.
                 *
                 * یعنی:
                 *
                 * return total <= invoice.remaining_amount
                 *
                 * در غیر این صورت برگشت نیاز به
                 * Supplier Refund دارد که فعلاً در schema نیست.
                 * ------------------------------------------------
                 */

                const existingReturn =
                    getPurchaseReturnByNumber(
                        db,
                        data.return_number
                    );


                if (
                    existingReturn
                ) {
                    throw new Error(
                        "شماره برگشت خرید قبلاً ثبت شده است."
                    );
                }


                /*
                 * ------------------------------------------------
                 * 6. آماده‌سازی اقلام
                 * ------------------------------------------------
                 */

                const preparedItems =
                    [];


                let totalReturnAmount =
                    0;


                let totalReturnTax =
                    0;


                let totalReturnNet =
                    0;


                for (
                    const inputItem
                    of data.items
                ) {

                    const purchaseItem =
                        getPurchaseInvoiceItemForReturn(
                            db,
                            invoice.id,
                            Number(
                                inputItem.product_id
                            )
                        );


                    if (
                        !purchaseItem
                    ) {
                        throw new Error(
                            `کالای انتخاب‌شده در فاکتور خرید «${invoice.invoice_number}» پیدا نشد.`
                        );
                    }


                    /*
                     * واحد برگشت باید با واحد ثبت‌شده
                     * در قلم خرید یکسان باشد تا مقدار برگشت
                     * بدون حدس و خطای تبدیل در سوابق قبلی
                     * قابل محاسبه باشد.
                     */

                    if (
                        Number(
                            inputItem.unit_id
                        ) !==
                        Number(
                            purchaseItem.unit_id
                        )
                    ) {
                        throw new Error(
                            `واحد برگشت کالای «${purchaseItem.product_name}» باید با واحد ثبت‌شده در فاکتور خرید یکسان باشد.`
                        );
                    }


                    const requestedQuantity =
                        Number(
                            inputItem.quantity
                        );


                    const originalQuantity =
                        Number(
                            purchaseItem.quantity
                        );


                    if (
                        originalQuantity <= 0
                    ) {
                        throw new Error(
                            `مقدار خرید کالای «${purchaseItem.product_name}» معتبر نیست.`
                        );
                    }


                    const previousQuantity =
                        getPreviousReturnedQuantity(
                            db,
                            invoice.id,
                            purchaseItem.product_id
                        );


                    const previousTotal =
                        getPreviousReturnedTotal(
                            db,
                            invoice.id,
                            purchaseItem.product_id
                        );


                    const remainingQuantity =
                        originalQuantity -
                        previousQuantity;


                    if (
                        remainingQuantity <= 0
                    ) {
                        throw new Error(
                            `کالای «${purchaseItem.product_name}» قبلاً به‌طور کامل برگشت داده شده است.`
                        );
                    }


                    if (
                        requestedQuantity >
                        remainingQuantity
                    ) {
                        throw new Error(
                            `مقدار قابل برگشت کالای «${purchaseItem.product_name}» فقط ${remainingQuantity} است.`
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


                    let lineTotal;


                    let taxAmount;


                    if (
                        isFinalReturn
                    ) {

                        lineTotal =
                            roundMoney(
                                Number(
                                    purchaseItem.line_total
                                ) -
                                Number(
                                    previousTotal
                                )
                            );


                        /*
                         * مالیات قبلی از روی مقدارهای
                         * برگشتی قبلی و مالیات اصلی قلم
                         * دوباره محاسبه می‌شود.
                         */

                        const previousTax =
                            roundMoney(
                                Number(
                                    purchaseItem.tax_amount
                                ) *
                                (
                                    previousQuantity /
                                    originalQuantity
                                )
                            );


                        taxAmount =
                            roundMoney(
                                Number(
                                    purchaseItem.tax_amount
                                ) -
                                previousTax
                            );

                    } else {

                        lineTotal =
                            roundMoney(
                                Number(
                                    purchaseItem.line_total
                                ) *
                                ratio
                            );


                        taxAmount =
                            roundMoney(
                                Number(
                                    purchaseItem.tax_amount
                                ) *
                                ratio
                            );
                    }


                    if (
                        lineTotal <= 0
                    ) {
                        throw new Error(
                            `مبلغ برگشت کالای «${purchaseItem.product_name}» معتبر نیست.`
                        );
                    }


                    if (
                        taxAmount < 0 ||
                        taxAmount > lineTotal
                    ) {
                        throw new Error(
                            `مالیات برگشت کالای «${purchaseItem.product_name}» معتبر نیست.`
                        );
                    }


                    const netReturnAmount =
                        roundMoney(
                            lineTotal -
                            taxAmount
                        );


                    /*
                     * ------------------------------------------------
                     * محاسبه قیمت تمام‌شده همان خرید
                     *
                     * purchase.service.js این مقدار را ثبت می‌کند:
                     *
                     * inventoryUnitCost =
                     *   (grossLine - discount) /
                     *   stockQuantity
                     *
                     * بنابراین همان مبنا را بازسازی می‌کنیم.
                     * ------------------------------------------------
                     */

                    const stockUnit =
                        db
                            .prepare(`
                                SELECT
                                    id,
                                    decimal_places,
                                    is_active
                                FROM units
                                WHERE id = (
                                    SELECT
                                        unit_id
                                    FROM products
                                    WHERE id = ?
                                )
                            `)
                            .get(
                                purchaseItem.product_id
                            );


                    if (
                        !stockUnit
                    ) {
                        throw new Error(
                            `واحد موجودی کالای «${purchaseItem.product_name}» پیدا نشد.`
                        );
                    }


                    const stockQuantity =
                        convertQuantity(
                            requestedQuantity,
                            purchaseItem.unit_id,
                            stockUnit.id
                        );


                    if (
                        !Number.isFinite(
                            stockQuantity
                        ) ||
                        stockQuantity <= 0
                    ) {
                        throw new Error(
                            `تبدیل مقدار موجودی کالای «${purchaseItem.product_name}» معتبر نیست.`
                        );
                    }


                    const originalStockQuantity =
                        convertQuantity(
                            originalQuantity,
                            purchaseItem.unit_id,
                            stockUnit.id
                        );


                    if (
                        !Number.isFinite(
                            originalStockQuantity
                        ) ||
                        originalStockQuantity <= 0
                    ) {
                        throw new Error(
                            `واحد موجودی کالای «${purchaseItem.product_name}» معتبر نیست.`
                        );
                    }


                    const originalGrossLine =
                        roundMoney(
                            Number(
                                purchaseItem.quantity
                            ) *
                            Number(
                                purchaseItem.unit_price
                            )
                        );


                    const inventoryNetLine =
                        roundMoney(
                            originalGrossLine -
                            Number(
                                purchaseItem.discount_amount
                            )
                        );


                    const inventoryUnitCost =
                        inventoryNetLine /
                        originalStockQuantity;


                    const returnedInventoryCost =
                        roundMoney(
                            stockQuantity *
                            inventoryUnitCost
                        );


                    if (
                        returnedInventoryCost < 0
                    ) {
                        throw new Error(
                            `بهای تمام‌شده برگشت کالای «${purchaseItem.product_name}» معتبر نیست.`
                        );
                    }


                    preparedItems.push({
                        purchaseItem,

                        quantity:
                            requestedQuantity,

                        stockQuantity,

                        lineTotal,

                        taxAmount,

                        netReturnAmount,

                        inventoryUnitCost,

                        returnedInventoryCost
                    });


                    totalReturnAmount +=
                        lineTotal;


                    totalReturnTax +=
                        taxAmount;


                    totalReturnNet +=
                        netReturnAmount;
                }


                totalReturnAmount =
                    roundMoney(
                        totalReturnAmount
                    );


                totalReturnTax =
                    roundMoney(
                        totalReturnTax
                    );


                totalReturnNet =
                    roundMoney(
                        totalReturnNet
                    );


                if (
                    totalReturnAmount <= 0
                ) {
                    throw new Error(
                        "مبلغ کل برگشت خرید معتبر نیست."
                    );
                }


                /*
                 * ------------------------------------------------
                 * 7. فقط تا سقف بدهی فعلی
                 * ------------------------------------------------
                 */

                const currentRemaining =
                    roundMoney(
                        Number(
                            invoice.remaining_amount
                        )
                    );


                if (
                    totalReturnAmount >
                    currentRemaining
                ) {
                    throw new Error(
                        `مبلغ برگشت خرید ${totalReturnAmount} از بدهی فعلی تأمین‌کننده ${currentRemaining} بیشتر است. برگشت مبلغ پرداخت‌شده فعلاً در Schema موجود نیست.`
                    );
                }


                /*
                 * ------------------------------------------------
                 * 8. ثبت header برگشت
                 * ------------------------------------------------
                 */

                const returnId =
                    insertPurchaseReturn(
                        db,
                        {
                            return_number:
                                data.return_number,

                            purchase_invoice_id:
                                invoice.id,

                            supplier_id:
                                invoice.supplier_id,

                            warehouse_id:
                                warehouse.id,

                            status:
                                "completed",

                            return_date:
                                data.return_date,

                            total_amount:
                                totalReturnAmount,

                            notes:
                                data.notes,

                            created_by_user_id:
                                user.id
                        }
                    );


                /*
                 * ------------------------------------------------
                 * 9. ثبت اقلام + کاهش موجودی
                 * ------------------------------------------------
                 */

                for (
                    const prepared
                    of preparedItems
                ) {

                    insertPurchaseReturnItem(
                        db,
                        {
                            purchase_return_id:
                                returnId,

                            product_id:
                                prepared
                                    .purchaseItem
                                    .product_id,

                            quantity:
                                prepared.quantity,

                            unit_id:
                                prepared
                                    .purchaseItem
                                    .unit_id,

                            unit_price:
                                prepared
                                    .purchaseItem
                                    .unit_price,

                            total_amount:
                                prepared.lineTotal
                        }
                    );


                    applyInventoryMovementInTransaction(
                        db,
                        {
                            warehouse_id:
                                warehouse.id,

                            product_id:
                                prepared
                                    .purchaseItem
                                    .product_id,

                            movement_type:
                                "purchase_return",

                            quantity:
                                prepared.stockQuantity,

                            unit_cost:
                                Math.round(
                                    prepared
                                        .inventoryUnitCost
                                ),

                            reference_type:
                                "purchase_return",

                            reference_id:
                                returnId,

                            description:
                                `برگشت خرید ${invoice.invoice_number}`
                        }
                    );
                }


                /*
                 * ------------------------------------------------
                 * 10. وضعیت مالی فاکتور خرید
                 *
                 * چون return <= remaining،
                 * paid_amount دست‌نخورده باقی می‌ماند.
                 * فقط total و remaining کاهش می‌یابد.
                 * ------------------------------------------------
                 */

                const newTotalAmount =
                    Math.max(
                        0,
                        roundMoney(
                            Number(
                                invoice.total_amount
                            ) -
                            totalReturnAmount
                        )
                    );


                const newPaidAmount =
                    roundMoney(
                        Number(
                            invoice.paid_amount
                        )
                    );


                const newRemainingAmount =
                    Math.max(
                        0,
                        roundMoney(
                            Number(
                                invoice.remaining_amount
                            ) -
                            totalReturnAmount
                        )
                    );


                const newPaymentStatus =
                    calculatePaymentStatus(
                        newTotalAmount,
                        newPaidAmount
                    );


                /*
                 * ------------------------------------------------
                 * 11. بررسی اینکه همه اقلام برگشت خورده‌اند یا نه
                 * ------------------------------------------------
                 */

                const hasUnreturnedItem =
                    db
                        .prepare(`
                            SELECT 1

                            FROM purchase_invoice_items pii

                            WHERE
                                pii.purchase_invoice_id = ?

                                AND
                                pii.quantity >
                                COALESCE(
                                    (
                                        SELECT
                                            SUM(
                                                pri.quantity
                                            )

                                        FROM purchase_return_items pri

                                        INNER JOIN purchase_returns pr
                                            ON pr.id =
                                               pri.purchase_return_id

                                        WHERE
                                            pr.purchase_invoice_id =
                                                pii.purchase_invoice_id

                                            AND
                                            pri.product_id =
                                                pii.product_id

                                            AND
                                            pr.status =
                                                'completed'
                                    ),
                                    0
                                )

                            LIMIT 1
                        `)
                        .get(
                            invoice.id
                        );


                const newStatus =
                    hasUnreturnedItem
                        ? "completed"
                        : "returned";


                /*
                 * ------------------------------------------------
                 * 12. به‌روزرسانی فاکتور
                 * ------------------------------------------------
                 */

                updatePurchaseInvoiceAfterReturn(
                    db,
                    invoice.id,
                    newTotalAmount,
                    newPaidAmount,
                    newRemainingAmount,
                    newPaymentStatus,
                    newStatus
                );


                /*
                 * ------------------------------------------------
                 * 13. سند حسابداری برگشت خرید
                 *
                 * تأمین‌کننده بدهکار می‌شود.
                 *
                 * موجودی بستانکار می‌شود.
                 *
                 * مالیات خرید بستانکار می‌شود.
                 * ------------------------------------------------
                 */

                const journalLines =
                    [];


                journalLines.push({
                    account_id:
                        supplier.account_id,

                    debit:
                        totalReturnAmount,

                    credit:
                        0,

                    description:
                        "کاهش بدهی ناشی از برگشت خرید"
                });


                const returnedInventoryCost =
                    roundMoney(
                        preparedItems.reduce(
                            (
                                sum,
                                item
                            ) =>
                                sum +
                                Number(
                                    item
                                        .returnedInventoryCost
                                ),
                            0
                        )
                    );


                const taxAccountId =
                    totalReturnTax > 0
                        ? getPurchaseTaxAccountId(
                            db
                        )
                        : null;


                if (
                    returnedInventoryCost > 0
                ) {

                    journalLines.push({
                        account_id:
                            warehouse.account_id,

                        debit:
                            0,

                        credit:
                            returnedInventoryCost,

                        description:
                            "کاهش موجودی ناشی از برگشت خرید"
                    });
                }


                if (
                    totalReturnTax > 0
                ) {

                    journalLines.push({
                        account_id:
                            taxAccountId,

                        debit:
                            0,

                        credit:
                            totalReturnTax,

                        description:
                            "برگشت مالیات خرید"
                    });
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


                /*
                 * این کنترل بسیار مهم است.
                 *
                 * totalReturnAmount شامل مالیات است،
                 * ولی inventory cost مالیات را شامل نمی‌شود.
                 *
                 * بنابراین:
                 *
                 * total return
                 * =
                 * inventory cost
                 * +
                 * tax
                 *
                 * باید برقرار باشد.
                 */

                if (
                    totalReturnAmount !==
                    roundMoney(
                        returnedInventoryCost +
                        totalReturnTax
                    )
                ) {
                    throw new Error(
                        `مبلغ برگشت خرید با بهای موجودی و مالیات سازگار نیست. برگشت: ${totalReturnAmount}، موجودی: ${returnedInventoryCost}، مالیات: ${totalReturnTax}`
                    );
                }


                if (
                    totalDebit !==
                    totalCredit
                ) {
                    throw new Error(
                        `سند برگشت خرید متوازن نیست. بدهکار: ${totalDebit}، بستانکار: ${totalCredit}`
                    );
                }


                if (
                    journalLines.length < 2
                ) {
                    throw new Error(
                        "سند حسابداری برگشت خرید معتبر نیست."
                    );
                }


                createJournalEntryInTransaction(
                    db,
                    {
                        entry_date:
                            data.return_date,

                        reference_type:
                            "purchase_return",

                        reference_id:
                            returnId,

                        description:
                            `ثبت حسابداری برگشت خرید ${invoice.invoice_number}`,

                        status:
                            "posted",

                        lines:
                            journalLines
                    }
                );


                /*
                 * ------------------------------------------------
                 * 14. خروجی کامل
                 * ------------------------------------------------
                 */

                return {
                    id:
                        returnId,

                    return_number:
                        data.return_number,

                    purchase_invoice_id:
                        invoice.id,

                    supplier_id:
                        invoice.supplier_id,

                    total_amount:
                        totalReturnAmount,

                    returned_inventory_cost:
                        returnedInventoryCost,

                    returned_tax:
                        totalReturnTax,

                    previous_remaining_amount:
                        invoice.remaining_amount,

                    new_remaining_amount:
                        newRemainingAmount,

                    payment_status:
                        newPaymentStatus,

                    status:
                        newStatus
                };
            });


        const result =
            transaction();


        const resultDb =
            createConnection();


        try {
            return getPurchaseReturnById(
                resultDb,
                result.id
            );
        } finally {
            resultDb.close();
        }

    } finally {
        db.close();
    }
}


module.exports = {
    createPurchaseReturn
};