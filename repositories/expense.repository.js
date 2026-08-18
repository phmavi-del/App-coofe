function insertExpense(
    db,
    expense
) {
    const result = db
        .prepare(`
            INSERT INTO expenses (
                expense_number,
                account_id,
                payment_method,
                cash_register_id,
                bank_account_id,
                amount,
                expense_date,
                status,
                created_by_user_id,
                reference_number,
                description
            )
            VALUES (
                @expense_number,
                @account_id,
                @payment_method,
                @cash_register_id,
                @bank_account_id,
                @amount,
                @expense_date,
                @status,
                @created_by_user_id,
                @reference_number,
                @description
            )
        `)
        .run({
            expense_number:
                expense.expense_number,

            account_id:
                expense.account_id,

            payment_method:
                expense.payment_method,

            cash_register_id:
                expense.cash_register_id ??
                null,

            bank_account_id:
                expense.bank_account_id ??
                null,

            amount:
                expense.amount,

            expense_date:
                expense.expense_date,

            status:
                expense.status ||
                "completed",

            created_by_user_id:
                expense.created_by_user_id,

            reference_number:
                expense.reference_number ??
                null,

            description:
                expense.description ??
                null
        });

    return result.lastInsertRowid;
}


function getExpenseById(
    db,
    expenseId
) {
    return db
        .prepare(`
            SELECT
                e.*,

                a.code AS account_code,
                a.name AS account_name,

                cr.code AS cash_register_code,
                cr.name AS cash_register_name,

                ba.code AS bank_account_code,
                ba.name AS bank_account_name,

                u.username,
                u.full_name

            FROM expenses e

            INNER JOIN accounts a
                ON a.id = e.account_id

            LEFT JOIN cash_registers cr
                ON cr.id = e.cash_register_id

            LEFT JOIN bank_accounts ba
                ON ba.id = e.bank_account_id

            INNER JOIN users u
                ON u.id = e.created_by_user_id

            WHERE e.id = ?
        `)
        .get(expenseId);
}


function getExpenses(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.status !== undefined &&
        filters.status !== null &&
        filters.status !== ""
    ) {
        conditions.push(
            "e.status = @status"
        );

        params.status =
            filters.status;
    }

    if (
        filters.payment_method !== undefined &&
        filters.payment_method !== null &&
        filters.payment_method !== ""
    ) {
        conditions.push(
            "e.payment_method = @payment_method"
        );

        params.payment_method =
            filters.payment_method;
    }

    if (
        filters.account_id !== undefined &&
        filters.account_id !== null
    ) {
        conditions.push(
            "e.account_id = @account_id"
        );

        params.account_id =
            filters.account_id;
    }

    if (
        filters.cash_register_id !== undefined &&
        filters.cash_register_id !== null
    ) {
        conditions.push(
            "e.cash_register_id = @cash_register_id"
        );

        params.cash_register_id =
            filters.cash_register_id;
    }

    if (
        filters.bank_account_id !== undefined &&
        filters.bank_account_id !== null
    ) {
        conditions.push(
            "e.bank_account_id = @bank_account_id"
        );

        params.bank_account_id =
            filters.bank_account_id;
    }

    if (
        filters.created_by_user_id !== undefined &&
        filters.created_by_user_id !== null
    ) {
        conditions.push(
            "e.created_by_user_id = @created_by_user_id"
        );

        params.created_by_user_id =
            filters.created_by_user_id;
    }

    if (
        filters.from_date !== undefined &&
        filters.from_date !== null &&
        filters.from_date !== ""
    ) {
        conditions.push(
            "e.expense_date >= @from_date"
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
            "e.expense_date <= @to_date"
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
                e.*,

                a.code AS account_code,
                a.name AS account_name,

                cr.code AS cash_register_code,
                cr.name AS cash_register_name,

                ba.code AS bank_account_code,
                ba.name AS bank_account_name,

                u.username,
                u.full_name

            FROM expenses e

            INNER JOIN accounts a
                ON a.id = e.account_id

            LEFT JOIN cash_registers cr
                ON cr.id = e.cash_register_id

            LEFT JOIN bank_accounts ba
                ON ba.id = e.bank_account_id

            INNER JOIN users u
                ON u.id = e.created_by_user_id

            ${whereClause}

            ORDER BY
                e.id DESC

            LIMIT @limit
            OFFSET @offset
        `)
        .all({
            ...params,
            limit,
            offset
        });
}


function countExpenses(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.status !== undefined &&
        filters.status !== null &&
        filters.status !== ""
    ) {
        conditions.push(
            "status = @status"
        );

        params.status =
            filters.status;
    }

    if (
        filters.payment_method !== undefined &&
        filters.payment_method !== null &&
        filters.payment_method !== ""
    ) {
        conditions.push(
            "payment_method = @payment_method"
        );

        params.payment_method =
            filters.payment_method;
    }

    if (
        filters.account_id !== undefined &&
        filters.account_id !== null
    ) {
        conditions.push(
            "account_id = @account_id"
        );

        params.account_id =
            filters.account_id;
    }

    if (
        filters.from_date !== undefined &&
        filters.from_date !== null &&
        filters.from_date !== ""
    ) {
        conditions.push(
            "expense_date >= @from_date"
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
            "expense_date <= @to_date"
        );

        params.to_date =
            filters.to_date;
    }

    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

    const row = db
        .prepare(`
            SELECT
                COUNT(*) AS total
            FROM expenses
            ${whereClause}
        `)
        .get(params);

    return row.total;
}


function insertCashTransaction(
    db,
    transaction
) {
    const result = db
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


function insertBankTransaction(
    db,
    transaction
) {
    const result = db
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


module.exports = {
    insertExpense,
    getExpenseById,
    getExpenses,
    countExpenses,
    insertCashTransaction,
    insertBankTransaction
};