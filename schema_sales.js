const SALES_SCHEMA = [

    /*
     * -------------------------------------------------
     * فاکتورهای فروش
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS sales_invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        invoice_number TEXT NOT NULL UNIQUE,

        customer_id INTEGER,

        warehouse_id INTEGER NOT NULL,

        created_by_user_id INTEGER NOT NULL,

        invoice_date TEXT NOT NULL,

        status TEXT NOT NULL DEFAULT 'draft'
            CHECK (
                status IN (
                    'draft',
                    'completed',
                    'cancelled',
                    'returned'
                )
            ),

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

        customer_name_snapshot TEXT,

        customer_phone_snapshot TEXT,

        customer_address_snapshot TEXT,

        notes TEXT,

        reference_number TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (customer_id)
            REFERENCES customers(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (warehouse_id)
            REFERENCES warehouses(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (created_by_user_id)
            REFERENCES users(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    /*
     * -------------------------------------------------
     * اقلام فاکتور فروش
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS sales_invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        sales_invoice_id INTEGER NOT NULL,

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

        FOREIGN KEY (sales_invoice_id)
            REFERENCES sales_invoices(id)
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
     * پرداخت‌های فروش
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS sales_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        sales_invoice_id INTEGER NOT NULL,

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

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
     * برگشت از فروش
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS sales_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        return_number TEXT NOT NULL UNIQUE,

        sales_invoice_id INTEGER NOT NULL,

        customer_id INTEGER,

        warehouse_id INTEGER NOT NULL,

        created_by_user_id INTEGER NOT NULL,

        return_date TEXT NOT NULL,

        status TEXT NOT NULL DEFAULT 'completed'
            CHECK (
                status IN (
                    'draft',
                    'completed',
                    'cancelled'
                )
            ),

        total_amount INTEGER NOT NULL DEFAULT 0
            CHECK (total_amount >= 0),

        notes TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (sales_invoice_id)
            REFERENCES sales_invoices(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (customer_id)
            REFERENCES customers(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (warehouse_id)
            REFERENCES warehouses(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (created_by_user_id)
            REFERENCES users(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    /*
     * -------------------------------------------------
     * اقلام برگشت فروش
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS sales_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        sales_return_id INTEGER NOT NULL,

        product_id INTEGER NOT NULL,

        quantity REAL NOT NULL
            CHECK (quantity > 0),

        unit_id INTEGER NOT NULL,

        unit_price INTEGER NOT NULL
            CHECK (unit_price >= 0),

        discount_amount INTEGER NOT NULL DEFAULT 0
            CHECK (discount_amount >= 0),

        tax_amount INTEGER NOT NULL DEFAULT 0
            CHECK (tax_amount >= 0),

        line_total INTEGER NOT NULL DEFAULT 0
            CHECK (line_total >= 0),

        FOREIGN KEY (sales_return_id)
            REFERENCES sales_returns(id)
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
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer
        ON sales_invoices(customer_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_warehouse
        ON sales_invoices(warehouse_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_user
        ON sales_invoices(created_by_user_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_date
        ON sales_invoices(invoice_date)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_invoice
        ON sales_invoice_items(sales_invoice_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_product
        ON sales_invoice_items(product_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_sales_payments_invoice
        ON sales_payments(sales_invoice_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_sales_returns_invoice
        ON sales_returns(sales_invoice_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_sales_return_items_return
        ON sales_return_items(sales_return_id)
    `
];


function createSalesSchema(db) {

    const transaction = db.transaction(() => {

        for (const sql of SALES_SCHEMA) {
            db.exec(sql);
        }

    });

    transaction();
}


module.exports = {
    SALES_SCHEMA,
    createSalesSchema
};