const PURCHASING_SCHEMA = [

    /*
     * -------------------------------------------------
     * تامین‌کنندگان
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        code TEXT NOT NULL UNIQUE,

        name TEXT NOT NULL,

        company_name TEXT,

        phone TEXT,

        mobile TEXT,

        email TEXT,

        national_id TEXT,

        economic_code TEXT,

        address TEXT,

        postal_code TEXT,

        description TEXT,

        credit_limit INTEGER NOT NULL DEFAULT 0
            CHECK (credit_limit >= 0),

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


    /*
     * -------------------------------------------------
     * فاکتورهای خرید
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS purchase_invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        invoice_number TEXT NOT NULL UNIQUE,

        supplier_id INTEGER,

        warehouse_id INTEGER NOT NULL,

        status TEXT NOT NULL DEFAULT 'draft'
            CHECK (
                status IN (
                    'draft',
                    'completed',
                    'cancelled',
                    'returned'
                )
            ),

        invoice_date TEXT NOT NULL,

        subtotal INTEGER NOT NULL DEFAULT 0
            CHECK (subtotal >= 0),

        discount_amount INTEGER NOT NULL DEFAULT 0
            CHECK (discount_amount >= 0),

        tax_amount INTEGER NOT NULL DEFAULT 0
            CHECK (tax_amount >= 0),

        total_amount INTEGER NOT NULL DEFAULT 0
            CHECK (total_amount >= 0),

        paid_amount INTEGER NOT NULL DEFAULT 0
            CHECK (paid_amount >= 0),

        remaining_amount INTEGER NOT NULL DEFAULT 0
            CHECK (remaining_amount >= 0),

        payment_status TEXT NOT NULL DEFAULT 'unpaid'
            CHECK (
                payment_status IN (
                    'unpaid',
                    'partial',
                    'paid'
                )
            ),

        notes TEXT,

        reference_number TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (supplier_id)
            REFERENCES suppliers(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (warehouse_id)
            REFERENCES warehouses(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    /*
     * -------------------------------------------------
     * اقلام فاکتور خرید
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS purchase_invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        purchase_invoice_id INTEGER NOT NULL,

        product_id INTEGER NOT NULL,

        quantity REAL NOT NULL
            CHECK (quantity > 0),

        unit_id INTEGER NOT NULL,

        unit_price INTEGER NOT NULL
            CHECK (unit_price >= 0),

        discount_amount INTEGER NOT NULL DEFAULT 0
            CHECK (discount_amount >= 0),

        tax_rate_percent REAL NOT NULL DEFAULT 0
            CHECK (tax_rate_percent >= 0),

        tax_amount INTEGER NOT NULL DEFAULT 0
            CHECK (tax_amount >= 0),

        line_total INTEGER NOT NULL DEFAULT 0
            CHECK (line_total >= 0),

        notes TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (purchase_invoice_id)
            REFERENCES purchase_invoices(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,

        FOREIGN KEY (product_id)
            REFERENCES products(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (unit_id)
            REFERENCES units(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    /*
     * -------------------------------------------------
     * پرداخت‌های خرید
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS purchase_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        purchase_invoice_id INTEGER NOT NULL,

        payment_method TEXT NOT NULL
            CHECK (
                payment_method IN (
                    'cash',
                    'bank',
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

        notes TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
            OR
            (
                payment_method = 'credit'
                AND cash_register_id IS NULL
                AND bank_account_id IS NULL
            )
        )
    )
    `,


    /*
     * -------------------------------------------------
     * برگشت از خرید
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS purchase_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        return_number TEXT NOT NULL UNIQUE,

        purchase_invoice_id INTEGER NOT NULL,

        supplier_id INTEGER,

        warehouse_id INTEGER NOT NULL,

        status TEXT NOT NULL DEFAULT 'completed'
            CHECK (
                status IN (
                    'draft',
                    'completed',
                    'cancelled'
                )
            ),

        return_date TEXT NOT NULL,

        total_amount INTEGER NOT NULL DEFAULT 0
            CHECK (total_amount >= 0),

        notes TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (purchase_invoice_id)
            REFERENCES purchase_invoices(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (supplier_id)
            REFERENCES suppliers(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (warehouse_id)
            REFERENCES warehouses(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    /*
     * -------------------------------------------------
     * اقلام برگشت خرید
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS purchase_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        purchase_return_id INTEGER NOT NULL,

        product_id INTEGER NOT NULL,

        quantity REAL NOT NULL
            CHECK (quantity > 0),

        unit_id INTEGER NOT NULL,

        unit_price INTEGER NOT NULL
            CHECK (unit_price >= 0),

        total_amount INTEGER NOT NULL DEFAULT 0
            CHECK (total_amount >= 0),

        FOREIGN KEY (purchase_return_id)
            REFERENCES purchase_returns(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,

        FOREIGN KEY (product_id)
            REFERENCES products(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (unit_id)
            REFERENCES units(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    /*
     * -------------------------------------------------
     * شاخص‌ها
     * -------------------------------------------------
     */

    `
    CREATE INDEX IF NOT EXISTS idx_suppliers_name
        ON suppliers(name)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_suppliers_phone
        ON suppliers(phone)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier
        ON purchase_invoices(supplier_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_purchase_invoices_warehouse
        ON purchase_invoices(warehouse_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date
        ON purchase_invoices(invoice_date)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_invoice
        ON purchase_invoice_items(purchase_invoice_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_product
        ON purchase_invoice_items(product_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_purchase_payments_invoice
        ON purchase_payments(purchase_invoice_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_purchase_returns_invoice
        ON purchase_returns(purchase_invoice_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return
        ON purchase_return_items(purchase_return_id)
    `
];


function createPurchasingSchema(db) {

    const transaction = db.transaction(() => {

        for (const sql of PURCHASING_SCHEMA) {
            db.exec(sql);
        }

    });

    transaction();
}


module.exports = {
    PURCHASING_SCHEMA,
    createPurchasingSchema
};