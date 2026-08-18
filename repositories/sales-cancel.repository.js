function getSalesInvoiceForCancellation(
    db,
    salesInvoiceId
) {
    return db
        .prepare(`
            SELECT
                si.*,

                c.account_id AS customer_account_id,

                w.name AS warehouse_name,

                w.account_id AS warehouse_account_id

            FROM sales_invoices si

            LEFT JOIN customers c
                ON c.id =
                   si.customer_id

            INNER JOIN warehouses w
                ON w.id =
                   si.warehouse_id

            WHERE si.id = ?
        `)
        .get(
            salesInvoiceId
        );
}


function getSalesInvoiceItemsForCancellation(
    db,
    salesInvoiceId
) {
    return db
        .prepare(`
            SELECT
                sii.id,
                sii.sales_invoice_id,
                sii.product_id,
                sii.quantity,
                sii.unit_id,
                sii.unit_price,
                sii.discount_amount,
                sii.tax_rate_percent,
                sii.tax_amount,
                sii.line_total,
                sii.notes,

                p.name AS product_name,
                p.track_inventory,
                p.inventory_behavior

            FROM sales_invoice_items sii

            INNER JOIN products p
                ON p.id =
                   sii.product_id

            WHERE sii.sales_invoice_id = ?

            ORDER BY sii.id
        `)
        .all(
            salesInvoiceId
        );
}


function getSalesPaymentsForCancellation(
    db,
    salesInvoiceId
) {
    return db
        .prepare(`
            SELECT
                sp.id,
                sp.sales_invoice_id,
                sp.payment_method,
                sp.cash_register_id,
                sp.bank_account_id,
                sp.amount,
                sp.payment_date,
                sp.reference_number,
                sp.terminal_reference,
                sp.notes,
                sp.is_actual_payment

            FROM sales_payments sp

            WHERE sp.sales_invoice_id = ?

            ORDER BY sp.id
        `)
        .all(
            salesInvoiceId
        );
}


function getSalesReturnsForCancellation(
    db,
    salesInvoiceId
) {
    return db
        .prepare(`
            SELECT
                id,
                return_number,
                sales_invoice_id,
                status,
                total_amount,
                refund_amount,
                refund_status
            FROM sales_returns
            WHERE sales_invoice_id = ?
              AND status <> 'cancelled'
            ORDER BY id
        `)
        .all(
            salesInvoiceId
        );
}


function getCustomerSettlementsForCancellation(
    db,
    salesInvoiceId
) {
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
                settlement_date,
                reference_number,
                terminal_reference
            FROM customer_settlements
            WHERE sales_invoice_id = ?
            ORDER BY id
        `)
        .all(
            salesInvoiceId
        );
}


function getCustomerAccountForCancellation(
    db,
    customerId
) {
    return db
        .prepare(`
            SELECT
                id,
                customer_id,
                points_balance,
                credit_balance,
                total_purchases,
                total_paid
            FROM customer_accounts
            WHERE customer_id = ?
        `)
        .get(
            customerId
        );
}


function getCustomerVisitsForCancellation(
    db,
    salesInvoiceId
) {
    return db
        .prepare(`
            SELECT
                id,
                customer_id,
                reference_type,
                reference_id,
                amount,
                description
            FROM customer_visits
            WHERE reference_type = 'sales_invoice'
              AND reference_id = ?
            ORDER BY id
        `)
        .all(
            salesInvoiceId
        );
}


function getUserForCancellation(
    db,
    userId
) {
    return db
        .prepare(`
            SELECT
                id,
                username,
                full_name,
                is_active,
                is_locked
            FROM users
            WHERE id = ?
        `)
        .get(
            userId
        );
}


function getCashTransactionsForCancellation(
    db,
    salesInvoiceId
) {
    return db
        .prepare(`
            SELECT
                id,
                cash_register_id,
                transaction_type,
                amount,
                direction,
                reference_type,
                reference_id,
                description,
                transaction_date,
                created_at
            FROM cash_transactions
            WHERE reference_type = 'sales_invoice'
              AND reference_id = ?
              AND transaction_type = 'sale'
              AND direction = 'in'
            ORDER BY id
        `)
        .all(
            salesInvoiceId
        );
}


function getBankTransactionsForCancellation(
    db,
    salesInvoiceId
) {
    return db
        .prepare(`
            SELECT
                id,
                bank_account_id,
                transaction_type,
                amount,
                direction,
                reference_type,
                reference_id,
                description,
                transaction_date,
                created_at
            FROM bank_transactions
            WHERE reference_type = 'sales_invoice'
              AND reference_id = ?
              AND transaction_type = 'sale'
              AND direction = 'in'
            ORDER BY id
        `)
        .all(
            salesInvoiceId
        );
}


function getInventoryMovementsBySalesInvoiceItemForCancellation(
    db,
    salesInvoiceItemId
) {
    return db
        .prepare(`
            SELECT
                id,
                warehouse_id,
                product_id,
                movement_type,
                quantity,
                unit_cost,
                reference_type,
                reference_id,
                sales_invoice_item_id,
                transfer_id,
                description,
                movement_date,
                created_at

            FROM inventory_movements

            WHERE sales_invoice_item_id = ?

              AND reference_type =
                  'sales_invoice'

              AND movement_type IN (
                  'sale',
                  'production_out'
              )

            ORDER BY id
        `)
        .all(
            salesInvoiceItemId
        );
}


function getPostedSalesJournalForCancellation(
    db,
    salesInvoiceId
) {
    const entries =
        db
            .prepare(`
                SELECT
                    je.id,
                    je.entry_number,
                    je.entry_date,
                    je.reference_type,
                    je.reference_id,
                    je.description,
                    je.status

                FROM journal_entries je

                WHERE je.reference_type =
                    'sales_invoice'

                  AND je.reference_id = ?

                  AND je.status = 'posted'

                ORDER BY je.id
            `)
            .all(
                salesInvoiceId
            );


    const result = [];


    for (
        const entry
        of entries
    ) {
        const lines =
            db
                .prepare(`
                    SELECT
                        jl.id,
                        jl.journal_entry_id,
                        jl.account_id,
                        jl.debit,
                        jl.credit,
                        jl.description
                    FROM journal_lines jl
                    WHERE jl.journal_entry_id = ?
                    ORDER BY jl.id
                `)
                .all(
                    entry.id
                );


        result.push({
            ...entry,
            lines
        });
    }


    return result;
}


function getExistingSalesCancellationJournal(
    db,
    salesInvoiceId
) {
    return db
        .prepare(`
            SELECT
                id,
                entry_number,
                reference_type,
                reference_id,
                status
            FROM journal_entries
            WHERE reference_type =
                'sales_cancel'
              AND reference_id = ?
            LIMIT 1
        `)
        .get(
            salesInvoiceId
        );
}


function getExistingSalesCancellationCashTransactions(
    db,
    salesInvoiceId
) {
    return db
        .prepare(`
            SELECT
                id
            FROM cash_transactions
            WHERE reference_type =
                'sales_cancel'
              AND reference_id = ?
            LIMIT 1
        `)
        .get(
            salesInvoiceId
        );
}


function getExistingSalesCancellationBankTransactions(
    db,
    salesInvoiceId
) {
    return db
        .prepare(`
            SELECT
                id
            FROM bank_transactions
            WHERE reference_type =
                'sales_cancel'
              AND reference_id = ?
            LIMIT 1
        `)
        .get(
            salesInvoiceId
        );
}


function insertSalesCancellationCashTransaction(
    db,
    transaction
) {
    const result =
        db
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
                    'refund',
                    @amount,
                    'out',
                    'sales_cancel',
                    @reference_id,
                    @description,
                    COALESCE(
                        @transaction_date,
                        CURRENT_TIMESTAMP
                    )
                )
            `)
            .run({
                cash_register_id:
                    transaction.cash_register_id,

                amount:
                    transaction.amount,

                reference_id:
                    transaction.reference_id,

                description:
                    transaction.description,

                transaction_date:
                    transaction.transaction_date ??
                    null
            });


    return result.lastInsertRowid;
}


