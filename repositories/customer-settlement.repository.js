function getCustomerById(
    db,
    customerId
) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                account_id,
                is_active
            FROM customers
            WHERE id = ?
        `)
        .get(customerId);
}


function getSalesInvoiceById(
    db,
    salesInvoiceId
) {
    return db
        .prepare(`
            SELECT
                id,
                invoice_number,
                customer_id,
                status,
                total_amount,
                paid_amount,
                remaining_amount,
                payment_status
            FROM sales_invoices
            WHERE id = ?
        `)
        .get(salesInvoiceId);
}


function getCashRegisterById(
    db,
    cashRegisterId
) {
    return db
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
}


function getBankAccountById(
    db,
    bankAccountId
) {
    return db
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
}


function updateSalesInvoiceSettlement(
    db,
    salesInvoiceId,
    paidAmount,
    remainingAmount,
    paymentStatus
) {
    db.prepare(`
        UPDATE sales_invoices
        SET
            paid_amount = ?,
            remaining_amount = ?,
            payment_status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(
        paidAmount,
        remainingAmount,
        paymentStatus,
        salesInvoiceId
    );
}


function insertCashTransaction(
    db,
    cashRegisterId,
    amount,
    salesInvoiceId,
    description
) {
    return db
        .prepare(`
            INSERT INTO cash_transactions (
                cash_register_id,
                transaction_type,
                amount,
                direction,
                reference_type,
                reference_id,
                description
            )
            VALUES (
                ?,
                'receipt',
                ?,
                'in',
                'customer_settlement',
                ?,
                ?
            )
        `)
        .run(
            cashRegisterId,
            amount,
            salesInvoiceId,
            description
        )
        .lastInsertRowid;
}


function insertBankTransaction(
    db,
    bankAccountId,
    amount,
    salesInvoiceId,
    description
) {
    return db
        .prepare(`
            INSERT INTO bank_transactions (
                bank_account_id,
                transaction_type,
                amount,
                direction,
                reference_type,
                reference_id,
                description
            )
            VALUES (
                ?,
                'receipt',
                ?,
                'in',
                'customer_settlement',
                ?,
                ?
            )
        `)
        .run(
            bankAccountId,
            amount,
            salesInvoiceId,
            description
        )
        .lastInsertRowid;
}



function insertCustomerSettlement(
    db,
    settlement
) {
    const result =
        db
            .prepare(`
                INSERT INTO customer_settlements (
                    customer_id,
                    sales_invoice_id,
                    payment_method,
                    cash_register_id,
                    bank_account_id,
                    amount,
                    settlement_date,
                    reference_number,
                    terminal_reference,
                    description
                )
                VALUES (
                    @customer_id,
                    @sales_invoice_id,
                    @payment_method,
                    @cash_register_id,
                    @bank_account_id,
                    @amount,
                    COALESCE(
                        @settlement_date,
                        CURRENT_TIMESTAMP
                    ),
                    @reference_number,
                    @terminal_reference,
                    @description
                )
            `)
            .run({
                customer_id:
                    settlement.customer_id,

                sales_invoice_id:
                    settlement.sales_invoice_id,

                payment_method:
                    settlement.payment_method,

                cash_register_id:
                    settlement.cash_register_id ??
                    null,

                bank_account_id:
                    settlement.bank_account_id ??
                    null,

                amount:
                    settlement.amount,

                settlement_date:
                    settlement.settlement_date ??
                    null,

                reference_number:
                    settlement.reference_number ??
                    null,

                terminal_reference:
                    settlement.terminal_reference ??
                    null,

                description:
                    settlement.description ??
                    null
            });

    return result.lastInsertRowid;
}

function getExistingSettlementByReference(
    db,
    paymentMethod,
    bankAccountId,
    cashRegisterId,
    referenceNumber,
    terminalReference
) {
    if (
        !referenceNumber &&
        !terminalReference
    ) {
        return null;
    }

    return db
        .prepare(`
            SELECT
                id,
                customer_id,
                sales_invoice_id,
                payment_method,
                cash_register_id,
                bank_account_id,
                amount,
                reference_number,
                terminal_reference,
                settlement_date
            FROM customer_settlements
            WHERE payment_method = ?
              AND (
                    (
                        ? IS NOT NULL
                        AND bank_account_id = ?
                    )
                    OR
                    (
                        ? IS NOT NULL
                        AND cash_register_id = ?
                    )
              )
              AND (
                    (
                        ? IS NOT NULL
                        AND reference_number = ?
                    )
                    OR
                    (
                        ? IS NOT NULL
                        AND terminal_reference = ?
                    )
              )
            LIMIT 1
        `)
        .get(
            paymentMethod,

            bankAccountId,
            bankAccountId,

            cashRegisterId,
            cashRegisterId,

            referenceNumber,
            referenceNumber,

            terminalReference,
            terminalReference
        );
}

module.exports = {
    getCustomerById,
    getSalesInvoiceById,
    getCashRegisterById,
    getBankAccountById,
    updateSalesInvoiceSettlement,
    insertCashTransaction,
    insertBankTransaction,
    insertCustomerSettlement,
    getExistingSettlementByReference
};