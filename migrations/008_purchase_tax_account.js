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

    /*
     * دارایی‌ها
     */
    const assets =
        getAccountByCode(
            db,
            "1"
        );

    if (!assets) {
        throw new Error(
            "حساب دارایی‌ها پیدا نشد."
        );
    }


    /*
     * حساب مالیات خرید.
     *
     * این حساب به‌صورت دارایی در نظر گرفته می‌شود
     * تا مالیات خرید قابل تفکیک از موجودی کالا باشد.
     */
    getOrCreateAccount(
        db,
        {
            parent_id:
                assets.id,

            code:
                "104",

            name:
                "مالیات خرید",

            account_type:
                "asset",

            normal_balance:
                "debit",

            level:
                2,

            description:
                "مالیات و ارزش افزوده خرید"
        }
    );
}


module.exports = {
    up
};