function up(db) {

    db.exec(`
        CREATE TABLE IF NOT EXISTS supplier_settlements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            supplier_id INTEGER NOT NULL,

            purchase_invoice_id INTEGER NOT NULL,

            payment_method TEXT NOT NULL
                CHECK (
                    payment_method IN (
                        'cash',
                        'bank'
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

            FOREIGN KEY (supplier_id)
                REFERENCES suppliers(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (purchase_invoice_id)
                REFERENCES purchase_invoices(id)
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
                    payment_method = 'bank'
                    AND bank_account_id IS NOT NULL
                    AND cash_register_id IS NULL
                )
            )
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_supplier_settlements_supplier
        ON supplier_settlements(supplier_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_supplier_settlements_invoice
        ON supplier_settlements(purchase_invoice_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_supplier_settlements_date
        ON supplier_settlements(settlement_date)
    `);
}


module.exports = {
    up
};