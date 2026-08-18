function validateCashRegisterInput(
    input
) {
    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new Error(
            "ورودی صندوق معتبر نیست."
        );
    }

    const data = {
        branch_id:
            input.branch_id ?? null,



contra_account_id:
    input.contra_account_id ?? null,


        code:
            typeof input.code === "string"
                ? input.code.trim()
                : "",

        name:
            typeof input.name === "string"
                ? input.name.trim()
                : "",

        description:
            input.description ?? null,

        opening_balance:
            input.opening_balance ?? 0,

        is_main:
            input.is_main === undefined
                ? 0
                : input.is_main,

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
            "کد صندوق الزامی است."
        );
    }

    if (!data.name) {
        errors.push(
            "نام صندوق الزامی است."
        );
    }

    if (
        !Number.isInteger(
            Number(data.opening_balance)
        ) ||
        Number(data.opening_balance) < 0
    ) {
        errors.push(
            "موجودی افتتاحیه صندوق معتبر نیست."
        );
    }

    if (
        ![0, 1].includes(
            Number(data.is_main)
        )
    ) {
        errors.push(
            "وضعیت صندوق اصلی معتبر نیست."
        );
    }

    if (
        ![0, 1].includes(
            Number(data.is_active)
        )
    ) {
        errors.push(
            "وضعیت فعال بودن صندوق معتبر نیست."
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
            "حساب حسابداری صندوق معتبر نیست."
        );
    }

    if (
        data.description !== null &&
        typeof data.description !== "string"
    ) {
        errors.push(
            "توضیحات صندوق باید متنی باشد."
        );
    }

if (
    !Number.isInteger(
        Number(data.contra_account_id)
    ) ||
    Number(data.contra_account_id) <= 0
) {
    errors.push(
        "حساب مقابل عملیات صندوق الزامی و معتبر است."
    );
}

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "CASH_VALIDATION_ERROR";

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

        opening_balance:
            Number(data.opening_balance),

        is_main:
            Number(data.is_main),

        is_active:
            Number(data.is_active),

        account_id:
            data.account_id === null
                ? null
                : Number(data.account_id),

        description:
            data.description ?? null
    };
}


function validateCashTransactionFilterInput(
    input = {}
) {
    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new Error(
            "فیلتر تراکنش صندوق معتبر نیست."
        );
    }

    const data = {
        cash_register_id:
            input.cash_register_id ?? null,

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
        data.cash_register_id !== null &&
        (
            !Number.isInteger(
                Number(data.cash_register_id)
            ) ||
            Number(data.cash_register_id) <= 0
        )
    ) {
        errors.push(
            "شناسه صندوق معتبر نیست."
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
            "جهت تراکنش صندوق معتبر نیست."
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

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "CASH_FILTER_VALIDATION_ERROR";

        error.details =
            errors;

        throw error;
    }

    return {
        ...data,

        cash_register_id:
            data.cash_register_id === null
                ? null
                : Number(data.cash_register_id),

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


function validateCashOperationInput(
    input
) {
    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new Error(
            "ورودی عملیات صندوق معتبر نیست."
        );
    }

   const data = {
    cash_register_id:
        input.cash_register_id ?? null,

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
        input.user_id ?? null,

    contra_account_id:
        input.contra_account_id ?? null
};

    const errors = [];

    if (
        !Number.isInteger(
            Number(data.cash_register_id)
        ) ||
        Number(data.cash_register_id) <= 0
    ) {
        errors.push(
            "صندوق معتبر نیست."
        );
    }

    if (
        !Number.isInteger(
            Number(data.amount)
        ) ||
        Number(data.amount) <= 0
    ) {
        errors.push(
            "مبلغ عملیات صندوق باید بزرگ‌تر از صفر باشد."
        );
    }

    if (!data.transaction_type) {
        errors.push(
            "نوع تراکنش صندوق الزامی است."
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
            "جهت تراکنش صندوق معتبر نیست."
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
            "شرح عملیات صندوق باید متنی باشد."
        );
    }


if (
    !Number.isInteger(
        Number(data.contra_account_id)
    ) ||
    Number(data.contra_account_id) <= 0
) {
    errors.push(
        "حساب مقابل عملیات صندوق الزامی و معتبر است."
    );
}


    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "CASH_OPERATION_VALIDATION_ERROR";

        error.details =
            errors;

        throw error;
    }

    return {
        ...data,

        cash_register_id:
            Number(data.cash_register_id),

  contra_account_id:
      Number(data.contra_account_id),


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
            data.description ?? null
    };
}


module.exports = {
    validateCashRegisterInput,
    validateCashTransactionFilterInput,
    validateCashOperationInput
};