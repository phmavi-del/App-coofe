function up(db) {

    /*
     * -------------------------------------------------
     * نرخ‌های مالیاتی
     * -------------------------------------------------
     */

    db.exec(`
        CREATE TABLE IF NOT EXISTS tax_rates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            code TEXT NOT NULL UNIQUE,

            name TEXT NOT NULL,

            rate_percent REAL NOT NULL DEFAULT 0
                CHECK (rate_percent >= 0),

            is_default INTEGER NOT NULL DEFAULT 0
                CHECK (is_default IN (0, 1)),

            is_active INTEGER NOT NULL DEFAULT 1
                CHECK (is_active IN (0, 1)),

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);


    /*
     * -------------------------------------------------
     * فهرست قیمت
     * -------------------------------------------------
     */

    db.exec(`
        CREATE TABLE IF NOT EXISTS price_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            code TEXT NOT NULL UNIQUE,

            name TEXT NOT NULL,

            price_type TEXT NOT NULL DEFAULT 'retail'
                CHECK (
                    price_type IN (
                        'retail',
                        'takeaway',
                        'delivery',
                        'online',
                        'custom'
                    )
                ),

            is_default INTEGER NOT NULL DEFAULT 0
                CHECK (is_default IN (0, 1)),

            is_active INTEGER NOT NULL DEFAULT 1
                CHECK (is_active IN (0, 1)),

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);


    /*
     * -------------------------------------------------
     * قیمت کالا در فهرست‌های مختلف
     * -------------------------------------------------
     */

    db.exec(`
        CREATE TABLE IF NOT EXISTS product_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            product_id INTEGER NOT NULL,

            price_list_id INTEGER NOT NULL,

            price INTEGER NOT NULL DEFAULT 0
                CHECK (price >= 0),

            min_quantity REAL NOT NULL DEFAULT 1
                CHECK (min_quantity > 0),

            effective_from TEXT,

            effective_to TEXT,

            is_active INTEGER NOT NULL DEFAULT 1
                CHECK (is_active IN (0, 1)),

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UNIQUE (
                product_id,
                price_list_id,
                min_quantity,
                effective_from
            ),

            FOREIGN KEY (product_id)
                REFERENCES products(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (price_list_id)
                REFERENCES price_lists(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT
        )
    `);


    /*
     * -------------------------------------------------
     * مالیات اختصاصی کالا
     * -------------------------------------------------
     */

    db.exec(`
        CREATE TABLE IF NOT EXISTS product_tax_rates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            product_id INTEGER NOT NULL,

            tax_rate_id INTEGER NOT NULL,

            effective_from TEXT,

            effective_to TEXT,

            is_active INTEGER NOT NULL DEFAULT 1
                CHECK (is_active IN (0, 1)),

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (product_id)
                REFERENCES products(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (tax_rate_id)
                REFERENCES tax_rates(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT
        )
    `);


    /*
     * -------------------------------------------------
     * تنظیمات کالا در هر انبار
     * -------------------------------------------------
     */

    db.exec(`
        CREATE TABLE IF NOT EXISTS product_warehouse_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            product_id INTEGER NOT NULL,

            warehouse_id INTEGER NOT NULL,

            min_stock REAL NOT NULL DEFAULT 0
                CHECK (min_stock >= 0),

            max_stock REAL,

            reorder_point REAL NOT NULL DEFAULT 0
                CHECK (reorder_point >= 0),

            is_preferred INTEGER NOT NULL DEFAULT 0
                CHECK (is_preferred IN (0, 1)),

            is_active INTEGER NOT NULL DEFAULT 1
                CHECK (is_active IN (0, 1)),

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UNIQUE (
                product_id,
                warehouse_id
            ),

            CHECK (
                max_stock IS NULL
                OR max_stock >= min_stock
            ),

            FOREIGN KEY (product_id)
                REFERENCES products(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (warehouse_id)
                REFERENCES warehouses(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT
        )
    `);


    /*
     * -------------------------------------------------
     * ستون‌های جدید محصولات
     * -------------------------------------------------
     */

    const productColumns = db
        .prepare(`
            PRAGMA table_info(products)
        `)
        .all()
        .map(column => column.name);


    if (!productColumns.includes("image_path")) {

        db.exec(`
            ALTER TABLE products
            ADD COLUMN image_path TEXT
        `);
    }


    if (!productColumns.includes("online_enabled")) {

        db.exec(`
            ALTER TABLE products
            ADD COLUMN online_enabled INTEGER NOT NULL DEFAULT 1
        `);
    }


    if (!productColumns.includes("sort_order")) {

        db.exec(`
            ALTER TABLE products
            ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0
        `);
    }


    if (!productColumns.includes("notes")) {

        db.exec(`
            ALTER TABLE products
            ADD COLUMN notes TEXT
        `);
    }


    /*
     * -------------------------------------------------
     * Indexها
     * -------------------------------------------------
     */

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_product_prices_product
        ON product_prices(product_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_product_prices_price_list
        ON product_prices(price_list_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_product_tax_rates_product
        ON product_tax_rates(product_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_product_tax_rates_tax
        ON product_tax_rates(tax_rate_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_product_warehouse_settings_product
        ON product_warehouse_settings(product_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_product_warehouse_settings_warehouse
        ON product_warehouse_settings(warehouse_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_products_online
        ON products(online_enabled, is_active)
    `);
}


module.exports = {
    up
};