const {
    createConnection
} = require("../core/connection");

const {
    validateRecipeInput
} = require("../validation/recipe.validation");

const {
    getProductById,
    getUnitById,
    getRecipeByCode,
    getActiveRecipeByProductId,
    insertRecipe,
    insertRecipeItem,
    getRecipeById
} = require("../repositories/recipe.repository");


function assertActiveProduct(
    db,
    productId,
    isIngredient = false
) {
    const product =
        getProductById(
            db,
            productId
        );

    if (!product) {
        throw new Error(
            isIngredient
                ? "ماده اولیه انتخاب‌شده وجود ندارد."
                : "محصول اصلی Recipe وجود ندارد."
        );
    }

    if (!product.is_active) {
        throw new Error(
            isIngredient
                ? "ماده اولیه انتخاب‌شده غیرفعال است."
                : "محصول اصلی Recipe غیرفعال است."
        );
    }

    /*
     * محصول اصلی Recipe باید قابل فروش باشد.
     */
    if (
        !isIngredient &&
        !product.is_active
    ) {
        throw new Error(
            "محصول اصلی Recipe قابل استفاده نیست."
        );
    }

    /*
     * ماده اولیه باید کنترل موجودی داشته باشد.
     */
    if (
        isIngredient &&
        !product.track_inventory
    ) {
        throw new Error(
            "محصول انتخاب‌شده برای ماده اولیه، کنترل موجودی ندارد."
        );
    }

    return product;
}


function assertActiveUnit(
    db,
    unitId
) {
    const unit =
        getUnitById(
            db,
            unitId
        );

    if (!unit) {
        throw new Error(
            "واحد انتخاب‌شده وجود ندارد."
        );
    }

    if (!unit.is_active) {
        throw new Error(
            "واحد انتخاب‌شده غیرفعال است."
        );
    }

    return unit;
}


function assertRecipeCodeAvailable(
    db,
    code
) {
    const existing =
        getRecipeByCode(
            db,
            code
        );

    if (existing) {
        throw new Error(
            "کد Recipe قبلاً ثبت شده است."
        );
    }
}


function assertNoActiveRecipe(
    db,
    productId
) {
    const existing =
        getActiveRecipeByProductId(
            db,
            productId
        );

    if (existing) {
        throw new Error(
            "این محصول قبلاً یک Recipe فعال دارد."
        );
    }
}


function createRecipe(input) {

    const data =
        validateRecipeInput(input);

    const db =
        createConnection();

    try {

        const transaction =
            db.transaction(() => {

                /*
                 * محصول اصلی
                 */

                assertActiveProduct(
                    db,
                    data.product_id,
                    false
                );


                /*
                 * واحد خروجی
                 */

                assertActiveUnit(
                    db,
                    data.yield_unit_id
                );


                /*
                 * کد Recipe
                 */

                assertRecipeCodeAvailable(
                    db,
                    data.code
                );


                /*
                 * هر محصول فقط یک Recipe فعال
                 */

                assertNoActiveRecipe(
                    db,
                    data.product_id
                );


                /*
                 * بررسی مواد اولیه
                 */

                for (
                    const item
                    of data.items
                ) {

                    assertActiveProduct(
                        db,
                        Number(
                            item.ingredient_product_id
                        ),
                        true
                    );

                    assertActiveUnit(
                        db,
                        Number(item.unit_id)
                    );


                    /*
                     * جلوگیری از مصرف خود محصول
                     * به عنوان ماده اولیه خودش
                     */

                    if (
                        Number(
                            item.ingredient_product_id
                        ) ===
                        data.product_id
                    ) {
                        throw new Error(
                            "محصول نمی‌تواند ماده اولیه خودش باشد."
                        );
                    }
                }


                /*
                 * Recipe را ابتدا به صورت Draft
                 * ایجاد می‌کنیم.
                 */

                const recipeId =
                    insertRecipe(
                        db,
                        {
                            code: data.code,

                            product_id:
                                data.product_id,

                            name: data.name,

                            version: 1,

                            status: "draft",

                            yield_quantity:
                                data.yield_quantity,

                            yield_unit_id:
                                data.yield_unit_id,

                            preparation_time_minutes:
                                data.preparation_time_minutes,

                            notes:
                                data.notes
                        }
                    );


                /*
                 * اقلام Recipe
                 */

                for (
                    const item
                    of data.items
                ) {

                    insertRecipeItem(
                        db,
                        recipeId,
                        {
                            ingredient_product_id:
                                Number(
                                    item.ingredient_product_id
                                ),

                            quantity:
                                Number(
                                    item.quantity
                                ),

                            unit_id:
                                Number(
                                    item.unit_id
                                ),

                            waste_percent:
                                Number(
                                    item.waste_percent ?? 0
                                ),

                            notes:
                                item.notes ?? null,

                            sort_order:
                                Number(
                                    item.sort_order ?? 0
                                )
                        }
                    );
                }


                return recipeId;
            });


        const recipeId =
            transaction();


        return getRecipeByIdResult(
            recipeId
        );

    } finally {

        db.close();
    }
}


function getRecipeByIdResult(
    recipeId
) {
    const db =
        createConnection();

    try {

        return getRecipeById(
            db,
            recipeId
        );

    } finally {

        db.close();
    }
}


function activateRecipe(
    recipeId
) {
    const db =
        createConnection();

    try {

        const transaction =
            db.transaction(() => {

                const recipe =
                    db
                        .prepare(
                            `
                            SELECT *
                            FROM recipes
                            WHERE id = ?
                            `
                        )
                        .get(recipeId);

                if (!recipe) {
                    throw new Error(
                        "Recipe پیدا نشد."
                    );
                }

                if (
                    recipe.status ===
                    "archived"
                ) {
                    throw new Error(
                        "Recipe آرشیوشده قابل فعال‌سازی نیست."
                    );
                }


                const existing =
                    getActiveRecipeByProductId(
                        db,
                        recipe.product_id
                    );

                if (
                    existing &&
                    existing.id !== recipe.id
                ) {
                    throw new Error(
                        "این محصول یک Recipe فعال دیگر دارد."
                    );
                }


                const itemCount =
                    db
                        .prepare(
                            `
                            SELECT COUNT(*) AS count
                            FROM recipe_items
                            WHERE recipe_id = ?
                            `
                        )
                        .get(recipeId)
                        .count;

                if (itemCount === 0) {
                    throw new Error(
                        "Recipe بدون ماده اولیه قابل فعال‌سازی نیست."
                    );
                }


                db
                    .prepare(
                        `
                        UPDATE recipes
                        SET
                            status = 'active',
                            updated_at =
                                CURRENT_TIMESTAMP
                        WHERE id = ?
                        `
                    )
                    .run(recipeId);
            });

        transaction();

        return getRecipeByIdResult(
            recipeId
        );

    } finally {

        db.close();
    }
}


function deactivateRecipe(
    recipeId
) {
    const db =
        createConnection();

    try {

        const result =
            db
                .prepare(
                    `
                    UPDATE recipes
                    SET
                        status = 'inactive',
                        updated_at =
                            CURRENT_TIMESTAMP
                    WHERE id = ?
                      AND status = 'active'
                    `
                )
                .run(recipeId);

        if (result.changes === 0) {
            throw new Error(
                "Recipe فعال پیدا نشد."
            );
        }

        return getRecipeByIdResult(
            recipeId
        );

    } finally {

        db.close();
    }
}


module.exports = {
    createRecipe,
    activateRecipe,
    deactivateRecipe,
    getRecipeByIdResult
};