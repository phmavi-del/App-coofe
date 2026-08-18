const {
    createConnection
} = require("../core/connection");


const PRICE_LISTS = [
    {
        code: "RETAIL",
        name: "قیمت فروش",
        price_type: "retail",
        is_default: 1
    },
    {
        code: "TAKEAWAY",
        name: "قیمت بیرون‌بر",
        price_type: "takeaway",
        is_default: 0
    },
    {
        code: "DELIVERY",
        name: "قیمت ارسال",
        price_type: "delivery",
        is_default: 0
    },
    {
        code: "ONLINE",
        name: "قیمت آنلاین",
        price_type: "online",
        is_default: 0
    }
];


const TAX_RATES = [
    {
        code: "TAX_NONE",
        name: "بدون مالیات",
        rate_percent: 0,
        is_default: 1
    }
];


function seedProductBase(db) {

    const transaction = db.transaction(() => {

        const insertPriceList = db.prepare(`
            INSERT OR IGNORE INTO price_lists (
                code,
                name,
                price_type,
                is_default,
                is_active
            )
            VALUES (?, ?, ?, ?, 1)
        `);

        for (const item of PRICE_LISTS) {
            insertPriceList.run(
                item.code,
                item.name,
                item.price_type,
                item.is_default
            );
        }


        const insertTaxRate = db.prepare(`
            INSERT OR IGNORE INTO tax_rates (
                code,
                name,
                rate_percent,
                is_default,
                is_active
            )
            VALUES (?, ?, ?, ?, 1)
        `);

        for (const tax of TAX_RATES) {
            insertTaxRate.run(
                tax.code,
                tax.name,
                tax.rate_percent,
                tax.is_default
            );
        }

    });

    transaction();
}


function initializeProductBaseSeed() {

    const db = createConnection();

    try {

        seedProductBase(db);

        console.log(
            "Product base data initialized successfully."
        );

    } finally {

        db.close();
    }
}


if (require.main === module) {
    initializeProductBaseSeed();
}


module.exports = {
    PRICE_LISTS,
    TAX_RATES,
    seedProductBase,
    initializeProductBaseSeed
};