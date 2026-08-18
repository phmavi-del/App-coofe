function validatePurchaseInvoiceInput(input) {

    if (!input || typeof input !== "object") {
        throw new Error(
            "اطلاعات فاکتور خرید معتبر نیست."
        );
    }

    const data = {
        supplier_id:
            input.supplier_id === null ||
            input.supplier_id === undefined
                ? null
                : Number(input.supplier_id),

        warehouse_id:
            Number(input.warehouse_id),

        invoice_number:
            typeof input.invoice_number === "string"
                ? input.invoice_number.trim()
                : "",

        invoice_date:
            input.invoice_date || null,

        status:
            input.status || "draft",

        discount_amount:
            Number(input.discount_amount ?? 0),

        tax_amount:
            Number(input.tax_amount ?? 0),

        notes:
            input.notes ?? null,

        reference_number:
            input.reference_number ?? null,

        created_by_user_id:
            Number(input.created_by_user_id),

        items:
            Array.isArray(input.items)
                ? input.items
                : [],

        payments:
            Array.isArray(input.payments)
                ? input.payments
                : []
    };

    const errors = [];

    if (
        !Number.isInteger(data.warehouse_id) ||
        data.warehouse_id <= 0
    ) {
        errors.push(
            "انبار فاکتور خرید معتبر نیست."
        );
    }

    if (!data.invoice_number) {
        errors.push(
            "شماره فاکتور خرید الزامی است."
        );
    }

    if (!data.invoice_date) {
        errors.push(
            "تاریخ فاکتور خرید الزامی است."
        );
    }

    if (
        ![
            "draft",
            "completed",
            "cancelled",
            "returned"
        ].includes(data.status)
    ) {
        errors.push(
            "وضعیت فاکتور خرید معتبر نیست."
        );
    }

    if (
        !Number.isInteger(
            data.created_by_user_id
        ) ||
        data.created_by_user_id <= 0
    ) {
        errors.push(
            "کاربر ثبت‌کننده فاکتور معتبر نیست."
        );
    }

    if (
        !Number.isFinite(
            data.discount_amount
        ) ||
        data.discount_amount < 0
    ) {
        errors.push(
            "مبلغ تخفیف معتبر نیست."
        );
    }

    if (
        !Number.isFinite(
            data.tax_amount
        ) ||
        data.tax_amount < 0
    ) {
        errors.push(
            "مبلغ مالیات معتبر نیست."
        );
    }

    if (data.items.length === 0) {
        errors.push(
            "فاکتور خرید باید حداقل یک قلم کالا داشته باشد."
        );
    }

    const seenProducts = new Set();

    for (
        let index = 0;
        index < data.items.length;
        index++
    ) {

        const item = data.items[index];

        const productId =
            Number(item.product_id);

        const unitId =
            Number(item.unit_id);

        const quantity =
            Number(item.quantity);

        const unitPrice =
            Number(item.unit_price ?? 0);

        const discountAmount =
            Number(item.discount_amount ?? 0);

        const taxRatePercent =
            Number(
                item.tax_rate_percent ?? 0
            );

        const taxAmount =
            Number(
                item.tax_amount ?? 0
            );

        if (
            !Number.isInteger(productId) ||
            productId <= 0
        ) {
            errors.push(
                `کالای ردیف ${index + 1} معتبر نیست.`
            );
        }

        if (seenProducts.has(productId)) {
            errors.push(
                `کالای ردیف ${index + 1} تکراری است.`
            );
        }

        seenProducts.add(productId);

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            errors.push(
                `مقدار ردیف ${index + 1} باید بیشتر از صفر باشد.`
            );
        }

        if (
            !Number.isInteger(unitId) ||
            unitId <= 0
        ) {
            errors.push(
                `واحد ردیف ${index + 1} معتبر نیست.`
            );
        }

        if (
            !Number.isFinite(unitPrice) ||
            unitPrice < 0
        ) {
            errors.push(
                `قیمت ردیف ${index + 1} معتبر نیست.`
            );
        }

        if (
            !Number.isFinite(discountAmount) ||
            discountAmount < 0
        ) {
            errors.push(
                `تخفیف ردیف ${index + 1} معتبر نیست.`
            );
        }

        if (
            !Number.isFinite(taxRatePercent) ||
            taxRatePercent < 0
        ) {
            errors.push(
                `نرخ مالیات ردیف ${index + 1} معتبر نیست.`
            );
        }

        if (
            !Number.isFinite(taxAmount) ||
            taxAmount < 0
        ) {
            errors.push(
                `مبلغ مالیات ردیف ${index + 1} معتبر نیست.`
            );
        }
    }

    let paymentTotal = 0;

    for (
        let index = 0;
        index < data.payments.length;
        index++
    ) {

        const payment =
            data.payments[index];

        const method =
            payment.payment_method;

        const amount =
            Number(payment.amount);

        const cashRegisterId =
            payment.cash_register_id == null
                ? null
                : Number(payment.cash_register_id);

        const bankAccountId =
            payment.bank_account_id == null
                ? null
                : Number(payment.bank_account_id);

        if (
            ![
                "cash",
                "bank",
                "credit"
            ].includes(method)
        ) {
            errors.push(
                `روش پرداخت ردیف ${index + 1} معتبر نیست.`
            );
        }

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            errors.push(
                `مبلغ پرداخت ردیف ${index + 1} معتبر نیست.`
            );
        }

        if (
            method === "cash" &&
            (
                !Number.isInteger(cashRegisterId) ||
                cashRegisterId <= 0 ||
                bankAccountId !== null
            )
        ) {
            errors.push(
                `پرداخت نقدی ردیف ${index + 1} باید صندوق معتبر داشته باشد.`
            );
        }

        if (
            method === "bank" &&
            (
                !Number.isInteger(bankAccountId) ||
                bankAccountId <= 0 ||
                cashRegisterId !== null
            )
        ) {
            errors.push(
                `پرداخت بانکی ردیف ${index + 1} باید حساب بانکی معتبر داشته باشد.`
            );
        }

        if (
            method === "credit" &&
            (
                cashRegisterId !== null ||
                bankAccountId !== null
            )
        ) {
            errors.push(
                `پرداخت نسیه ردیف ${index + 1} نباید صندوق یا بانک داشته باشد.`
            );
        }

        paymentTotal += amount;
    }

    if (errors.length > 0) {

        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "PURCHASE_VALIDATION_ERROR";

        error.details = errors;

        throw error;
    }

    return data;
}


module.exports = {
    validatePurchaseInvoiceInput
};