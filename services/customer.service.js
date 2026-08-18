const {
    createConnection
} = require("../core/connection");

const {
    validateCustomerInput
} = require("../validation/customer.validation");

const {
    getCustomerById,
    getCustomerByCode,
    getCustomerByPhone,
    insertCustomer,
    updateCustomerAccountLink,
    insertCustomerAccount
} = require("../repositories/customer.repository");


function getAccountByCode(
    db,
    code
) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                account_type,
                normal_balance,
                is_active
            FROM accounts
            WHERE code = ?
        `)
        .get(code);
}


function getOrCreateCustomerAccount(
    db,
    customer
) {
    const customerGroup =
        getAccountByCode(
            db,
            "202"
        );

    if (!customerGroup) {
        throw new Error(
            "حساب گروه دریافتنی مشتریان پیدا نشد."
        );
    }

    const accountCode =
        `202${String(customer.id).padStart(6, "0")}`;

    let account =
        getAccountByCode(
            db,
            accountCode
        );

    if (!account) {

        const result =
            db
                .prepare(`
                    INSERT INTO accounts (
                        parent_id,
                        code,
                        name,
                        account_type,
                        normal_balance,
                        level,
                        is_system,
                        is_active,
                        description
                    )
                    VALUES (?, ?, ?, 'asset', 'debit', 3, 1, 1, ?)
                `)
                .run(
                    customerGroup.id,
                    accountCode,
                    `حساب مشتری ${customer.name}`,
                    `حساب تفصیلی مشتری ${customer.name}`
                );

        account = {
            id:
                result.lastInsertRowid,

            code:
                accountCode
        };
    }

    updateCustomerAccountLink(
        db,
        customer.id,
        account.id
    );

    return account.id;
}


function assertCodeAvailable(
    db,
    code
) {
    const existing =
        getCustomerByCode(
            db,
            code
        );

    if (existing) {
        throw new Error(
            "کد مشتری قبلاً ثبت شده است."
        );
    }
}


function assertPhoneAvailable(
    db,
    phone
) {
    if (!phone) {
        return;
    }

    const existing =
        getCustomerByPhone(
            db,
            phone
        );

    if (existing) {
        throw new Error(
            "شماره تماس مشتری قبلاً ثبت شده است."
        );
    }
}


function createCustomer(
    input
) {
    const data =
        validateCustomerInput(
            input
        );

    const db =
        createConnection();

    try {

        const transaction =
            db.transaction(() => {

                assertCodeAvailable(
                    db,
                    data.code
                );

                assertPhoneAvailable(
                    db,
                    data.phone
                );

                const customerId =
                    insertCustomer(
                        db,
                        data
                    );

                const customer =
                    getCustomerById(
                        db,
                        customerId
                    );

                if (!customer) {
                    throw new Error(
                        "مشتری پس از ثبت پیدا نشد."
                    );
                }

                getOrCreateCustomerAccount(
                    db,
                    customer
                );

                insertCustomerAccount(
                    db,
                    customerId
                );

                return customerId;
            });

        const customerId =
            transaction();

        return getCustomerByIdResult(
            customerId
        );

    } finally {

        db.close();
    }
}


function getCustomerByIdResult(
    customerId
) {
    const db =
        createConnection();

    try {
        return getCustomerById(
            db,
            customerId
        );
    } finally {
        db.close();
    }
}


module.exports = {
    createCustomer,
    getCustomerByIdResult
};