const {
    createConnection
} = require("../core/connection");


const {
    getActiveRecipeByProductId,
    getRecipeById
} = require("../repositories/recipe.repository");


const {
    convertQuantityInTransaction
} = require("./unit-conversion.service");


const {
    applyInventoryMovementInTransaction
} = require("./inventory.service");


function getRecipeForProduct(
    db,
    productId
) {
    const recipe =
        getActiveRecipeByProductId(
            db,
            productId
        );

    if (!recipe) {
        throw new Error(
            "برای این محصول Recipe فعال وجود ندارد."
        );
    }

    return getRecipeById(
        db,
        recipe.id
    );
}


function calculateRequiredQuantity(
    recipeItem,
    producedQuantity,
    recipeYieldQuantity
) {
    if (
        recipeYieldQuantity <= 0
    ) {
        throw new Error(
            "مقدار خروجی Recipe معتبر نیست."
        );
    }

    const baseQuantity =
        Number(recipeItem.quantity) *
        (
            Number(producedQuantity) /
            Number(recipeYieldQuantity)
        );

    const wastePercent =
        Number(
            recipeItem.waste_percent ?? 0
        );

    return (
        baseQuantity *
        (1 + wastePercent / 100)
    );
}


function getProductInventoryUnit(
    db,
    productId
) {
    const product =
        db
            .prepare(`
                SELECT
                    id,
                    name,
                    unit_id,
                    track_inventory,
                    is_active
                FROM products
                WHERE id = ?
            `)
            .get(productId);

    if (!product) {
        throw new Error(
            "ماده اولیه پیدا نشد."
        );
    }

    if (!product.is_active) {
        throw new Error(
            `ماده اولیه «${product.name}» غیرفعال است.`
        );
    }

    if (!product.track_inventory) {
        throw new Error(
            `برای ماده اولیه «${product.name}» کنترل موجودی فعال نیست.`
        );
    }

    return product;
}


function consumeRecipeInTransaction(
    db,
    input
) {
    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new Error(
            "اطلاعات مصرف Recipe معتبر نیست."
        );
    }

    const productId =
        Number(
            input.product_id
        );

    const warehouseId =
        Number(
            input.warehouse_id
        );

    const producedQuantity =
        Number(
            input.quantity
        );

    const referenceType =
        input.reference_type ||
        "recipe_consumption";

    const referenceId =
        input.reference_id ??
        null;

    const salesInvoiceItemId =
        input.sales_invoice_item_id == null
            ? null
            : Number(
                input.sales_invoice_item_id
            );


    if (
        !Number.isInteger(productId) ||
        productId <= 0
    ) {
        throw new Error(
            "محصول Recipe معتبر نیست."
        );
    }

    if (
        !Number.isInteger(warehouseId) ||
        warehouseId <= 0
    ) {
        throw new Error(
            "انبار مصرف معتبر نیست."
        );
    }

    if (
        !Number.isFinite(
            producedQuantity
        ) ||
        producedQuantity <= 0
    ) {
        throw new Error(
            "مقدار تولید یا فروش باید بیشتر از صفر باشد."
        );
    }

    if (
        referenceType ===
            "sales_invoice" &&
        (
            !Number.isInteger(
                salesInvoiceItemId
            ) ||
            salesInvoiceItemId <= 0
        )
    ) {
        throw new Error(
            "شناسه قلم فاکتور فروش برای مصرف Recipe معتبر نیست."
        );
    }


    const recipe =
        getRecipeForProduct(
            db,
            productId
        );


    const preparedMovements =
        [];


    for (
        const item
        of recipe.items
    ) {

        const ingredient =
            getProductInventoryUnit(
                db,
                item.ingredient_product_id
            );


        const requiredQuantityInRecipeUnit =
            calculateRequiredQuantity(
                item,
                producedQuantity,
                recipe.yield_quantity
            );


        const requiredQuantityInInventoryUnit =
            convertQuantityInTransaction(
                db,
                requiredQuantityInRecipeUnit,
                item.unit_id,
                ingredient.unit_id
            );


        const balance =
            db
                .prepare(`
                    SELECT
                        quantity,
                        average_cost
                    FROM inventory_balances
                    WHERE warehouse_id = ?
                      AND product_id = ?
                `)
                .get(
                    warehouseId,
                    ingredient.id
                );


        const availableQuantity =
            balance
                ? Number(
                    balance.quantity
                )
                : 0;


        if (
            availableQuantity <
            requiredQuantityInInventoryUnit
        ) {
            throw new Error(
                `موجودی «${ingredient.name}» کافی نیست. موجودی: ${availableQuantity}، مقدار موردنیاز: ${requiredQuantityInInventoryUnit}`
            );
        }


        preparedMovements.push({
            productId:
                ingredient.id,

            ingredientName:
                ingredient.name,

            quantity:
                requiredQuantityInInventoryUnit,

            inventoryUnitId:
                ingredient.unit_id,

            averageCost:
                balance
                    ? Number(
                        balance.average_cost
                    )
                    : 0
        });
    }


    const movements = [];

    let totalCost = 0;


    for (
        const movement
        of preparedMovements
    ) {

        const result =
            applyInventoryMovementInTransaction(
                db,
                {
                    warehouse_id:
                        warehouseId,

                    product_id:
                        movement.productId,

                    movement_type:
                        "production_out",

                    quantity:
                        movement.quantity,

                    unit_cost:
                        movement.averageCost,

                    reference_type:
                        referenceType,

                    reference_id:
                        referenceId,

                    sales_invoice_item_id:
                        salesInvoiceItemId,

                    description:
                        `مصرف Recipe «${recipe.name}» برای ${producedQuantity} واحد`
                }
            );


        const movementCost =
            movement.quantity *
            movement.averageCost;

        totalCost +=
            movementCost;


        movements.push({
            ...result,

            ingredientName:
                movement.ingredientName,

            inventoryUnitId:
                movement.inventoryUnitId,

            unitCost:
                movement.averageCost,

            movementCost
        });
    }


    return {
        recipeId:
            recipe.id,

        recipeCode:
            recipe.code,

        recipeName:
            recipe.name,

        productId,

        warehouseId,

        producedQuantity,

        salesInvoiceItemId,

        totalCost,

        movements
    };
}


function consumeRecipe(
    input
) {
    const db =
        createConnection();

    try {

        const transaction =
            db.transaction(() => {
                return consumeRecipeInTransaction(
                    db,
                    input
                );
            });

        return transaction();

    } finally {

        db.close();
    }
}


module.exports = {
    consumeRecipe,
    consumeRecipeInTransaction,
    calculateRequiredQuantity
};