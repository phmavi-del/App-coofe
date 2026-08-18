function getPurchaseInvoiceForCancellation(
    db,
    purchaseInvoiceId
) {
    return db
        .prepare(`
            SELECT
                pi.*,

                s.account_id AS supplier_account_id,

                w.name AS warehouse_name,

                w.account_id AS warehouse_account_id

            FROM purchase_invoices pi

            INNER JOIN suppliers s
                ON s.id =
                   pi.supplier_id

            INNER JOIN warehouses w
                ON w.id =
                   pi.warehouse_id

            WHERE pi.id = ?
        `)
        .get(
            purchaseInvoiceId
        );
}


function getPurchaseInvoiceItemsForCancellation(
    db,
    purchaseInvoiceId
) {
    return db
        .prepare(`
            SELECT
                pii.id,

                pii.purchase_invoice_id,

                pii.product_id,

                pii.quantity,

                pii.unit_id,

                pii.unit_price,

                pii.discount_amount,

                pii.tax_rate_percent,

                pii.tax_amount,

                pii.line_total,

                pii.notes,

                p.name AS product_name,

                p.track_inventory,

                p.is_active

            FROM purchase_invoice_items pii

            INNER JOIN products p
                ON p.id =
                   pii.product_id

            WHERE
                pii.purchase_invoice_id = ?

            ORDER BY
                pii.id
        `)
        .all(
            purchaseInvoiceId
        );
}


function getPurchasePaymentsForCancellation(
    db,
    purchaseInvoiceId
) {
    return db
        .prepare(`
            SELECT
                pp.id,

                pp.purchase_invoice_id,

                pp.payment_method,

                pp.cash_register_id,

                pp.bank_account_id,

                pp.amount,

                pp.payment_date,

                pp.reference_number,

                pp.notes

            FROM purchase_payments pp

            WHERE
                pp.purchase_invoice_id = ?

            ORDER BY
                pp.id
        `)
        .all(
            purchaseInvoiceId
        );
}


function getPurchaseReturnsForCancellation(
    db,
    purchaseInvoiceId
) {
    return db
        .prepare(`
            SELECT
                id,

                return_number,

                purchase_invoice_id,

                supplier_id,

                warehouse_id,

                status,

                return_date,

                total_amount,

                notes

            FROM purchase_returns

            WHERE
                purchase_invoice_id = ?

                AND status <> 'cancelled'

            ORDER BY
                id
        `)
        .all(
            purchaseInvoiceId
        );
}


function getCashTransactionsForCancellation(
    db,
    purchaseInvoiceId
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

            WHERE
                reference_type =
                    'purchase_invoice'

                AND reference_id = ?

                AND transaction_type =
                    'purchase'

                AND direction =
                    'out'

            ORDER BY
                id
        `)
        .all(
            purchaseInvoiceId
        );
}


function getBankTransactionsForCancellation(
    db,
    purchaseInvoiceId
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

            WHERE
                reference_type =
                    'purchase_invoice'

                AND reference_id = ?

                AND transaction_type =
                    'purchase'

                AND direction =
                    'out'

            ORDER BY
                id
        `)
        .all(
            purchaseInvoiceId
        );
}


function getInventoryMovementsForPurchaseItemForCancellation(
    db,
    purchaseInvoiceItemId
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

                transfer_id,

                description,

                movement_date,

                created_at

            FROM inventory_movements

            WHERE
                reference_type =
                    'purchase_invoice'

                AND reference_id = (
                    SELECT
                        purchase_invoice_id
                    FROM purchase_invoice_items
                    WHERE id = ?
                )

                AND product_id = (
                    SELECT
                        product_id
                    FROM purchase_invoice_items
                    WHERE id = ?
                )

                AND movement_type =
                    'purchase'

            ORDER BY
                id
        `)
        .all(
            purchaseInvoiceItemId,
            purchaseInvoiceItemId
        );
}


function getPostedPurchaseJournalForCancellation(
    db,
    purchaseInvoiceId
) {
    const entries =
        db
            .prepare(`
                SELECT
                    id,

                    entry_number,

                    entry_date,

                    reference_type,

                    reference_id,

                    description,

                    status

                FROM journal_entries

                WHERE
                    reference_type =
                        'purchase_invoice'

                    AND reference_id = ?

                    AND status = 'posted'

                ORDER BY
                    id
            `)
            .all(
                purchaseInvoiceId
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
                        id,

                        journal_entry_id,

                        account_id,

                        debit,

                        credit,

                        description

                    FROM journal_lines

                    WHERE
                        journal_entry_id = ?

                    ORDER BY
                        id
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


function getExistingPurchaseCancellationJournal(
    db,
    purchaseInvoiceId
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

            WHERE
                reference_type =
                    'purchase_cancel'

                AND reference_id = ?

            LIMIT 1
        `)
        .get(
            purchaseInvoiceId
        );
}


function getExistingPurchaseCancellationCashTransactions(
    db,
    purchaseInvoiceId
) {
    return db
        .prepare(`
            SELECT
                id

            FROM cash_transactions

            WHERE
                reference_type =
                    'purchase_cancel'

                AND reference_id = ?

            LIMIT 1
        `)
        .get(
            purchaseInvoiceId
        );
}


function getExistingPurchaseCancellationBankTransactions(
    db,
    purchaseInvoiceId
) {
    return db
        .prepare(`
            SELECT
                id

            FROM bank_transactions

            WHERE
                reference_type =
                    'purchase_cancel'

                AND reference_id = ?

            LIMIT 1
        `)
        .get(
            purchaseInvoiceId
        );
}


function insertPurchaseCancellationCashTransaction(
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

                    'in',

                    'purchase_cancel',

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


function insertPurchaseCancellationBankTransaction(
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

                    'in',

                    'purchase_cancel',

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


function getUserForPurchaseCancellation(
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


function updatePurchaseInvoiceCancelled(
    db,
    purchaseInvoiceId
) {
    return db
        .prepare(`
            UPDATE purchase_invoices

            SET
                status =
                    'cancelled',

                paid_amount =
                    0,

                remaining_amount =
                    0,

                payment_status =
                    'paid',

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE
                id = ?

                AND status =
                    'completed'
        `)
        .run(
            purchaseInvoiceId
        )
        .changes;
}


module.exports = {
    getPurchaseInvoiceForCancellation,
    getPurchaseInvoiceItemsForCancellation,
    getPurchasePaymentsForCancellation,
    getPurchaseReturnsForCancellation,
    getCashTransactionsForCancellation,
    getBankTransactionsForCancellation,
    getInventoryMovementsForPurchaseItemForCancellation,
    getPostedPurchaseJournalForCancellation,
    getExistingPurchaseCancellationJournal,
    getExistingPurchaseCancellationCashTransactions,
    getExistingPurchaseCancellationBankTransactions,
    insertPurchaseCancellationCashTransaction,
    insertPurchaseCancellationBankTransaction,
    getUserForPurchaseCancellation,
    updatePurchaseInvoiceCancelled
};