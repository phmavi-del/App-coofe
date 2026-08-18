function validatePurchaseCancellationInput(
    input
) {
    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new Error(
            "اطلاعات لغو فاکتور خرید معتبر نیست."
        );
    }

    const data = {
        purchase_invoice_id:
            Number(
                input.purchase_invoice_id
            ),

        cancelled_by_user_id:
            Number(
                input.cancelled_by_user_id
            ),

        cancellation_date:
            input.cancellation_date ||
            new Date()
                .toISOString()
                .slice(0, 19)
                .replace(
                    "T",
                    " "
                ),

        reason:
            input.reason == null
                ? null
                : String(
                    input.reason
                ).trim()
    };

    const errors = [];

    if (
        !Number.isInteger(
            data.purchase_invoice_id
        ) ||
        data.purchase_invoice_id <= 0
    ) {
        errors.push(
            "شناسه فاکتور خرید معتبر نیست."
        );
    }

    if (
        !Number.isInteger(
            data.cancelled_by_user_id
        ) ||
        data.cancelled_by_user_id <= 0
    ) {
        errors.push(
            "کاربر لغوکننده معتبر نیست."
        );
    }

    if (
        typeof data.cancellation_date !==
        "string" ||
        !data.cancellation_date.trim()
    ) {
        errors.push(
            "تاریخ لغو معتبر نیست."
        );
    }

    if (
        errors.length > 0
    ) {
        const error =
            new Error(
                errors.join("\n")
            );

        error.code =
            "PURCHASE_CANCELLATION_VALIDATION_ERROR";

        error.details =
            errors;

        throw error;
    }

    return data;
}


module.exports = {
    validatePurchaseCancellationInput
};