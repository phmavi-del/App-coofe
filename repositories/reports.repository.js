function getTrialBalance(
    db,
    filters = {}
) {
    const params = {};

    const conditions = [
        "je.status = 'posted'"
    ];

    if (
        filters.from_date !== undefined &&
        filters.from_date !== null &&
        filters.from_date !== ""
    ) {
        conditions.push(
            "je.entry_date >= @from_date"
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
            "je.entry_date <= @to_date"
        );

        params.to_date =
            filters.to_date;
    }

    if (
        filters.account_id !== undefined &&
        filters.account_id !== null
    ) {
        conditions.push(
            "a.id = @account_id"
        );

        params.account_id =
            filters.account_id;
    }

    const rows =
        db
            .prepare(`
                SELECT
                    a.id AS account_id,
                    a.code AS account_code,
                    a.name AS account_name,
                    a.account_type,
                    a.normal_balance,
                    a.parent_id,

                    COALESCE(
                        SUM(jl.debit),
                        0
                    ) AS total_debit,

                    COALESCE(
                        SUM(jl.credit),
                        0
                    ) AS total_credit

                FROM accounts a

                LEFT JOIN journal_lines jl
                    ON jl.account_id = a.id

                LEFT JOIN journal_entries je
                    ON je.id = jl.journal_entry_id
                    AND ${conditions.join(" AND ")}

                WHERE a.is_active = 1

                GROUP BY
                    a.id,
                    a.code,
                    a.name,
                    a.account_type,
                    a.normal_balance,
                    a.parent_id

                ORDER BY
                    a.code
            `)
            .all(params);

    return rows.map(
        row => ({
            ...row,

            total_debit:
                Number(
                    row.total_debit || 0
                ),

            total_credit:
                Number(
                    row.total_credit || 0
                ),

            balance:
                Number(
                    row.total_debit || 0
                ) -
                Number(
                    row.total_credit || 0
                )
        })
    );
}


function getGeneralLedger(
    db,
    filters = {}
) {
    const conditions = [
        "je.status = 'posted'"
    ];

    const params = {};

    if (
        filters.account_id !== undefined &&
        filters.account_id !== null
    ) {
        conditions.push(
            "jl.account_id = @account_id"
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
            "je.entry_date >= @from_date"
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
            "je.entry_date <= @to_date"
        );

        params.to_date =
            filters.to_date;
    }

    if (
        filters.reference_type !== undefined &&
        filters.reference_type !== null &&
        filters.reference_type !== ""
    ) {
        conditions.push(
            "je.reference_type = @reference_type"
        );

        params.reference_type =
            filters.reference_type;
    }

    if (
        filters.reference_id !== undefined &&
        filters.reference_id !== null
    ) {
        conditions.push(
            "je.reference_id = @reference_id"
        );

        params.reference_id =
            filters.reference_id;
    }

    const rows =
        db
            .prepare(`
                SELECT
                    jl.id AS journal_line_id,

                    je.id AS journal_entry_id,
                    je.entry_number,
                    je.entry_date,
                    je.reference_type,
                    je.reference_id,
                    je.description AS entry_description,
                    je.status,

                    a.id AS account_id,
                    a.code AS account_code,
                    a.name AS account_name,
                    a.account_type,
                    a.normal_balance,

                    jl.debit,
                    jl.credit,
                    jl.description AS line_description

                FROM journal_lines jl

                INNER JOIN journal_entries je
                    ON je.id = jl.journal_entry_id

                INNER JOIN accounts a
                    ON a.id = jl.account_id

                WHERE
                    ${conditions.join(" AND ")}

                ORDER BY
                    je.entry_date,
                    je.entry_number,
                    jl.id
            `)
            .all(params);

    let runningBalance = 0;

    return rows.map(
        row => {
            runningBalance +=
                Number(row.debit || 0) -
                Number(row.credit || 0);

            return {
                ...row,

                debit:
                    Number(
                        row.debit || 0
                    ),

                credit:
                    Number(
                        row.credit || 0
                    ),

                running_balance:
                    runningBalance
            };
        }
    );
}


function getAccountLedger(
    db,
    accountId,
    filters = {}
) {
    return getGeneralLedger(
        db,
        {
            ...filters,
            account_id: accountId
        }
    );
}


