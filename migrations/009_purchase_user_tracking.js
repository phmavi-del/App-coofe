function addColumnIfMissing(
    db,
    tableName,
    columnName,
    columnDefinition
) {
    const columns = db
        .prepare(
            `PRAGMA table_info(${tableName})`
        )
        .all()
        .map(column => column.name);

    if (!columns.includes(columnName)) {
        db.exec(`
            ALTER TABLE ${tableName}
            ADD COLUMN ${columnName} ${columnDefinition}
        `);
    }
}

function up(db) {
    addColumnIfMissing(
        db,
        "purchase_invoices",
        "created_by_user_id",
        "INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL"
    );

    addColumnIfMissing(
        db,
        "purchase_returns",
        "created_by_user_id",
        "INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL"
    );

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_purchase_invoices_created_by
        ON purchase_invoices(created_by_user_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_purchase_returns_created_by
        ON purchase_returns(created_by_user_id)
    `);
}

module.exports = {
    up
};