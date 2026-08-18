function validateCustomerSettlementInput(input) {

    if (!input || typeof input !== "object") {
        throw new Error(
            "اطلاعات تسویه مشتری معتبر نیست."
        );
    }

    const data = {
        customer_id:
            Number(input.customer_id),

        sales_invoice_id:
            Number(input.sales_invoice_id),

        amount:
            Number(input.amount),

        payment_method:
            input.payment_method,

        cash_register_id:
            input.cash_register_id == null
                ? null
                : Number(input.cash_register_id),

        bank_account_id:
            input.bank_account_id == null
                ? null
                : Number(input.bank_account_id),

        payment_date:
            input.payment_date || null,

        reference_number:
            input.reference_number ?? null,

        terminal_reference:
            input.terminal_reference ?? null,

        description:
            input.description ?? null
    };

    const errors = [];

    if (
        !Number.isInteger(data.customer_id) ||
        data.customer_id <= 0
    ) {
        errors.push(
            "مشتری معتبر نیست."
        );
    }

    if (
        !Number.isInteger(data.sales_invoice_id) ||
        data.sales_invoice_id <= 0
    ) {
        errors.push(
            "فاکتور فروش معتبر نیست."
        );
    }

    if (
        !Number.isFinite(data.amount) ||
        data.amount <= 0
    ) {
        errors.push(
            "مبلغ تسویه باید بیشتر از صفر باشد."
        );
    }

    if (
        ![
            "cash",
            "card"
        ].includes(
            data.payment_method
        )
    ) {
        errors.push(
            "روش تسویه باید نقدی یا کارت‌خوان باشد."
        );
    }

    if (
        data.payment_method === "cash" &&
        (
            !Number.isInteger(
                data.cash_register_id
            ) ||
            data.cash_register_id <= 0 ||
            data.bank_account_id !== null
        )
    ) {
        errors.push(
            "تسویه نقدی باید صندوق معتبر داشته باشد."
        );
    }

    if (
        data.payment_method === "card" &&
        (
            !Number.isInteger(
                data.bank_account_id
            ) ||
            data.bank_account_id <= 0 ||
            data.cash_register_id !== null
        )
    ) {
        errors.push(
            "تسویه کارت‌خوان باید حساب بانکی معتبر داشته باشد."
        );
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "CUSTOMER_SETTLEMENT_VALIDATION_ERROR";

        error.details = errors;

        throw error;
    }

    return data;
}

module.exports = {
    validateCustomerSettlementInput
};