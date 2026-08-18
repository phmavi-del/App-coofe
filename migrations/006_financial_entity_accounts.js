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


function getOrCreateAccount(db, account) {
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
                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    1,
                    1,
                    ?
                )
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


function addAccountColumnIfMissing(
    db,
    tableName
) {
    const columns =
        db
            .prepare(
                `PRAGMA table_info(${tableName})`
            )
            .all()
            .map(column => column.name);

    if (!columns.includes("account_id")) {

        db.exec(`
            ALTER TABLE ${tableName}
            ADD COLUMN account_id INTEGER
            REFERENCES accounts(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
        `);
    }
}


function up(db) {

    /*
     * -------------------------------------------------
     * افزودن حساب حسابداری به موجودیت‌ها
     * -------------------------------------------------
     */

    addAccountColumnIfMissing(
        db,
        "cash_registers"
    );

    addAccountColumnIfMissing(
        db,
        "bank_accounts"
    );

    addAccountColumnIfMissing(
        db,
        "warehouses"
    );


    /*
     * -------------------------------------------------
     * حساب‌های اصلی
     * -------------------------------------------------
     */

    const assets =
        getAccountByCode(
            db,
            "1"
        );

    const cashGroup =
        getAccountByCode(
            db,
            "101"
        );

    const bankGroup =
        getAccountByCode(
            db,
            "102"
        );

    const inventoryGroup =
        getAccountByCode(
            db,
            "103"
        );


    if (!assets) {
        throw new Error(
            "حساب اصلی دارایی‌ها پیدا نشد."
        );
    }

    if (!cashGroup) {
        throw new Error(
            "حساب گروه صندوق‌ها پیدا نشد."
        );
    }

    if (!bankGroup) {
        throw new Error(
            "حساب گروه بانک‌ها پیدا نشد."
        );
    }

    if (!inventoryGroup) {
        throw new Error(
            "حساب گروه موجودی کالا پیدا نشد."
        );
    }


    /*
     * -------------------------------------------------
     * صندوق اصلی
     * -------------------------------------------------
     */

    const mainCash =
        db
            .prepare(`
                SELECT
                    id,
                    code,
                    name,
                    account_id
                FROM cash_registers
                WHERE code = 'CASH-001'
            `)
            .get();

    if (mainCash) {

        const accountId =
            getOrCreateAccount(
                db,
                {
                    parent_id:
                        cashGroup.id,

                    code:
                        "101001",

                    name:
                        `حساب ${mainCash.name}`,

                    account_type:
                        "asset",

                    normal_balance:
                        "debit",

                    level:
                        3,

                    description:
                        "حساب معین صندوق اصلی"
                }
            );

        db.prepare(`
            UPDATE cash_registers
            SET account_id = ?
            WHERE id = ?
              AND account_id IS NULL
        `).run(
            accountId,
            mainCash.id
        );
    }


    /*
     * -------------------------------------------------
     * حساب بانکی اصلی
     * -------------------------------------------------
     */

    const mainBank =
        db
            .prepare(`
                SELECT
                    id,
                    code,
                    name,
                    account_id
                FROM bank_accounts
                WHERE code = 'BANK-001'
            `)
            .get();

    if (mainBank) {

        const accountId =
            getOrCreateAccount(
                db,
                {
                    parent_id:
                        bankGroup.id,

                    code:
                        "102001",

                    name:
                        `حساب ${mainBank.name}`,

                    account_type:
                        "asset",

                    normal_balance:
                        "debit",

                    level:
                        3,

                    description:
                        "حساب معین حساب بانکی اصلی"
                }
            );

        db.prepare(`
            UPDATE bank_accounts
            SET account_id = ?
            WHERE id = ?
              AND account_id IS NULL
        `).run(
            accountId,
            mainBank.id
        );
    }


    /*
     * -------------------------------------------------
     * انبار اصلی
     * -------------------------------------------------
     */

    const mainWarehouse =
        db
            .prepare(`
                SELECT
                    id,
                    code,
                    name,
                    account_id
                FROM warehouses
                WHERE code = 'WH-001'
            `)
            .get();

    if (mainWarehouse) {

        const accountId =
            getOrCreateAccount(
                db,
                {
                    parent_id:
                        inventoryGroup.id,

                    code:
                        "103001",

                    name:
                        `موجودی ${mainWarehouse.name}`,

                    account_type:
                        "asset",

                    normal_balance:
                        "debit",

                    level:
                        3,

                    description:
                        "حساب موجودی انبار اصلی"
                }
            );

        db.prepare(`
            UPDATE warehouses
            SET account_id = ?
            WHERE id = ?
              AND account_id IS NULL
        `).run(
            accountId,
            mainWarehouse.id
        );
    }


    /*
     * -------------------------------------------------
     * جلوگیری از اتصال یک حساب به چند موجودیت
     * -------------------------------------------------
     */

    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
        ux_cash_registers_account
        ON cash_registers(account_id)
        WHERE account_id IS NOT NULL
    `);

    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
        ux_bank_accounts_account
        ON bank_accounts(account_id)
        WHERE account_id IS NOT NULL
    `);

    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
        ux_warehouses_account
        ON warehouses(account_id)
        WHERE account_id IS NOT NULL
    `);
}


module.exports = {
    up
};