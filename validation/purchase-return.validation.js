function roundMoney(
    value
) {
    return Math.round(
        Number(value) || 0
    );
}


function toNullableString(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const result =
        String(value).trim();

    return result || null;
}


function isPositiveInteger(
    value
) {
    return (
        Number.isInteger(value) &&
        value > 0
    );
}


function validatePurchaseReturnInput(
    input
) {
    if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input)
    ) {
        throw new Error(
            "اطلاعات برگشت خرید معتبر نیست."
        );
    }


    const data = {
        purchase_invoice_id:
            Number(
                input.purchase_invoice_id
            ),

        warehouse_id:
            Number(
                input.warehouse_id
            ),

        created_by_user_id:
            Number(
                input.created_by_user_id
            ),

        return_number:
            typeof input.return_number === "string"
                ? input.return_number.trim()
                : "",

        return_date:
            input.return_date ||
            null,

        notes:
            toNullableString(
                input.notes
            ),

        items:
            Array.isArray(input.items)
                ? input.items
                : []
    };


    const errors = [];


    if (
        !isPositiveInteger(
            data.purchase_invoice_id
        )
    ) {
        errors.push(
            "فاکتور خرید معتبر نیست."
        );
    }


    if (
        !isPositiveInteger(
            data.warehouse_id
        )
    ) {
        errors.push(
            "انبار برگشت معتبر نیست."
        );
    }


    if (
        !isPositiveInteger(
            data.created_by_user_id
        )
    ) {
        errors.push(
            "کاربر ثبت‌کننده معتبر نیست."
        );
    }


    if (
        !data.return_number
    ) {
        errors.push(
            "شماره برگشت خرید الزامی است."
        );
    }


    if (
        !data.return_date
    ) {
        errors.push(
            "تاریخ برگشت خرید الزامی است."
        );
    }


    if (
        data.items.length === 0
    ) {
        errors.push(
            "برگشت خرید باید حداقل یک قلم داشته باشد."
        );
    }


    const seenProducts =
        new Set();


    const normalizedItems =
        [];


    for (
        let index = 0;
        index < data.items.length;
        index++
    ) {
        const item =
            data.items[index];


        if (
            !item ||
            typeof item !== "object" ||
            Array.isArray(item)
        ) {
            errors.push(
                `قلم برگشت ردیف ${index + 1} معتبر نیست.`
            );

            continue;
        }


        const productId =
            Number(
                item.product_id
            );


        const unitId =
            Number(
                item.unit_id
            );


        const quantity =
            Number(
                item.quantity
            );


        if (
            !isPositiveInteger(
                productId
            )
        ) {
            errors.push(
                `کالای برگشت ردیف ${index + 1} معتبر نیست.`
            );
        } else if (
            seenProducts.has(
                productId
            )
        ) {
            errors.push(
                `کالای ردیف ${index + 1} در این برگشت تکراری است.`
            );
        } else {
            seenProducts.add(
                productId
            );
        }


        if (
            !isPositiveInteger(
                unitId
            )
        ) {
            errors.push(
                `واحد برگشت ردیف ${index + 1} معتبر نیست.`
            );
        }


        if (
            !Number.isFinite(
                quantity
            ) ||
            quantity <= 0
        ) {
            errors.push(
                `مقدار برگشت ردیف ${index + 1} معتبر نیست.`
            );
        }


        if (
            isPositiveInteger(productId) &&
            isPositiveInteger(unitId) &&
            Number.isFinite(quantity) &&
            quantity > 0 &&
            !normalizedItems.some(
                normalized =>
                    normalized.product_id ===
                    productId
            )
        ) {
            normalizedItems.push({
                product_id:
                    productId,

                unit_id:
                    unitId,

                quantity:
                    quantity
            });
        }
    }


    if (
        errors.length > 0
    ) {
        const error =
            new Error(
                errors.join("\n")
            );

        error.code =
            "PURCHASE_RETURN_VALIDATION_ERROR";

        error.details =
            errors;

        throw error;
    }


    return {
        purchase_invoice_id:
            data.purchase_invoice_id,

        warehouse_id:
            data.warehouse_id,

        created_by_user_id:
            data.created_by_user_id,

        return_number:
            data.return_number,

        return_date:
            data.return_date,

        notes:
            data.notes,

        items:
            normalizedItems
    };
}


module.exports = {
    validatePurchaseReturnInput
};