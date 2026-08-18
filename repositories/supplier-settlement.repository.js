function getSupplierById(
    db,
    supplierId
) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                account_id,
                credit_limit,
                is_active
            FROM suppliers
            WHERE id = ?
        `)
        .get(
            supplierId
        );
}


function getPurchaseInvoiceById(
    db,
    purchaseInvoiceId
) {
    return db
        .prepare(`
            SELECT
                id,
                invoice_number,
                supplier_id,
                status,
                total_amount,
                paid_amount,
                remaining_amount,
                payment_status
            FROM purchase_invoices
            WHERE id = ?
        `)
        .get(
            purchaseInvoiceId
        );
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
        .get(
            cashRegisterId
        );
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
        .get(
            bankAccountId
        );
}


function updatePurchaseInvoiceSettlement(
    db,
    purchaseInvoiceId,
    paidAmount,
    remainingAmount,
    paymentStatus
) {
    return db
        .prepare(`
            UPDATE purchase_invoices
            SET
                paid_amount = ?,

                remaining_amount = ?,

                payment_status = ?,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = ?

              AND status = 'completed'
        `)
        .run(
            paidAmount,
            remainingAmount,
            paymentStatus,
            purchaseInvoiceId
        )
        .changes;
}


function insertCashTransaction(
    db,
    cashRegisterId,
    amount,
    supplierSettlementId,
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
                'payment',
                ?,
                'out',
                'supplier_settlement',
                ?,
                ?
            )
        `)
        .run(
            cashRegisterId,
            amount,
            supplierSettlementId,
            description
        )
        .lastInsertRowid;
}


function insertBankTransaction(
    db,
    bankAccountId,
    amount,
    supplierSettlementId,
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
                'payment',
                ?,
                'out',
                'supplier_settlement',
                ?,
                ?
            )
        `)
        .run(
            bankAccountId,
            amount,
            supplierSettlementId,
            description
        )
        .lastInsertRowid;
}


function insertSupplierSettlement(
    db,
    settlement
) {
    const result =
        db
            .prepare(`
                INSERT INTO supplier_settlements (
                    supplier_id,
                    purchase_invoice_id,
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
                    @supplier_id,
                    @purchase_invoice_id,
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
                supplier_id:
                    settlement.supplier_id,

                purchase_invoice_id:
                    settlement.purchase_invoice_id,

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
                supplier_id,
                purchase_invoice_id,
                payment_method,
                cash_register_id,
                bank_account_id,
                amount,
                reference_number,
                terminal_reference,
                settlement_date

            FROM supplier_settlements

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


function getSupplierSettlementById(
    db,
    settlementId
) {
    const settlement =
        db
            .prepare(`
                SELECT
                    ss.*,

                    s.code AS supplier_code,
                    s.name AS supplier_name,

                    pi.invoice_number,

                    cr.code AS cash_register_code,
                    cr.name AS cash_register_name,

                    ba.code AS bank_account_code,
                    ba.name AS bank_account_name

                FROM supplier_settlements ss

                INNER JOIN suppliers s
                    ON s.id =
                       ss.supplier_id

                INNER JOIN purchase_invoices pi
                    ON pi.id =
                       ss.purchase_invoice_id

                LEFT JOIN cash_registers cr
                    ON cr.id =
                       ss.cash_register_id

                LEFT JOIN bank_accounts ba
                    ON ba.id =
                       ss.bank_account_id

                WHERE ss.id = ?
            `)
            .get(
                settlementId
            );

    return settlement || null;
}


function getSupplierSettlementsByInvoiceId(
    db,
    purchaseInvoiceId
) {
    return db
        .prepare(`
            SELECT
                ss.*,

                s.code AS supplier_code,
                s.name AS supplier_name,

                pi.invoice_number,

                cr.name AS cash_register_name,

                ba.name AS bank_account_name

            FROM supplier_settlements ss

            INNER JOIN suppliers s
                ON s.id =
                   ss.supplier_id

            INNER JOIN purchase_invoices pi
                ON pi.id =
                   ss.purchase_invoice_id

            LEFT JOIN cash_registers cr
                ON cr.id =
                   ss.cash_register_id

            LEFT JOIN bank_accounts ba
                ON ba.id =
                   ss.bank_account_id

            WHERE ss.purchase_invoice_id = ?

            ORDER BY
                ss.id
        `)
        .all(
            purchaseInvoiceId
        );
}


module.exports = {
    getSupplierById,
    getPurchaseInvoiceById,
    getCashRegisterById,
    getBankAccountById,
    updatePurchaseInvoiceSettlement,
    insertCashTransaction,
    insertBankTransaction,
    insertSupplierSettlement,
    getExistingSettlementByReference,
    getSupplierSettlementById,
    getSupplierSettlementsByInvoiceId
};