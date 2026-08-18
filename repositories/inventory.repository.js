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
                is_main,
                is_active
            FROM warehouses
            WHERE id = ?
        `)
        .get(warehouseId);
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
                track_inventory,
                is_active
            FROM products
            WHERE id = ?
        `)
        .get(productId);
}


function getInventoryBalance(
    db,
    warehouseId,
    productId
) {
    return db
        .prepare(`
            SELECT *
            FROM inventory_balances
            WHERE warehouse_id = ?
              AND product_id = ?
        `)
        .get(
            warehouseId,
            productId
        );
}


function ensureInventoryBalance(
    db,
    warehouseId,
    productId
) {
    db.prepare(`
        INSERT OR IGNORE INTO inventory_balances (
            warehouse_id,
            product_id,
            quantity,
            reserved_quantity,
            average_cost
        )
        VALUES (?, ?, 0, 0, 0)
    `).run(
        warehouseId,
        productId
    );

    return getInventoryBalance(
        db,
        warehouseId,
        productId
    );
}


function insertInventoryMovement(
    db,
    movement
) {
    const result =
        db
            .prepare(`
                INSERT INTO inventory_movements (
                    warehouse_id,
                    product_id,
                    movement_type,
                    quantity,
                    unit_cost,
                    reference_type,
                    reference_id,
                    sales_invoice_item_id,
                    transfer_id,
                    description,
                    movement_date
                )
                VALUES (
                    @warehouse_id,
                    @product_id,
                    @movement_type,
                    @quantity,
                    @unit_cost,
                    @reference_type,
                    @reference_id,
                    @sales_invoice_item_id,
                    @transfer_id,
                    @description,
                    COALESCE(
                        @movement_date,
                        CURRENT_TIMESTAMP
                    )
                )
            `)
            .run({
                warehouse_id:
                    movement.warehouse_id,

                product_id:
                    movement.product_id,

                movement_type:
                    movement.movement_type,

                quantity:
                    movement.quantity,

                unit_cost:
                    movement.unit_cost ?? 0,

                reference_type:
                    movement.reference_type ?? null,

                reference_id:
                    movement.reference_id ?? null,

                sales_invoice_item_id:
                    movement.sales_invoice_item_id ??
                    null,

                transfer_id:
                    movement.transfer_id ?? null,

                description:
                    movement.description ?? null,

                movement_date:
                    movement.movement_date ?? null
            });

    return result.lastInsertRowid;
}


function updateInventoryBalance(
    db,
    warehouseId,
    productId,
    quantity,
    averageCost
) {
    db.prepare(`
        UPDATE inventory_balances
        SET
            quantity = ?,
            average_cost = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE warehouse_id = ?
          AND product_id = ?
    `).run(
        quantity,
        averageCost,
        warehouseId,
        productId
    );
}


function getInventoryMovementsByReference(
    db,
    referenceType,
    referenceId
) {
    return db
        .prepare(`
            SELECT
                id,
                warehouse_id,
                product_id,
                movement_type,
                quantity,
                unit_cost,
                reference_type,
                reference_id,
                sales_invoice_item_id,
                transfer_id,
                description,
                movement_date,
                created_at
            FROM inventory_movements
            WHERE reference_type = ?
              AND reference_id = ?
            ORDER BY id
        `)
        .all(
            referenceType,
            referenceId
        );
}


function getInventoryMovementsBySalesInvoiceItem(
    db,
    salesInvoiceItemId
) {
    return db
        .prepare(`
            SELECT
                id,
                warehouse_id,
                product_id,
                movement_type,
                quantity,
                unit_cost,
                reference_type,
                reference_id,
                sales_invoice_item_id,
                transfer_id,
                description,
                movement_date,
                created_at
            FROM inventory_movements
            WHERE sales_invoice_item_id = ?
              AND reference_type = 'sales_invoice'
              AND movement_type IN (
                  'sale',
                  'production_out'
              )
            ORDER BY id
        `)
        .all(
            salesInvoiceItemId
        );
}


module.exports = {
    getWarehouseById,
    getProductById,
    getInventoryBalance,
    ensureInventoryBalance,
    insertInventoryMovement,
    updateInventoryBalance,
    getInventoryMovementsByReference,
    getInventoryMovementsBySalesInvoiceItem
};