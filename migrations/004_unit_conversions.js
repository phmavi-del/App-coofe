function up(db) {

    db.exec(`
        CREATE TABLE IF NOT EXISTS unit_conversions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            from_unit_id INTEGER NOT NULL,

            to_unit_id INTEGER NOT NULL,

            conversion_factor REAL NOT NULL
                CHECK (conversion_factor > 0),

            is_active INTEGER NOT NULL DEFAULT 1
                CHECK (is_active IN (0, 1)),

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UNIQUE (
                from_unit_id,
                to_unit_id
            ),

            CHECK (
                from_unit_id <> to_unit_id
            ),

            FOREIGN KEY (from_unit_id)
                REFERENCES units(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (to_unit_id)
                REFERENCES units(id)
                ON UPDATE CASCADE
                ON DELETE RESTRICT
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_unit_conversions_from
        ON unit_conversions(from_unit_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_unit_conversions_to
        ON unit_conversions(to_unit_id)
    `);
}

module.exports = {
    up
};