const CUSTOMER_SCHEMA = [

    `
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        code TEXT NOT NULL UNIQUE,

        name TEXT NOT NULL,

        phone TEXT UNIQUE,

        email TEXT,

        national_id TEXT,

        address TEXT,

        postal_code TEXT,

        birth_date TEXT,

        description TEXT,

        credit_limit INTEGER NOT NULL DEFAULT 0,

        opening_balance INTEGER NOT NULL DEFAULT 0,

        opening_balance_type TEXT NOT NULL DEFAULT 'none'
            CHECK (
                opening_balance_type IN (
                    'none',
                    'debit',
                    'credit'
                )
            ),

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    `,


    `
    CREATE TABLE IF NOT EXISTS customer_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        customer_id INTEGER NOT NULL UNIQUE,

        points_balance INTEGER NOT NULL DEFAULT 0,

        credit_balance INTEGER NOT NULL DEFAULT 0,

        total_purchases INTEGER NOT NULL DEFAULT 0,

        total_paid INTEGER NOT NULL DEFAULT 0,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (customer_id)
            REFERENCES customers(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    `
    CREATE TABLE IF NOT EXISTS customer_levels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        code TEXT NOT NULL UNIQUE,

        name TEXT NOT NULL,

        min_points INTEGER NOT NULL DEFAULT 0,

        discount_percent REAL NOT NULL DEFAULT 0,

        points_multiplier REAL NOT NULL DEFAULT 1,

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    `,


    `
    CREATE TABLE IF NOT EXISTS customer_level_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        customer_id INTEGER NOT NULL,

        level_id INTEGER NOT NULL,

        assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        expires_at TEXT,

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        FOREIGN KEY (customer_id)
            REFERENCES customers(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (level_id)
            REFERENCES customer_levels(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    `
    CREATE TABLE IF NOT EXISTS customer_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        customer_id INTEGER NOT NULL,

        transaction_type TEXT NOT NULL
            CHECK (
                transaction_type IN (
                    'points_earned',
                    'points_spent',
                    'points_adjustment',
                    'credit_added',
                    'credit_spent',
                    'credit_adjustment'
                )
            ),

        points_amount INTEGER NOT NULL DEFAULT 0,

        credit_amount INTEGER NOT NULL DEFAULT 0,

        reference_type TEXT,

        reference_id INTEGER,

        description TEXT,

        transaction_date TEXT NOT NULL
            DEFAULT CURRENT_TIMESTAMP,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (customer_id)
            REFERENCES customers(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    `
    CREATE TABLE IF NOT EXISTS customer_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        code TEXT NOT NULL UNIQUE,

        name TEXT NOT NULL,

        reward_type TEXT NOT NULL
            CHECK (
                reward_type IN (
                    'discount',
                    'credit',
                    'points',
                    'product'
                )
            ),

        value REAL NOT NULL DEFAULT 0,

        min_purchase_amount INTEGER NOT NULL DEFAULT 0,

        required_points INTEGER NOT NULL DEFAULT 0,

        start_date TEXT,

        end_date TEXT,

        usage_limit INTEGER,

        used_count INTEGER NOT NULL DEFAULT 0,

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    `,


    `
    CREATE TABLE IF NOT EXISTS customer_reward_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        customer_id INTEGER NOT NULL,

        reward_id INTEGER NOT NULL,

        reference_type TEXT,

        reference_id INTEGER,

        points_used INTEGER NOT NULL DEFAULT 0,

        reward_value INTEGER NOT NULL DEFAULT 0,

        used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (customer_id)
            REFERENCES customers(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (reward_id)
            REFERENCES customer_rewards(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    `
    CREATE TABLE IF NOT EXISTS customer_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        customer_id INTEGER NOT NULL,

        reference_type TEXT,

        reference_id INTEGER,

        visit_date TEXT NOT NULL
            DEFAULT CURRENT_TIMESTAMP,

        amount INTEGER NOT NULL DEFAULT 0,

        description TEXT,

        FOREIGN KEY (customer_id)
            REFERENCES customers(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    `
    CREATE INDEX IF NOT EXISTS idx_customers_name
        ON customers(name)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_customers_phone
        ON customers(phone)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer
        ON customer_transactions(customer_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_customer_transactions_reference
        ON customer_transactions(reference_type, reference_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_customer_visits_customer
        ON customer_visits(customer_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_customer_reward_usage_customer
        ON customer_reward_usage(customer_id)
    `
];


function createCustomerSchema(db) {

    const transaction = db.transaction(() => {

        for (const sql of CUSTOMER_SCHEMA) {
            db.exec(sql);
        }

    });

    transaction();
}


module.exports = {
    CUSTOMER_SCHEMA,
    createCustomerSchema
};