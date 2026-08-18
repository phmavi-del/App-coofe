function getSupplierById(
    db,
    supplierId
) {
    if (supplierId === null) {
        return null;
    }

    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                account_id,
                credit_limit,
                is_active
            FROM suppliers
            WHERE id = ?
        `)
        .get(supplierId);
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
        .get(warehouseId);
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
        .get(userId);
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
                unit_id,
                purchase_price,
                is_active,
                is_purchasable,
                track_inventory
            FROM products
            WHERE id = ?
        `)
        .get(productId);
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
        .get(unitId);
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
        .get(cashRegisterId);
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
        .get(bankAccountId);
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
        .get(ratePercent);
}


function getPurchaseByInvoiceNumber(
    db,
    invoiceNumber
) {
    return db
        .prepare(`
            SELECT
                id,
                invoice_number,
                supplier_id,
                warehouse_id,
                status,
                total_amount,
                paid_amount,
                remaining_amount
            FROM purchase_invoices
            WHERE invoice_number = ?
        `)
        .get(invoiceNumber);
}


function getNextPurchaseInvoiceId(
    db
) {
    const row = db
        .prepare(`
            SELECT
                COALESCE(
                    MAX(id),
                    0
                ) + 1 AS next_id
            FROM purchase_invoices
        `)
        .get();

    return row.next_id;
}


function insertPurchaseInvoice(
    db,
    invoice
) {
    const result = db
        .prepare(`
            INSERT INTO purchase_invoices (
                invoice_number,
                supplier_id,
                warehouse_id,
                status,
                invoice_date,
                subtotal,
                discount_amount,
                tax_amount,
                total_amount,
                paid_amount,
                remaining_amount,
                payment_status,
                notes,
                reference_number,
                created_by_user_id
            )
            VALUES (
                @invoice_number,
                @supplier_id,
                @warehouse_id,
                @status,
                @invoice_date,
                @subtotal,
                @discount_amount,
                @tax_amount,
                @total_amount,
                @paid_amount,
                @remaining_amount,
                @payment_status,
                @notes,
                @reference_number,
                @created_by_user_id
            )
        `)
        .run({
            invoice_number:
                invoice.invoice_number,

            supplier_id:
                invoice.supplier_id,

            warehouse_id:
                invoice.warehouse_id,

            status:
                invoice.status,

            invoice_date:
                invoice.invoice_date,

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

            notes:
                invoice.notes,

            reference_number:
                invoice.reference_number,

            created_by_user_id:
                invoice.created_by_user_id
        });

    return result.lastInsertRowid;
}


function insertPurchaseInvoiceItem(
    db,
    item
) {
    const result = db
        .prepare(`
            INSERT INTO purchase_invoice_items (
                purchase_invoice_id,
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
                @purchase_invoice_id,
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
            purchase_invoice_id:
                item.purchase_invoice_id,

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
                item.notes ?? null
        });

    return result.lastInsertRowid;
}


function insertPurchasePayment(
    db,
    payment
) {
    const result = db
        .prepare(`
            INSERT INTO purchase_payments (
                purchase_invoice_id,
                payment_method,
                cash_register_id,
                bank_account_id,
                amount,
                payment_date,
                reference_number,
                notes
            )
            VALUES (
                @purchase_invoice_id,
                @payment_method,
                @cash_register_id,
                @bank_account_id,
                @amount,
                COALESCE(
                    @payment_date,
                    CURRENT_TIMESTAMP
                ),
                @reference_number,
                @notes
            )
        `)
        .run({
            purchase_invoice_id:
                payment.purchase_invoice_id,

            payment_method:
                payment.payment_method,

            cash_register_id:
                payment.cash_register_id,

            bank_account_id:
                payment.bank_account_id,

            amount:
                payment.amount,

            payment_date:
                payment.payment_date ?? null,

            reference_number:
                payment.reference_number ?? null,

            notes:
                payment.notes ?? null
        });

    return result.lastInsertRowid;
}


function getPurchaseById(
    db,
    purchaseId
) {
    const invoice = db
        .prepare(`
            SELECT
                pi.*,
                s.name AS supplier_name,
                s.code AS supplier_code,
                w.name AS warehouse_name,
                u.full_name AS created_by_name
            FROM purchase_invoices pi

            LEFT JOIN suppliers s
                ON s.id = pi.supplier_id

            INNER JOIN warehouses w
                ON w.id = pi.warehouse_id

            INNER JOIN users u
                ON u.id = pi.created_by_user_id

            WHERE pi.id = ?
        `)
        .get(purchaseId);

    if (!invoice) {
        return null;
    }

    const items = db
        .prepare(`
            SELECT
                pii.*,
                p.code AS product_code,
                p.name AS product_name,
                u.name AS unit_name,
                u.symbol AS unit_symbol
            FROM purchase_invoice_items pii

            INNER JOIN products p
                ON p.id = pii.product_id

            INNER JOIN units u
                ON u.id = pii.unit_id

            WHERE pii.purchase_invoice_id = ?

            ORDER BY pii.id
        `)
        .all(purchaseId);

    const payments = db
        .prepare(`
            SELECT
                pp.*,
                cr.name AS cash_register_name,
                ba.name AS bank_account_name
            FROM purchase_payments pp

            LEFT JOIN cash_registers cr
                ON cr.id = pp.cash_register_id

            LEFT JOIN bank_accounts ba
                ON ba.id = pp.bank_account_id

            WHERE pp.purchase_invoice_id = ?

            ORDER BY pp.id
        `)
        .all(purchaseId);

    return {
        ...invoice,
        items,
        payments
    };
}


module.exports = {
    getSupplierById,
    getWarehouseById,
    getUserById,
    getProductById,
    getUnitById,
    getCashRegisterById,
    getBankAccountById,
    getTaxRate,
    getPurchaseByInvoiceNumber,
    getNextPurchaseInvoiceId,
    insertPurchaseInvoice,
    insertPurchaseInvoiceItem,
    insertPurchasePayment,
    getPurchaseById
};