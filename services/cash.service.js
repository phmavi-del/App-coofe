const {
    createConnection
} = require("../core/connection");

const {
    validateCashRegisterInput,
    validateCashTransactionFilterInput,
    validateCashOperationInput
} = require("../validation/cash.validation");

const {
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
    insertCashTransaction
} = require("../repositories/cash.repository");

const {
    getAccountById
} = require("../repositories/accounting.repository");

const {
    createJournalEntryInTransaction
} = require("./accounting.service");

const {
    createAuditLogInTransaction
} = require("./audit.service");

const {
    getBankAccountById,
    insertBankTransaction
} = require("../repositories/bank.repository");


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
                "cash",

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


function assertActiveCashRegister(
    db,
    cashRegisterId
) {
    const cash =
        getCashRegisterById(
            db,
            cashRegisterId
        );

    if (!cash) {
        throw new Error(
            `صندوق ${cashRegisterId} پیدا نشد.`
        );
    }

    if (!cash.is_active) {
        throw new Error(
            `صندوق «${cash.name}» غیرفعال است.`
        );
    }

    if (!cash.account_id) {
        throw new Error(
            `صندوق «${cash.name}» به حسابداری متصل نیست.`
        );
    }

    return cash;
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


function createCashRegisterInTransaction(
    db,
    input,
    userId
) {
    const data =
        validateCashRegisterInput(
            input
        );

    if (
        getCashRegisterByCode(
            db,
            data.code
        )
    ) {
        throw new Error(
            `کد صندوق «${data.code}» قبلاً ثبت شده است.`
        );
    }

    if (data.account_id !== null) {
        assertActiveLedgerAccount(
            db,
            data.account_id
        );
    }

    const cashId =
        insertCashRegister(
            db,
            data
        );

    const created =
        getCashRegisterById(
            db,
            cashId
        );

    createAudit(
        db,
        {
            userId,
            action:
                "CREATE_CASH_REGISTER",

            recordId:
                cashId,

            beforeData:
                null,

            afterData:
                created
        }
    );

    return created;
}


function updateCashRegisterInTransaction(
    db,
    input,
    userId
) {
    const current =
        getCashRegisterById(
            db,
            input.id
        );

    if (!current) {
        throw new Error(
            "صندوق پیدا نشد."
        );
    }

    const data =
        validateCashRegisterInput(
            input
        );

    const sameCode =
        getCashRegisterByCode(
            db,
            data.code
        );

    if (
        sameCode &&
        sameCode.id !== current.id
    ) {
        throw new Error(
            `کد صندوق «${data.code}» قبلاً ثبت شده است.`
        );
    }

    if (data.account_id !== null) {
        assertActiveLedgerAccount(
            db,
            data.account_id
        );
    }

    const changes =
        updateCashRegister(
            db,
            {
                ...data,
                id:
                    current.id
            }
        );

    if (!changes) {
        throw new Error(
            "تغییری در صندوق ایجاد نشد."
        );
    }

    const updated =
        getCashRegisterById(
            db,
            current.id
        );

    createAudit(
        db,
        {
            userId,
            action:
                "UPDATE_CASH_REGISTER",

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


function saveCashRegister(
    input,
    userId
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                if (input.id) {
                    return updateCashRegisterInTransaction(
                        db,
                        input,
                        userId
                    );
                }

                return createCashRegisterInTransaction(
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


function listCashRegisters(
    filters = {}
) {
    const db =
        createConnection();

    try {
        return getCashRegisters(
            db,
            filters
        );
    } finally {
        db.close();
    }
}


function getCashRegister(
    cashRegisterId
) {
    const db =
        createConnection();

    try {
        return getCashRegisterById(
            db,
            cashRegisterId
        );
    } finally {
        db.close();
    }
}


function createCashOperationInTransaction(
    db,
    input
) {
    const data =
        validateCashOperationInput(
            input
        );

    const cash =
        assertActiveCashRegister(
            db,
            data.cash_register_id
        );

    const contraAccount =
        assertActiveLedgerAccount(
            db,
            data.contra_account_id
        );

    if (
        Number(
            cash.account_id
        ) ===
        Number(
            contraAccount.id
        )
    ) {
        throw new Error(
            "حساب صندوق و حساب مقابل نمی‌توانند یکسان باشند."
        );
    }

    const transactionId =
        insertCashTransaction(
            db,
            data
        );

    const journalEntryId =
        createJournalEntryInTransaction(
            db,
            {
                entry_date:
                    data.transaction_date,

                reference_type:
                    data.reference_type ||
                    "cash_operation",

                reference_id:
                    data.reference_id ??
                    transactionId,

                description:
                    data.description ||
                    "عملیات صندوق",

                status:
                    "posted",

                lines: [
                    {
                        account_id:
                            cash.account_id,

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
                            "حساب صندوق"
                    },

                    {
                        account_id:
                            contraAccount.id,

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
        getCashTransactionById(
            db,
            transactionId
        );

    createAudit(
        db,
        {
            userId:
                data.user_id,

            action:
                "CREATE_CASH_OPERATION",

            recordId:
                transactionId,

            beforeData:
                null,

            afterData: {
                transaction:
                    result,

                journal_entry_id:
                    journalEntryId
            }
        }
    );

    return {
        transactionId,
        journalEntryId
    };
}


function createCashOperation(
    input
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                return createCashOperationInTransaction(
                    db,
                    input
                );
            });

        const result =
            transaction();

        return {
            ...result,

            transaction:
                getCashTransaction(
                    result.transactionId
                )
        };

    } finally {
        db.close();
    }
}


function createCashToBankTransferInTransaction(
    db,
    input
) {
    const {
        cash_register_id,
        bank_account_id,
        amount,
        transaction_date,
        description,
        user_id,
        reference_type,
        reference_id
    } = input;

    if (
        !Number.isInteger(
            Number(cash_register_id)
        ) ||
        Number(cash_register_id) <= 0
    ) {
        throw new Error(
            "صندوق انتقال‌دهنده معتبر نیست."
        );
    }

    if (
        !Number.isInteger(
            Number(bank_account_id)
        ) ||
        Number(bank_account_id) <= 0
    ) {
        throw new Error(
            "حساب بانکی مقصد معتبر نیست."
        );
    }

    if (
        !Number.isInteger(
            Number(amount)
        ) ||
        Number(amount) <= 0
    ) {
        throw new Error(
            "مبلغ انتقال معتبر نیست."
        );
    }

    const cash =
        assertActiveCashRegister(
            db,
            cash_register_id
        );

    const bank =
        getBankAccountById(
            db,
            bank_account_id
        );

    if (!bank) {
        throw new Error(
            "حساب بانکی مقصد پیدا نشد."
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

    if (
        Number(
            cash.account_id
        ) ===
        Number(
            bank.account_id
        )
    ) {
        throw new Error(
            "حساب صندوق و بانک نمی‌توانند یکسان باشند."
        );
    }

    const transferReferenceType =
        reference_type ||
        "cash_bank_transfer";

    const transferReferenceId =
        reference_id ??
        null;

    const cashTransactionId =
        insertCashTransaction(
            db,
            {
                cash_register_id,
                transaction_type:
                    "transfer_out",
                amount:
                    Number(amount),
                direction:
                    "out",
                reference_type:
                    transferReferenceType,
                reference_id:
                    transferReferenceId,
                description:
                    description ||
                    "انتقال از صندوق به بانک",
                transaction_date:
                    transaction_date ||
                    new Date()
                        .toISOString()
                        .slice(0, 19)
                        .replace("T", " ")
            }
        );

    const bankTransactionId =
        insertBankTransaction(
            db,
            {
                bank_account_id,
                transaction_type:
                    "transfer_in",
                amount:
                    Number(amount),
                direction:
                    "in",
                reference_type:
                    transferReferenceType,
                reference_id:
                    transferReferenceId,
                description:
                    description ||
                    "انتقال از صندوق به بانک",
                transaction_date:
                    transaction_date ||
                    new Date()
                        .toISOString()
                        .slice(0, 19)
                        .replace("T", " ")
            }
        );

    const journalEntryId =
        createJournalEntryInTransaction(
            db,
            {
                entry_date:
                    transaction_date ||
                    new Date()
                        .toISOString()
                        .slice(0, 19)
                        .replace("T", " "),

                reference_type:
                    transferReferenceType,

                reference_id:
                    transferReferenceId ??
                    cashTransactionId,

                description:
                    description ||
                    "انتقال از صندوق به بانک",

                status:
                    "posted",

                lines: [
                    {
                        account_id:
                            bank.account_id,

                        debit:
                            Number(amount),

                        credit:
                            0,

                        description:
                            "افزایش موجودی بانک"
                    },

                    {
                        account_id:
                            cash.account_id,

                        debit:
                            0,

                        credit:
                            Number(amount),

                        description:
                            "کاهش موجودی صندوق"
                    }
                ]
            }
        );

    createAudit(
        db,
        {
            userId:
                user_id,

            action:
                "CASH_TO_BANK_TRANSFER",

            recordId:
                cashTransactionId,

            beforeData:
                null,

            afterData: {
                cash_transaction_id:
                    cashTransactionId,

                bank_transaction_id:
                    bankTransactionId,

                journal_entry_id:
                    journalEntryId,

                amount:
                    Number(amount)
            }
        }
    );

    return {
        cashTransactionId,
        bankTransactionId,
        journalEntryId
    };
}


function createCashToBankTransfer(
    input
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                return createCashToBankTransferInTransaction(
                    db,
                    input
                );
            });

        return transaction();

    } finally {
        db.close();
    }
}


function createBankToCashTransferInTransaction(
    db,
    input
) {
    const {
        cash_register_id,
        bank_account_id,
        amount,
        transaction_date,
        description,
        user_id,
        reference_type,
        reference_id
    } = input;

    if (
        !Number.isInteger(
            Number(cash_register_id)
        ) ||
        Number(cash_register_id) <= 0
    ) {
        throw new Error(
            "صندوق مقصد معتبر نیست."
        );
    }

    if (
        !Number.isInteger(
            Number(bank_account_id)
        ) ||
        Number(bank_account_id) <= 0
    ) {
        throw new Error(
            "حساب بانکی انتقال‌دهنده معتبر نیست."
        );
    }

    if (
        !Number.isInteger(
            Number(amount)
        ) ||
        Number(amount) <= 0
    ) {
        throw new Error(
            "مبلغ انتقال معتبر نیست."
        );
    }

    const cash =
        assertActiveCashRegister(
            db,
            cash_register_id
        );

    const bank =
        getBankAccountById(
            db,
            bank_account_id
        );

    if (!bank) {
        throw new Error(
            "حساب بانکی انتقال‌دهنده پیدا نشد."
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

    if (
        Number(
            cash.account_id
        ) ===
        Number(
            bank.account_id
        )
    ) {
        throw new Error(
            "حساب صندوق و بانک نمی‌توانند یکسان باشند."
        );
    }

    const transferReferenceType =
        reference_type ||
        "bank_cash_transfer";

    const transferReferenceId =
        reference_id ??
        null;

    const date =
        transaction_date ||
        new Date()
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");

    const bankTransactionId =
        insertBankTransaction(
            db,
            {
                bank_account_id,
                transaction_type:
                    "transfer_out",
                amount:
                    Number(amount),
                direction:
                    "out",
                reference_type:
                    transferReferenceType,
                reference_id:
                    transferReferenceId,
                description:
                    description ||
                    "انتقال از بانک به صندوق",
                transaction_date:
                    date
            }
        );

    const cashTransactionId =
        insertCashTransaction(
            db,
            {
                cash_register_id,
                transaction_type:
                    "transfer_in",
                amount:
                    Number(amount),
                direction:
                    "in",
                reference_type:
                    transferReferenceType,
                reference_id:
                    transferReferenceId,
                description:
                    description ||
                    "انتقال از بانک به صندوق",
                transaction_date:
                    date
            }
        );

    const journalEntryId =
        createJournalEntryInTransaction(
            db,
            {
                entry_date:
                    date,

                reference_type:
                    transferReferenceType,

                reference_id:
                    transferReferenceId ??
                    bankTransactionId,

                description:
                    description ||
                    "انتقال از بانک به صندوق",

                status:
                    "posted",

                lines: [
                    {
                        account_id:
                            cash.account_id,

                        debit:
                            Number(amount),

                        credit:
                            0,

                        description:
                            "افزایش موجودی صندوق"
                    },

                    {
                        account_id:
                            bank.account_id,

                        debit:
                            0,

                        credit:
                            Number(amount),

                        description:
                            "کاهش موجودی بانک"
                    }
                ]
            }
        );

    createAudit(
        db,
        {
            userId:
                user_id,

            action:
                "BANK_TO_CASH_TRANSFER",

            recordId:
                bankTransactionId,

            beforeData:
                null,

            afterData: {
                bank_transaction_id:
                    bankTransactionId,

                cash_transaction_id:
                    cashTransactionId,

                journal_entry_id:
                    journalEntryId,

                amount:
                    Number(amount)
            }
        }
    );

    return {
        bankTransactionId,
        cashTransactionId,
        journalEntryId
    };
}


function createBankToCashTransfer(
    input
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                return createBankToCashTransferInTransaction(
                    db,
                    input
                );
            });

        return transaction();

    } finally {
        db.close();
    }
}


function listCashTransactions(
    filters = {}
) {
    const data =
        validateCashTransactionFilterInput(
            filters
        );

    const db =
        createConnection();

    try {
        return getCashTransactions(
            db,
            data
        );
    } finally {
        db.close();
    }
}


function getCashTransaction(
    transactionId
) {
    const db =
        createConnection();

    try {
        return getCashTransactionById(
            db,
            transactionId
        );
    } finally {
        db.close();
    }
}


function getCashTransactionCount(
    filters = {}
) {
    const data =
        validateCashTransactionFilterInput(
            filters
        );

    const db =
        createConnection();

    try {
        return countCashTransactions(
            db,
            data
        );
    } finally {
        db.close();
    }
}


function getCashRegisterBalance(
    cashRegisterId
) {
    const db =
        createConnection();

    try {
        assertActiveCashRegister(
            db,
            cashRegisterId
        );

        return getCashBalance(
            db,
            cashRegisterId
        );
    } finally {
        db.close();
    }
}


function getCashRegisterSummary(
    cashRegisterId,
    filters = {}
) {
    const db =
        createConnection();

    try {
        assertActiveCashRegister(
            db,
            cashRegisterId
        );

        return getCashSummary(
            db,
            cashRegisterId,
            filters
        );
    } finally {
        db.close();
    }
}


function getCashTransactionsByRef(
    referenceType,
    referenceId
) {
    const db =
        createConnection();

    try {
        return getCashTransactionsByReference(
            db,
            referenceType,
            referenceId
        );
    } finally {
        db.close();
    }
}


module.exports = {
    saveCashRegister,
    listCashRegisters,
    getCashRegister,

    createCashOperationInTransaction,
    createCashOperation,

    createCashToBankTransferInTransaction,
    createCashToBankTransfer,

    createBankToCashTransferInTransaction,
    createBankToCashTransfer,

    listCashTransactions,
    getCashTransaction,
    getCashTransactionCount,

    getCashRegisterBalance,
    getCashRegisterSummary,
    getCashTransactionsByRef,

    createCashRegisterInTransaction,
    updateCashRegisterInTransaction
};