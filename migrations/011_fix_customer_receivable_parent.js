function up(db) {

    const assets =
        db
            .prepare(`
                SELECT
                    id,
                    code,
                    account_type,
                    normal_balance
                FROM accounts
                WHERE code = '1'
            `)
            .get();

    if (!assets) {
        throw new Error(
            "حساب دارایی‌ها پیدا نشد."
        );
    }

    const customerReceivables =
        db
            .prepare(`
                SELECT
                    id,
                    code,
                    account_type,
                    normal_balance
                FROM accounts
                WHERE code = '202'
            `)
            .get();

    if (!customerReceivables) {
        throw new Error(
            "حساب دریافتنی مشتریان پیدا نشد."
        );
    }

    if (
        customerReceivables.account_type !==
        "asset"
    ) {
        throw new Error(
            "نوع حساب دریافتنی مشتریان باید asset باشد."
        );
    }

    if (
        customerReceivables.normal_balance !==
        "debit"
    ) {
        throw new Error(
            "ماهیت حساب دریافتنی مشتریان باید debit باشد."
        );
    }

    db.prepare(`
        UPDATE accounts
        SET
            parent_id = ?,
            account_type = 'asset',
            normal_balance = 'debit',
            level = 2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(
        assets.id,
        customerReceivables.id
    );
}

module.exports = {
    up
};