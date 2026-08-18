function validateBankAccountInput(
    input
) {
    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new Error(
            "ورودی حساب بانکی معتبر نیست."
        );
    }

    const data = {
        branch_id:
            input.branch_id ?? null,

        code:
            typeof input.code === "string"
                ? input.code.trim()
                : "",

        name:
            typeof input.name === "string"
                ? input.name.trim()
                : "",

        bank_name:
            input.bank_name ?? null,

        account_number:
            input.account_number ?? null,

        iban:
            input.iban ?? null,

        card_number:
            input.card_number ?? null,

        description:
            input.description ?? null,

        is_active:
            input.is_active === undefined
                ? 1
                : input.is_active,

        account_id:
            input.account_id ?? null
    };

    const errors = [];

    if (
        data.branch_id !== null &&
        (
            !Number.isInteger(
                Number(data.branch_id)
            ) ||
            Number(data.branch_id) <= 0
        )
    ) {
        errors.push(
            "شعبه معتبر نیست."
        );
    }

    if (!data.code) {
        errors.push(
            "کد حساب بانکی الزامی است."
        );
    }

    if (!data.name) {
        errors.push(
            "نام حساب بانکی الزامی است."
        );
    }

    if (
        ![0, 1].includes(
            Number(data.is_active)
        )
    ) {
        errors.push(
            "وضعیت فعال بودن حساب بانکی معتبر نیست."
        );
    }

    if (
        data.account_id !== null &&
        (
            !Number.isInteger(
                Number(data.account_id)
            ) ||
            Number(data.account_id) <= 0
        )
    ) {
        errors.push(
            "حساب حسابداری معتبر نیست."
        );
    }

    for (
        const field of [
            "bank_name",
            "account_number",
            "iban",
            "card_number",
            "description"
        ]
    ) {
        if (
            data[field] !== null &&
            typeof data[field] !== "string"
        ) {
            errors.push(
                `${field} باید متنی باشد.`
            );
        }
    }

    if (
        data.iban &&
        !/^IR\d{24}$/.test(
            data.iban.replace(/\s+/g, "")
        )
    ) {
        errors.push(
            "شماره شبا معتبر نیست."
        );
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "BANK_VALIDATION_ERROR";

        error.details =
            errors;

        throw error;
    }

    return {
        ...data,

        branch_id:
            data.branch_id === null
                ? null
                : Number(data.branch_id),

        is_active:
            Number(data.is_active),

        account_id:
            data.account_id === null
                ? null
                : Number(data.account_id)
    };
}


function validateBankTransactionFilterInput(
    input = {}
) {
    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new Error(
            "فیلتر تراکنش بانکی معتبر نیست."
        );
    }

    const data = {
        bank_account_id:
            input.bank_account_id ?? null,

        transaction_type:
            input.transaction_type ?? null,

        direction:
            input.direction ?? null,

        reference_type:
            input.reference_type ?? null,

        reference_id:
            input.reference_id ?? null,

        from_date:
            input.from_date ?? null,

        to_date:
            input.to_date ?? null,

        limit:
            input.limit ?? 100,

        offset:
            input.offset ?? 0
    };

    const errors = [];

    if (
        data.bank_account_id !== null &&
        (
            !Number.isInteger(
                Number(data.bank_account_id)
            ) ||
            Number(data.bank_account_id) <= 0
        )
    ) {
        errors.push(
            "شناسه حساب بانکی معتبر نیست."
        );
    }

    if (
        data.reference_id !== null &&
        (
            !Number.isInteger(
                Number(data.reference_id)
            ) ||
            Number(data.reference_id) <= 0
        )
    ) {
        errors.push(
            "شناسه مرجع معتبر نیست."
        );
    }

    if (
        data.direction !== null &&
        ![
            "in",
            "out"
        ].includes(
            data.direction
        )
    ) {
        errors.push(
            "جهت تراکنش بانکی معتبر نیست."
        );
    }

    if (
        !Number.isInteger(
            Number(data.limit)
        ) ||
        Number(data.limit) <= 0
    ) {
        errors.push(
            "تعداد نتایج معتبر نیست."
        );
    }

    if (
        !Number.isInteger(
            Number(data.offset)
        ) ||
        Number(data.offset) < 0
    ) {
        errors.push(
            "Offset معتبر نیست."
        );
    }




