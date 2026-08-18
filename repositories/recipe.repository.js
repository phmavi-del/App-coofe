function getProductById(
    db,
    productId
) {
    return db
        .prepare(
            `
            SELECT
                id,
                code,
                name,
                product_type,
                unit_id,
                is_active,
                track_inventory
            FROM products
            WHERE id = ?
            `
        )
        .get(productId);
}


function getProductByCode(
    db,
    code
) {
    return db
        .prepare(
            `
            SELECT
                id,
                code,
                name
            FROM products
            WHERE code = ?
            `
        )
        .get(code);
}


function getUnitById(
    db,
    unitId
) {
    return db
        .prepare(
            `
            SELECT
                id,
                code,
                name,
                symbol,
                decimal_places,
                is_active
            FROM units
            WHERE id = ?
            `
        )
        .get(unitId);
}


function getRecipeByCode(
    db,
    code
) {
    return db
        .prepare(
            `
            SELECT *
            FROM recipes
            WHERE code = ?
            `
        )
        .get(code);
}


function getActiveRecipeByProductId(
    db,
    productId
) {
    return db
        .prepare(
            `
            SELECT *
            FROM recipes
            WHERE product_id = ?
              AND status = 'active'
            LIMIT 1
            `
        )
        .get(productId);
}


function insertRecipe(
    db,
    recipe
) {
    const result = db
        .prepare(
            `
            INSERT INTO recipes (
                code,
                product_id,
                name,
                version,
                status,
                yield_quantity,
                yield_unit_id,
                preparation_time_minutes,
                notes
            )
            VALUES (
                @code,
                @product_id,
                @name,
                @version,
                @status,
                @yield_quantity,
                @yield_unit_id,
                @preparation_time_minutes,
                @notes
            )
            `
        )
        .run({
            code: recipe.code,
            product_id: recipe.product_id,
            name: recipe.name,
            version: recipe.version,
            status: recipe.status,
            yield_quantity: recipe.yield_quantity,
            yield_unit_id: recipe.yield_unit_id,
            preparation_time_minutes:
                recipe.preparation_time_minutes,
            notes: recipe.notes
        });

    return result.lastInsertRowid;
}


function insertRecipeItem(
    db,
    recipeId,
    item
) {
    const result = db
        .prepare(
            `
            INSERT INTO recipe_items (
                recipe_id,
                ingredient_product_id,
                quantity,
                unit_id,
                waste_percent,
                notes,
                sort_order
            )
            VALUES (
                @recipe_id,
                @ingredient_product_id,
                @quantity,
                @unit_id,
                @waste_percent,
                @notes,
                @sort_order
            )
            `
        )
        .run({
            recipe_id: recipeId,
            ingredient_product_id:
                item.ingredient_product_id,
            quantity: item.quantity,
            unit_id: item.unit_id,
            waste_percent:
                item.waste_percent,
            notes: item.notes ?? null,
            sort_order:
                item.sort_order ?? 0
        });

    return result.lastInsertRowid;
}


function getRecipeById(
    db,
    recipeId
) {
    const recipe =
        db
            .prepare(
                `
                SELECT
                    r.*,
                    p.name AS product_name,
                    u.name AS yield_unit_name,
                    u.symbol AS yield_unit_symbol
                FROM recipes r

                INNER JOIN products p
                    ON p.id = r.product_id

                INNER JOIN units u
                    ON u.id = r.yield_unit_id

                WHERE r.id = ?
                `
            )
            .get(recipeId);

    if (!recipe) {
        return null;
    }

    const items =
        db
            .prepare(
                `
                SELECT
                    ri.*,
                    p.name AS ingredient_name,
                    p.code AS ingredient_code,
                    u.name AS unit_name,
                    u.symbol AS unit_symbol
                FROM recipe_items ri

                INNER JOIN products p
                    ON p.id =
                        ri.ingredient_product_id

                INNER JOIN units u
                    ON u.id = ri.unit_id

                WHERE ri.recipe_id = ?

                ORDER BY
                    ri.sort_order,
                    ri.id
                `
            )
            .all(recipeId);

    return {
        ...recipe,
        items
    };
}


module.exports = {
    getProductById,
    getProductByCode,
    getUnitById,
    getRecipeByCode,
    getActiveRecipeByProductId,
    insertRecipe,
    insertRecipeItem,
    getRecipeById
};