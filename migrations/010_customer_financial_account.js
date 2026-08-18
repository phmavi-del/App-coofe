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
    const existing = getAccountByCode(
        db,
        account.code
    );

    if (existing) {
        return existing.id;
    }

    const result = db
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

    const columns = db
        .prepare(`
            PRAGMA table_info(customers)
        `)
        .all()
        .map(column => column.name);

    if (!columns.includes("account_id")) {
        db.exec(`
            ALTER TABLE customers
            ADD COLUMN account_id INTEGER
            REFERENCES accounts(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
        `);
    }

    const receivablesGroup =
        getAccountByCode(db, "202");

    if (!receivablesGroup) {
        const liabilities =
            getAccountByCode(db, "2");

        if (!liabilities) {
            throw new Error(
                "حساب بدهی‌ها پیدا نشد."
            );
        }

        getOrCreateAccount(
            db,
            {
                parent_id: liabilities.id,
                code: "202",
                name: "حساب‌های دریافتنی مشتریان",
                account_type: "asset",
                normal_balance: "debit",
                level: 2,
                description:
                    "حساب‌های دریافتنی از مشتریان"
            }
        );
    }

    const group =
        getAccountByCode(db, "202");

    const customers = db
        .prepare(`
            SELECT
                id,
                code,
                name,
                account_id
            FROM customers
            ORDER BY id
        `)
        .all();

    for (const customer of customers) {

        if (customer.account_id) {
            continue;
        }

        const accountCode =
            `202${String(100000 + customer.id)}`;

        const accountId =
            getOrCreateAccount(
                db,
                {
                    parent_id: group.id,
                    code: accountCode,
                    name:
                        `حساب مشتری ${customer.name}`,
                    account_type: "asset",
                    normal_balance: "debit",
                    level: 3,
                    description:
                        `حساب تفصیلی مشتری ${customer.name}`
                }
            );

        db.prepare(`
            UPDATE customers
            SET account_id = ?
            WHERE id = ?
              AND account_id IS NULL
        `).run(
            accountId,
            customer.id
        );
    }

    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
        ux_customers_account
        ON customers(account_id)
        WHERE account_id IS NOT NULL
    `);
}

module.exports = {
    up
};