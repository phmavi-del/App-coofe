function up(db) {

    /*
     * جلوگیری از ثبت Reference Number تکراری
     * برای تسویه‌های بعدی.
     *
     * رکوردهای قدیمی موجود دست‌کاری نمی‌شوند.
     */
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS
        trg_customer_settlement_duplicate_reference
        BEFORE INSERT ON customer_settlements
        WHEN NEW.reference_number IS NOT NULL
         AND EXISTS (
             SELECT 1
             FROM customer_settlements cs
             WHERE cs.payment_method =
                   NEW.payment_method
               AND (
                    (
                        NEW.payment_method = 'card'
                        AND cs.bank_account_id =
                            NEW.bank_account_id
                    )
                    OR
                    (
                        NEW.payment_method = 'cash'
                        AND cs.cash_register_id =
                            NEW.cash_register_id
                    )
               )
               AND cs.reference_number =
                   NEW.reference_number
        )
        BEGIN
            SELECT RAISE(
                ABORT,
                'شماره مرجع تسویه قبلاً ثبت شده است.'
            );
        END;
    `);


    /*
     * جلوگیری از Terminal Reference تکراری
     * برای کارت‌خوان.
     */
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS
        trg_customer_settlement_duplicate_terminal
        BEFORE INSERT ON customer_settlements
        WHEN NEW.payment_method = 'card'
         AND NEW.terminal_reference IS NOT NULL
         AND EXISTS (
             SELECT 1
             FROM customer_settlements cs
             WHERE cs.payment_method = 'card'
               AND cs.bank_account_id =
                   NEW.bank_account_id
               AND cs.terminal_reference =
                   NEW.terminal_reference
        )
        BEGIN
            SELECT RAISE(
                ABORT,
                'شماره مرجع کارت‌خوان قبلاً ثبت شده است.'
            );
        END;
    `);


    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_customer_settlements_reference
        ON customer_settlements(
            payment_method,
            reference_number
        )
    `);


    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_customer_settlements_terminal
        ON customer_settlements(
            payment_method,
            bank_account_id,
            terminal_reference
        )
    `);
}


module.exports = {
    up
};