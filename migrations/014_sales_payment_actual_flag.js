function up(db) {

    const columns = db
        .prepare(`
            PRAGMA table_info(sales_payments)
        `)
        .all()
        .map(column => column.name);

    if (!columns.includes("is_actual_payment")) {

        db.exec(`
            ALTER TABLE sales_payments
            ADD COLUMN is_actual_payment INTEGER
            NOT NULL DEFAULT 1
            CHECK (is_actual_payment IN (0, 1))
        `);
    }

    /*
     * نسیه دریافت واقعی نیست.
     */
    db.prepare(`
        UPDATE sales_payments
        SET is_actual_payment = 0
        WHERE payment_method = 'credit'
    `).run();

    /*
     * نقدی و کارت پرداخت واقعی هستند.
     */
    db.prepare(`
        UPDATE sales_payments
        SET is_actual_payment = 1
        WHERE payment_method IN (
            'cash',
            'card'
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_sales_payments_actual
        ON sales_payments(
            sales_invoice_id,
            is_actual_payment
        )
    `);
}

module.exports = {
    up
};