const CORE_SCHEMA = [

    `
    CREATE TABLE IF NOT EXISTS app_info (
        id INTEGER PRIMARY KEY CHECK (id = 1),

        app_name TEXT NOT NULL,

        app_version TEXT NOT NULL,

        database_version INTEGER NOT NULL DEFAULT 1,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        code TEXT NOT NULL UNIQUE,

        name TEXT NOT NULL,

        description TEXT,

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS cash_registers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        branch_id INTEGER,

        code TEXT NOT NULL UNIQUE,

        name TEXT NOT NULL,

        description TEXT,

        opening_balance INTEGER NOT NULL DEFAULT 0,

        is_main INTEGER NOT NULL DEFAULT 0
            CHECK (is_main IN (0, 1)),

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (branch_id)
            REFERENCES branches(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS warehouses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        branch_id INTEGER,

        code TEXT NOT NULL UNIQUE,

        name TEXT NOT NULL,

        description TEXT,

        is_main INTEGER NOT NULL DEFAULT 0
            CHECK (is_main IN (0, 1)),

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (branch_id)
            REFERENCES branches(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS bank_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        branch_id INTEGER,

        code TEXT NOT NULL UNIQUE,

        name TEXT NOT NULL,

        bank_name TEXT,

        account_number TEXT,

        card_number TEXT,

        iban TEXT,

        opening_balance INTEGER NOT NULL DEFAULT 0,

        is_main INTEGER NOT NULL DEFAULT 0
            CHECK (is_main IN (0, 1)),

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (branch_id)
            REFERENCES branches(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        code TEXT NOT NULL UNIQUE,

        name TEXT NOT NULL,

        symbol TEXT,

        decimal_places INTEGER NOT NULL DEFAULT 0,

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        parent_id INTEGER,

        code TEXT NOT NULL UNIQUE,

        name TEXT NOT NULL,

        description TEXT,

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (parent_id)
            REFERENCES categories(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL
    )
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_cash_registers_branch
        ON cash_registers(branch_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_warehouses_branch
        ON warehouses(branch_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_branch
        ON bank_accounts(branch_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_categories_parent
        ON categories(parent_id)
    `
];

function createCoreSchema(db) {

    const transaction = db.transaction(() => {

        for (const sql of CORE_SCHEMA) {
            db.exec(sql);
        }

    });

    transaction();
}

module.exports = {
    CORE_SCHEMA,
    createCoreSchema
};