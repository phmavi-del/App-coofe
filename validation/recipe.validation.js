function validateRecipeInput(input) {

    const errors = [];

    if (!input || typeof input !== "object") {
        throw new Error(
            "اطلاعات Recipe معتبر نیست."
        );
    }

    const data = {
        code:
            typeof input.code === "string"
                ? input.code.trim()
                : "",

        product_id:
            Number(input.product_id),

        name:
            typeof input.name === "string"
                ? input.name.trim()
                : "",

        yield_quantity:
            input.yield_quantity ?? 1,

        yield_unit_id:
            Number(input.yield_unit_id),

        preparation_time_minutes:
            input.preparation_time_minutes ?? null,

        notes:
            input.notes ?? null,

        items:
            Array.isArray(input.items)
                ? input.items
                : []
    };

    if (!data.code) {
        errors.push(
            "کد Recipe الزامی است."
        );
    }

    if (!data.name) {
        errors.push(
            "نام Recipe الزامی است."
        );
    }

    if (
        !Number.isInteger(data.product_id) ||
        data.product_id <= 0
    ) {
        errors.push(
            "محصول اصلی Recipe معتبر نیست."
        );
    }

    if (
        typeof data.yield_quantity !== "number" ||
        !Number.isFinite(data.yield_quantity) ||
        data.yield_quantity <= 0
    ) {
        errors.push(
            "مقدار خروجی Recipe باید بزرگ‌تر از صفر باشد."
        );
    }

    if (
        !Number.isInteger(data.yield_unit_id) ||
        data.yield_unit_id <= 0
    ) {
        errors.push(
            "واحد خروجی Recipe معتبر نیست."
        );
    }

    if (
        data.preparation_time_minutes !== null &&
        (
            !Number.isInteger(
                Number(
                    data.preparation_time_minutes
                )
            ) ||
            Number(
                data.preparation_time_minutes
            ) < 0
        )
    ) {
        errors.push(
            "زمان آماده‌سازی Recipe معتبر نیست."
        );
    }

    if (data.items.length === 0) {
        errors.push(
            "Recipe باید حداقل یک ماده اولیه داشته باشد."
        );
    }

    const ingredientIds =
        new Set();

    for (
        let index = 0;
        index < data.items.length;
        index++
    ) {

        const item =
            data.items[index];

        const ingredientId =
            Number(
                item.ingredient_product_id
            );

        const quantity =
            Number(
                item.quantity
            );

        const unitId =
            Number(
                item.unit_id
            );

        const wastePercent =
            item.waste_percent ?? 0;

        if (
            !Number.isInteger(
                ingredientId
            ) ||
            ingredientId <= 0
        ) {
            errors.push(
                `ماده اولیه ردیف ${index + 1} معتبر نیست.`
            );
        }

        if (
            ingredientIds.has(
                ingredientId
            )
        ) {
            errors.push(
                `ماده اولیه ردیف ${index + 1} تکراری است.`
            );
        }

        ingredientIds.add(
            ingredientId
        );

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            errors.push(
                `مقدار مصرف ردیف ${index + 1} باید بیشتر از صفر باشد.`
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
            !Number.isFinite(
                Number(wastePercent)
            ) ||
            Number(wastePercent) < 0 ||
            Number(wastePercent) > 100
        ) {
            errors.push(
                `درصد ضایعات ردیف ${index + 1} معتبر نیست.`
            );
        }
    }

    if (errors.length > 0) {

        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "RECIPE_VALIDATION_ERROR";

        error.details = errors;

        throw error;
    }

    return data;
}

module.exports = {
    validateRecipeInput
};