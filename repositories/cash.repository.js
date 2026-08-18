function getCashRegisterById(
    db,
    cashRegisterId
) {
    return db
        .prepare(`
            SELECT
                cr.*,
                b.code AS branch_code,
                b.name AS branch_name,
                a.code AS account_code,
                a.name AS account_name
            FROM cash_registers cr
            LEFT JOIN branches b
                ON b.id = cr.branch_id
            LEFT JOIN accounts a
                ON a.id = cr.account_id
            WHERE cr.id = ?
        `)
        .get(cashRegisterId);
}


function getCashRegisterByCode(
    db,
    code
) {
    return db
        .prepare(`
            SELECT
                cr.*,
                b.code AS branch_code,
                b.name AS branch_name,
                a.code AS account_code,
                a.name AS account_name
            FROM cash_registers cr
            LEFT JOIN branches b
                ON b.id = cr.branch_id
            LEFT JOIN accounts a
                ON a.id = cr.account_id
            WHERE cr.code = ?
        `)
        .get(code);
}


function getCashRegisters(
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
            "cr.branch_id = @branch_id"
        );

        params.branch_id =
            filters.branch_id;
    }

    if (
        filters.is_active !== undefined &&
        filters.is_active !== null
    ) {
        conditions.push(
            "cr.is_active = @is_active"
        );

        params.is_active =
            Number(filters.is_active);
    }

    if (
        filters.is_main !== undefined &&
        filters.is_main !== null
    ) {
        conditions.push(
            "cr.is_main = @is_main"
        );

        params.is_main =
            Number(filters.is_main);
    }

    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

    return db
        .prepare(`
            SELECT
                cr.*,
                b.code AS branch_code,
                b.name AS branch_name,
                a.code AS account_code,
                a.name AS account_name
            FROM cash_registers cr
            LEFT JOIN branches b
                ON b.id = cr.branch_id
            LEFT JOIN accounts a
                ON a.id = cr.account_id
            ${whereClause}
            ORDER BY
                cr.is_main DESC,
                cr.name,
                cr.id
        `)
        .all(params);
}


function insertCashRegister(
    db,
    cash
) {
    const result =
        db
            .prepare(`
                INSERT INTO cash_registers (
                    branch_id,
                    code,
                    name,
                    description,
                    opening_balance,
                    is_main,
                    is_active,
                    account_id
                )
                VALUES (
                    @branch_id,
                    @code,
                    @name,
                    @description,
                    @opening_balance,
                    @is_main,
                    @is_active,
                    @account_id
                )
            `)
            .run({
                branch_id:
                    cash.branch_id ??
                    null,

                code:
                    cash.code,

                name:
                    cash.name,

                description:
                    cash.description ??
                    null,

                opening_balance:
                    cash.opening_balance ??
                    0,

                is_main:
                    cash.is_main === undefined
                        ? 0
                        : cash.is_main,

                is_active:
                    cash.is_active === undefined
                        ? 1
                        : cash.is_active,

                account_id:
                    cash.account_id ??
                    null
            });

    return result.lastInsertRowid;
}


function updateCashRegister(
    db,
    cash
) {
    return db
        .prepare(`
            UPDATE cash_registers
            SET
                branch_id = @branch_id,
                code = @code,
                name = @name,
                description = @description,
                is_main = @is_main,
                is_active = @is_active,
                account_id = @account_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `)
        .run({
            id:
                cash.id,

            branch_id:
                cash.branch_id ??
                null,

            code:
                cash.code,

            name:
                cash.name,

            description:
                cash.description ??
                null,

            is_main:
                cash.is_main === undefined
                    ? 0
                    : cash.is_main,

            is_active:
                cash.is_active === undefined
                    ? 1
                    : cash.is_active,

            account_id:
                cash.account_id ??
                null
        })
        .changes;
}


function getCashBalance(
    db,
    cashRegisterId
) {
    const row =
        db
            .prepare(`
                SELECT
                    cr.id,
                    cr.opening_balance,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN ct.direction = 'in'
                                    THEN ct.amount
                                WHEN ct.direction = 'out'
                                    THEN -ct.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS transaction_balance

                FROM cash_registers cr

                LEFT JOIN cash_transactions ct
                    ON ct.cash_register_id = cr.id

                WHERE cr.id = ?

                GROUP BY
                    cr.id,
                    cr.opening_balance
            `)
            .get(cashRegisterId);

    if (!row) {
        return null;
    }

    return {
        cash_register_id:
            row.id,

        opening_balance:
            Number(row.opening_balance || 0),

        transaction_balance:
            Number(row.transaction_balance || 0),

        balance:
            Number(row.opening_balance || 0) +
            Number(row.transaction_balance || 0)
    };
}


