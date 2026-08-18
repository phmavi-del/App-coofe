const {
    createConnection
} = require("../core/connection");

const {
    validateSalesInvoiceInput
} = require("../validation/sales.validation");

const {
    getCustomerById,
    getWarehouseById,
    getUserById,
    getProductById,
    getUnitById,
    getCashRegisterById,
    getBankAccountById,
    getTaxRate,
    getSalesByInvoiceNumber,
    insertSalesInvoice,
    insertSalesInvoiceItem,
    insertSalesPayment,
    getSalesById
} = require("../repositories/sales.repository");

const {
    convertQuantityInTransaction
} = require("./unit-conversion.service");

const {
    applyInventoryMovementInTransaction
} = require("./inventory.service");

const {
    consumeRecipeInTransaction
} = require("./recipe-consumption.service");

const {
    createJournalEntryInTransaction
} = require("./accounting.service");


function roundMoney(value) {
    return Math.round(
        Number(value) || 0
    );
}


function assertActiveCustomer(
    db,
    customerId
) {
    if (customerId === null) {
        return null;
    }

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

    return customer;
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

    if (!product.is_sellable) {
        throw new Error(
            `کالای «${product.name}» قابل فروش نیست.`
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
            "واحد فروش پیدا نشد."
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


function getAccountByCode(
    db,
    code
) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                account_type,
                normal_balance,
                is_active
            FROM accounts
            WHERE code = ?
        `)
        .get(code);
}


function calculateSalesItems(
    db,
    items
) {
    const calculatedItems = [];

    let subtotal = 0;
    let lineDiscountTotal = 0;
    let taxTotal = 0;

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

        const saleUnit =
            assertActiveUnit(
                db,
                Number(
                    item.unit_id
                )
            );

        const quantity =
            Number(
                item.quantity
            );

        const unitPrice =
            roundMoney(
                item.unit_price
            );

        const discountAmount =
            roundMoney(
                item.discount_amount ?? 0
            );

        const taxRatePercent =
            Number(
                item.tax_rate_percent ?? 0
            );

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            throw new Error(
                `مقدار «${product.name}» معتبر نیست.`
            );
        }

        if (
            !Number.isFinite(unitPrice) ||
            unitPrice < 0
        ) {
            throw new Error(
                `قیمت «${product.name}» معتبر نیست.`
            );
        }

        if (
            discountAmount < 0
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
            discountAmount >
            grossLine
        ) {
            throw new Error(
                `تخفیف «${product.name}» بیشتر از مبلغ کالا است.`
            );
        }

        const netLine =
            grossLine -
            discountAmount;

        if (
            !Number.isFinite(
                taxRatePercent
            ) ||
            taxRatePercent < 0
        ) {
            throw new Error(
                `نرخ مالیات «${product.name}» معتبر نیست.`
            );
        }

        let taxAmount = 0;

        if (
            taxRatePercent > 0
        ) {
            const tax =
                getTaxRate(
                    db,
                    taxRatePercent
                );

            if (!tax) {
                throw new Error(
                    `نرخ مالیات ${taxRatePercent}% در سیستم تعریف نشده است.`
                );
            }

            taxAmount =
                roundMoney(
                    netLine *
                    taxRatePercent /
                    100
                );
        }

        const lineTotal =
            netLine +
            taxAmount;

        subtotal += grossLine;

        lineDiscountTotal +=
            discountAmount;

        taxTotal +=
            taxAmount;

        calculatedItems.push({
            productId:
                product.id,

            productName:
                product.name,

            inventoryBehavior:
                product.inventory_behavior,

            quantity,

            unitId:
                saleUnit.id,

            unitPrice,

            discountAmount,

            taxRatePercent,

            taxAmount,

            lineTotal,

            notes:
                item.notes ?? null
        });
    }

    return {
        items:
            calculatedItems,

        subtotal:
            roundMoney(subtotal),

        lineDiscountTotal:
            roundMoney(
                lineDiscountTotal
            ),

        taxTotal:
            roundMoney(taxTotal)
    };
}


function insertCashTransaction(
    db,
    cash,
    payment,
    salesId
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
                'sale',
                ?,
                'in',
                'sales_invoice',
                ?,
                ?
            )
        `)
        .run(
            cash.id,
            payment.amount,
            salesId,
            "دریافت فروش"
        )
        .lastInsertRowid;
}


function insertBankTransaction(
    db,
    bank,
    payment,
    salesId
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
                'sale',
                ?,
                'in',
                'sales_invoice',
                ?,
                ?
            )
        `)
        .run(
            bank.id,
            payment.amount,
            salesId,
            "دریافت فروش کارت‌خوان"
        )
        .lastInsertRowid;
}


function updateCustomerTotals(
    db,
    customerId,
    totalAmount,
    paidAmount
) {
    if (customerId === null) {
        return;
    }

    db.prepare(`
        INSERT OR IGNORE INTO customer_accounts (
            customer_id,
            points_balance,
            credit_balance,
            total_purchases,
            total_paid
        )
        VALUES (?, 0, 0, 0, 0)
    `).run(customerId);

    db.prepare(`
        UPDATE customer_accounts
        SET
            total_purchases =
                total_purchases + ?,

            total_paid =
                total_paid + ?,

            updated_at =
                CURRENT_TIMESTAMP
        WHERE customer_id = ?
    `).run(
        totalAmount,
        paidAmount,
        customerId
    );
}


function insertCustomerVisit(
    db,
    customerId,
    salesId,
    amount
) {
    if (customerId === null) {
        return;
    }

    db.prepare(`
        INSERT INTO customer_visits (
            customer_id,
            reference_type,
            reference_id,
            amount,
            description
        )
        VALUES (
            ?,
            'sales_invoice',
            ?,
            ?,
            ?
        )
    `).run(
        customerId,
        salesId,
        amount,
        "ثبت فاکتور فروش"
    );
}


function createSalesInvoice(
    input
) {
    const data =
        validateSalesInvoiceInput(
            input
        );

    const db =
        createConnection();

    try {

        const transaction =
            db.transaction(() => {

                const customer =
                    assertActiveCustomer(
                        db,
                        data.customer_id
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


                if (
                    data.status ===
                    "draft" &&
                    data.payments.length > 0
                ) {
                    throw new Error(
                        "فاکتور پیش‌نویس نباید پرداخت ثبت‌شده داشته باشد."
                    );
                }


                const existing =
                    getSalesByInvoiceNumber(
                        db,
                        data.invoice_number
                    );

                if (existing) {
                    throw new Error(
                        "شماره فاکتور فروش قبلاً ثبت شده است."
                    );
                }


                const calculated =
                    calculateSalesItems(
                        db,
                        data.items
                    );


                const invoiceDiscount =
                    roundMoney(
                        data.discount_amount
                    );


                const totalDiscount =
                    calculated.lineDiscountTotal +
                    invoiceDiscount;


                const totalAmount =
                    roundMoney(
                        calculated.subtotal -
                        totalDiscount +
                        calculated.taxTotal
                    );


                if (
                    totalAmount < 0
                ) {
                    throw new Error(
                        "مبلغ نهایی فاکتور فروش معتبر نیست."
                    );
                }


                const payments = [];
                let actualPaidAmount = 0;
                let creditAmount = 0;


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

                        actualPaidAmount +=
                            amount;

                        payments.push({
                            ...payment,
                            amount,
                            cash
                        });

                    } else if (
                        payment.payment_method ===
                        "card"
                    ) {

                        const bank =
                            assertBankAccount(
                                db,
                                Number(
                                    payment.bank_account_id
                                )
                            );

                        actualPaidAmount +=
                            amount;

                        payments.push({
                            ...payment,
                            amount,
                            bank
                        });

                    } else if (
                        payment.payment_method ===
                        "credit"
                    ) {

                        if (!customer) {
                            throw new Error(
                                "فروش نسیه نیاز به مشتری دارد."
                            );
                        }

                        if (!customer.account_id) {
                            throw new Error(
                                "مشتری به حساب دریافتنی متصل نیست."
                            );
                        }

                        creditAmount +=
                            amount;

                        payments.push({
                            ...payment,
                            amount
                        });

                    } else {
                        throw new Error(
                            "روش پرداخت فروش معتبر نیست."
                        );
                    }
                }


                const paymentCoverage =
                    actualPaidAmount +
                    creditAmount;


                if (
                    paymentCoverage >
                    totalAmount
                ) {
                    throw new Error(
                        "مجموع پرداخت‌ها بیشتر از مبلغ فاکتور است."
                    );
                }


                if (
                    data.status ===
                    "completed" &&
                    paymentCoverage !==
                    totalAmount
                ) {
                    throw new Error(
                        "در فاکتور تکمیل‌شده، مجموع پرداخت و نسیه باید با مبلغ نهایی برابر باشد."
                    );
                }


                const remainingAmount =
                    totalAmount -
                    actualPaidAmount;


                const paymentStatus =
                    calculatePaymentStatus(
                        totalAmount,
                        actualPaidAmount
                    );


                const salesId =
                    insertSalesInvoice(
                        db,
                        {
                            invoice_number:
                                data.invoice_number,

                            customer_id:
                                data.customer_id,

                            warehouse_id:
                                warehouse.id,

                            created_by_user_id:
                                user.id,

                            invoice_date:
                                data.invoice_date,

                            status:
                                data.status,

                            subtotal:
                                calculated.subtotal,

                            discount_amount:
                                totalDiscount,

                            tax_amount:
                                calculated.taxTotal,

                            total_amount:
                                totalAmount,

                            paid_amount:
                                actualPaidAmount,

                            remaining_amount:
                                remainingAmount,

                            payment_status:
                                paymentStatus,

                            customer_name_snapshot:
                                customer
                                    ? customer.name
                                    : null,

                            customer_phone_snapshot:
                                customer
                                    ? customer.phone
                                    : null,

                            customer_address_snapshot:
                                customer
                                    ? customer.address
                                    : null,

                            notes:
                                data.notes,

                            reference_number:
                                data.reference_number
                        }
                    );


                let totalCostOfGoodsSold = 0;


               for (
    const item
    of calculated.items
) {

    const salesInvoiceItemId =
        insertSalesInvoiceItem(
            db,
            {
                sales_invoice_id:
                    salesId,

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


    if (
        data.status !==
        "completed"
    ) {
        continue;
    }


    if (
        item.inventoryBehavior ===
        "stock"
    ) {

        const product =
            getProductById(
                db,
                item.productId
            );

        const inventoryUnitId =
            product.unit_id;

        const inventoryQuantity =
            convertQuantityInTransaction(
                db,
                item.quantity,
                item.unitId,
                inventoryUnitId
            );

        const balance =
            db
                .prepare(`
                    SELECT
                        quantity,
                        average_cost
                    FROM inventory_balances
                    WHERE warehouse_id = ?
                      AND product_id = ?
                `)
                .get(
                    warehouse.id,
                    item.productId
                );

        const available =
            balance
                ? Number(
                    balance.quantity
                )
                : 0;

        if (
            available <
            inventoryQuantity
        ) {
            throw new Error(
                `موجودی «${item.productName}» کافی نیست. موجودی: ${available}، نیاز: ${inventoryQuantity}`
            );
        }

        const averageCost =
            balance
                ? Number(
                    balance.average_cost
                )
                : 0;

        totalCostOfGoodsSold +=
            inventoryQuantity *
            averageCost;


        applyInventoryMovementInTransaction(
            db,
            {
                warehouse_id:
                    warehouse.id,

                product_id:
                    item.productId,

                movement_type:
                    "sale",

                quantity:
                    inventoryQuantity,

                unit_cost:
                    Math.round(
                        averageCost
                    ),

                reference_type:
                    "sales_invoice",

                reference_id:
                    salesId,

                sales_invoice_item_id:
                    salesInvoiceItemId,

                description:
                    `خروج فروش: ${data.invoice_number}`
            }
        );

    } else if (
        item.inventoryBehavior ===
        "recipe"
    ) {

        const recipe =
            db
                .prepare(`
                    SELECT
                        yield_unit_id
                    FROM recipes
                    WHERE product_id = ?
                      AND status = 'active'
                    LIMIT 1
                `)
                .get(
                    item.productId
                );

        if (!recipe) {
            throw new Error(
                `برای «${item.productName}» Recipe فعال پیدا نشد.`
            );
        }


        const recipeQuantity =
            convertQuantityInTransaction(
                db,
                item.quantity,
                item.unitId,
                recipe.yield_unit_id
            );


        const consumption =
            consumeRecipeInTransaction(
                db,
                {
                    product_id:
                        item.productId,

                    warehouse_id:
                        warehouse.id,

                    quantity:
                        recipeQuantity,

                    reference_type:
                        "sales_invoice",

                    reference_id:
                        salesId,

                    sales_invoice_item_id:
                        salesInvoiceItemId
                }
            );


        totalCostOfGoodsSold +=
            Number(
                consumption.totalCost
            );
    }
}


                /*
                 * ثبت پرداخت‌ها
                 */

                for (
                    const payment
                    of payments
                ) {

                                           insertSalesPayment(
                            db,
                            {
                                sales_invoice_id:
                                    salesId,

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

                                terminal_reference:
                                    payment.terminal_reference ??
                                    null,

                                notes:
                                    payment.notes ??
                                    null,

                                is_actual_payment:
    payment.payment_method === "credit"
        ? 0
        : 1
                            }
                        );


                    if (
                        payment.payment_method ===
                        "cash"
                    ) {

                        insertCashTransaction(
                            db,
                            payment.cash,
                            payment,
                            salesId
                        );

                    } else if (
                        payment.payment_method ===
                        "card"
                    ) {

                        insertBankTransaction(
                            db,
                            payment.bank,
                            payment,
                            salesId
                        );
                    }
                }


                /*
                 * به‌روزرسانی آمار مشتری
                 */

                if (
                    data.status ===
                    "completed" &&
                    customer
                ) {

                    updateCustomerTotals(
                        db,
                        customer.id,
                        totalAmount,
                        actualPaidAmount
                    );

                    insertCustomerVisit(
                        db,
                        customer.id,
                        salesId,
                        totalAmount
                    );
                }


                /*
                 * سند حسابداری
                 */

                if (
                    data.status ===
                    "completed"
                ) {

                    const salesAccount =
                        getAccountByCode(
                            db,
                            "401"
                        );

                    const taxAccount =
                        getAccountByCode(
                            db,
                            "203"
                        );

                    const cogsAccount =
                        getAccountByCode(
                            db,
                            "502"
                        );

                    if (!salesAccount) {
                        throw new Error(
                            "حساب فروش 401 پیدا نشد."
                        );
                    }

                    if (
                        calculated.taxTotal > 0 &&
                        !taxAccount
                    ) {
                        throw new Error(
                            "حساب مالیات فروش 203 پیدا نشد."
                        );
                    }


                    if (
                        totalCostOfGoodsSold > 0 &&
                        !cogsAccount
                    ) {
                        throw new Error(
                            "حساب بهای تمام‌شده 502 پیدا نشد."
                        );
                    }


                    const journalLines = [];


                    /*
                     * دریافت:
                     * صندوق / بانک / حساب دریافتنی
                     */

                    for (
                        const payment
                        of payments
                    ) {

                        if (
                            payment.payment_method ===
                            "cash"
                        ) {

                            journalLines.push({
                                account_id:
                                    payment.cash.account_id,

                                debit:
                                    payment.amount,

                                credit:
                                    0,

                                description:
                                    "دریافت نقدی فروش"
                            });

                        } else if (
                            payment.payment_method ===
                            "card"
                        ) {

                            journalLines.push({
                                account_id:
                                    payment.bank.account_id,

                                debit:
                                    payment.amount,

                                credit:
                                    0,

                                description:
                                    "دریافت کارت‌خوان"
                            });
                        }
                    }


                    if (
                        creditAmount > 0
                    ) {

                        journalLines.push({
                            account_id:
                                customer.account_id,

                            debit:
                                creditAmount,

                            credit:
                                0,

                            description:
                                "ایجاد بدهی مشتری"
                        });
                    }


                    /*
                     * درآمد
                     */

                    const netRevenue =
                        calculated.subtotal -
                        totalDiscount;


                    if (
                        netRevenue > 0
                    ) {

                        journalLines.push({
                            account_id:
                                salesAccount.id,

                            debit:
                                0,

                            credit:
                                netRevenue,

                            description:
                                "درآمد فروش"
                        });
                    }


                    /*
                     * مالیات فروش
                     */

                    if (
                        calculated.taxTotal > 0
                    ) {

                        journalLines.push({
                            account_id:
                                taxAccount.id,

                            debit:
                                0,

                            credit:
                                calculated.taxTotal,

                            description:
                                "مالیات و ارزش افزوده فروش"
                        });
                    }


                    /*
                     * بهای تمام‌شده
                     */

                    const roundedCOGS =
                        roundMoney(
                            totalCostOfGoodsSold
                        );

                    if (
                        roundedCOGS > 0
                    ) {

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


                        journalLines.push({
                            account_id:
                                cogsAccount.id,

                            debit:
                                roundedCOGS,

                            credit:
                                0,

                            description:
                                "بهای تمام‌شده فروش"
                        });


                        journalLines.push({
                            account_id:
                                inventoryAccount.account_id,

                            debit:
                                0,

                            credit:
                                roundedCOGS,

                            description:
                                "کاهش موجودی ناشی از فروش"
                        });
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
                            `سند فروش متوازن نیست. بدهکار: ${totalDebit}، بستانکار: ${totalCredit}`
                        );
                    }


                    createJournalEntryInTransaction(
                        db,
                        {
                            entry_date:
                                data.invoice_date,

                            reference_type:
                                "sales_invoice",

                            reference_id:
                                salesId,

                            description:
                                `ثبت حسابداری فاکتور فروش ${data.invoice_number}`,

                            status:
                                "posted",

                            lines:
                                journalLines
                        }
                    );
                }


                return salesId;
            });


        const salesId =
            transaction();


        const resultDb =
            createConnection();

        try {
            return getSalesById(
                resultDb,
                salesId
            );
        } finally {
            resultDb.close();
        }

    } finally {
        db.close();
    }
}


module.exports = {
    createSalesInvoice
};