function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER,

            module TEXT NOT NULL,

            action TEXT NOT NULL,

            record_id INTEGER,

            before_data TEXT,

            after_data TEXT,

            created_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            CHECK (
                length(trim(module)) > 0
            ),

            CHECK (
                length(trim(action)) > 0
            )
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_audit_logs_user
        ON audit_logs(user_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_audit_logs_module_action
        ON audit_logs(module, action)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_audit_logs_record
        ON audit_logs(record_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_audit_logs_created_at
        ON audit_logs(created_at)
    `);
}

module.exports = {
    up
};