function insertSalesCancellationBankTransaction(
    db,
    transaction
) {
    const result =
        db
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
                    'refund',
                    @amount,
                    'out',
                    'sales_cancel',
                    @reference_id,
                    @description,
                    COALESCE(
                        @transaction_date,
                        CURRENT_TIMESTAMP
                    )
                )
            `)
            .run({
                bank_account_id:
                    transaction.bank_account_id,

                amount:
                    transaction.amount,

                reference_id:
                    transaction.reference_id,

                description:
                    transaction.description,

                transaction_date:
                    transaction.transaction_date ??
                    null
            });


    return result.lastInsertRowid;
}


function updateCustomerTotalsAfterSalesCancellation(
    db,
    customerId,
    totalPurchases,
    totalPaid
) {
    const result =
        db
            .prepare(`
                UPDATE customer_accounts
                SET
                    total_purchases =
                        total_purchases - ?,

                    total_paid =
                        total_paid - ?,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE customer_id = ?
                  AND total_purchases >= ?
                  AND total_paid >= ?
            `)
            .run(
                totalPurchases,
                totalPaid,
                customerId,
                totalPurchases,
                totalPaid
            );


    return result.changes;
}


function deleteCustomerVisitForSalesCancellation(
    db,
    visitId
) {
    return db
        .prepare(`
            DELETE FROM customer_visits
            WHERE id = ?
        `)
        .run(
            visitId
        )
        .changes;
}


function updateSalesInvoiceCancelled(
    db,
    salesInvoiceId
) {
    return db
        .prepare(`
            UPDATE sales_invoices
            SET
                status = 'cancelled',

                paid_amount = 0,

                remaining_amount = 0,

                payment_status = 'paid',

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = ?

              AND status = 'completed'
        `)
        .run(
            salesInvoiceId
        )
        .changes;
}


module.exports = {
    getSalesInvoiceForCancellation,
    getSalesInvoiceItemsForCancellation,
    getSalesPaymentsForCancellation,
    getSalesReturnsForCancellation,
    getCustomerSettlementsForCancellation,
    getCustomerAccountForCancellation,
    getCustomerVisitsForCancellation,
    getUserForCancellation,
    getCashTransactionsForCancellation,
    getBankTransactionsForCancellation,
    getInventoryMovementsBySalesInvoiceItemForCancellation,
    getPostedSalesJournalForCancellation,
    getExistingSalesCancellationJournal,
    getExistingSalesCancellationCashTransactions,
    getExistingSalesCancellationBankTransactions,
    insertSalesCancellationCashTransaction,
    insertSalesCancellationBankTransaction,
    updateCustomerTotalsAfterSalesCancellation,
    deleteCustomerVisitForSalesCancellation,
    updateSalesInvoiceCancelled
};