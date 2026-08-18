function getBankAccountById(
    db,
    bankAccountId
) {
    return db
        .prepare(`
            SELECT
                ba.*,
                b.code AS branch_code,
                b.name AS branch_name,
                a.code AS account_code,
                a.name AS account_name
            FROM bank_accounts ba
            LEFT JOIN branches b
                ON b.id = ba.branch_id
            LEFT JOIN accounts a
                ON a.id = ba.account_id
            WHERE ba.id = ?
        `)
        .get(bankAccountId);
}


function getBankAccountByCode(
    db,
    code
) {
    return db
        .prepare(`
            SELECT
                ba.*,
                b.code AS branch_code,
                b.name AS branch_name,
                a.code AS account_code,
                a.name AS account_name
            FROM bank_accounts ba
            LEFT JOIN branches b
                ON b.id = ba.branch_id
            LEFT JOIN accounts a
                ON a.id = ba.account_id
            WHERE ba.code = ?
        `)
        .get(code);
}


function getBankAccounts(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.branch_id !== undefined &&
        filters.branch_id !== null
    ) {
        conditions.push(
            "ba.branch_id = @branch_id"
        );

        params.branch_id =
            filters.branch_id;
    }

    if (
        filters.is_active !== undefined &&
        filters.is_active !== null
    ) {
        conditions.push(
            "ba.is_active = @is_active"
        );

        params.is_active =
            Number(filters.is_active);
    }

    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

    return db
        .prepare(`
            SELECT
                ba.*,
                b.code AS branch_code,
                b.name AS branch_name,
                a.code AS account_code,
                a.name AS account_name
            FROM bank_accounts ba
            LEFT JOIN branches b
                ON b.id = ba.branch_id
            LEFT JOIN accounts a
                ON a.id = ba.account_id
            ${whereClause}
            ORDER BY
                ba.name,
                ba.id
        `)
        .all(params);
}


function insertBankAccount(
    db,
    bank
) {
    const result =
        db
            .prepare(`
                INSERT INTO bank_accounts (
                    branch_id,
                    code,
                    name,
                    bank_name,
                    account_number,
                    iban,
                    card_number,
                    description,
                    is_active,
                    account_id
                )
                VALUES (
                    @branch_id,
                    @code,
                    @name,
                    @bank_name,
                    @account_number,
                    @iban,
                    @card_number,
                    @description,
                    @is_active,
                    @account_id
                )
            `)
            .run({
                branch_id:
                    bank.branch_id ??
                    null,

                code:
                    bank.code,

                name:
                    bank.name,

                bank_name:
                    bank.bank_name ??
                    null,

                account_number:
                    bank.account_number ??
                    null,

                iban:
                    bank.iban ??
                    null,

                card_number:
                    bank.card_number ??
                    null,

                description:
                    bank.description ??
                    null,

                is_active:
                    bank.is_active === undefined
                        ? 1
                        : bank.is_active,

                account_id:
                    bank.account_id ??
                    null
            });

    return result.lastInsertRowid;
}


function updateBankAccount(
    db,
    bank
) {
    return db
        .prepare(`
            UPDATE bank_accounts
            SET
                branch_id = @branch_id,
                code = @code,
                name = @name,
                bank_name = @bank_name,
                account_number = @account_number,
                iban = @iban,
                card_number = @card_number,
                description = @description,
                is_active = @is_active,
                account_id = @account_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `)
        .run({
            id:
                bank.id,

            branch_id:
                bank.branch_id ??
                null,

            code:
                bank.code,

            name:
                bank.name,

            bank_name:
                bank.bank_name ??
                null,

            account_number:
                bank.account_number ??
                null,

            iban:
                bank.iban ??
                null,

            card_number:
                bank.card_number ??
                null,

            description:
                bank.description ??
                null,

            is_active:
                bank.is_active === undefined
                    ? 1
                    : bank.is_active,

            account_id:
                bank.account_id ??
                null
        })
        .changes;
}


