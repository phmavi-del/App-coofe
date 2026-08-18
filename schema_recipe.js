const RECIPE_SCHEMA = [

    `
    CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        code TEXT NOT NULL UNIQUE,

        product_id INTEGER NOT NULL,

        name TEXT NOT NULL,

        version INTEGER NOT NULL DEFAULT 1
            CHECK (version >= 1),

        status TEXT NOT NULL DEFAULT 'draft'
            CHECK (
                status IN (
                    'draft',
                    'active',
                    'inactive',
                    'archived'
                )
            ),

        yield_quantity REAL NOT NULL DEFAULT 1
            CHECK (yield_quantity > 0),

        yield_unit_id INTEGER NOT NULL,

        preparation_time_minutes INTEGER
            CHECK (
                preparation_time_minutes IS NULL
                OR preparation_time_minutes >= 0
            ),

        notes TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (product_id)
            REFERENCES products(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (yield_unit_id)
            REFERENCES units(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS recipe_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        recipe_id INTEGER NOT NULL,

        ingredient_product_id INTEGER NOT NULL,

        quantity REAL NOT NULL
            CHECK (quantity > 0),

        unit_id INTEGER NOT NULL,

        waste_percent REAL NOT NULL DEFAULT 0
            CHECK (
                waste_percent >= 0
                AND waste_percent <= 100
            ),

        notes TEXT,

        sort_order INTEGER NOT NULL DEFAULT 0,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (recipe_id)
            REFERENCES recipes(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,

        FOREIGN KEY (ingredient_product_id)
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
     * در هر نسخه، یک محصول فقط یک Recipe فعال داشته باشد.
     */
    `
    CREATE UNIQUE INDEX IF NOT EXISTS
        ux_recipes_active_product
    ON recipes(product_id)
    WHERE status = 'active'
    `,

    `
    CREATE INDEX IF NOT EXISTS
        idx_recipes_product
    ON recipes(product_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS
        idx_recipes_status
    ON recipes(status)
    `,

    `
    CREATE INDEX IF NOT EXISTS
        idx_recipe_items_recipe
    ON recipe_items(recipe_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS
        idx_recipe_items_ingredient
    ON recipe_items(ingredient_product_id)
    `
];


function createRecipeSchema(db) {

    const transaction = db.transaction(() => {

        for (const sql of RECIPE_SCHEMA) {
            db.exec(sql);
        }

    });

    transaction();
}


module.exports = {
    RECIPE_SCHEMA,
    createRecipeSchema
};