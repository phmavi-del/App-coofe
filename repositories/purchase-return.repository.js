function getPurchaseById(
    db,
    purchaseId
) {
    const invoice =
        db
            .prepare(`
                SELECT
                    pi.*,

                    s.code AS supplier_code,
                    s.name AS supplier_name,
                    s.account_id AS supplier_account_id,

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
            .get(
                purchaseId
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
                    pii.*,

                    p.code AS product_code,
                    p.name AS product_name,
                    p.track_inventory,

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
            .all(
                purchaseId
            );


    const payments =
        db
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
            .all(
                purchaseId
            );


    return {
        ...invoice,
        items,
        payments
    };
}


function getPurchaseInvoiceItemForReturn(
    db,
    purchaseInvoiceId,
    productId
) {
    return db
        .prepare(`
            SELECT
                pii.id,
                pii.purchase_invoice_id,
                pii.product_id,
                pii.quantity,
                pii.unit_id,
                pii.unit_price,
                pii.discount_amount,
                pii.tax_rate_percent,
                pii.tax_amount,
                pii.line_total,
                pii.notes,

                p.name AS product_name,
                p.code AS product_code,
                p.track_inventory,
                p.is_active,

                u.name AS unit_name,
                u.symbol AS unit_symbol

            FROM purchase_invoice_items pii

            INNER JOIN products p
                ON p.id = pii.product_id

            INNER JOIN units u
                ON u.id = pii.unit_id

            WHERE
                pii.purchase_invoice_id = ?

                AND pii.product_id = ?

            ORDER BY pii.id

            LIMIT 1
        `)
        .get(
            purchaseInvoiceId,
            productId
        );
}


function getPreviousReturnedQuantity(
    db,
    purchaseInvoiceId,
    productId
) {
    const result =
        db
            .prepare(`
                SELECT
                    COALESCE(
                        SUM(
                            pri.quantity
                        ),
                        0
                    ) AS returned_quantity

                FROM purchase_return_items pri

                INNER JOIN purchase_returns pr
                    ON pr.id =
                       pri.purchase_return_id

                WHERE
                    pr.purchase_invoice_id = ?

                    AND pri.product_id = ?

                    AND pr.status = 'completed'
            `)
            .get(
                purchaseInvoiceId,
                productId
            );


    return Number(
        result.returned_quantity || 0
    );
}


function getPreviousReturnedTotal(
    db,
    purchaseInvoiceId,
    productId
) {
    const result =
        db
            .prepare(`
                SELECT
                    COALESCE(
                        SUM(
                            pri.total_amount
                        ),
                        0
                    ) AS returned_total

                FROM purchase_return_items pri

                INNER JOIN purchase_returns pr
                    ON pr.id =
                       pri.purchase_return_id

                WHERE
                    pr.purchase_invoice_id = ?

                    AND pri.product_id = ?

                    AND pr.status = 'completed'
            `)
            .get(
                purchaseInvoiceId,
                productId
            );


    return Number(
        result.returned_total || 0
    );
}


function getPurchaseReturnByNumber(
    db,
    returnNumber
) {
    return db
        .prepare(`
            SELECT
                id,
                return_number,
                purchase_invoice_id,
                supplier_id,
                warehouse_id,
                status,
                return_date,
                total_amount,
                notes
            FROM purchase_returns
            WHERE return_number = ?
        `)
        .get(
            returnNumber
        );
}


function insertPurchaseReturn(
    db,
    returnData
) {
    const result =
        db
            .prepare(`
                INSERT INTO purchase_returns (
                    return_number,
                    purchase_invoice_id,
                    supplier_id,
                    warehouse_id,
                    status,
                    return_date,
                    total_amount,
                    notes,
                    created_by_user_id
                )
                VALUES (
                    @return_number,
                    @purchase_invoice_id,
                    @supplier_id,
                    @warehouse_id,
                    @status,
                    @return_date,
                    @total_amount,
                    @notes,
                    @created_by_user_id
                )
            `)
            .run({
                return_number:
                    returnData.return_number,

                purchase_invoice_id:
                    returnData.purchase_invoice_id,

                supplier_id:
                    returnData.supplier_id,

                warehouse_id:
                    returnData.warehouse_id,

                status:
                    returnData.status,

                return_date:
                    returnData.return_date,

                total_amount:
                    returnData.total_amount,

                notes:
                    returnData.notes ??
                    null,

                created_by_user_id:
                    returnData.created_by_user_id
            });


    return result.lastInsertRowid;
}


function insertPurchaseReturnItem(
    db,
    item
) {
    const result =
        db
            .prepare(`
                INSERT INTO purchase_return_items (
                    purchase_return_id,
                    product_id,
                    quantity,
                    unit_id,
                    unit_price,
                    total_amount
                )
                VALUES (
                    @purchase_return_id,
                    @product_id,
                    @quantity,
                    @unit_id,
                    @unit_price,
                    @total_amount
                )
            `)
            .run({
                purchase_return_id:
                    item.purchase_return_id,

                product_id:
                    item.product_id,

                quantity:
                    item.quantity,

                unit_id:
                    item.unit_id,

                unit_price:
                    item.unit_price,

                total_amount:
                    item.total_amount
            });


    return result.lastInsertRowid;
}


function updatePurchaseInvoiceAfterReturn(
    db,
    purchaseInvoiceId,
    totalAmount,
    paidAmount,
    remainingAmount,
    paymentStatus,
    status
) {
    db.prepare(`
        UPDATE purchase_invoices
        SET
            total_amount = ?,

            paid_amount = ?,

            remaining_amount = ?,

            payment_status = ?,

            status = ?,

            updated_at =
                CURRENT_TIMESTAMP

        WHERE id = ?
    `).run(
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentStatus,
        status,
        purchaseInvoiceId
    );
}


function getPurchaseReturnById(
    db,
    returnId
) {
    const header =
        db
            .prepare(`
                SELECT
                    pr.*,

                    s.code AS supplier_code,
                    s.name AS supplier_name,

                    w.name AS warehouse_name,

                    u.full_name AS created_by_name

                FROM purchase_returns pr

                LEFT JOIN suppliers s
                    ON s.id = pr.supplier_id

                INNER JOIN warehouses w
                    ON w.id = pr.warehouse_id

                LEFT JOIN users u
                    ON u.id =
                       pr.created_by_user_id

                WHERE pr.id = ?
            `)
            .get(
                returnId
            );


    if (
        !header
    ) {
        return null;
    }


    const items =
        db
            .prepare(`
                SELECT
                    pri.*,

                    p.code AS product_code,
                    p.name AS product_name,

                    u.name AS unit_name,
                    u.symbol AS unit_symbol

                FROM purchase_return_items pri

                INNER JOIN products p
                    ON p.id = pri.product_id

                INNER JOIN units u
                    ON u.id = pri.unit_id

                WHERE
                    pri.purchase_return_id = ?

                ORDER BY pri.id
            `)
            .all(
                returnId
            );


    return {
        ...header,
        items
    };
}


module.exports = {
    getPurchaseById,
    getPurchaseInvoiceItemForReturn,
    getPreviousReturnedQuantity,
    getPreviousReturnedTotal,
    getPurchaseReturnByNumber,
    insertPurchaseReturn,
    insertPurchaseReturnItem,
    updatePurchaseInvoiceAfterReturn,
    getPurchaseReturnById
};