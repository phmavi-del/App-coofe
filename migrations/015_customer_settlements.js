function up(db) {

    db.exec(`
        CREATE TABLE IF NOT EXISTS customer_settlements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            customer_id INTEGER NOT NULL,

            sales_invoice_id INTEGER NOT NULL,

            payment_method TEXT NOT NULL
                CHECK (
                    payment_method IN (
                        'cash',
                        'card'
                    )
                ),

            cash_register_id INTEGER,

            bank_account_id INTEGER,

            amount INTEGER NOT NULL
                CHECK (amount > 0),

            settlement_date TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            reference_number TEXT,

            terminal_reference TEXT,

            description TEXT,

            created_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (customer_id)
                REFERENCES customers(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (sales_invoice_id)
                REFERENCES sales_invoices(id)
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
            )
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_customer_settlements_customer
        ON customer_settlements(customer_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_customer_settlements_invoice
        ON customer_settlements(sales_invoice_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_customer_settlements_date
        ON customer_settlements(settlement_date)
    `);
}

module.exports = {
    up
};