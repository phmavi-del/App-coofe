const {
    createConnection
} = require("../core/connection");

const {
    validateBankAccountInput,
    validateBankTransactionFilterInput,
    validateBankOperationInput
} = require("../validation/bank.validation");

const {
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
} = require("../repositories/bank.repository");

const {
    getAccountById
} = require("../repositories/accounting.repository");

const {
    createJournalEntryInTransaction
} = require("./accounting.service");

const {
    createAuditLogInTransaction
} = require("./audit.service");


function createAudit(
    db,
    {
        userId,
        action,
        recordId,
        beforeData,
        afterData
    }
) {
    return createAuditLogInTransaction(
        db,
        {
            user_id:
                userId ?? null,

            module:
                "bank",

            action,

            record_id:
                recordId ?? null,

            before_data:
                beforeData
                    ? JSON.stringify(beforeData)
                    : null,

            after_data:
                afterData
                    ? JSON.stringify(afterData)
                    : null
        }
    );
}


function assertActiveBankAccount(
    db,
    bankAccountId
) {
    const bank =
        getBankAccountById(
            db,
            bankAccountId
        );

    if (!bank) {
        throw new Error(
            `حساب بانکی ${bankAccountId} پیدا نشد.`
        );
    }

    if (!bank.is_active) {
        throw new Error(
            `حساب بانکی «${bank.name}» غیرفعال است.`
        );
    }

    if (!bank.account_id) {
        throw new Error(
            `حساب بانکی «${bank.name}» به حسابداری متصل نیست.`
        );
    }

    return bank;
}


function assertActiveLedgerAccount(
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
            `حساب حسابداری ${accountId} پیدا نشد.`
        );
    }

    if (!account.is_active) {
        throw new Error(
            `حساب «${account.name}» غیرفعال است.`
        );
    }

    return account;
}


function createBankAccountInTransaction(
    db,
    input,
    userId
) {
    const data =
        validateBankAccountInput(
            input
        );

    if (
        getBankAccountByCode(
            db,
            data.code
        )
    ) {
        throw new Error(
            `کد حساب بانکی «${data.code}» قبلاً ثبت شده است.`
        );
    }

    if (data.account_id !== null) {
        assertActiveLedgerAccount(
            db,
            data.account_id
        );
    }

    const bankId =
        insertBankAccount(
            db,
            data
        );

    const created =
        getBankAccountById(
            db,
            bankId
        );

    createAudit(
        db,
        {
            userId,
            action:
                "CREATE_BANK_ACCOUNT",

            recordId:
                bankId,

            beforeData:
                null,

            afterData:
                created
        }
    );

    return created;
}


function updateBankAccountInTransaction(
    db,
    input,
    userId
) {
    const current =
        getBankAccountById(
            db,
            input.id
        );

    if (!current) {
        throw new Error(
            "حساب بانکی پیدا نشد."
        );
    }

    const data =
        validateBankAccountInput(
            input
        );

    const sameCode =
        getBankAccountByCode(
            db,
            data.code
        );

    if (
        sameCode &&
        sameCode.id !== current.id
    ) {
        throw new Error(
            `کد حساب بانکی «${data.code}» قبلاً ثبت شده است.`
        );
    }

    if (data.account_id !== null) {
        assertActiveLedgerAccount(
            db,
            data.account_id
        );
    }

    const changes =
        updateBankAccount(
            db,
            {
                ...data,
                id:
                    current.id
            }
        );

    if (!changes) {
        throw new Error(
            "تغییری در حساب بانکی ایجاد نشد."
        );
    }

    const updated =
        getBankAccountById(
            db,
            current.id
        );

    createAudit(
        db,
        {
            userId,
            action:
                "UPDATE_BANK_ACCOUNT",

            recordId:
                current.id,

            beforeData:
                current,

            afterData:
                updated
        }
    );

    return updated;
}


function saveBankAccount(
    input,
    userId
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                if (input.id) {
                    return updateBankAccountInTransaction(
                        db,
                        input,
                        userId
                    );
                }

                return createBankAccountInTransaction(
                    db,
                    input,
                    userId
                );
            });

        return transaction();

    } finally {
        db.close();
    }
}


function listBankAccounts(
    filters = {}
) {
    const db =
        createConnection();

    try {
        return getBankAccounts(
            db,
            filters
        );
    } finally {
        db.close();
    }
}


