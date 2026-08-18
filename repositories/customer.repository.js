function getCustomerById(
    db,
    customerId
) {
    return db
        .prepare(`
            SELECT
                c.*,
                a.code AS account_code,
                a.name AS account_name,
                ca.points_balance,
                ca.credit_balance,
                ca.total_purchases,
                ca.total_paid
            FROM customers c

            LEFT JOIN accounts a
                ON a.id = c.account_id

            LEFT JOIN customer_accounts ca
                ON ca.customer_id = c.id

            WHERE c.id = ?
        `)
        .get(customerId);
}


function getCustomerByCode(
    db,
    code
) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                phone,
                account_id,
                is_active
            FROM customers
            WHERE code = ?
        `)
        .get(code);
}


function getCustomerByPhone(
    db,
    phone
) {
    if (!phone) {
        return undefined;
    }

    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                phone,
                account_id,
                is_active
            FROM customers
            WHERE phone = ?
        `)
        .get(phone);
}


function insertCustomer(
    db,
    customer
) {
    const result =
        db
            .prepare(`
                INSERT INTO customers (
                    code,
                    name,
                    phone,
                    email,
                    national_id,
                    address,
                    postal_code,
                    birth_date,
                    description,
                    credit_limit,
                    opening_balance,
                    opening_balance_type,
                    is_active
                )
                VALUES (
                    @code,
                    @name,
                    @phone,
                    @email,
                    @national_id,
                    @address,
                    @postal_code,
                    @birth_date,
                    @description,
                    @credit_limit,
                    @opening_balance,
                    @opening_balance_type,
                    @is_active
                )
            `)
            .run({
                code:
                    customer.code,

                name:
                    customer.name,

                phone:
                    customer.phone,

                email:
                    customer.email,

                national_id:
                    customer.national_id,

                address:
                    customer.address,

                postal_code:
                    customer.postal_code,

                birth_date:
                    customer.birth_date,

                description:
                    customer.description,

                credit_limit:
                    customer.credit_limit,

                opening_balance:
                    customer.opening_balance,

                opening_balance_type:
                    customer.opening_balance_type,

                is_active:
                    customer.is_active
            });

    return result.lastInsertRowid;
}


function updateCustomerAccountLink(
    db,
    customerId,
    accountId
) {
    db.prepare(`
        UPDATE customers
        SET
            account_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(
        accountId,
        customerId
    );
}


function insertCustomerAccount(
    db,
    customerId
) {
    db.prepare(`
        INSERT OR IGNORE INTO customer_accounts (
            customer_id,
            points_balance,
            credit_balance,
            total_purchases,
            total_paid
        )
        VALUES (?, 0, 0, 0, 0)
    `).run(customerId);
}


function getCustomerAccount(
    db,
    customerId
) {
    return db
        .prepare(`
            SELECT *
            FROM customer_accounts
            WHERE customer_id = ?
        `)
        .get(customerId);
}


module.exports = {
    getCustomerById,
    getCustomerByCode,
    getCustomerByPhone,
    insertCustomer,
    updateCustomerAccountLink,
    insertCustomerAccount,
    getCustomerAccount
};