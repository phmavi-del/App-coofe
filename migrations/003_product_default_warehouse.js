function up(db) {

    const columns = db
        .prepare(`
            PRAGMA table_info(products)
        `)
        .all()
        .map(column => column.name);

    if (!columns.includes("default_warehouse_id")) {

        db.exec(`
            ALTER TABLE products
            ADD COLUMN default_warehouse_id INTEGER
        `);
    }

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_products_default_warehouse
        ON products(default_warehouse_id)
    `);
}

module.exports = {
    up
};