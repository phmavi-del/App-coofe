const {
    createConnection
} = require("../core/connection");

const {
    validateInventoryMovement
} = require("../validation/inventory.validation");

const {
    getWarehouseById,
    getProductById,
    getInventoryBalance,
    ensureInventoryBalance,
    insertInventoryMovement,
    updateInventoryBalance
} = require("../repositories/inventory.repository");


const OUT_MOVEMENTS = new Set([
    "sale",
    "purchase_return",
    "transfer_out",
    "adjustment_out",
    "production_out",
    "stocktake_out"
]);


const IN_MOVEMENTS = new Set([
    "opening",
    "purchase",
    "sale_return",
    "transfer_in",
    "adjustment_in",
    "production_in",
    "stocktake_in"
]);


function assertWarehouse(
    db,
    warehouseId
) {
    const warehouse =
        getWarehouseById(
            db,
            warehouseId
        );

    if (!warehouse) {
        throw new Error(
            "انبار پیدا نشد."
        );
    }

    if (!warehouse.is_active) {
        throw new Error(
            "انبار غیرفعال است."
        );
    }

    return warehouse;
}


function assertProduct(
    db,
    productId
) {
    const product =
        getProductById(
            db,
            productId
        );

    if (!product) {
        throw new Error(
            "کالا پیدا نشد."
        );
    }

    if (!product.is_active) {
        throw new Error(
            "کالا غیرفعال است."
        );
    }

    if (!product.track_inventory) {
        throw new Error(
            "برای این کالا کنترل موجودی فعال نیست."
        );
    }

    return product;
}


function calculateWeightedAverageCost(
    currentQuantity,
    currentAverageCost,
    incomingQuantity,
    incomingUnitCost
) {
    const currentValue =
        currentQuantity *
        currentAverageCost;

    const incomingValue =
        incomingQuantity *
        incomingUnitCost;

    const totalQuantity =
        currentQuantity +
        incomingQuantity;

    if (totalQuantity <= 0) {
        return 0;
    }

    return (
        currentValue +
        incomingValue
    ) / totalQuantity;
}


/*
 * این تابع روی Connection موجود کار می‌کند.
 * بنابراین می‌تواند داخل Transaction مشترک
 * توسط فروش، خرید یا Recipe استفاده شود.
 */
function applyInventoryMovementInTransaction(
    db,
    input
) {
    const data =
        validateInventoryMovement(
            input
        );

    const warehouse =
        assertWarehouse(
            db,
            data.warehouse_id
        );

    const product =
        assertProduct(
            db,
            data.product_id
        );

    const balance =
        ensureInventoryBalance(
            db,
            warehouse.id,
            product.id
        );

    const currentQuantity =
        Number(balance.quantity);

    const currentAverageCost =
        Number(balance.average_cost);

    const isIncoming =
        IN_MOVEMENTS.has(
            data.movement_type
        );

    const isOutgoing =
        OUT_MOVEMENTS.has(
            data.movement_type
        );

    if (
        !isIncoming &&
        !isOutgoing
    ) {
        throw new Error(
            "نوع حرکت ورود یا خروج مشخص نیست."
        );
    }

    if (isOutgoing) {

        if (
            currentQuantity <
            data.quantity
        ) {
            throw new Error(
                `موجودی «${product.name}» کافی نیست. موجودی فعلی: ${currentQuantity}`
            );
        }

        const newQuantity =
            currentQuantity -
            data.quantity;

        updateInventoryBalance(
            db,
            warehouse.id,
            product.id,
            newQuantity,
            currentAverageCost
        );

        const movementId =
            insertInventoryMovement(
                db,
                data
            );

        return {
            movementId,
            warehouseId: warehouse.id,
            productId: product.id,
            productName: product.name,
            quantity: data.quantity,
            movementType:
                data.movement_type,
            beforeQuantity:
                currentQuantity,
            afterQuantity:
                newQuantity,
            averageCost:
                currentAverageCost
        };
    }

    const newQuantity =
        currentQuantity +
        data.quantity;

    const newAverageCost =
        calculateWeightedAverageCost(
            currentQuantity,
            currentAverageCost,
            data.quantity,
            data.unit_cost
        );

    updateInventoryBalance(
        db,
        warehouse.id,
        product.id,
        newQuantity,
        newAverageCost
    );

    const movementId =
        insertInventoryMovement(
            db,
            data
        );

    return {
        movementId,
        warehouseId: warehouse.id,
        productId: product.id,
        productName: product.name,
        quantity: data.quantity,
        movementType:
            data.movement_type,
        beforeQuantity:
            currentQuantity,
        afterQuantity:
            newQuantity,
        averageCost:
            newAverageCost
    };
}


function applyInventoryMovement(
    input
) {
    const db =
        createConnection();

    try {

        const transaction =
            db.transaction(() => {
                return applyInventoryMovementInTransaction(
                    db,
                    input
                );
            });

        return transaction();

    } finally {

        db.close();
    }
}


function getInventoryBalanceByProduct(
    warehouseId,
    productId
) {
    const db =
        createConnection();

    try {

        return getInventoryBalance(
            db,
            warehouseId,
            productId
        );

    } finally {

        db.close();
    }
}


module.exports = {
    applyInventoryMovement,
    applyInventoryMovementInTransaction,
    getInventoryBalanceByProduct
};