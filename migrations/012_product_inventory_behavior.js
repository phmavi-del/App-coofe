function up(db) {

    const columns = db
        .prepare(`
            PRAGMA table_info(products)
        `)
        .all()
        .map(column => column.name);

    if (!columns.includes("inventory_behavior")) {

        db.exec(`
            ALTER TABLE products
            ADD COLUMN inventory_behavior TEXT
            NOT NULL DEFAULT 'stock'
            CHECK (
                inventory_behavior IN (
                    'stock',
                    'recipe',
                    'none'
                )
            )
        `);
    }

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_products_inventory_behavior
        ON products(inventory_behavior)
    `);

    /*
     * محصولات موجود بر اساس نوع فعلی:
     *
     * raw_material → stock
     * service      → none
     * product      → stock
     *
     * بعداً محصول رستورانی دارای Recipe
     * به recipe تغییر داده می‌شود.
     */

    db.prepare(`
        UPDATE products
        SET inventory_behavior = 'stock'
        WHERE product_type IN (
            'product',
            'raw_material'
        )
    `).run();

    db.prepare(`
        UPDATE products
        SET inventory_behavior = 'none'
        WHERE product_type = 'service'
    `).run();
}

module.exports = {
    up
};