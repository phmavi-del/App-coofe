const PRODUCT_TYPES = [
    "product",
    "raw_material",
    "service"
];

function isNonEmptyString(value) {
    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
}

function isValidInteger(value) {
    return (
        Number.isInteger(value) &&
        Number.isFinite(value)
    );
}

function isValidNumber(value) {
    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );
}

function validateProductInput(input) {

    const errors = [];

    if (!input || typeof input !== "object") {
        throw new Error(
            "اطلاعات کالا معتبر نیست."
        );
    }

    const data = {
        code:
            typeof input.code === "string"
                ? input.code.trim()
                : "",

        barcode:
            typeof input.barcode === "string"
                ? input.barcode.trim()
                : null,

        name:
            typeof input.name === "string"
                ? input.name.trim()
                : "",

        product_type:
            input.product_type || "product",

        category_id:
            input.category_id ?? null,

        unit_id:
            input.unit_id,

        purchase_price:
            input.purchase_price ?? 0,

        sale_price:
            input.sale_price ?? 0,

        min_stock:
            input.min_stock ?? 0,

        max_stock:
            input.max_stock ?? null,

        reorder_point:
            input.reorder_point ?? 0,

        track_inventory:
            input.track_inventory ?? 1,

        is_sellable:
            input.is_sellable ?? 1,

        is_purchasable:
            input.is_purchasable ?? 1,

        is_active:
            input.is_active ?? 1,

        description:
            input.description ?? null,

        image_path:
            input.image_path ?? null,

        online_enabled:
            input.online_enabled ?? 1,

        sort_order:
            input.sort_order ?? 0,

        notes:
            input.notes ?? null,

        default_warehouse_id:
            input.default_warehouse_id
    };


    if (!isNonEmptyString(data.code)) {
        errors.push(
            "کد کالا الزامی است."
        );
    }

    if (!isNonEmptyString(data.name)) {
        errors.push(
            "نام کالا الزامی است."
        );
    }

    if (
        !PRODUCT_TYPES.includes(
            data.product_type
        )
    ) {
        errors.push(
            "نوع کالا معتبر نیست."
        );
    }

    if (
        !isValidInteger(data.unit_id) ||
        data.unit_id <= 0
    ) {
        errors.push(
            "واحد کالا باید مشخص شود."
        );
    }

    if (
        !isValidInteger(
            data.default_warehouse_id
        ) ||
        data.default_warehouse_id <= 0
    ) {
        errors.push(
            "انتخاب انبار برای کالا الزامی است."
        );
    }

    for (
        const field of [
            "purchase_price",
            "sale_price",
            "min_stock",
            "reorder_point"
        ]
    ) {

        if (
            !isValidNumber(data[field]) ||
            data[field] < 0
        ) {
            errors.push(
                `${field} باید عددی بزرگ‌تر یا مساوی صفر باشد.`
            );
        }
    }

    if (
        data.max_stock !== null &&
        (
            !isValidNumber(data.max_stock) ||
            data.max_stock < 0
        )
    ) {
        errors.push(
            "حداکثر موجودی معتبر نیست."
        );
    }

    if (
        data.max_stock !== null &&
        data.max_stock < data.min_stock
    ) {
        errors.push(
            "حداکثر موجودی نمی‌تواند کمتر از حداقل موجودی باشد."
        );
    }

    if (
        data.reorder_point > 0 &&
        data.max_stock !== null &&
        data.reorder_point > data.max_stock
    ) {
        errors.push(
            "نقطه سفارش نمی‌تواند بیشتر از حداکثر موجودی باشد."
        );
    }

    if (
        ![0, 1].includes(
            data.track_inventory
        )
    ) {
        errors.push(
            "تنظیم کنترل موجودی معتبر نیست."
        );
    }

    if (
        ![0, 1].includes(
            data.is_sellable
        )
    ) {
        errors.push(
            "تنظیم فروش کالا معتبر نیست."
        );
    }

    if (
        ![0, 1].includes(
            data.is_purchasable
        )
    ) {
        errors.push(
            "تنظیم خرید کالا معتبر نیست."
        );
    }

    if (
        ![0, 1].includes(
            data.is_active
        )
    ) {
        errors.push(
            "وضعیت کالا معتبر نیست."
        );
    }

    if (
        ![0, 1].includes(
            data.online_enabled
        )
    ) {
        errors.push(
            "تنظیم فروش آنلاین معتبر نیست."
        );
    }

    if (
        !isValidInteger(data.sort_order) ||
        data.sort_order < 0
    ) {
        errors.push(
            "ترتیب نمایش کالا معتبر نیست."
        );
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "PRODUCT_VALIDATION_ERROR";

        error.details = errors;

        throw error;
    }

    return data;
}

module.exports = {
    PRODUCT_TYPES,
    validateProductInput
};