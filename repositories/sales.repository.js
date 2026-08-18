function getCustomerById(
    db,
    customerId
) {
    if (
        customerId === null
    ) {
        return null;
    }

    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                phone,
                address,
                account_id,
                credit_limit,
                is_active
            FROM customers
            WHERE id = ?
        `)
        .get(
            customerId
        );
}


function getWarehouseById(
    db,
    warehouseId
) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                account_id,
                is_active
            FROM warehouses
            WHERE id = ?
        `)
        .get(
            warehouseId
        );
}


function getUserById(
    db,
    userId
) {
    return db
        .prepare(`
            SELECT
                id,
                username,
                full_name,
                is_active,
                is_locked
            FROM users
            WHERE id = ?
        `)
        .get(
            userId
        );
}


function getProductById(
    db,
    productId
) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                product_type,
                unit_id,
                sale_price,
                is_active,
                is_sellable,
                track_inventory,
                inventory_behavior
            FROM products
            WHERE id = ?
        `)
        .get(
            productId
        );
}


function getUnitById(
    db,
    unitId
) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                symbol,
                decimal_places,
                is_active
            FROM units
            WHERE id = ?
        `)
        .get(
            unitId
        );
}


function getCashRegisterById(
    db,
    cashRegisterId
) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                account_id,
                is_active
            FROM cash_registers
            WHERE id = ?
        `)
        .get(
            cashRegisterId
        );
}


function getBankAccountById(
    db,
    bankAccountId
) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                account_id,
                is_active
            FROM bank_accounts
            WHERE id = ?
        `)
        .get(
            bankAccountId
        );
}