function insertBankTransaction(
    db,
    transaction
) {
    const result =
        db
            .prepare(`
                INSERT INTO bank_transactions (
                    bank_account_id,
                    transaction_type,
                    amount,
                    direction,
                    reference_type,
                    reference_id,
                    description,
                    transaction_date
                )
                VALUES (
                    @bank_account_id,
                    @transaction_type,
                    @amount,
                    @direction,
                    @reference_type,
                    @reference_id,
                    @description,
                    @transaction_date
                )
            `)
            .run({
                bank_account_id:
                    transaction.bank_account_id,

                transaction_type:
                    transaction.transaction_type,

                amount:
                    transaction.amount,

                direction:
                    transaction.direction,

                reference_type:
                    transaction.reference_type ??
                    null,

                reference_id:
                    transaction.reference_id ??
                    null,

                description:
                    transaction.description ??
                    null,

                transaction_date:
                    transaction.transaction_date
            });

    return result.lastInsertRowid;
}


function getBankTransactionById(
    db,
    transactionId
) {
    return db
        .prepare(`
            SELECT
                bt.*,

                ba.code AS bank_account_code,
                ba.name AS bank_account_name

            FROM bank_transactions bt

            INNER JOIN bank_accounts ba
                ON ba.id = bt.bank_account_id

            WHERE bt.id = ?
        `)
        .get(transactionId);
}


function getBankTransactions(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.bank_account_id !== undefined &&
        filters.bank_account_id !== null
    ) {
        conditions.push(
            "bt.bank_account_id = @bank_account_id"
        );

        params.bank_account_id =
            filters.bank_account_id;
    }

    if (
        filters.transaction_type !== undefined &&
        filters.transaction_type !== null &&
        filters.transaction_type !== ""
    ) {
        conditions.push(
            "bt.transaction_type = @transaction_type"
        );

        params.transaction_type =
            filters.transaction_type;
    }

    if (
        filters.direction !== undefined &&
        filters.direction !== null &&
        filters.direction !== ""
    ) {
        conditions.push(
            "bt.direction = @direction"
        );

        params.direction =
            filters.direction;
    }

    if (
        filters.reference_type !== undefined &&
        filters.reference_type !== null &&
        filters.reference_type !== ""
    ) {
        conditions.push(
            "bt.reference_type = @reference_type"
        );

        params.reference_type =
            filters.reference_type;
    }

    if (
        filters.reference_id !== undefined &&
        filters.reference_id !== null
    ) {
        conditions.push(
            "bt.reference_id = @reference_id"
        );

        params.reference_id =
            filters.reference_id;
    }

    if (
        filters.from_date !== undefined &&
        filters.from_date !== null &&
        filters.from_date !== ""
    ) {
        conditions.push(
            "bt.transaction_date >= @from_date"
        );

        params.from_date =
            filters.from_date;
    }

    if (
        filters.to_date !== undefined &&
        filters.to_date !== null &&
        filters.to_date !== ""
    ) {
        conditions.push(
            "bt.transaction_date <= @to_date"
        );

        params.to_date =
            filters.to_date;
    }

    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

    const limit =
        Number.isInteger(filters.limit) &&
        filters.limit > 0
            ? filters.limit
            : 100;

    const offset =
        Number.isInteger(filters.offset) &&
        filters.offset >= 0
            ? filters.offset
            : 0;

    return db
        .prepare(`
            SELECT
                bt.*,

                ba.code AS bank_account_code,
                ba.name AS bank_account_name

            FROM bank_transactions bt

            INNER JOIN bank_accounts ba
                ON ba.id = bt.bank_account_id

            ${whereClause}

            ORDER BY
                bt.transaction_date DESC,
                bt.id DESC

            LIMIT @limit
            OFFSET @offset
        `)
        .all({
            ...params,
            limit,
            offset
        });
}