function getCashTransactionById(
    db,
    transactionId
) {
    return db
        .prepare(`
            SELECT
                ct.*,

                cr.code AS cash_register_code,
                cr.name AS cash_register_name,

                u.username,
                u.full_name

            FROM cash_transactions ct

            INNER JOIN cash_registers cr
                ON cr.id = ct.cash_register_id

            LEFT JOIN users u
                ON u.id = (
                    SELECT
                        created_by_user_id
                    FROM expenses
                    WHERE id = ct.reference_id
                      AND ct.reference_type = 'expense'
                    LIMIT 1
                )

            WHERE ct.id = ?
        `)
        .get(transactionId);
}


function getCashTransactions(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.cash_register_id !== undefined &&
        filters.cash_register_id !== null
    ) {
        conditions.push(
            "ct.cash_register_id = @cash_register_id"
        );

        params.cash_register_id =
            filters.cash_register_id;
    }

    if (
        filters.transaction_type !== undefined &&
        filters.transaction_type !== null &&
        filters.transaction_type !== ""
    ) {
        conditions.push(
            "ct.transaction_type = @transaction_type"
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
            "ct.direction = @direction"
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
            "ct.reference_type = @reference_type"
        );

        params.reference_type =
            filters.reference_type;
    }

    if (
        filters.reference_id !== undefined &&
        filters.reference_id !== null
    ) {
        conditions.push(
            "ct.reference_id = @reference_id"
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
            "ct.transaction_date >= @from_date"
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
            "ct.transaction_date <= @to_date"
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
                ct.*,

                cr.code AS cash_register_code,
                cr.name AS cash_register_name

            FROM cash_transactions ct

            INNER JOIN cash_registers cr
                ON cr.id = ct.cash_register_id

            ${whereClause}

            ORDER BY
                ct.transaction_date DESC,
                ct.id DESC

            LIMIT @limit
            OFFSET @offset
        `)
        .all({
            ...params,
            limit,
            offset
        });
}


function countCashTransactions(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.cash_register_id !== undefined &&
        filters.cash_register_id !== null
    ) {
        conditions.push(
            "cash_register_id = @cash_register_id"
        );

        params.cash_register_id =
            filters.cash_register_id;
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
            FROM cash_transactions
            ${whereClause}
        `)
        .get(params)
        .total;
}


function getCashSummary(
    db,
    cashRegisterId,
    {
        from_date = null,
        to_date = null
    } = {}
) {
    const conditions = [
        "cash_register_id = @cash_register_id"
    ];

    const params = {
        cash_register_id:
            cashRegisterId
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

    const whereClause =
        conditions.join(" AND ");

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

                FROM cash_transactions

                WHERE ${whereClause}
            `)
            .get(params);

    const balance =
        getCashBalance(
            db,
            cashRegisterId
        );

    return {
        cash_register_id:
            cashRegisterId,

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


function getCashTransactionsByReference(
    db,
    referenceType,
    referenceId
) {
    return db
        .prepare(`
            SELECT
                ct.*,

                cr.code AS cash_register_code,
                cr.name AS cash_register_name

            FROM cash_transactions ct

            INNER JOIN cash_registers cr
                ON cr.id = ct.cash_register_id

            WHERE
                ct.reference_type = ?
                AND ct.reference_id = ?

            ORDER BY
                ct.id
        `)
        .all(
            referenceType,
            referenceId
        );
}



function insertCashTransaction(
    db,
    transaction
) {
    const result =
        db
            .prepare(`
                INSERT INTO cash_transactions (
                    cash_register_id,
                    transaction_type,
                    amount,
                    direction,
                    reference_type,
                    reference_id,
                    description,
                    transaction_date
                )
                VALUES (
                    @cash_register_id,
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
                cash_register_id:
                    transaction.cash_register_id,

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


module.exports = {
    getCashRegisterById,
    getCashRegisterByCode,
    getCashRegisters,

    insertCashRegister,
    updateCashRegister,

    getCashBalance,

    getCashTransactionById,
    getCashTransactions,
    countCashTransactions,
    getCashSummary,
    getCashTransactionsByReference,
insertCashTransaction,
};