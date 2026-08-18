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
                company_name,
                phone,
                mobile,
                email,
                national_id,
                economic_code,
                address,
                postal_code,
                description,
                credit_limit,
                opening_balance,
                opening_balance_type,
                is_active,
                created_at,
                updated_at
            FROM suppliers
            WHERE id = ?
        `)
        .get(supplierId);
}


function getSupplierByCode(
    db,
    code
) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                is_active
            FROM suppliers
            WHERE code = ?
        `)
        .get(code);
}


function getSupplierByPhone(
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
                is_active
            FROM suppliers
            WHERE phone = ?
        `)
        .get(phone);
}


function insertSupplier(
    db,
    supplier
) {
    const result = db
        .prepare(`
            INSERT INTO suppliers (
                code,
                name,
                company_name,
                phone,
                mobile,
                email,
                national_id,
                economic_code,
                address,
                postal_code,
                description,
                credit_limit,
                opening_balance,
                opening_balance_type,
                is_active
            )
            VALUES (
                @code,
                @name,
                @company_name,
                @phone,
                @mobile,
                @email,
                @national_id,
                @economic_code,
                @address,
                @postal_code,
                @description,
                @credit_limit,
                @opening_balance,
                @opening_balance_type,
                @is_active
            )
        `)
        .run({
            code:
                supplier.code,

            name:
                supplier.name,

            company_name:
                supplier.company_name,

            phone:
                supplier.phone,

            mobile:
                supplier.mobile,

            email:
                supplier.email,

            national_id:
                supplier.national_id,

            economic_code:
                supplier.economic_code,

            address:
                supplier.address,

            postal_code:
                supplier.postal_code,

            description:
                supplier.description,

            credit_limit:
                supplier.credit_limit,

            opening_balance:
                supplier.opening_balance,

            opening_balance_type:
                supplier.opening_balance_type,

            is_active:
                supplier.is_active
        });

    return result.lastInsertRowid;
}


module.exports = {
    getSupplierById,
    getSupplierByCode,
    getSupplierByPhone,
    insertSupplier
};