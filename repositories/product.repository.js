const {
    createConnection
} = require("../core/connection");


function getProductById(
    db,
    productId
) {
    return db
        .prepare(
            `
            SELECT
                p.*,
                c.name AS category_name,
                c.icon AS category_icon,
                u.name AS unit_name,
                u.symbol AS unit_symbol
            FROM products p
            LEFT JOIN categories c
                ON c.id = p.category_id
            INNER JOIN units u
                ON u.id = p.unit_id
            WHERE p.id = ?
            `
        )
        .get(productId);
}


function getProductByCode(
    db,
    code
) {
    return db
        .prepare(
            `
            SELECT *
            FROM products
            WHERE code = ?
            `
        )
        .get(code);
}


function getProductByBarcode(
    db,
    barcode
) {
    if (!barcode) {
        return undefined;
    }

    return db
        .prepare(
            `
            SELECT *
            FROM products
            WHERE barcode = ?
            `
        )
        .get(barcode);
}


function getWarehouseById(
    db,
    warehouseId
) {
    return db
        .prepare(
            `
            SELECT
                id,
                code,
                name,
                is_main,
                is_active
            FROM warehouses
            WHERE id = ?
            `
        )
        .get(warehouseId);
}


function getCategoryById(
    db,
    categoryId
) {
    if (!categoryId) {
        return undefined;
    }

    return db
        .prepare(
            `
            SELECT
                id,
                code,
                name,
                icon,
                is_active
            FROM categories
            WHERE id = ?
            `
        )
        .get(categoryId);
}


function getUnitById(
    db,
    unitId
) {
    return db
        .prepare(
            `
            SELECT
                id,
                code,
                name,
                symbol,
                decimal_places,
                is_active
            FROM units
            WHERE id = ?
            `
        )
        .get(unitId);
}


function getPriceListByCode(
    db,
    code
) {
    return db
        .prepare(
            `
            SELECT
                id,
                code,
                name,
                price_type,
                is_default,
                is_active
            FROM price_lists
            WHERE code = ?
            `
        )
        .get(code);
}


function getDefaultTaxRate(
    db
) {
    return db
        .prepare(
            `
            SELECT
                id,
                code,
                name,
                rate_percent,
                is_default,
                is_active
            FROM tax_rates
            WHERE is_default = 1
              AND is_active = 1
            ORDER BY id
            LIMIT 1
            `
        )
        .get();
}


function insertProduct(
    db,
    product
) {
    const result = db
        .prepare(
            `
            INSERT INTO products (
                code,
                barcode,
                name,
                product_type,
                category_id,
                unit_id,
                purchase_price,
                sale_price,
                min_stock,
                max_stock,
                reorder_point,
                track_inventory,
                is_sellable,
                is_purchasable,
                is_active,
                description,
                image_path,
                online_enabled,
                sort_order,
                notes,
                default_warehouse_id
            )
            VALUES (
                @code,
                @barcode,
                @name,
                @product_type,
                @category_id,
                @unit_id,
                @purchase_price,
                @sale_price,
                @min_stock,
                @max_stock,
                @reorder_point,
                @track_inventory,
                @is_sellable,
                @is_purchasable,
                @is_active,
                @description,
                @image_path,
                @online_enabled,
                @sort_order,
                @notes,
                @default_warehouse_id
            )
            `
        )
        .run({
            code: product.code,
            barcode: product.barcode,
            name: product.name,
            product_type: product.product_type,
            category_id: product.category_id,
            unit_id: product.unit_id,
            purchase_price: product.purchase_price,
            sale_price: product.sale_price,
            min_stock: product.min_stock,
            max_stock: product.max_stock,
            reorder_point: product.reorder_point,
            track_inventory: product.track_inventory,
            is_sellable: product.is_sellable,
            is_purchasable: product.is_purchasable,
            is_active: product.is_active,
            description: product.description,
            image_path: product.image_path,
            online_enabled: product.online_enabled,
            sort_order: product.sort_order,
            notes: product.notes,
            default_warehouse_id:
                product.default_warehouse_id
        });

    return result.lastInsertRowid;
}


function insertProductWarehouseSetting(
    db,
    productId,
    warehouseId,
    values
) {
    db.prepare(
        `
        INSERT INTO product_warehouse_settings (
            product_id,
            warehouse_id,
            min_stock,
            max_stock,
            reorder_point,
            is_preferred,
            is_active
        )
        VALUES (
            @product_id,
            @warehouse_id,
            @min_stock,
            @max_stock,
            @reorder_point,
            @is_preferred,
            1
        )
        `
    ).run({
        product_id: productId,
        warehouse_id: warehouseId,
        min_stock: values.min_stock,
        max_stock: values.max_stock,
        reorder_point: values.reorder_point,
        is_preferred: values.is_preferred
    });
}


function insertInventoryBalance(
    db,
    productId,
    warehouseId
) {
    db.prepare(
        `
        INSERT INTO inventory_balances (
            warehouse_id,
            product_id,
            quantity,
            reserved_quantity,
            average_cost
        )
        VALUES (?, ?, 0, 0, 0)
        `
    ).run(
        warehouseId,
        productId
    );
}


function insertProductPrice(
    db,
    productId,
    priceListId,
    price
) {
    db.prepare(
        `
        INSERT INTO product_prices (
            product_id,
            price_list_id,
            price,
            min_quantity,
            effective_from,
            is_active
        )
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, 1)
        `
    ).run(
        productId,
        priceListId,
        price
    );
}


function insertProductTaxRate(
    db,
    productId,
    taxRateId
) {
    db.prepare(
        `
        INSERT INTO product_tax_rates (
            product_id,
            tax_rate_id,
            effective_from,
            is_active
        )
        VALUES (?, ?, CURRENT_TIMESTAMP, 1)
        `
    ).run(
        productId,
        taxRateId
    );
}


function createProductTransaction(
    productData,
    warehouseSettings
) {
    const db = createConnection();

    try {
        const transaction = db.transaction(() => {
            const productId =
                insertProduct(
                    db,
                    productData
                );

            insertProductWarehouseSetting(
                db,
                productId,
                productData.default_warehouse_id,
                warehouseSettings
            );

            insertInventoryBalance(
                db,
                productId,
                productData.default_warehouse_id
            );

            return productId;
        });

        return transaction();

    } finally {
        db.close();
    }
}


module.exports = {
    getProductById,
    getProductByCode,
    getProductByBarcode,
    getWarehouseById,
    getCategoryById,
    getUnitById,
    getPriceListByCode,
    getDefaultTaxRate,
    insertProduct,
    insertProductWarehouseSetting,
    insertInventoryBalance,
    insertProductPrice,
    insertProductTaxRate,
    createProductTransaction
};