function countBankTransactions(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.bank_account_id !== undefined &&
        filters.bank_account_id !== null
    ) {
        conditions.push(
            "bank_account_id = @bank_account_id"
        );

        params.bank_account_id =
            filters.bank_account_id;
    }

    if (
        filters.transaction_type !== undefined &&
        filters.transaction_type !== null &&
        filters.transaction_type !== ""
    ) {
        conditions.push(
            "transaction_type = @transaction_type"
        );

        params.transaction_type =
            filters.transaction_type;
    }

    if (
        filters.direction !== undefined &&
        filters.direction !== null &&
        filters.direction !== ""
    ) {
        conditions.push(
            "direction = @direction"
        );

        params.direction =
            filters.direction;
    }

    if (
        filters.reference_type !== undefined &&
        filters.reference_type !== null &&
        filters.reference_type !== ""
    ) {
        conditions.push(
            "reference_type = @reference_type"
        );

        params.reference_type =
            filters.reference_type;
    }

    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

    return db
        .prepare(`
            SELECT
                COUNT(*) AS total
            FROM bank_transactions
            ${whereClause}
        `)
        .get(params)
        .total;
}


function getBankBalance(
    db,
    bankAccountId
) {
    const row =
        db
            .prepare(`
                SELECT
                    ba.id,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN bt.direction = 'in'
                                    THEN bt.amount
                                WHEN bt.direction = 'out'
                                    THEN -bt.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS transaction_balance

                FROM bank_accounts ba

                LEFT JOIN bank_transactions bt
                    ON bt.bank_account_id = ba.id

                WHERE ba.id = ?

                GROUP BY
                    ba.id
            `)
            .get(bankAccountId);

    if (!row) {
        return null;
    }

    return {
        bank_account_id:
            row.id,

        transaction_balance:
            Number(
                row.transaction_balance || 0
            ),

        balance:
            Number(
                row.transaction_balance || 0
            )
    };
}


function getBankSummary(
    db,
    bankAccountId,
    {
        from_date = null,
        to_date = null
    } = {}
) {
    const conditions = [
        "bank_account_id = @bank_account_id"
    ];

    const params = {
        bank_account_id:
            bankAccountId
    };

    if (
        from_date !== null &&
        from_date !== undefined &&
        from_date !== ""
    ) {
        conditions.push(
            "transaction_date >= @from_date"
        );

        params.from_date =
            from_date;
    }

    if (
        to_date !== null &&
        to_date !== undefined &&
        to_date !== ""
    ) {
        conditions.push(
            "transaction_date <= @to_date"
        );

        params.to_date =
            to_date;
    }

    const row =
        db
            .prepare(`
                SELECT
                    COALESCE(
                        SUM(
                            CASE
                                WHEN direction = 'in'
                                    THEN amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_in,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN direction = 'out'
                                    THEN amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_out,

                    COUNT(*) AS transaction_count

                FROM bank_transactions

                WHERE ${conditions.join(" AND ")}
            `)
            .get(params);

    const balance =
        getBankBalance(
            db,
            bankAccountId
        );

    return {
        bank_account_id:
            bankAccountId,

        total_in:
            Number(row.total_in || 0),

        total_out:
            Number(row.total_out || 0),

        net_change:
            Number(row.total_in || 0) -
            Number(row.total_out || 0),

        transaction_count:
            Number(row.transaction_count || 0),

        current_balance:
            balance
                ? balance.balance
                : null
    };
}


function getBankTransactionsByReference(
    db,
    referenceType,
    referenceId
) {
    return db
        .prepare(`
            SELECT
                bt.*,

                ba.code AS bank_account_code,
                ba.name AS bank_account_name

            FROM bank_transactions bt

            INNER JOIN bank_accounts ba
                ON ba.id = bt.bank_account_id

            WHERE
                bt.reference_type = ?
                AND bt.reference_id = ?

            ORDER BY
                bt.id
        `)
        .all(
            referenceType,
            referenceId
        );
}


module.exports = {
    getBankAccountById,
    getBankAccountByCode,
    getBankAccounts,

    insertBankAccount,
    updateBankAccount,

    insertBankTransaction,
    getBankTransactionById,
    getBankTransactions,
    countBankTransactions,

    getBankBalance,
    getBankSummary,
    getBankTransactionsByReference
};