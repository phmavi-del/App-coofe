function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            expense_number TEXT NOT NULL UNIQUE,

            account_id INTEGER NOT NULL,

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

            expense_date TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            status TEXT NOT NULL DEFAULT 'completed'
                CHECK (
                    status IN (
                        'completed',
                        'cancelled'
                    )
                ),

            created_by_user_id INTEGER NOT NULL,

            reference_number TEXT,

            description TEXT,

            created_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (account_id)
                REFERENCES accounts(id)
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

            FOREIGN KEY (created_by_user_id)
                REFERENCES users(id)
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
        idx_expenses_account
        ON expenses(account_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_expenses_cash_register
        ON expenses(cash_register_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_expenses_bank_account
        ON expenses(bank_account_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_expenses_date
        ON expenses(expense_date)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_expenses_user
        ON expenses(created_by_user_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_expenses_status
        ON expenses(status)
    `);
}

module.exports = {
    up
};