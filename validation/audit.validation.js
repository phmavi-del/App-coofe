function validateAuditLogInput(
    input
) {
    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new Error(
            "ورودی ثبت گزارش حسابرسی معتبر نیست."
        );
    }

    const data = {
        user_id:
            input.user_id ?? null,

        module:
            typeof input.module === "string"
                ? input.module.trim()
                : "",

        action:
            typeof input.action === "string"
                ? input.action.trim()
                : "",

        record_id:
            input.record_id ?? null,

        before_data:
            input.before_data ?? null,

        after_data:
            input.after_data ?? null
    };

    const errors = [];

    if (
        data.user_id !== null
        &&
        (
            !Number.isInteger(
                Number(data.user_id)
            )
            ||
            Number(data.user_id) <= 0
        )
    ) {
        errors.push(
            "شناسه کاربر معتبر نیست."
        );
    }

    if (!data.module) {
        errors.push(
            "ماژول حسابرسی الزامی است."
        );
    }

    if (!data.action) {
        errors.push(
            "عملیات حسابرسی الزامی است."
        );
    }

    if (
        data.record_id !== null
        &&
        (
            !Number.isInteger(
                Number(data.record_id)
            )
            ||
            Number(data.record_id) <= 0
        )
    ) {
        errors.push(
            "شناسه رکورد معتبر نیست."
        );
    }

    for (
        const field of [
            "before_data",
            "after_data"
        ]
    ) {
        if (
            data[field] !== null
            &&
            typeof data[field] !== "string"
        ) {
            errors.push(
                `${field} باید از نوع متن باشد.`
            );
        }
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "AUDIT_VALIDATION_ERROR";

        error.details =
            errors;

        throw error;
    }

    return {
        ...data,

        user_id:
            data.user_id === null
                ? null
                : Number(data.user_id),

        record_id:
            data.record_id === null
                ? null
                : Number(data.record_id)
    };
}


module.exports = {
    validateAuditLogInput
};