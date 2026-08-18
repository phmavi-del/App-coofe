const {
    createConnection
} = require("../core/connection");


function getDirectConversion(
    db,
    fromUnitId,
    toUnitId
) {
    return db
        .prepare(`
            SELECT
                id,
                from_unit_id,
                to_unit_id,
                conversion_factor
            FROM unit_conversions
            WHERE from_unit_id = ?
              AND to_unit_id = ?
              AND is_active = 1
            LIMIT 1
        `)
        .get(
            fromUnitId,
            toUnitId
        );
}


function getUnit(
    db,
    unitId
) {
    return db
        .prepare(`
            SELECT
                id,
                code,
                name,
                symbol,
                decimal_places,
                is_active
            FROM units
            WHERE id = ?
        `)
        .get(unitId);
}


function convertQuantityInTransaction(
    db,
    quantity,
    fromUnitId,
    toUnitId
) {
    if (
        !Number.isFinite(quantity) ||
        quantity < 0
    ) {
        throw new Error(
            "مقدار برای تبدیل واحد معتبر نیست."
        );
    }

    if (
        !Number.isInteger(fromUnitId) ||
        fromUnitId <= 0
    ) {
        throw new Error(
            "واحد مبدأ معتبر نیست."
        );
    }

    if (
        !Number.isInteger(toUnitId) ||
        toUnitId <= 0
    ) {
        throw new Error(
            "واحد مقصد معتبر نیست."
        );
    }

    if (fromUnitId === toUnitId) {
        return quantity;
    }

    const fromUnit =
        getUnit(
            db,
            fromUnitId
        );

    const toUnit =
        getUnit(
            db,
            toUnitId
        );

    if (!fromUnit) {
        throw new Error(
            "واحد مبدأ پیدا نشد."
        );
    }

    if (!toUnit) {
        throw new Error(
            "واحد مقصد پیدا نشد."
        );
    }

    if (!fromUnit.is_active) {
        throw new Error(
            "واحد مبدأ غیرفعال است."
        );
    }

    if (!toUnit.is_active) {
        throw new Error(
            "واحد مقصد غیرفعال است."
        );
    }

    const direct =
        getDirectConversion(
            db,
            fromUnitId,
            toUnitId
        );

    if (direct) {
        return (
            quantity *
            direct.conversion_factor
        );
    }

    const reverse =
        getDirectConversion(
            db,
            toUnitId,
            fromUnitId
        );

    if (reverse) {
        return (
            quantity /
            reverse.conversion_factor
        );
    }

    throw new Error(
        `تبدیل مستقیم یا معکوس از «${fromUnit.name}» به «${toUnit.name}» تعریف نشده است.`
    );
}


function convertQuantity(
    quantity,
    fromUnitId,
    toUnitId
) {
    const db =
        createConnection();

    try {
        return convertQuantityInTransaction(
            db,
            quantity,
            fromUnitId,
            toUnitId
        );
    } finally {
        db.close();
    }
}


module.exports = {
    convertQuantity,
    convertQuantityInTransaction,
    getDirectConversion
};