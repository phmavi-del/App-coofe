function up(db) {

    const columns = db
        .prepare(`
            PRAGMA table_info(inventory_movements)
        `)
        .all()
        .map(column => column.name);

    if (!columns.includes("sales_invoice_item_id")) {
        db.exec(`
            ALTER TABLE inventory_movements
            ADD COLUMN sales_invoice_item_id INTEGER
            REFERENCES sales_invoice_items(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
        `);
    }

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_inventory_movements_sales_item
        ON inventory_movements(
            sales_invoice_item_id
        )
    `);
}

module.exports = {
    up
};