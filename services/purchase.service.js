const {
    createConnection
} = require("../core/connection");

const {
    validatePurchaseInvoiceInput
} = require("../validation/purchase.validation");

const {
    getSupplierById,
    getWarehouseById,
    getUserById,
    getProductById,
    getUnitById,
    getCashRegisterById,
    getBankAccountById,
    getTaxRate,
    getPurchaseByInvoiceNumber,
    insertPurchaseInvoice,
    insertPurchaseInvoiceItem,
    insertPurchasePayment,
    getPurchaseById
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


function roundMoney(value) {
    return Math.round(
        Number(value)
    );
}


function assertActiveSupplier(
    db,
    supplierId
) {
    if (supplierId === null) {
        return null;
    }

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


function assertActiveWarehouse(
    db,
    warehouseId
) {
    const warehouse =
        getWarehouseById(
            db,
            warehouseId
        );

    if (!warehouse) {
        throw new Error(
            "انبار پیدا نشد."
        );
    }

    if (!warehouse.is_active) {
        throw new Error(
            "انبار غیرفعال است."
        );
    }

    if (!warehouse.account_id) {
        throw new Error(
            "انبار به حساب حسابداری متصل نیست."
        );
    }

    return warehouse;
}


function assertActiveUser(
    db,
    userId
) {
    const user =
        getUserById(
            db,
            userId
        );

    if (!user) {
        throw new Error(
            "کاربر ثبت‌کننده پیدا نشد."
        );
    }

    if (!user.is_active) {
        throw new Error(
            "کاربر ثبت‌کننده غیرفعال است."
        );
    }

    if (user.is_locked) {
        throw new Error(
            "کاربر ثبت‌کننده قفل شده است."
        );
    }

    return user;
}


function assertActiveProduct(
    db,
    productId
) {
    const product =
        getProductById(
            db,
            productId
        );

    if (!product) {
        throw new Error(
            "کالا پیدا نشد."
        );
    }

    if (!product.is_active) {
        throw new Error(
            `کالای «${product.name}» غیرفعال است.`
        );
    }

    if (!product.is_purchasable) {
        throw new Error(
            `کالای «${product.name}» قابل خرید نیست.`
        );
    }

    return product;
}


function assertActiveUnit(
    db,
    unitId
) {
    const unit =
        getUnitById(
            db,
            unitId
        );

    if (!unit) {
        throw new Error(
            "واحد پیدا نشد."
        );
    }

    if (!unit.is_active) {
        throw new Error(
            `واحد «${unit.name}» غیرفعال است.`
        );
    }

    return unit;
}


function assertCashRegister(
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


function assertBankAccount(
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


function calculatePurchaseItems(
    db,
    items
) {
    const calculatedItems = [];

    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    for (
        let index = 0;
        index < items.length;
        index++
    ) {
        const item =
            items[index];

        const product =
            assertActiveProduct(
                db,
                Number(
                    item.product_id
                )
            );

        const purchaseUnit =
            assertActiveUnit(
                db,
                Number(
                    item.unit_id
                )
            );

        const stockUnit =
            getUnitById(
                db,
                product.unit_id
            );

        if (!stockUnit) {
            throw new Error(
                `واحد موجودی «${product.name}» پیدا نشد.`
            );
        }

        if (!stockUnit.is_active) {
            throw new Error(
                `واحد موجودی «${product.name}» غیرفعال است.`
            );
        }

        const quantity =
            Number(
                item.quantity
            );

        const unitPrice =
            roundMoney(
                item.unit_price
            );

        const discount =
            roundMoney(
                item.discount_amount ?? 0
            );

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            throw new Error(
                `مقدار کالای «${product.name}» معتبر نیست.`
            );
        }

        if (
            !Number.isFinite(unitPrice) ||
            unitPrice < 0
        ) {
            throw new Error(
                `قیمت خرید «${product.name}» معتبر نیست.`
            );
        }

        if (
            discount < 0
        ) {
            throw new Error(
                `تخفیف «${product.name}» معتبر نیست.`
            );
        }

        const grossLine =
            roundMoney(
                quantity *
                unitPrice
            );

        if (
            discount > grossLine
        ) {
            throw new Error(
                `تخفیف «${product.name}» نمی‌تواند از مبلغ کالا بیشتر باشد.`
            );
        }

        const netLine =
            grossLine -
            discount;

        const taxPercent =
            Number(
                item.tax_rate_percent ?? 0
            );

        if (
            !Number.isFinite(
                taxPercent
            ) ||
            taxPercent < 0
        ) {
            throw new Error(
                `نرخ مالیات «${product.name}» معتبر نیست.`
            );
        }

        let taxAmount = 0;

        if (taxPercent > 0) {
            const taxRate =
                getTaxRate(
                    db,
                    taxPercent
                );

            if (!taxRate) {
                throw new Error(
                    `نرخ مالیات ${taxPercent}% در سیستم تعریف نشده است.`
                );
            }

            taxAmount =
                roundMoney(
                    netLine *
                    taxPercent /
                    100
                );
        }

        const lineTotal =
            netLine +
            taxAmount;

        /*
         * مقدار خرید را به واحد پایه
         * موجودی تبدیل می‌کنیم.
         */

        const stockQuantity =
            convertQuantity(
                quantity,
                purchaseUnit.id,
                stockUnit.id
            );

        if (
            !Number.isFinite(
                stockQuantity
            ) ||
            stockQuantity <= 0
        ) {
            throw new Error(
                `تبدیل واحد کالای «${product.name}» معتبر نیست.`
            );
        }

        /*
         * بهای تمام‌شده موجودی:
         *
         * مالیات قابل تفکیک است و وارد
         * بهای موجودی نمی‌شود.
         *
         * تخفیف خرید از بهای کالا کم می‌شود.
         */

        const inventoryUnitCost =
            netLine /
            stockQuantity;

        subtotal += grossLine;
        totalDiscount += discount;
        totalTax += taxAmount;

        calculatedItems.push({
            productId:
                product.id,

            productName:
                product.name,

            quantity,

            unitId:
                purchaseUnit.id,

            stockUnitId:
                stockUnit.id,

            stockQuantity,

            unitPrice,

            discountAmount:
                discount,

            taxRatePercent:
                taxPercent,

            taxAmount,

            lineTotal,

            inventoryUnitCost,

            notes:
                item.notes ?? null
        });
    }

    return {
        items:
            calculatedItems,

        subtotal:
            roundMoney(subtotal),

        discountAmount:
            roundMoney(totalDiscount),

        taxAmount:
            roundMoney(totalTax)
    };
}


function insertCashTransactionInTransaction(
    db,
    cash,
    payment,
    purchaseId
) {
    return db
        .prepare(`
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
                'purchase',
                ?,
                'out',
                'purchase_invoice',
                ?,
                ?
            )
        `)
        .run(
            cash.id,
            payment.amount,
            purchaseId,
            "پرداخت خرید"
        )
        .lastInsertRowid;
}


function insertBankTransactionInTransaction(
    db,
    bank,
    payment,
    purchaseId
) {
    return db
        .prepare(`
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
                'purchase',
                ?,
                'out',
                'purchase_invoice',
                ?,
                ?
            )
        `)
        .run(
            bank.id,
            payment.amount,
            purchaseId,
            "پرداخت خرید"
        )
        .lastInsertRowid;
}


function createPurchaseInvoice(
    input
) {
    const data =
        validatePurchaseInvoiceInput(
            input
        );

    const db =
        createConnection();

    try {

        const transaction =
            db.transaction(() => {

                /*
                 * موجودیت‌های اصلی
                 */

                const supplier =
                    assertActiveSupplier(
                        db,
                        data.supplier_id
                    );

                const warehouse =
                    assertActiveWarehouse(
                        db,
                        data.warehouse_id
                    );

                const user =
                    assertActiveUser(
                        db,
                        data.created_by_user_id
                    );


                /*
                 * جلوگیری از شماره فاکتور تکراری
                 */

                const existingInvoice =
                    getPurchaseByInvoiceNumber(
                        db,
                        data.invoice_number
                    );

                if (existingInvoice) {
                    throw new Error(
                        "شماره فاکتور خرید قبلاً ثبت شده است."
                    );
                }


                /*
                 * محاسبه واقعی اقلام
                 */

                const calculated =
                    calculatePurchaseItems(
                        db,
                        data.items
                    );


                const finalTotal =
                    roundMoney(
                        calculated.subtotal -
                        calculated.discountAmount +
                        calculated.taxAmount
                    );


                if (
                    finalTotal < 0
                ) {
                    throw new Error(
                        "مبلغ نهایی فاکتور خرید معتبر نیست."
                    );
                }


                /*
                 * پرداخت‌ها
                 */

                let actualPaidAmount = 0;
let creditAmount = 0;

const validatedPayments = [];

for (
    const payment
    of data.payments
) {

    const amount =
        roundMoney(
            payment.amount
        );

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        throw new Error(
            "مبلغ پرداخت معتبر نیست."
        );
    }

    if (
        payment.payment_method ===
        "cash"
    ) {

        const cash =
            assertCashRegister(
                db,
                Number(
                    payment.cash_register_id
                )
            );

        actualPaidAmount += amount;

        validatedPayments.push({
            ...payment,
            amount,
            cash
        });

    } else if (
        payment.payment_method ===
        "bank"
    ) {

        const bank =
            assertBankAccount(
                db,
                Number(
                    payment.bank_account_id
                )
            );

        actualPaidAmount += amount;

        validatedPayments.push({
            ...payment,
            amount,
            bank
        });

    } else if (
        payment.payment_method ===
        "credit"
    ) {

        if (!supplier) {
            throw new Error(
                "خرید نسیه نیاز به تأمین‌کننده دارد."
            );
        }

        creditAmount += amount;

        validatedPayments.push({
            ...payment,
            amount
        });

    } else {

        throw new Error(
            "روش پرداخت خرید معتبر نیست."
        );
    }
}

if (
    actualPaidAmount +
    creditAmount >
    finalTotal
) {
    throw new Error(
        "مجموع پرداخت و اعتبار نسیه نمی‌تواند از مبلغ فاکتور بیشتر باشد."
    );
}

if (
    Math.round(
        actualPaidAmount +
        creditAmount
    ) !==
    Math.round(finalTotal)
) {
    throw new Error(
        "مبلغ پرداخت/نسیه باید دقیقاً با مبلغ نهایی فاکتور برابر باشد."
    );
}


                /*
                 * ثبت فاکتور
                 */

                const remainingAmount =
    finalTotal -
    actualPaidAmount;

const paymentStatus =
    calculatePaymentStatus(
        finalTotal,
        actualPaidAmount
    );


                const purchaseId =
                    insertPurchaseInvoice(
                        db,
                        {
                            invoice_number:
                                data.invoice_number,

                            supplier_id:
                                data.supplier_id,

                            warehouse_id:
                                data.warehouse_id,

                            status:
                                data.status,

                            invoice_date:
                                data.invoice_date,

                            subtotal:
                                calculated.subtotal,

                            discount_amount:
                                calculated.discountAmount,

                            tax_amount:
                                calculated.taxAmount,

                            total_amount:
                                finalTotal,

                            paid_amount:
                                 actualPaidAmount,

                            remaining_amount:
                                remainingAmount,

                            payment_status:
                                paymentStatus,

                            notes:
                                data.notes,

                            reference_number:
                                data.reference_number,

                            created_by_user_id:
                                user.id
                        }
                    );


                /*
                 * ثبت اقلام + ورود موجودی
                 */

                for (
                    const item
                    of calculated.items
                ) {

                    insertPurchaseInvoiceItem(
                        db,
                        {
                            purchase_invoice_id:
                                purchaseId,

                            product_id:
                                item.productId,

                            quantity:
                                item.quantity,

                            unit_id:
                                item.unitId,

                            unit_price:
                                item.unitPrice,

                            discount_amount:
                                item.discountAmount,

                            tax_rate_percent:
                                item.taxRatePercent,

                            tax_amount:
                                item.taxAmount,

                            line_total:
                                item.lineTotal,

                            notes:
                                item.notes
                        }
                    );


                    /*
                     * خرید completed => ورود به انبار
                     *
                     * Draft فقط فاکتور را ثبت می‌کند.
                     */

                    if (
                        data.status ===
                        "completed"
                    ) {

                        applyInventoryMovementInTransaction(
                            db,
                            {
                                warehouse_id:
                                    warehouse.id,

                                product_id:
                                    item.productId,

                                movement_type:
                                    "purchase",

                                quantity:
                                    item.stockQuantity,

                                unit_cost:
                                    item.inventoryUnitCost,

                                reference_type:
                                    "purchase_invoice",

                                reference_id:
                                    purchaseId,

                                description:
                                    `ورود خرید: ${data.invoice_number}`
                            }
                        );
                    }
                }


                /*
                 * پرداخت‌ها
                 */

                for (
                    const payment
                    of validatedPayments
                ) {

                    const paymentId =
                        insertPurchasePayment(
                            db,
                            {
                                purchase_invoice_id:
                                    purchaseId,

                                payment_method:
                                    payment.payment_method,

                                cash_register_id:
                                    payment.cash_register_id ??
                                    null,

                                bank_account_id:
                                    payment.bank_account_id ??
                                    null,

                                amount:
                                    payment.amount,

                                payment_date:
                                    payment.payment_date ??
                                    null,

                                reference_number:
                                    payment.reference_number ??
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

                        insertCashTransactionInTransaction(
                            db,
                            payment.cash,
                            payment,
                            purchaseId
                        );

                    } else if (
                        payment.payment_method ===
                        "bank"
                    ) {

                        insertBankTransactionInTransaction(
                            db,
                            payment.bank,
                            payment,
                            purchaseId
                        );
                    }


                    /*
                     * برای لینک حسابداری در ادامه،
                     * paymentId حفظ شده و reference
                     * اصلی همچنان purchaseInvoice است.
                     */
                    void paymentId;
                }


                /*
                 * اگر فاکتور Draft باشد،
                 * فعلاً سند مالی ایجاد نمی‌کنیم.
                 */

                if (
                    data.status ===
                    "completed"
                ) {

                    /*
                     * حساب موجودی انبار
                     */
                    const inventoryAccount =
                        db
                            .prepare(`
                                SELECT
                                    account_id
                                FROM warehouses
                                WHERE id = ?
                            `)
                            .get(
                                warehouse.id
                            );

                    if (
                        !inventoryAccount ||
                        !inventoryAccount.account_id
                    ) {
                        throw new Error(
                            "حساب موجودی انبار پیدا نشد."
                        );
                    }


                    /*
                     * حساب مالیات خرید
                     */
                    const taxAccount =
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
                        !taxAccount
                    ) {
                        throw new Error(
                            "حساب مالیات خرید پیدا نشد."
                        );
                    }


                    /*
                     * حساب طرف مقابل:
                     *
                     * خرید ابتدا در حساب تأمین‌کننده
                     * ثبت می‌شود.
                     */
                    if (!supplier) {
                        throw new Error(
                            "برای فاکتور خرید completed، تأمین‌کننده باید مشخص باشد."
                        );
                    }


                    const journalLines = [];


                    const inventoryNetAmount =
                        calculated.subtotal -
                        calculated.discountAmount;


                    if (
                        inventoryNetAmount > 0
                    ) {
                        journalLines.push({
                            account_id:
                                inventoryAccount.account_id,

                            debit:
                                inventoryNetAmount,

                            credit:
                                0,

                            description:
                                "افزایش موجودی ناشی از خرید"
                        });
                    }


                    if (
                        calculated.taxAmount > 0
                    ) {
                        journalLines.push({
                            account_id:
                                taxAccount.id,

                            debit:
                                calculated.taxAmount,

                            credit:
                                0,

                            description:
                                "مالیات خرید"
                        });
                    }


                    /*
                     * کل مبلغ ابتدا به حساب تأمین‌کننده
                     * بستانکار می‌شود.
                     */
                    journalLines.push({
                        account_id:
                            supplier.account_id,

                        debit:
                            0,

                        credit:
                            finalTotal,

                        description:
                            `فاکتور خرید ${data.invoice_number}`
                    });


                    /*
                     * سپس پرداخت‌ها:
                     *
                     * تأمین‌کننده بدهکار می‌شود.
                     * صندوق/بانک بستانکار می‌شود.
                     */

                   for (
    const payment
    of validatedPayments
) {

    const paymentAmount =
        payment.amount;

    if (
        payment.payment_method ===
        "cash"
    ) {

        journalLines.push({
            account_id:
                supplier.account_id,

            debit:
                paymentAmount,

            credit:
                0,

            description:
                "تسویه پرداخت خرید"
        });

        journalLines.push({
            account_id:
                payment.cash.account_id,

            debit:
                0,

            credit:
                paymentAmount,

            description:
                "پرداخت از صندوق"
        });

    } else if (
        payment.payment_method ===
        "bank"
    ) {

        journalLines.push({
            account_id:
                supplier.account_id,

            debit:
                paymentAmount,

            credit:
                0,

            description:
                "تسویه پرداخت خرید"
        });

        journalLines.push({
            account_id:
                payment.bank.account_id,

            debit:
                0,

            credit:
                paymentAmount,

            description:
                "پرداخت از بانک"
        });

    } else if (
        payment.payment_method ===
        "credit"
    ) {

        /*
         * نسیه هنوز پرداخت نشده است.
         * بنابراین هیچ بدهکار/بستانکار
         * اضافی برای پرداخت ایجاد نمی‌کنیم.
         *
         * بدهی همان credit اصلی به تأمین‌کننده
         * باقی می‌ماند.
         */
    }
}


                    const totalDebit =
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
                        );

                    const totalCredit =
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
                        );


                    if (
                        totalDebit !==
                        totalCredit
                    ) {
                        throw new Error(
                            `سند خرید متوازن نیست. بدهکار: ${totalDebit} بستانکار: ${totalCredit}`
                        );
                    }


                    createJournalEntryInTransaction(
                        db,
                        {
                            entry_date:
                                data.invoice_date,

                            reference_type:
                                "purchase_invoice",

                            reference_id:
                                purchaseId,

                            description:
                                `ثبت حسابداری فاکتور خرید ${data.invoice_number}`,

                            status:
                                "posted",

                            lines:
                                journalLines
                        }
                    );
                }


                return purchaseId;
            });


        const purchaseId =
            transaction();


       const resultDb =
    createConnection();

try {
    return getPurchaseById(
        resultDb,
        purchaseId
    );
} finally {
    resultDb.close();
}

    } finally {

        db.close();
    }
}


module.exports = {
    createPurchaseInvoice
};