if (
    !Number.isInteger(
        Number(data.contra_account_id)
    ) ||
    Number(data.contra_account_id) <= 0
) {
    errors.push(
        "حساب مقابل عملیات بانکی الزامی و معتبر است."
    );
}





    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "BANK_FILTER_VALIDATION_ERROR";

        error.details =
            errors;

        throw error;
    }

    return {
        ...data,

        bank_account_id:
            data.bank_account_id === null
                ? null
                : Number(data.bank_account_id),

        reference_id:
            data.reference_id === null
                ? null
                : Number(data.reference_id),

        limit:
            Number(data.limit),

        offset:
            Number(data.offset)
    };
}


function validateBankOperationInput(
    input
) {
    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new Error(
            "ورودی عملیات بانکی معتبر نیست."
        );
    }

    const data = {
        bank_account_id:
            input.bank_account_id ?? null,


contra_account_id:
    input.contra_account_id ?? null,
 

       amount:
            input.amount ?? null,

        transaction_type:
            typeof input.transaction_type === "string"
                ? input.transaction_type.trim()
                : "",

        direction:
            typeof input.direction === "string"
                ? input.direction.trim()
                : "",

        reference_type:
            input.reference_type ?? null,

        reference_id:
            input.reference_id ?? null,

        description:
            input.description ?? null,

        transaction_date:
            input.transaction_date ||
            new Date()
                .toISOString()
                .slice(0, 19)
                .replace("T", " "),

        user_id:
            input.user_id ?? null
    };

    const errors = [];

    if (
        !Number.isInteger(
            Number(data.bank_account_id)
        ) ||
        Number(data.bank_account_id) <= 0
    ) {
        errors.push(
            "حساب بانکی معتبر نیست."
        );
    }

    if (
        !Number.isInteger(
            Number(data.amount)
        ) ||
        Number(data.amount) <= 0
    ) {
        errors.push(
            "مبلغ عملیات بانکی باید بزرگ‌تر از صفر باشد."
        );
    }

    if (!data.transaction_type) {
        errors.push(
            "نوع تراکنش بانکی الزامی است."
        );
    }

    if (
        ![
            "in",
            "out"
        ].includes(
            data.direction
        )
    ) {
        errors.push(
            "جهت تراکنش بانکی معتبر نیست."
        );
    }

    if (
        data.reference_id !== null &&
        (
            !Number.isInteger(
                Number(data.reference_id)
            ) ||
            Number(data.reference_id) <= 0
        )
    ) {
        errors.push(
            "شناسه مرجع معتبر نیست."
        );
    }

    if (
        data.user_id !== null &&
        (
            !Number.isInteger(
                Number(data.user_id)
            ) ||
            Number(data.user_id) <= 0
        )
    ) {
        errors.push(
            "کاربر عملیات معتبر نیست."
        );
    }

    if (
        data.description !== null &&
        typeof data.description !== "string"
    ) {
        errors.push(
            "شرح عملیات بانکی باید متنی باشد."
        );
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "BANK_OPERATION_VALIDATION_ERROR";

        error.details =
            errors;

        throw error;
    }

    return {
        ...data,

        bank_account_id:
            Number(data.bank_account_id),

        amount:
            Number(data.amount),

        reference_id:
            data.reference_id === null
                ? null
                : Number(data.reference_id),

        user_id:
            data.user_id === null
                ? null
                : Number(data.user_id),

        reference_type:
            data.reference_type ?? null,

        description:
            data.description ?? null,
contra_account_id:
    Number(data.contra_account_id)

    };
}


module.exports = {
    validateBankAccountInput,
    validateBankTransactionFilterInput,
    validateBankOperationInput
};