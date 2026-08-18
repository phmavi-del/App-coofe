function up(db) {

    const itemColumns = db
        .prepare(`
            PRAGMA table_info(sales_return_items)
        `)
        .all()
        .map(column => column.name);

    if (!itemColumns.includes(
        "sales_invoice_item_id"
    )) {
        db.exec(`
            ALTER TABLE sales_return_items
            ADD COLUMN sales_invoice_item_id INTEGER
            REFERENCES sales_invoice_items(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
        `);
    }


    const returnColumns = db
        .prepare(`
            PRAGMA table_info(sales_returns)
        `)
        .all()
        .map(column => column.name);

    if (!returnColumns.includes(
        "refund_amount"
    )) {
        db.exec(`
            ALTER TABLE sales_returns
            ADD COLUMN refund_amount INTEGER
            NOT NULL DEFAULT 0
            CHECK (refund_amount >= 0)
        `);
    }

    if (!returnColumns.includes(
        "refund_status"
    )) {
        db.exec(`
            ALTER TABLE sales_returns
            ADD COLUMN refund_status TEXT
            NOT NULL DEFAULT 'unpaid'
            CHECK (
                refund_status IN (
                    'unpaid',
                    'partial',
                    'refunded',
                    'not_applicable'
                )
            )
        `);
    }


    db.exec(`
        CREATE TABLE IF NOT EXISTS sales_return_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            sales_return_id INTEGER NOT NULL,

            payment_method TEXT NOT NULL
                CHECK (
                    payment_method IN (
                        'cash',
                        'card',
                        'credit'
                    )
                ),

            cash_register_id INTEGER,

            bank_account_id INTEGER,

            amount INTEGER NOT NULL
                CHECK (amount > 0),

            payment_date TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            reference_number TEXT,

            terminal_reference TEXT,

            notes TEXT,

            created_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (sales_return_id)
                REFERENCES sales_returns(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (cash_register_id)
                REFERENCES cash_registers(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (bank_account_id)
                REFERENCES bank_accounts(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            CHECK (
                (
                    payment_method = 'cash'
                    AND cash_register_id IS NOT NULL
                    AND bank_account_id IS NULL
                )
                OR
                (
                    payment_method = 'card'
                    AND bank_account_id IS NOT NULL
                    AND cash_register_id IS NULL
                )
                OR
                (
                    payment_method = 'credit'
                    AND cash_register_id IS NULL
                    AND bank_account_id IS NULL
                )
            )
        )
    `);


    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_sales_return_items_invoice_item
        ON sales_return_items(
            sales_invoice_item_id
        )
    `);


    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_sales_return_payments_return
        ON sales_return_payments(
            sales_return_id
        )
    `);


    /*
     * Reference کارت‌خوان برگشت نیز نباید
     * دوباره استفاده شود.
     */

    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
        ux_sales_return_payment_card_reference
        ON sales_return_payments(
            bank_account_id,
            reference_number
        )
        WHERE payment_method = 'card'
          AND reference_number IS NOT NULL
    `);


    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
        ux_sales_return_payment_terminal
        ON sales_return_payments(
            bank_account_id,
            terminal_reference
        )
        WHERE payment_method = 'card'
          AND terminal_reference IS NOT NULL
    `);
}

module.exports = {
    up
};