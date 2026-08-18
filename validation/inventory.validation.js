const MOVEMENT_TYPES = [
    "opening",
    "purchase",
    "sale",
    "purchase_return",
    "sale_return",
    "transfer_in",
    "transfer_out",
    "adjustment_in",
    "adjustment_out",
    "production_in",
    "production_out",
    "stocktake_in",
    "stocktake_out"
];


function validateInventoryMovement(
    input
) {
    if (!input || typeof input !== "object") {
        throw new Error(
            "اطلاعات حرکت انبار معتبر نیست."
        );
    }

    const data = {
        warehouse_id:
            Number(input.warehouse_id),

        product_id:
            Number(input.product_id),

        movement_type:
            input.movement_type,

        quantity:
            Number(input.quantity),

        unit_cost:
            Number(input.unit_cost ?? 0),

        reference_type:
            input.reference_type ?? null,

        reference_id:
            input.reference_id ?? null,

        sales_invoice_item_id:
            input.sales_invoice_item_id == null
                ? null
                : Number(
                    input.sales_invoice_item_id
                ),

        transfer_id:
            input.transfer_id ?? null,

        description:
            input.description ?? null
    };


    const errors = [];


    if (
        !Number.isInteger(
            data.warehouse_id
        ) ||
        data.warehouse_id <= 0
    ) {
        errors.push(
            "انبار معتبر نیست."
        );
    }


    if (
        !Number.isInteger(
            data.product_id
        ) ||
        data.product_id <= 0
    ) {
        errors.push(
            "کالا معتبر نیست."
        );
    }


    if (
        !MOVEMENT_TYPES.includes(
            data.movement_type
        )
    ) {
        errors.push(
            "نوع حرکت انبار معتبر نیست."
        );
    }


    if (
        !Number.isFinite(
            data.quantity
        ) ||
        data.quantity <= 0
    ) {
        errors.push(
            "مقدار حرکت باید بیشتر از صفر باشد."
        );
    }


    if (
        !Number.isFinite(
            data.unit_cost
        ) ||
        data.unit_cost < 0
    ) {
        errors.push(
            "بهای واحد معتبر نیست."
        );
    }


    if (
        data.sales_invoice_item_id !== null &&
        (
            !Number.isInteger(
                data.sales_invoice_item_id
            ) ||
            data.sales_invoice_item_id <= 0
        )
    ) {
        errors.push(
            "شناسه قلم فاکتور فروش معتبر نیست."
        );
    }


    if (errors.length > 0) {

        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "INVENTORY_VALIDATION_ERROR";

        error.details =
            errors;

        throw error;
    }


    return data;
}


module.exports = {
    MOVEMENT_TYPES,
    validateInventoryMovement
};