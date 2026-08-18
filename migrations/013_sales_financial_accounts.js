function getAccountByCode(
    db,
    code
) {
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

    /*
     * -------------------------------------------------
     * مالیات و ارزش افزوده پرداختنی
     * -------------------------------------------------
     */

    const liabilities =
        getAccountByCode(
            db,
            "2"
        );

    if (!liabilities) {
        throw new Error(
            "حساب بدهی‌ها پیدا نشد."
        );
    }

    getOrCreateAccount(
        db,
        {
            parent_id:
                liabilities.id,

            code:
                "203",

            name:
                "مالیات و ارزش افزوده پرداختنی",

            account_type:
                "liability",

            normal_balance:
                "credit",

            level:
                2,

            description:
                "مالیات و ارزش افزوده فروش"
        }
    );


    /*
     * -------------------------------------------------
     * بهای تمام‌شده فروش
     * -------------------------------------------------
     */

    const expenses =
        getAccountByCode(
            db,
            "5"
        );

    if (!expenses) {
        throw new Error(
            "حساب هزینه‌ها پیدا نشد."
        );
    }

    getOrCreateAccount(
        db,
        {
            parent_id:
                expenses.id,

            code:
                "502",

            name:
                "بهای تمام‌شده فروش",

            account_type:
                "expense",

            normal_balance:
                "debit",

            level:
                2,

            description:
                "بهای تمام‌شده کالا و مواد مصرف‌شده در فروش"
        }
    );


    /*
     * -------------------------------------------------
     * کنترل وجود حساب فروش
     * -------------------------------------------------
     */

    const salesAccount =
        getAccountByCode(
            db,
            "401"
        );

    if (!salesAccount) {
        throw new Error(
            "حساب فروش 401 پیدا نشد."
        );
    }

    if (
        salesAccount.account_type !==
        "revenue"
    ) {
        throw new Error(
            "حساب 401 باید از نوع revenue باشد."
        );
    }

    if (
        salesAccount.normal_balance !==
        "credit"
    ) {
        throw new Error(
            "ماهیت حساب 401 باید credit باشد."
        );
    }
}


module.exports = {
    up
};