function getJournalSummary(
    db,
    filters = {}
) {
    const conditions = [
        "status = 'posted'"
    ];

    const params = {};

    if (
        filters.from_date !== undefined &&
        filters.from_date !== null &&
        filters.from_date !== ""
    ) {
        conditions.push(
            "entry_date >= @from_date"
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
            "entry_date <= @to_date"
        );

        params.to_date =
            filters.to_date;
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

    return db
        .prepare(`
            SELECT
                COUNT(*) AS journal_entry_count,

                COALESCE(
                    SUM(
                        (
                            SELECT
                                COALESCE(
                                    SUM(jl.debit),
                                    0
                                )
                            FROM journal_lines jl
                            WHERE
                                jl.journal_entry_id =
                                journal_entries.id
                        )
                    ),
                    0
                ) AS total_debit,

                COALESCE(
                    SUM(
                        (
                            SELECT
                                COALESCE(
                                    SUM(jl.credit),
                                    0
                                )
                            FROM journal_lines jl
                            WHERE
                                jl.journal_entry_id =
                                journal_entries.id
                        )
                    ),
                    0
                ) AS total_credit

            FROM journal_entries

            WHERE
                ${conditions.join(" AND ")}
        `)
        .get(params);
}


function getIncomeStatement(
    db,
    filters = {}
) {
    const conditions = [
        "je.status = 'posted'"
    ];

    const params = {};

    if (
        filters.from_date !== undefined &&
        filters.from_date !== null &&
        filters.from_date !== ""
    ) {
        conditions.push(
            "je.entry_date >= @from_date"
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
            "je.entry_date <= @to_date"
        );

        params.to_date =
            filters.to_date;
    }

    return db
        .prepare(`
            SELECT
                a.id AS account_id,
                a.code AS account_code,
                a.name AS account_name,
                a.account_type,
                a.normal_balance,

                COALESCE(
                    SUM(jl.debit),
                    0
                ) AS total_debit,

                COALESCE(
                    SUM(jl.credit),
                    0
                ) AS total_credit

            FROM accounts a

            INNER JOIN journal_lines jl
                ON jl.account_id = a.id

            INNER JOIN journal_entries je
                ON je.id = jl.journal_entry_id

            WHERE
                ${conditions.join(" AND ")}

               AND a.account_type IN (
    'revenue',
    'expense'
)

            GROUP BY
                a.id,
                a.code,
                a.name,
                a.account_type,
                a.normal_balance

            ORDER BY
                a.account_type,
                a.code
        `)
        .all(params)
        .map(
            row => ({
                ...row,

                total_debit:
                    Number(
                        row.total_debit || 0
                    ),

                total_credit:
                    Number(
                        row.total_credit || 0
                    ),

               amount:
    row.account_type === "revenue"
        ? Number(
            row.total_credit || 0
        ) -
        Number(
            row.total_debit || 0
        )
        : Number(
            row.total_debit || 0
        ) -
        Number(
            row.total_credit || 0
        )
            })
        );
}


function getBalanceSheet(
    db,
    filters = {}
) {
    const conditions = [
        "je.status = 'posted'"
    ];

    const params = {};

    if (
        filters.to_date !== undefined &&
        filters.to_date !== null &&
        filters.to_date !== ""
    ) {
        conditions.push(
            "je.entry_date <= @to_date"
        );

        params.to_date =
            filters.to_date;
    }

    return db
        .prepare(`
            SELECT
                a.id AS account_id,
                a.code AS account_code,
                a.name AS account_name,
                a.account_type,
                a.normal_balance,

                COALESCE(
                    SUM(jl.debit),
                    0
                ) AS total_debit,

                COALESCE(
                    SUM(jl.credit),
                    0
                ) AS total_credit

            FROM accounts a

            LEFT JOIN journal_lines jl
                ON jl.account_id = a.id

            LEFT JOIN journal_entries je
                ON je.id = jl.journal_entry_id
                AND ${conditions.join(" AND ")}

            WHERE
                a.account_type IN (
                    'asset',
                    'liability',
                    'equity'
                )
                AND a.is_active = 1

            GROUP BY
                a.id,
                a.code,
                a.name,
                a.account_type,
                a.normal_balance

            ORDER BY
                a.account_type,
                a.code
        `)
        .all(params)
        .map(
            row => ({
                ...row,

                total_debit:
                    Number(
                        row.total_debit || 0
                    ),

                total_credit:
                    Number(
                        row.total_credit || 0
                    ),

                balance:
                    row.normal_balance === "debit"
                        ? Number(
                            row.total_debit || 0
                        ) -
                        Number(
                            row.total_credit || 0
                        )
                        : Number(
                            row.total_credit || 0
                        ) -
                        Number(
                            row.total_debit || 0
                        )
            })
        );
}


function getReferenceJournal(
    db,
    referenceType,
    referenceId
) {
    const entries =
        db
            .prepare(`
                SELECT
                    je.*

                FROM journal_entries je

                WHERE
                    je.reference_type = ?
                    AND je.reference_id = ?

                ORDER BY
                    je.id
            `)
            .all(
                referenceType,
                referenceId
            );

    return entries.map(
        entry => ({
            ...entry,

            lines:
                db
                    .prepare(`
                        SELECT
                            jl.*,
                            a.code AS account_code,
                            a.name AS account_name

                        FROM journal_lines jl

                        INNER JOIN accounts a
                            ON a.id = jl.account_id

                        WHERE
                            jl.journal_entry_id = ?

                        ORDER BY
                            jl.id
                    `)
                    .all(entry.id)
        })
    );
}


module.exports = {
    getTrialBalance,
    getGeneralLedger,
    getAccountLedger,
    getJournalSummary,
    getIncomeStatement,
    getBalanceSheet,
    getReferenceJournal
};