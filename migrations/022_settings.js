function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            setting_key TEXT NOT NULL UNIQUE,

            setting_value TEXT,

            value_type TEXT NOT NULL DEFAULT 'string'
                CHECK (
                    value_type IN (
                        'string',
                        'number',
                        'boolean',
                        'json'
                    )
                ),

            description TEXT,

            is_active INTEGER NOT NULL DEFAULT 1
                CHECK (is_active IN (0, 1)),

            created_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_app_settings_active
        ON app_settings(is_active)
    `);
}

module.exports = {
    up
};