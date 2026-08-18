function getAccountByCode(db, code) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                account_type,
                normal_balance,
                level,
                is_system,
                is_active
            FROM accounts
            WHERE code = ?
        `)
        .get(code);
}


function getOrCreateAccount(
    db,
    account
) {
    const existing =
        getAccountByCode(
            db,
            account.code
        );

    if (existing) {
        return existing.id;
    }

    const result =
        db
            .prepare(`
                INSERT INTO accounts (
                    parent_id,
                    code,
                    name,
                    account_type,
                    normal_balance,
                    level,
                    is_system,
                    is_active,
                    description
                )
                VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)
            `)
            .run(
                account.parent_id,
                account.code,
                account.name,
                account.account_type,
                account.normal_balance,
                account.level,
                account.description || null
            );

    return result.lastInsertRowid;
}


function up(db) {

    const columns =
        db
            .prepare(`
                PRAGMA table_info(suppliers)
            `)
            .all()
            .map(column => column.name);


    if (!columns.includes("account_id")) {

        db.exec(`
            ALTER TABLE suppliers
            ADD COLUMN account_id INTEGER
            REFERENCES accounts(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
        `);
    }


    const supplierAccountGroup =
        getAccountByCode(
            db,
            "201"
        );


    if (!supplierAccountGroup) {
        throw new Error(
            "حساب بستانکاران و تأمین‌کنندگان پیدا نشد."
        );
    }


    const suppliers =
        db
            .prepare(`
                SELECT
                    id,
                    code,
                    name,
                    account_id
                FROM suppliers
                ORDER BY id
            `)
            .all();


    for (const supplier of suppliers) {

        if (supplier.account_id) {
            continue;
        }


        const numericCode =
            String(
                100000 + supplier.id
            );


        const accountCode =
            `201${numericCode}`;


        const accountId =
            getOrCreateAccount(
                db,
                {
                    parent_id:
                        supplierAccountGroup.id,

                    code:
                        accountCode,

                    name:
                        `حساب ${supplier.name}`,

                    account_type:
                        "liability",

                    normal_balance:
                        "credit",

                    level:
                        3,

                    description:
                        `حساب تفصیلی تأمین‌کننده ${supplier.name}`
                }
            );


        db.prepare(`
            UPDATE suppliers
            SET account_id = ?
            WHERE id = ?
              AND account_id IS NULL
        `).run(
            accountId,
            supplier.id
        );
    }


    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
        ux_suppliers_account
        ON suppliers(account_id)
        WHERE account_id IS NOT NULL
    `);
}


module.exports = {
    up
};