function getBankAccount(
    bankAccountId
) {
    const db =
        createConnection();

    try {
        return getBankAccountById(
            db,
            bankAccountId
        );
    } finally {
        db.close();
    }
}


function createBankOperationInTransaction(
    db,
    input
) {
    const data =
        validateBankOperationInput(
            input
        );

    const bank =
        assertActiveBankAccount(
            db,
            data.bank_account_id
        );

    const transactionId =
        insertBankTransaction(
            db,
            data
        );

    createJournalEntryInTransaction(
        db,
        {
            entry_date:
                data.transaction_date,

            reference_type:
                data.reference_type ||
                "bank_operation",

            reference_id:
                data.reference_id ??
                transactionId,

            description:
                data.description ||
                "عملیات بانکی",

            status:
                "posted",

            lines: [
                {
                    account_id:
                        bank.account_id,

                    debit:
                        data.direction === "in"
                            ? data.amount
                            : 0,

                    credit:
                        data.direction === "out"
                            ? data.amount
                            : 0,

                    description:
                        data.description ||
                        "حساب بانکی"
                },

                {
                    account_id:
                        Number(
                            data.contra_account_id
                        ),

                    debit:
                        data.direction === "out"
                            ? data.amount
                            : 0,

                    credit:
                        data.direction === "in"
                            ? data.amount
                            : 0,

                    description:
                        data.description ||
                        "حساب مقابل"
                }
            ]
        }
    );

    



const result =
    getBankTransactionById(
        db,
        transactionId
    );

createAudit(
    db,
    {
        userId:
            data.user_id,

        action:
            "CREATE_BANK_OPERATION",

        recordId:
            transactionId,

        beforeData:
            null,

        afterData:
            result
    }
);

return transactionId;









}


function createBankOperation(
    input
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                const transactionId =
                    createBankOperationInTransaction(
                        db,
                        input
                    );

                const result =
                    getBankTransactionById(
                        db,
                        transactionId
                    );

                createAudit(
                    db,
                    {
                        userId:
                            input.user_id,

                        action:
                            "CREATE_BANK_OPERATION",

                        recordId:
                            transactionId,

                        beforeData:
                            null,

                        afterData:
                            result
                    }
                );

                return result;
            });

        return transaction();

    } finally {
        db.close();
    }
}


function listBankTransactions(
    filters = {}
) {
    const data =
        validateBankTransactionFilterInput(
            filters
        );

    const db =
        createConnection();

    try {
        return getBankTransactions(
            db,
            data
        );
    } finally {
        db.close();
    }
}


function getBankTransaction(
    transactionId
) {
    const db =
        createConnection();

    try {
        return getBankTransactionById(
            db,
            transactionId
        );
    } finally {
        db.close();
    }
}


function getBankTransactionCount(
    filters = {}
) {
    const data =
        validateBankTransactionFilterInput(
            filters
        );

    const db =
        createConnection();

    try {
        return countBankTransactions(
            db,
            data
        );
    } finally {
        db.close();
    }
}


function getBankAccountBalance(
    bankAccountId
) {
    const db =
        createConnection();

    try {
        assertActiveBankAccount(
            db,
            bankAccountId
        );

        return getBankBalance(
            db,
            bankAccountId
        );
    } finally {
        db.close();
    }
}


function getBankAccountSummary(
    bankAccountId,
    filters = {}
) {
    const db =
        createConnection();

    try {
        assertActiveBankAccount(
            db,
            bankAccountId
        );

        return getBankSummary(
            db,
            bankAccountId,
            filters
        );
    } finally {
        db.close();
    }
}


function getBankTransactionsByRef(
    referenceType,
    referenceId
) {
    const db =
        createConnection();

    try {
        return getBankTransactionsByReference(
            db,
            referenceType,
            referenceId
        );
    } finally {
        db.close();
    }
}


module.exports = {
    saveBankAccount,
    listBankAccounts,
    getBankAccount,

    createBankOperationInTransaction,
    createBankOperation,

    listBankTransactions,
    getBankTransaction,
    getBankTransactionCount,

    getBankAccountBalance,
    getBankAccountSummary,
    getBankTransactionsByRef,

    createBankAccountInTransaction,
    updateBankAccountInTransaction
};