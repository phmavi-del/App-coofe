const {
    createConnection
} = require("../core/connection");

const {
    validateReportDateFilters,
    validateAccountReportInput,
    validateReferenceReportInput
} = require("../validation/reports.validation");

const {
    getTrialBalance,
    getGeneralLedger,
    getAccountLedger,
    getJournalSummary,
    getIncomeStatement,
    getBalanceSheet,
    getReferenceJournal
} = require("../repositories/reports.repository");


function getTrialBalanceReport(
    input = {}
) {
    const data =
        validateReportDateFilters(
            input
        );

    const db =
        createConnection();

    try {
        const rows =
            getTrialBalance(
                db,
                data
            );

        const totalDebit =
            rows.reduce(
                (
                    total,
                    row
                ) =>
                    total +
                    Number(
                        row.total_debit || 0
                    ),
                0
            );

        const totalCredit =
            rows.reduce(
                (
                    total,
                    row
                ) =>
                    total +
                    Number(
                        row.total_credit || 0
                    ),
                0
            );

        return {
            rows,

            totals: {
                debit:
                    totalDebit,

                credit:
                    totalCredit,

                balanced:
                    totalDebit ===
                    totalCredit
            }
        };
    } finally {
        db.close();
    }
}


function getGeneralLedgerReport(
    input = {}
) {
    const data =
        validateReportDateFilters(
            input
        );

    const db =
        createConnection();

    try {
        return getGeneralLedger(
            db,
            data
        );
    } finally {
        db.close();
    }
}


function getAccountLedgerReport(
    input = {}
) {
    const data =
        validateAccountReportInput(
            input
        );

    const db =
        createConnection();

    try {
        const rows =
            getAccountLedger(
                db,
                data.account_id,
                data
            );

        const totalDebit =
            rows.reduce(
                (
                    total,
                    row
                ) =>
                    total +
                    Number(
                        row.debit || 0
                    ),
                0
            );

        const totalCredit =
            rows.reduce(
                (
                    total,
                    row
                ) =>
                    total +
                    Number(
                        row.credit || 0
                    ),
                0
            );

        return {
            account_id:
                data.account_id,

            rows,

            totals: {
                debit:
                    totalDebit,

                credit:
                    totalCredit,

                net:
                    totalDebit -
                    totalCredit
            }
        };
    } finally {
        db.close();
    }
}


function getJournalSummaryReport(
    input = {}
) {
    const data =
        validateReportDateFilters(
            input
        );

    const db =
        createConnection();

    try {
        const result =
            getJournalSummary(
                db,
                data
            );

        return {
            ...result,

            journal_entry_count:
                Number(
                    result.journal_entry_count || 0
                ),

            total_debit:
                Number(
                    result.total_debit || 0
                ),

            total_credit:
                Number(
                    result.total_credit || 0
                ),

            balanced:
                Number(
                    result.total_debit || 0
                ) ===
                Number(
                    result.total_credit || 0
                )
        };
    } finally {
        db.close();
    }
}


function getIncomeStatementReport(
    input = {}
) {
    const data =
        validateReportDateFilters(
            input
        );

    const db =
        createConnection();

    try {
        const rows =
            getIncomeStatement(
                db,
                data
            );

        const revenue =
            rows
                .filter(
                    row =>
                        row.account_type ===
                        "revenue"
                )
                .reduce(
                    (
                        total,
                        row
                    ) =>
                        total +
                        Number(
                            row.amount || 0
                        ),
                    0
                );

        const expense =
            rows
                .filter(
                    row =>
                        row.account_type ===
                        "expense"
                )
                .reduce(
                    (
                        total,
                        row
                    ) =>
                        total +
                        Number(
                            row.amount || 0
                        ),
                    0
                );

        return {
            rows,

            totals: {
                revenue,
                expense,

                profit:
                    revenue -
                    expense
            }
        };
    } finally {
        db.close();
    }
}


function getBalanceSheetReport(
    input = {}
) {
    const data =
        validateReportDateFilters(
            input
        );

    const db =
        createConnection();

    try {
        const rows =
            getBalanceSheet(
                db,
                data
            );

        const incomeRows =
            getIncomeStatement(
                db,
                data
            );

        const assets =
            rows
                .filter(
                    row =>
                        row.account_type ===
                        "asset"
                )
                .reduce(
                    (
                        total,
                        row
                    ) =>
                        total +
                        Number(
                            row.balance || 0
                        ),
                    0
                );

        const liabilities =
            rows
                .filter(
                    row =>
                        row.account_type ===
                        "liability"
                )
                .reduce(
                    (
                        total,
                        row
                    ) =>
                        total +
                        Number(
                            row.balance || 0
                        ),
                    0
                );

        const equity =
            rows
                .filter(
                    row =>
                        row.account_type ===
                        "equity"
                )
                .reduce(
                    (
                        total,
                        row
                    ) =>
                        total +
                        Number(
                            row.balance || 0
                        ),
                    0
                );

        const revenue =
            incomeRows
                .filter(
                    row =>
                        row.account_type ===
                        "revenue"
                )
                .reduce(
                    (
                        total,
                        row
                    ) =>
                        total +
                        Number(
                            row.amount || 0
                        ),
                    0
                );

        const expense =
            incomeRows
                .filter(
                    row =>
                        row.account_type ===
                        "expense"
                )
                .reduce(
                    (
                        total,
                        row
                    ) =>
                        total +
                        Number(
                            row.amount || 0
                        ),
                    0
                );

        const currentProfit =
            revenue -
            expense;

        const totalEquity =
            equity +
            currentProfit;

        const liabilitiesPlusEquity =
            liabilities +
            totalEquity;

        return {
            rows,

            totals: {
                assets,

                liabilities,

                equity,

                currentProfit,

                totalEquity,

                liabilitiesPlusEquity,

                balanced:
                    assets ===
                    liabilitiesPlusEquity
            }
        };
    } finally {
        db.close();
    }
}


function getReferenceJournalReport(
    input = {}
) {
    const data =
        validateReferenceReportInput(
            input
        );

    const db =
        createConnection();

    try {
        return getReferenceJournal(
            db,
            data.reference_type,
            data.reference_id
        );
    } finally {
        db.close();
    }
}


module.exports = {
    getTrialBalanceReport,
    getGeneralLedgerReport,
    getAccountLedgerReport,
    getJournalSummaryReport,
    getIncomeStatementReport,
    getBalanceSheetReport,
    getReferenceJournalReport
};