const {
    createConnection
} = require("../core/connection");

const {
    validateExpenseInput
} = require("../validation/expense.validation");

const {
    insertExpense,
    getExpenseById,
    insertCashTransaction,
    insertBankTransaction
} = require("../repositories/expense.repository");

const {
    getAccountById
} = require("../repositories/accounting.repository");

const {
    createJournalEntryInTransaction
} = require("./accounting.service");

const {
    createAuditLogInTransaction
} = require("./audit.service");


function assertActiveExpenseAccount(
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
            `حساب هزینه ${accountId} پیدا نشد.`
        );
    }

    if (!account.is_active) {
        throw new Error(
            `حساب «${account.name}» غیرفعال است.`
        );
    }

    if (account.account_type !== "expense") {
        throw new Error(
            `حساب «${account.name}» حساب هزینه نیست.`
        );
    }

    return account;
}


function assertActiveCashRegister(
    db,
    cashRegisterId
) {
    const row =
        db
            .prepare(`
                SELECT
                    id,
                    code,
                    name,
                    account_id,
                    is_active
                FROM cash_registers
                WHERE id = ?
            `)
            .get(cashRegisterId);

    if (!row) {
        throw new Error(
            `صندوق ${cashRegisterId} پیدا نشد.`
        );
    }

    if (!row.is_active) {
        throw new Error(
            `صندوق «${row.name}» غیرفعال است.`
        );
    }

    if (!row.account_id) {
        throw new Error(
            `صندوق «${row.name}» به حسابداری متصل نیست.`
        );
    }

    return row;
}


function assertActiveBankAccount(
    db,
    bankAccountId
) {
    const row =
        db
            .prepare(`
                SELECT
                    id,
                    code,
                    name,
                    account_id,
                    is_active
                FROM bank_accounts
                WHERE id = ?
            `)
            .get(bankAccountId);

    if (!row) {
        throw new Error(
            `حساب بانکی ${bankAccountId} پیدا نشد.`
        );
    }

    if (!row.is_active) {
        throw new Error(
            `حساب بانکی «${row.name}» غیرفعال است.`
        );
    }

    if (!row.account_id) {
        throw new Error(
            `حساب بانکی «${row.name}» به حسابداری متصل نیست.`
        );
    }

    return row;
}


function createExpenseInTransaction(
    db,
    input
) {
    const data =
        validateExpenseInput(
            input
        );

    const expenseAccount =
        assertActiveExpenseAccount(
            db,
            data.account_id
        );

    let cashRegister = null;
    let bankAccount = null;
    let paymentAccountId = null;

    if (
        data.payment_method === "cash"
    ) {
        cashRegister =
            assertActiveCashRegister(
                db,
                data.cash_register_id
            );

        paymentAccountId =
            cashRegister.account_id;
    }

    if (
        data.payment_method === "bank"
    ) {
        bankAccount =
            assertActiveBankAccount(
                db,
                data.bank_account_id
            );

        paymentAccountId =
            bankAccount.account_id;
    }

    const expenseId =
        insertExpense(
            db,
            {
                ...data,
                status: "completed"
            }
        );

    if (
        data.payment_method === "cash"
    ) {
        insertCashTransaction(
            db,
            {
                cash_register_id:
                    cashRegister.id,

                transaction_type:
                    "expense",

                amount:
                    data.amount,

                direction:
                    "out",

                reference_type:
                    "expense",

                reference_id:
                    expenseId,

                description:
                    data.description,

                transaction_date:
                    data.expense_date
            }
        );
    }

    if (
        data.payment_method === "bank"
    ) {
        insertBankTransaction(
            db,
            {
                bank_account_id:
                    bankAccount.id,

                transaction_type:
                    "expense",

                amount:
                    data.amount,

                direction:
                    "out",

                reference_type:
                    "expense",

                reference_id:
                    expenseId,

                description:
                    data.description,

                transaction_date:
                    data.expense_date
            }
        );
    }

    const journalEntryId =
        createJournalEntryInTransaction(
            db,
            {
                entry_date:
                    data.expense_date,

                reference_type:
                    "expense",

                reference_id:
                    expenseId,

                description:
                    data.description ||
                    `ثبت هزینه ${data.expense_number}`,

                status:
                    "posted",

                lines: [
                    {
                        account_id:
                            expenseAccount.id,

                        debit:
                            data.amount,

                        credit:
                            0,

                        description:
                            data.description ||
                            "هزینه عملیاتی"
                    },
                    {
                        account_id:
                            paymentAccountId,

                        debit:
                            0,

                        credit:
                            data.amount,

                        description:
                            data.payment_method === "cash"
                                ? "پرداخت از صندوق"
                                : "پرداخت از بانک"
                    }
                ]
            }
        );

    const auditId =
        createAuditLogInTransaction(
            db,
            {
                user_id:
                    data.created_by_user_id,

                module:
                    "expenses",

                action:
                    "CREATE",

                record_id:
                    expenseId,

                before_data:
                    null,

                after_data:
                    JSON.stringify({
                        expense_id:
                            expenseId,

                        expense_number:
                            data.expense_number,

                        account_id:
                            data.account_id,

                        payment_method:
                            data.payment_method,

                        amount:
                            data.amount,

                        cash_register_id:
                            data.cash_register_id,

                        bank_account_id:
                            data.bank_account_id,

                        journal_entry_id:
                            journalEntryId
                    })
            }
        );

    return {
        expenseId,
        journalEntryId,
        auditId
    };
}


function createExpense(
    input
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                return createExpenseInTransaction(
                    db,
                    input
                );
            });

        const result =
            transaction();

        return getExpense(
            result.expenseId
        );

    } finally {
        db.close();
    }
}


function getExpense(
    expenseId
) {
    const db =
        createConnection();

    try {
        return getExpenseById(
            db,
            expenseId
        );
    } finally {
        db.close();
    }
}


module.exports = {
    createExpense,
    createExpenseInTransaction,
    getExpense
};