function getTaxRate(
    db,
    ratePercent
) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                rate_percent,
                is_active
            FROM tax_rates
            WHERE rate_percent = ?
              AND is_active = 1
            ORDER BY id
            LIMIT 1
        `)
        .get(
            ratePercent
        );
}


function getSalesByInvoiceNumber(
    db,
    invoiceNumber
) {
    return db
        .prepare(`
            SELECT
                id,
                invoice_number,
                customer_id,
                warehouse_id,
                status,
                total_amount,
                paid_amount,
                remaining_amount,
                payment_status
            FROM sales_invoices
            WHERE invoice_number = ?
        `)
        .get(
            invoiceNumber
        );
}


function insertSalesInvoice(
    db,
    invoice
) {
    const result =
        db
            .prepare(`
                INSERT INTO sales_invoices (
                    invoice_number,
                    customer_id,
                    warehouse_id,
                    created_by_user_id,
                    invoice_date,
                    status,
                    subtotal,
                    discount_amount,
                    tax_amount,
                    total_amount,
                    paid_amount,
                    remaining_amount,
                    payment_status,
                    customer_name_snapshot,
                    customer_phone_snapshot,
                    customer_address_snapshot,
                    notes,
                    reference_number
                )
                VALUES (
                    @invoice_number,
                    @customer_id,
                    @warehouse_id,
                    @created_by_user_id,
                    @invoice_date,
                    @status,
                    @subtotal,
                    @discount_amount,
                    @tax_amount,
                    @total_amount,
                    @paid_amount,
                    @remaining_amount,
                    @payment_status,
                    @customer_name_snapshot,
                    @customer_phone_snapshot,
                    @customer_address_snapshot,
                    @notes,
                    @reference_number
                )
            `)
            .run({
                invoice_number:
                    invoice.invoice_number,

                customer_id:
                    invoice.customer_id,

                warehouse_id:
                    invoice.warehouse_id,

                created_by_user_id:
                    invoice.created_by_user_id,

                invoice_date:
                    invoice.invoice_date,

                status:
                    invoice.status,

                subtotal:
                    invoice.subtotal,

                discount_amount:
                    invoice.discount_amount,

                tax_amount:
                    invoice.tax_amount,

                total_amount:
                    invoice.total_amount,

                paid_amount:
                    invoice.paid_amount,

                remaining_amount:
                    invoice.remaining_amount,

                payment_status:
                    invoice.payment_status,

                customer_name_snapshot:
                    invoice.customer_name_snapshot,

                customer_phone_snapshot:
                    invoice.customer_phone_snapshot,

                customer_address_snapshot:
                    invoice.customer_address_snapshot,

                notes:
                    invoice.notes,

                reference_number:
                    invoice.reference_number
            });

    return result.lastInsertRowid;
}


function insertSalesInvoiceItem(
    db,
    item
) {
    const result =
        db
            .prepare(`
                INSERT INTO sales_invoice_items (
                    sales_invoice_id,
                    product_id,
                    quantity,
                    unit_id,
                    unit_price,
                    discount_amount,
                    tax_rate_percent,
                    tax_amount,
                    line_total,
                    notes
                )
                VALUES (
                    @sales_invoice_id,
                    @product_id,
                    @quantity,
                    @unit_id,
                    @unit_price,
                    @discount_amount,
                    @tax_rate_percent,
                    @tax_amount,
                    @line_total,
                    @notes
                )
            `)
            .run({
                sales_invoice_id:
                    item.sales_invoice_id,

                product_id:
                    item.product_id,

                quantity:
                    item.quantity,

                unit_id:
                    item.unit_id,

                unit_price:
                    item.unit_price,

                discount_amount:
                    item.discount_amount,

                tax_rate_percent:
                    item.tax_rate_percent,

                tax_amount:
                    item.tax_amount,

                line_total:
                    item.line_total,

                notes:
                    item.notes ??
                    null
            });

    return result.lastInsertRowid;
}


function insertSalesPayment(
    db,
    payment
) {
    const result =
        db
            .prepare(`
                INSERT INTO sales_payments (
                    sales_invoice_id,
                    payment_method,
                    cash_register_id,
                    bank_account_id,
                    amount,
                    payment_date,
                    reference_number,
                    terminal_reference,
                    notes,
                    is_actual_payment
                )
                VALUES (
                    @sales_invoice_id,
                    @payment_method,
                    @cash_register_id,
                    @bank_account_id,
                    @amount,
                    COALESCE(
                        @payment_date,
                        CURRENT_TIMESTAMP
                    ),
                    @reference_number,
                    @terminal_reference,
                    @notes,
                    @is_actual_payment
                )
            `)
            .run({
                sales_invoice_id:
                    payment.sales_invoice_id,

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
                    payment.is_actual_payment ??
                    1
            });

    return result.lastInsertRowid;
}


function getSalesById(
    db,
    salesId
) {
    const invoice =
        db
            .prepare(`
                SELECT
                    si.*,

                    c.code AS customer_code,

                    COALESCE(
                        si.customer_name_snapshot,
                        c.name
                    ) AS customer_name,

                    COALESCE(
                        si.customer_phone_snapshot,
                        c.phone
                    ) AS customer_phone,

                    COALESCE(
                        si.customer_address_snapshot,
                        c.address
                    ) AS customer_address,

                    w.name AS warehouse_name,

                    u.full_name AS created_by_name

                FROM sales_invoices si

                LEFT JOIN customers c
                    ON c.id = si.customer_id

                INNER JOIN warehouses w
                    ON w.id = si.warehouse_id

                INNER JOIN users u
                    ON u.id = si.created_by_user_id

                WHERE si.id = ?
            `)
            .get(
                salesId
            );

    if (
        !invoice
    ) {
        return null;
    }


    const items =
        db
            .prepare(`
                SELECT
                    sii.*,

                    p.code AS product_code,

                    p.name AS product_name,

                    u.name AS unit_name,

                    u.symbol AS unit_symbol

                FROM sales_invoice_items sii

                INNER JOIN products p
                    ON p.id = sii.product_id

                INNER JOIN units u
                    ON u.id = sii.unit_id

                WHERE sii.sales_invoice_id = ?

                ORDER BY sii.id
            `)
            .all(
                salesId
            );


    const payments =
        db
            .prepare(`
                SELECT
                    sp.*,

                    cr.name AS cash_register_name,

                    ba.name AS bank_account_name

                FROM sales_payments sp

                LEFT JOIN cash_registers cr
                    ON cr.id = sp.cash_register_id

                LEFT JOIN bank_accounts ba
                    ON ba.id = sp.bank_account_id

                WHERE sp.sales_invoice_id = ?

                ORDER BY sp.id
            `)
            .all(
                salesId
            );


    return {
        ...invoice,
        items,
        payments
    };
}


function getSalesInvoiceItemById(
    db,
    salesInvoiceItemId
) {
    return db
        .prepare(`
            SELECT
                sii.id,
                sii.sales_invoice_id,
                sii.product_id,
                sii.quantity,
                sii.unit_id,
                sii.unit_price,
                sii.discount_amount,
                sii.tax_rate_percent,
                sii.tax_amount,
                sii.line_total,
                sii.notes,

                si.invoice_number,
                si.customer_id,
                si.warehouse_id,
                si.status AS invoice_status,
                si.total_amount AS invoice_total_amount,

                p.code AS product_code,
                p.name AS product_name,
                p.inventory_behavior,
                p.track_inventory,

                u.name AS unit_name,
                u.symbol AS unit_symbol

            FROM sales_invoice_items sii

            INNER JOIN sales_invoices si
                ON si.id = sii.sales_invoice_id

            INNER JOIN products p
                ON p.id = sii.product_id

            INNER JOIN units u
                ON u.id = sii.unit_id

            WHERE sii.id = ?
        `)
        .get(
            salesInvoiceItemId
        );
}


function getReturnedQuantityForInvoiceItem(
    db,
    salesInvoiceItemId
) {
    const result =
        db
            .prepare(`
                SELECT
                    COALESCE(
                        SUM(sri.quantity),
                        0
                    ) AS returned_quantity

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

    return Number(
        result.returned_quantity || 0
    );
}


