function up(db) {
    const columns = db
        .prepare(
            `
            PRAGMA table_info(categories)
            `
        )
        .all()
        .map(column => column.name);

    if (!columns.includes("icon")) {
        db.exec(`
            ALTER TABLE categories
            ADD COLUMN icon TEXT
        `);
    }

    if (!columns.includes("sort_order")) {
        db.exec(`
            ALTER TABLE categories
            ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0
        `);
    }
}

module.exports = {
    up
};