function validateCustomerInput(input) {

    if (!input || typeof input !== "object") {
        throw new Error(
            "اطلاعات مشتری معتبر نیست."
        );
    }

    const data = {
        code:
            typeof input.code === "string"
                ? input.code.trim()
                : "",

        name:
            typeof input.name === "string"
                ? input.name.trim()
                : "",

        phone:
            input.phone
                ? String(input.phone).trim()
                : null,

        email:
            input.email
                ? String(input.email).trim()
                : null,

        national_id:
            input.national_id
                ? String(input.national_id).trim()
                : null,

        address:
            input.address
                ? String(input.address).trim()
                : null,

        postal_code:
            input.postal_code
                ? String(input.postal_code).trim()
                : null,

        birth_date:
            input.birth_date
                ? String(input.birth_date).trim()
                : null,

        description:
            input.description ?? null,

        credit_limit:
            Number(
                input.credit_limit ?? 0
            ),

        opening_balance:
            Number(
                input.opening_balance ?? 0
            ),

        opening_balance_type:
            input.opening_balance_type ||
            "none",

        is_active:
            input.is_active ?? 1
    };

    const errors = [];

    if (!data.code) {
        errors.push(
            "کد مشتری الزامی است."
        );
    }

    if (!data.name) {
        errors.push(
            "نام مشتری الزامی است."
        );
    }

    if (
        !Number.isFinite(
            data.credit_limit
        ) ||
        data.credit_limit < 0
    ) {
        errors.push(
            "سقف اعتبار مشتری معتبر نیست."
        );
    }

    if (
        !Number.isFinite(
            data.opening_balance
        ) ||
        data.opening_balance < 0
    ) {
        errors.push(
            "مانده افتتاحیه مشتری معتبر نیست."
        );
    }

    if (
        ![
            "none",
            "debit",
            "credit"
        ].includes(
            data.opening_balance_type
        )
    ) {
        errors.push(
            "نوع مانده افتتاحیه مشتری معتبر نیست."
        );
    }

    if (
        ![0, 1].includes(
            data.is_active
        )
    ) {
        errors.push(
            "وضعیت مشتری معتبر نیست."
        );
    }

    if (
        data.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            data.email
        )
    ) {
        errors.push(
            "ایمیل مشتری معتبر نیست."
        );
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "CUSTOMER_VALIDATION_ERROR";

        error.details = errors;

        throw error;
    }

    return data;
}

module.exports = {
    validateCustomerInput
};