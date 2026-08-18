function getAccountById(
    db,
    accountId
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
            WHERE id = ?
        `)
        .get(accountId);
}


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


function getNextJournalEntryNumber(
    db
) {
    const row = db
        .prepare(`
            SELECT
                COALESCE(
                    MAX(entry_number),
                    0
                ) + 1 AS next_number
            FROM journal_entries
        `)
        .get();

    return row.next_number;
}


function insertJournalEntry(
    db,
    entry
) {
    const result = db
        .prepare(`
            INSERT INTO journal_entries (
                entry_number,
                entry_date,
                reference_type,
                reference_id,
                description,
                status
            )
            VALUES (
                @entry_number,
                @entry_date,
                @reference_type,
                @reference_id,
                @description,
                @status
            )
        `)
        .run({
            entry_number:
                entry.entry_number,

            entry_date:
                entry.entry_date,

            reference_type:
                entry.reference_type ?? null,

            reference_id:
                entry.reference_id ?? null,

            description:
                entry.description ?? null,

            status:
                entry.status || "posted"
        });

    return result.lastInsertRowid;
}


function insertJournalLine(
    db,
    line
) {
    const result = db
        .prepare(`
            INSERT INTO journal_lines (
                journal_entry_id,
                account_id,
                debit,
                credit,
                description
            )
            VALUES (
                @journal_entry_id,
                @account_id,
                @debit,
                @credit,
                @description
            )
        `)
        .run({
            journal_entry_id:
                line.journal_entry_id,

            account_id:
                line.account_id,

            debit:
                line.debit ?? 0,

            credit:
                line.credit ?? 0,

            description:
                line.description ?? null
        });

    return result.lastInsertRowid;
}


function getJournalEntryById(
    db,
    entryId
) {
    const entry = db
        .prepare(`
            SELECT
                je.*
            FROM journal_entries je
            WHERE je.id = ?
        `)
        .get(entryId);

    if (!entry) {
        return null;
    }

    const lines = db
        .prepare(`
            SELECT
                jl.*,
                a.code AS account_code,
                a.name AS account_name
            FROM journal_lines jl
            INNER JOIN accounts a
                ON a.id = jl.account_id
            WHERE jl.journal_entry_id = ?
            ORDER BY
                jl.id
        `)
        .all(entryId);

    return {
        ...entry,
        lines
    };
}


module.exports = {
    getAccountById,
    getAccountByCode,
    getNextJournalEntryNumber,
    insertJournalEntry,
    insertJournalLine,
    getJournalEntryById
};