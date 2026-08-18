const {
    createConnection
} = require("../core/connection");

const CATEGORIES = [
    {
        code: "PIZZA",
        name: "پیتزا",
        icon: "🍕",
        description: "انواع پیتزا",
        sort_order: 1
    },
    {
        code: "BURGER",
        name: "برگر",
        icon: "🍔",
        description: "انواع برگر",
        sort_order: 2
    },
    {
        code: "SANDWICH",
        name: "ساندویچ",
        icon: "🥪",
        description: "انواع ساندویچ",
        sort_order: 3
    },
    {
        code: "SALAD",
        name: "سالاد",
        icon: "🥗",
        description: "انواع سالاد",
        sort_order: 4
    },
    {
        code: "PASTA",
        name: "پاستا",
        icon: "🍝",
        description: "انواع پاستا",
        sort_order: 5
    },
    {
        code: "APPETIZER",
        name: "پیش‌غذا",
        icon: "🍟",
        description: "انواع پیش‌غذا",
        sort_order: 6
    },
    {
        code: "MAIN_FOOD",
        name: "غذای اصلی",
        icon: "🍗",
        description: "غذاهای اصلی",
        sort_order: 7
    },
    {
        code: "HOT_DRINK",
        name: "نوشیدنی گرم",
        icon: "☕",
        description: "قهوه، چای و نوشیدنی‌های گرم",
        sort_order: 8
    },
    {
        code: "COLD_DRINK",
        name: "نوشیدنی سرد",
        icon: "🧋",
        description: "انواع نوشیدنی سرد",
        sort_order: 9
    },
    {
        code: "SOFT_DRINK",
        name: "نوشابه و آبمیوه",
        icon: "🥤",
        description: "نوشابه، آبمیوه و نوشیدنی‌های بطری",
        sort_order: 10
    },
    {
        code: "DESSERT",
        name: "دسر",
        icon: "🍰",
        description: "انواع دسر",
        sort_order: 11
    },
    {
        code: "BREAKFAST",
        name: "صبحانه",
        icon: "🍳",
        description: "انواع صبحانه",
        sort_order: 12
    },
    {
        code: "SAUCE",
        name: "سس و افزودنی",
        icon: "🥫",
        description: "سس‌ها و افزودنی‌ها",
        sort_order: 13
    },
    {
        code: "OTHER",
        name: "سایر",
        icon: "📦",
        description: "سایر محصولات",
        sort_order: 99
    }
];

function seedCategories(db) {
    const transaction = db.transaction(() => {
        const select = db.prepare(`
            SELECT id
            FROM categories
            WHERE code = ?
        `);

        const insert = db.prepare(`
            INSERT INTO categories (
                code,
                name,
                description,
                icon,
                sort_order,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, 1)
        `);

        for (const category of CATEGORIES) {
            const existing = select.get(category.code);

            if (existing) {
                continue;
            }

            insert.run(
                category.code,
                category.name,
                category.description,
                category.icon,
                category.sort_order
            );
        }
    });

    transaction();
}

function initializeCategoriesSeed() {
    const db = createConnection();

    try {
        seedCategories(db);

        console.log(
            "Restaurant categories initialized successfully."
        );
    } finally {
        db.close();
    }
}

if (require.main === module) {
    initializeCategoriesSeed();
}

module.exports = {
    CATEGORIES,
    seedCategories,
    initializeCategoriesSeed
};