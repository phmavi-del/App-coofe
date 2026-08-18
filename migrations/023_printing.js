function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS printers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            code TEXT NOT NULL UNIQUE,

            name TEXT NOT NULL,

            printer_type TEXT NOT NULL DEFAULT 'system'
                CHECK (
                    printer_type IN (
                        'system',
                        'network',
                        'usb',
                        'pdf'
                    )
                ),

            connection_value TEXT,

            paper_width_mm REAL,

            description TEXT,

            is_active INTEGER NOT NULL DEFAULT 1
                CHECK (is_active IN (0, 1)),

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS print_routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            code TEXT NOT NULL UNIQUE,

            name TEXT NOT NULL,

            document_type TEXT NOT NULL,

            printer_id INTEGER,

            copies INTEGER NOT NULL DEFAULT 1
                CHECK (copies > 0),

            is_active INTEGER NOT NULL DEFAULT 1
                CHECK (is_active IN (0, 1)),

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (printer_id)
                REFERENCES printers(id)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS print_settings (
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

            is_active INTEGER NOT NULL DEFAULT 1
                CHECK (is_active IN (0, 1)),

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_routes_printer
        ON print_routes(printer_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_routes_document
        ON print_routes(document_type)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_routes_active
        ON print_routes(is_active)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_settings_active
        ON print_settings(is_active)
    `);
}

module.exports = {
    up
};