function getSalesReturnByNumber(
    db,
    returnNumber
) {
    return db
        .prepare(`
            SELECT
                id,
                return_number,
                sales_invoice_id,
                customer_id,
                warehouse_id,
                created_by_user_id,
                return_date,
                status,
                total_amount,
                refund_amount,
                refund_status,
                notes
            FROM sales_returns
            WHERE return_number = ?
        `)
        .get(
            returnNumber
        );
}


function insertSalesReturn(
    db,
    returnData
) {
    const result =
        db
            .prepare(`
                INSERT INTO sales_returns (
                    return_number,
                    sales_invoice_id,
                    customer_id,
                    warehouse_id,
                    created_by_user_id,
                    return_date,
                    status,
                    total_amount,
                    refund_amount,
                    refund_status,
                    notes
                )
                VALUES (
                    @return_number,
                    @sales_invoice_id,
                    @customer_id,
                    @warehouse_id,
                    @created_by_user_id,
                    @return_date,
                    @status,
                    @total_amount,
                    @refund_amount,
                    @refund_status,
                    @notes
                )
            `)
            .run({
                return_number:
                    returnData.return_number,

                sales_invoice_id:
                    returnData.sales_invoice_id,

                customer_id:
                    returnData.customer_id,

                warehouse_id:
                    returnData.warehouse_id,

                created_by_user_id:
                    returnData.created_by_user_id,

                return_date:
                    returnData.return_date,

                status:
                    returnData.status,

                total_amount:
                    returnData.total_amount,

                refund_amount:
                    returnData.refund_amount,

                refund_status:
                    returnData.refund_status,

                notes:
                    returnData.notes ??
                    null
            });

    return result.lastInsertRowid;
}


function insertSalesReturnItem(
    db,
    item
) {
    const result =
        db
            .prepare(`
                INSERT INTO sales_return_items (
                    sales_return_id,
                    sales_invoice_item_id,
                    product_id,
                    quantity,
                    unit_id,
                    unit_price,
                    discount_amount,
                    tax_amount,
                    line_total
                )
                VALUES (
                    @sales_return_id,
                    @sales_invoice_item_id,
                    @product_id,
                    @quantity,
                    @unit_id,
                    @unit_price,
                    @discount_amount,
                    @tax_amount,
                    @line_total
                )
            `)
            .run({
                sales_return_id:
                    item.sales_return_id,

                sales_invoice_item_id:
                    item.sales_invoice_item_id,

                product_id:
                    item.product_id,

                quantity:
                    item.quantity,

                unit_id:
                    item.unit_id,

                unit_price:
                    item.unit_price,

                discount_amount:
                    item.discount_amount,

                tax_amount:
                    item.tax_amount,

                line_total:
                    item.line_total
            });

    return result.lastInsertRowid;
}


function insertSalesReturnPayment(
    db,
    payment
) {
    const result =
        db
            .prepare(`
                INSERT INTO sales_return_payments (
                    sales_return_id,
                    payment_method,
                    cash_register_id,
                    bank_account_id,
                    amount,
                    payment_date,
                    reference_number,
                    terminal_reference,
                    notes
                )
                VALUES (
                    @sales_return_id,
                    @payment_method,
                    @cash_register_id,
                    @bank_account_id,
                    @amount,
                    COALESCE(
                        @payment_date,
                        CURRENT_TIMESTAMP
                    ),
                    @reference_number,
                    @terminal_reference,
                    @notes
                )
            `)
            .run({
                sales_return_id:
                    payment.sales_return_id,

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
                    null
            });

    return result.lastInsertRowid;
}


module.exports = {
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
    getSalesById,
    getSalesInvoiceItemById,
    getReturnedQuantityForInvoiceItem,
    getSalesReturnByNumber,
    insertSalesReturn,
    insertSalesReturnItem,
    insertSalesReturnPayment
};