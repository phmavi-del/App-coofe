function getOrCreateUnit(db, unit) {
    const existing = db
        .prepare(`
            SELECT id
            FROM units
            WHERE code = ?
        `)
        .get(unit.code);

    if (existing) {
        return existing.id;
    }

    const result = db
        .prepare(`
            INSERT INTO units (
                code,
                name,
                symbol,
                decimal_places,
                is_active
            )
            VALUES (?, ?, ?, ?, 1)
        `)
        .run(
            unit.code,
            unit.name,
            unit.symbol,
            unit.decimal_places
        );

    return result.lastInsertRowid;
}

function up(db) {

    /*
     * تبدیل‌های آزمایشی اشتباه را حذف می‌کنیم.
     */
    db.prepare(`
        DELETE FROM unit_conversions
        WHERE
            (from_unit_id = 2 AND to_unit_id = 1)
            OR
            (from_unit_id = 3 AND to_unit_id = 1)
    `).run();


    /*
     * واحدهای پایه موردنیاز برای آشپزخانه و Recipe
     */
    const gramId = getOrCreateUnit(
        db,
        {
            code: "UNIT-G",
            name: "گرم",
            symbol: "g",
            decimal_places: 3
        }
    );

    const milliliterId = getOrCreateUnit(
        db,
        {
            code: "UNIT-ML",
            name: "میلی‌لیتر",
            symbol: "ml",
            decimal_places: 3
        }
    );


    /*
     * تبدیل‌های صحیح:
     *
     * 1 کیلوگرم = 1000 گرم
     * 1 گرم = 0.001 کیلوگرم
     *
     * 1 لیتر = 1000 میلی‌لیتر
     * 1 میلی‌لیتر = 0.001 لیتر
     */

    const insertConversion = db.prepare(`
        INSERT OR IGNORE INTO unit_conversions (
            from_unit_id,
            to_unit_id,
            conversion_factor,
            is_active
        )
        VALUES (?, ?, ?, 1)
    `);


    insertConversion.run(
        2,
        gramId,
        1000
    );

    insertConversion.run(
        gramId,
        2,
        0.001
    );

    insertConversion.run(
        3,
        milliliterId,
        1000
    );

    insertConversion.run(
        milliliterId,
        3,
        0.001
    );
}

module.exports = {
    up
};