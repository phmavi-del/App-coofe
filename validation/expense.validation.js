function validateExpenseInput(
    input
) {
    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new Error(
            "ورودی هزینه معتبر نیست."
        );
    }

    const data = {
        expense_number:
            typeof input.expense_number === "string"
                ? input.expense_number.trim()
                : "",

        account_id:
            input.account_id ?? null,

        payment_method:
            typeof input.payment_method === "string"
                ? input.payment_method.trim()
                : "",

        cash_register_id:
            input.cash_register_id ?? null,

        bank_account_id:
            input.bank_account_id ?? null,

        amount:
            input.amount ?? null,

        expense_date:
            input.expense_date ||
            new Date()
                .toISOString()
                .slice(0, 19)
                .replace("T", " "),

        created_by_user_id:
            input.created_by_user_id ?? null,

        reference_number:
            input.reference_number ?? null,

        description:
            input.description ?? null
    };

    const errors = [];

    if (!data.expense_number) {
        errors.push(
            "شماره هزینه الزامی است."
        );
    }

    if (
        !Number.isInteger(
            Number(data.account_id)
        ) ||
        Number(data.account_id) <= 0
    ) {
        errors.push(
            "حساب هزینه معتبر نیست."
        );
    }

    if (
        ![
            "cash",
            "bank"
        ].includes(
            data.payment_method
        )
    ) {
        errors.push(
            "روش پرداخت هزینه معتبر نیست."
        );
    }

    if (
        !Number.isInteger(
            Number(data.amount)
        ) ||
        Number(data.amount) <= 0
    ) {
        errors.push(
            "مبلغ هزینه باید یک عدد صحیح بزرگ‌تر از صفر باشد."
        );
    }

    if (
        !Number.isInteger(
            Number(data.created_by_user_id)
        ) ||
        Number(data.created_by_user_id) <= 0
    ) {
        errors.push(
            "کاربر ثبت‌کننده معتبر نیست."
        );
    }

    if (
        data.payment_method === "cash"
    ) {
        if (
            !Number.isInteger(
                Number(data.cash_register_id)
            ) ||
            Number(data.cash_register_id) <= 0
        ) {
            errors.push(
                "صندوق برای پرداخت نقدی الزامی است."
            );
        }

        if (
            data.bank_account_id !== null &&
            data.bank_account_id !== undefined
        ) {
            errors.push(
                "در پرداخت نقدی نباید حساب بانکی تعیین شود."
            );
        }
    }

    if (
        data.payment_method === "bank"
    ) {
        if (
            !Number.isInteger(
                Number(data.bank_account_id)
            ) ||
            Number(data.bank_account_id) <= 0
        ) {
            errors.push(
                "حساب بانکی برای پرداخت بانکی الزامی است."
            );
        }

        if (
            data.cash_register_id !== null &&
            data.cash_register_id !== undefined
        ) {
            errors.push(
                "در پرداخت بانکی نباید صندوق تعیین شود."
            );
        }
    }

    if (
        data.reference_number !== null &&
        data.reference_number !== undefined &&
        typeof data.reference_number !== "string"
    ) {
        errors.push(
            "شماره مرجع باید متنی باشد."
        );
    }

    if (
        data.description !== null &&
        data.description !== undefined &&
        typeof data.description !== "string"
    ) {
        errors.push(
            "شرح هزینه باید متنی باشد."
        );
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "EXPENSE_VALIDATION_ERROR";

        error.details =
            errors;

        throw error;
    }

    return {
        ...data,

        account_id:
            Number(data.account_id),

        cash_register_id:
            data.cash_register_id === null ||
            data.cash_register_id === undefined
                ? null
                : Number(data.cash_register_id),

        bank_account_id:
            data.bank_account_id === null ||
            data.bank_account_id === undefined
                ? null
                : Number(data.bank_account_id),

        amount:
            Number(data.amount),

        created_by_user_id:
            Number(data.created_by_user_id),

        reference_number:
            data.reference_number ?? null,

        description:
            data.description ?? null
    };
}


module.exports = {
    validateExpenseInput
};