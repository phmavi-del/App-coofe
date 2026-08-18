const INVENTORY_SCHEMA = [

    /*
     * -------------------------------------------------
     * کالاها
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        code TEXT NOT NULL UNIQUE,

        barcode TEXT UNIQUE,

        name TEXT NOT NULL,

        product_type TEXT NOT NULL DEFAULT 'product'
            CHECK (
                product_type IN (
                    'product',
                    'raw_material',
                    'service'
                )
            ),

        category_id INTEGER,

        unit_id INTEGER NOT NULL,

        purchase_price INTEGER NOT NULL DEFAULT 0,

        sale_price INTEGER NOT NULL DEFAULT 0,

        min_stock REAL NOT NULL DEFAULT 0,

        max_stock REAL,

        reorder_point REAL NOT NULL DEFAULT 0,

        track_inventory INTEGER NOT NULL DEFAULT 1
            CHECK (track_inventory IN (0, 1)),

        is_sellable INTEGER NOT NULL DEFAULT 1
            CHECK (is_sellable IN (0, 1)),

        is_purchasable INTEGER NOT NULL DEFAULT 1
            CHECK (is_purchasable IN (0, 1)),

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        description TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (category_id)
            REFERENCES categories(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL,

        FOREIGN KEY (unit_id)
            REFERENCES units(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    /*
     * -------------------------------------------------
     * موجودی کالا در هر انبار
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS inventory_balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        warehouse_id INTEGER NOT NULL,

        product_id INTEGER NOT NULL,

        quantity REAL NOT NULL DEFAULT 0,

        reserved_quantity REAL NOT NULL DEFAULT 0,

        average_cost INTEGER NOT NULL DEFAULT 0,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        UNIQUE (
            warehouse_id,
            product_id
        ),

        CHECK (quantity >= 0),

        CHECK (reserved_quantity >= 0),

        FOREIGN KEY (warehouse_id)
            REFERENCES warehouses(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (product_id)
            REFERENCES products(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    /*
     * -------------------------------------------------
     * گردش انبار
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS inventory_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        warehouse_id INTEGER NOT NULL,

        product_id INTEGER NOT NULL,

        movement_type TEXT NOT NULL
            CHECK (
                movement_type IN (
                    'opening',
                    'purchase',
                    'sale',
                    'purchase_return',
                    'sale_return',
                    'transfer_in',
                    'transfer_out',
                    'adjustment_in',
                    'adjustment_out',
                    'production_in',
                    'production_out',
                    'stocktake_in',
                    'stocktake_out'
                )
            ),

        quantity REAL NOT NULL
            CHECK (quantity > 0),

        unit_cost INTEGER NOT NULL DEFAULT 0,

        reference_type TEXT,

        reference_id INTEGER,

        transfer_id INTEGER,

        description TEXT,

        movement_date TEXT NOT NULL
            DEFAULT CURRENT_TIMESTAMP,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (warehouse_id)
            REFERENCES warehouses(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (product_id)
            REFERENCES products(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    /*
     * -------------------------------------------------
     * انتقال بین انبارها
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS inventory_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        transfer_number INTEGER NOT NULL UNIQUE,

        source_warehouse_id INTEGER NOT NULL,

        destination_warehouse_id INTEGER NOT NULL,

        status TEXT NOT NULL DEFAULT 'completed'
            CHECK (
                status IN (
                    'draft',
                    'completed',
                    'cancelled'
                )
            ),

        transfer_date TEXT NOT NULL
            DEFAULT CURRENT_TIMESTAMP,

        description TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CHECK (
            source_warehouse_id
            <> destination_warehouse_id
        ),

        FOREIGN KEY (source_warehouse_id)
            REFERENCES warehouses(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (destination_warehouse_id)
            REFERENCES warehouses(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    /*
     * -------------------------------------------------
     * اقلام انتقال
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS inventory_transfer_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        transfer_id INTEGER NOT NULL,

        product_id INTEGER NOT NULL,

        quantity REAL NOT NULL
            CHECK (quantity > 0),

        unit_cost INTEGER NOT NULL DEFAULT 0,

        FOREIGN KEY (transfer_id)
            REFERENCES inventory_transfers(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,

        FOREIGN KEY (product_id)
            REFERENCES products(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    /*
     * -------------------------------------------------
     * انبارگردانی
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS stocktakes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        stocktake_number INTEGER NOT NULL UNIQUE,

        warehouse_id INTEGER NOT NULL,

        status TEXT NOT NULL DEFAULT 'draft'
            CHECK (
                status IN (
                    'draft',
                    'counting',
                    'completed',
                    'cancelled'
                )
            ),

        stocktake_date TEXT NOT NULL
            DEFAULT CURRENT_TIMESTAMP,

        description TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (warehouse_id)
            REFERENCES warehouses(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,


    /*
     * -------------------------------------------------
     * اقلام انبارگردانی
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS stocktake_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        stocktake_id INTEGER NOT NULL,

        product_id INTEGER NOT NULL,

        system_quantity REAL NOT NULL DEFAULT 0,

        counted_quantity REAL NOT NULL DEFAULT 0,

        difference_quantity REAL NOT NULL DEFAULT 0,

        unit_cost INTEGER NOT NULL DEFAULT 0,

        FOREIGN KEY (stocktake_id)
            REFERENCES stocktakes(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,

        FOREIGN KEY (product_id)
            REFERENCES products(id)
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
    CREATE INDEX IF NOT EXISTS idx_products_category
        ON products(category_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_products_barcode
        ON products(barcode)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_inventory_balances_product
        ON inventory_balances(product_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_inventory_balances_warehouse
        ON inventory_balances(warehouse_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_product
        ON inventory_movements(product_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse
        ON inventory_movements(warehouse_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference
        ON inventory_movements(reference_type, reference_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_inventory_transfers_source
        ON inventory_transfers(source_warehouse_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_inventory_transfers_destination
        ON inventory_transfers(destination_warehouse_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_stocktakes_warehouse
        ON stocktakes(warehouse_id)
    `
];


function createInventorySchema(db) {

    const transaction = db.transaction(() => {

        for (const sql of INVENTORY_SCHEMA) {
            db.exec(sql);
        }

    });

    transaction();
}


module.exports = {
    INVENTORY_SCHEMA,
    createInventorySchema
};