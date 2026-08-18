const {
    createConnection
} = require("../core/connection");

const {
    validateProductInput
} = require("../validation/product.validation");

const {
    getProductByCode,
    getProductByBarcode,
    getWarehouseById,
    getCategoryById,
    getUnitById,
    getPriceListByCode,
    getDefaultTaxRate,
    insertProduct,
    insertProductWarehouseSetting,
    insertInventoryBalance,
    insertProductPrice,
    insertProductTaxRate
} = require("../repositories/product.repository");


function assertActiveWarehouse(
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
            "انبار انتخاب‌شده وجود ندارد."
        );
    }

    if (!warehouse.is_active) {
        throw new Error(
            "انبار انتخاب‌شده غیرفعال است."
        );
    }

    return warehouse;
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


function assertActiveCategory(
    db,
    categoryId
) {
    if (categoryId === null) {
        return null;
    }

    const category =
        getCategoryById(
            db,
            categoryId
        );

    if (!category) {
        throw new Error(
            "دسته‌بندی انتخاب‌شده وجود ندارد."
        );
    }

    if (!category.is_active) {
        throw new Error(
            "دسته‌بندی انتخاب‌شده غیرفعال است."
        );
    }

    return category;
}


function assertProductCodeAvailable(
    db,
    code
) {
    const existing =
        getProductByCode(
            db,
            code
        );

    if (existing) {
        throw new Error(
            "کد کالا قبلاً ثبت شده است."
        );
    }
}


function assertBarcodeAvailable(
    db,
    barcode
) {
    if (!barcode) {
        return;
    }

    const existing =
        getProductByBarcode(
            db,
            barcode
        );

    if (existing) {
        throw new Error(
            "بارکد کالا قبلاً ثبت شده است."
        );
    }
}


function createProduct(input) {

    const data =
        validateProductInput(input);

    const db =
        createConnection();

    try {

        const transaction =
            db.transaction(() => {

                assertProductCodeAvailable(
                    db,
                    data.code
                );

                assertBarcodeAvailable(
                    db,
                    data.barcode
                );

                assertActiveWarehouse(
                    db,
                    data.default_warehouse_id
                );

                assertActiveUnit(
                    db,
                    data.unit_id
                );

                assertActiveCategory(
                    db,
                    data.category_id
                );


                const productId =
                    insertProduct(
                        db,
                        data
                    );


                insertProductWarehouseSetting(
                    db,
                    productId,
                    data.default_warehouse_id,
                    {
                        min_stock:
                            data.min_stock,

                        max_stock:
                            data.max_stock,

                        reorder_point:
                            data.reorder_point,

                        is_preferred: 1
                    }
                );


                insertInventoryBalance(
                    db,
                    productId,
                    data.default_warehouse_id
                );


                const retailPriceList =
                    getPriceListByCode(
                        db,
                        "RETAIL"
                    );

                if (!retailPriceList) {
                    throw new Error(
                        "فهرست قیمت فروش پیش‌فرض پیدا نشد."
                    );
                }


                insertProductPrice(
                    db,
                    productId,
                    retailPriceList.id,
                    data.sale_price
                );


                const defaultTaxRate =
                    getDefaultTaxRate(
                        db
                    );

                if (defaultTaxRate) {

                    insertProductTaxRate(
                        db,
                        productId,
                        defaultTaxRate.id
                    );
                }


                return productId;
            });


        const productId =
            transaction();

        return getProductResult(
            productId
        );

    } finally {

        db.close();
    }
}


function getProductResult(
    productId
) {
    const db =
        createConnection();

    try {

        return db
            .prepare(
                `
                SELECT
                    p.*,
                    c.name AS category_name,
                    c.icon AS category_icon,
                    u.name AS unit_name,
                    u.symbol AS unit_symbol,
                    w.name AS warehouse_name
                FROM products p

                LEFT JOIN categories c
                    ON c.id = p.category_id

                INNER JOIN units u
                    ON u.id = p.unit_id

                INNER JOIN warehouses w
                    ON w.id = p.default_warehouse_id

                WHERE p.id = ?
                `
            )
            .get(productId);

    } finally {

        db.close();
    }
}


module.exports = {
    createProduct,
    getProductResult
};