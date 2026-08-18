const FINANCIAL_SCHEMA = [

    `
    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        parent_id INTEGER,

        code TEXT NOT NULL UNIQUE,

        name TEXT NOT NULL,

        account_type TEXT NOT NULL
            CHECK (
                account_type IN (
                    'asset',
                    'liability',
                    'equity',
                    'revenue',
                    'expense'
                )
            ),

        normal_balance TEXT NOT NULL
            CHECK (
                normal_balance IN (
                    'debit',
                    'credit'
                )
            ),

        level INTEGER NOT NULL DEFAULT 1,

        is_system INTEGER NOT NULL DEFAULT 0
            CHECK (is_system IN (0, 1)),

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        description TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (parent_id)
            REFERENCES accounts(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        entry_number INTEGER NOT NULL UNIQUE,

        entry_date TEXT NOT NULL,

        reference_type TEXT,

        reference_id INTEGER,

        description TEXT,

        status TEXT NOT NULL DEFAULT 'posted'
            CHECK (
                status IN (
                    'draft',
                    'posted',
                    'void'
                )
            ),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS journal_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        journal_entry_id INTEGER NOT NULL,

        account_id INTEGER NOT NULL,

        debit INTEGER NOT NULL DEFAULT 0,

        credit INTEGER NOT NULL DEFAULT 0,

        description TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CHECK (debit >= 0),

        CHECK (credit >= 0),

        CHECK (
            (debit > 0 AND credit = 0)
            OR
            (credit > 0 AND debit = 0)
        ),

        FOREIGN KEY (journal_entry_id)
            REFERENCES journal_entries(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (account_id)
            REFERENCES accounts(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS cash_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        cash_register_id INTEGER NOT NULL,

        transaction_type TEXT NOT NULL
            CHECK (
                transaction_type IN (
                    'opening',
                    'sale',
                    'purchase',
                    'receipt',
                    'payment',
                    'expense',
                    'transfer_in',
                    'transfer_out',
                    'adjustment',
                    'refund'
                )
            ),

        amount INTEGER NOT NULL
            CHECK (amount > 0),

        direction TEXT NOT NULL
            CHECK (
                direction IN (
                    'in',
                    'out'
                )
            ),

        reference_type TEXT,

        reference_id INTEGER,

        description TEXT,

        transaction_date TEXT NOT NULL
            DEFAULT CURRENT_TIMESTAMP,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (cash_register_id)
            REFERENCES cash_registers(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS bank_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        bank_account_id INTEGER NOT NULL,

        transaction_type TEXT NOT NULL
            CHECK (
                transaction_type IN (
                    'opening',
                    'sale',
                    'purchase',
                    'receipt',
                    'payment',
                    'expense',
                    'transfer_in',
                    'transfer_out',
                    'adjustment',
                    'refund'
                )
            ),

        amount INTEGER NOT NULL
            CHECK (amount > 0),

        direction TEXT NOT NULL
            CHECK (
                direction IN (
                    'in',
                    'out'
                )
            ),

        reference_type TEXT,

        reference_id INTEGER,

        description TEXT,

        transaction_date TEXT NOT NULL
            DEFAULT CURRENT_TIMESTAMP,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (bank_account_id)
            REFERENCES bank_accounts(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_accounts_parent
        ON accounts(parent_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_accounts_type
        ON accounts(account_type)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_journal_entries_date
        ON journal_entries(entry_date)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_journal_entries_reference
        ON journal_entries(reference_type, reference_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_journal_lines_entry
        ON journal_lines(journal_entry_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_journal_lines_account
        ON journal_lines(account_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_cash_transactions_register
        ON cash_transactions(cash_register_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_account
        ON bank_transactions(bank_account_id)
    `
];

function createFinancialSchema(db) {

    const transaction = db.transaction(() => {

        for (const sql of FINANCIAL_SCHEMA) {
            db.exec(sql);
        }

    });

    transaction();
}

module.exports = {
    FINANCIAL_SCHEMA,
    createFinancialSchema
};