const {
    createConnection
} = require("../core/connection");

const {
    validateJournalEntryInput
} = require("../validation/accounting.validation");

const {
    getAccountById,
    getNextJournalEntryNumber,
    insertJournalEntry,
    insertJournalLine,
    getJournalEntryById
} = require("../repositories/accounting.repository");


function assertActiveAccount(
    db,
    accountId
) {
    const account =
        getAccountById(
            db,
            accountId
        );

    if (!account) {
        throw new Error(
            `حساب با شناسه ${accountId} پیدا نشد.`
        );
    }

    if (!account.is_active) {
        throw new Error(
            `حساب «${account.name}» غیرفعال است.`
        );
    }

    return account;
}


/*
 * این تابع روی Connection موجود اجرا می‌شود
 * و برای Transactionهای بزرگ‌تر مثل خرید و فروش
 * قابل استفاده است.
 */
function createJournalEntryInTransaction(
    db,
    input
) {
    const data =
        validateJournalEntryInput(
            input
        );


    for (
        const line of data.lines
    ) {
        assertActiveAccount(
            db,
            Number(line.account_id)
        );
    }


    const entryNumber =
        getNextJournalEntryNumber(
            db
        );


    const entryId =
        insertJournalEntry(
            db,
            {
                entry_number:
                    entryNumber,

                entry_date:
                    data.entry_date,

                reference_type:
                    data.reference_type,

                reference_id:
                    data.reference_id,

                description:
                    data.description,

                status:
                    data.status
            }
        );


    for (
        const line of data.lines
    ) {
        insertJournalLine(
            db,
            {
                journal_entry_id:
                    entryId,

                account_id:
                    Number(
                        line.account_id
                    ),

                debit:
                    Number(
                        line.debit ?? 0
                    ),

                credit:
                    Number(
                        line.credit ?? 0
                    ),

                description:
                    line.description ??
                    null
            }
        );
    }


    return entryId;
}


function createJournalEntry(
    input
) {
    const db =
        createConnection();

    try {

        const transaction =
            db.transaction(() => {
                return createJournalEntryInTransaction(
                    db,
                    input
                );
            });


        const entryId =
            transaction();


        return getJournalEntry(
            entryId
        );

    } finally {

        db.close();
    }
}


function getJournalEntry(
    entryId
) {
    const db =
        createConnection();

    try {

        return getJournalEntryById(
            db,
            entryId
        );

    } finally {

        db.close();
    }
}


module.exports = {
    createJournalEntry,
    createJournalEntryInTransaction,
    getJournalEntry
};