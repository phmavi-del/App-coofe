const {
    createConnection
} = require("../core/connection");

function getOrCreate(
    db,
    table,
    code,
    values
) {
    const existing = db
        .prepare(
            `SELECT id FROM ${table} WHERE code = ?`
        )
        .get(code);

    if (existing) {
        return existing.id;
    }

    const columns = [
        "code",
        ...Object.keys(values)
    ];

    const placeholders = columns
        .map(() => "?")
        .join(", ");

    const params = [
        code,
        ...Object.values(values)
    ];

    const result = db
        .prepare(
            `
            INSERT INTO ${table}
            (${columns.join(", ")})
            VALUES (${placeholders})
            `
        )
        .run(...params);

    return result.lastInsertRowid;
}

function seedInitialData(db) {

    const transaction = db.transaction(() => {

        /*
         * -------------------------------------------------
         * اطلاعات برنامه
         * -------------------------------------------------
         */

        db.prepare(
            `
            INSERT INTO app_info (
                id,
                app_name,
                app_version,
                database_version
            )
            VALUES (
                1,
                ?,
                ?,
                ?
            )
            ON CONFLICT(id)
            DO UPDATE SET
                app_name = excluded.app_name,
                app_version = excluded.app_version,
                database_version = excluded.database_version,
                updated_at = CURRENT_TIMESTAMP
            `
        ).run(
            "حسابداری ایران فود",
            "1.0.0",
            1
        );


        /*
         * -------------------------------------------------
         * شعبه اصلی
         * -------------------------------------------------
         */

        const mainBranchId = getOrCreate(
            db,
            "branches",
            "BR-001",
            {
                name: "شعبه اصلی",
                description:
                    "شعبه اصلی حسابداری ایران فود",
                is_active: 1
            }
        );


        /*
         * -------------------------------------------------
         * صندوق اصلی
         * -------------------------------------------------
         */

        const mainCashId = getOrCreate(
            db,
            "cash_registers",
            "CASH-001",
            {
                branch_id: mainBranchId,
                name: "صندوق اصلی",
                description:
                    "صندوق اصلی برنامه",
                opening_balance: 0,
                is_main: 1,
                is_active: 1
            }
        );


        /*
         * -------------------------------------------------
         * انبار اصلی
         * -------------------------------------------------
         */

        const mainWarehouseId = getOrCreate(
            db,
            "warehouses",
            "WH-001",
            {
                branch_id: mainBranchId,
                name: "انبار اصلی",
                description:
                    "انبار اصلی برنامه",
                is_main: 1,
                is_active: 1
            }
        );


        /*
         * -------------------------------------------------
         * حساب بانکی اصلی
         * -------------------------------------------------
         */

        const mainBankId = getOrCreate(
            db,
            "bank_accounts",
            "BANK-001",
            {
                branch_id: mainBranchId,
                name: "حساب بانکی اصلی",
                bank_name: null,
                account_number: null,
                card_number: null,
                iban: null,
                opening_balance: 0,
                is_main: 1,
                is_active: 1
            }
        );


        /*
         * -------------------------------------------------
         * واحدهای پایه
         * -------------------------------------------------
         */

        getOrCreate(
            db,
            "units",
            "UNIT-PCS",
            {
                name: "عدد",
                symbol: "عدد",
                decimal_places: 0,
                is_active: 1
            }
        );

        getOrCreate(
            db,
            "units",
            "UNIT-KG",
            {
                name: "کیلوگرم",
                symbol: "kg",
                decimal_places: 3,
                is_active: 1
            }
        );

        getOrCreate(
            db,
            "units",
            "UNIT-LITER",
            {
                name: "لیتر",
                symbol: "L",
                decimal_places: 3,
                is_active: 1
            }
        );


        /*
         * -------------------------------------------------
         * حساب‌های پایه حسابداری
         * -------------------------------------------------
         */

        const assetsId = getOrCreate(
            db,
            "accounts",
            "1",
            {
                parent_id: null,
                name: "دارایی‌ها",
                account_type: "asset",
                normal_balance: "debit",
                level: 1,
                is_system: 1,
                is_active: 1,
                description:
                    "گروه اصلی دارایی‌ها"
            }
        );

        const liabilitiesId = getOrCreate(
            db,
            "accounts",
            "2",
            {
                parent_id: null,
                name: "بدهی‌ها",
                account_type: "liability",
                normal_balance: "credit",
                level: 1,
                is_system: 1,
                is_active: 1,
                description:
                    "گروه اصلی بدهی‌ها"
            }
        );

        const equityId = getOrCreate(
            db,
            "accounts",
            "3",
            {
                parent_id: null,
                name: "حقوق مالکانه",
                account_type: "equity",
                normal_balance: "credit",
                level: 1,
                is_system: 1,
                is_active: 1,
                description:
                    "گروه اصلی حقوق مالکانه"
            }
        );

        const revenueId = getOrCreate(
            db,
            "accounts",
            "4",
            {
                parent_id: null,
                name: "درآمدها",
                account_type: "revenue",
                normal_balance: "credit",
                level: 1,
                is_system: 1,
                is_active: 1,
                description:
                    "گروه اصلی درآمدها"
            }
        );

        const expenseId = getOrCreate(
            db,
            "accounts",
            "5",
            {
                parent_id: null,
                name: "هزینه‌ها",
                account_type: "expense",
                normal_balance: "debit",
                level: 1,
                is_system: 1,
                is_active: 1,
                description:
                    "گروه اصلی هزینه‌ها"
            }
        );


        /*
         * -------------------------------------------------
         * حساب‌های زیرمجموعه دارایی
         * -------------------------------------------------
         */

        getOrCreate(
            db,
            "accounts",
            "101",
            {
                parent_id: assetsId,
                name: "صندوق‌ها",
                account_type: "asset",
                normal_balance: "debit",
                level: 2,
                is_system: 1,
                is_active: 1,
                description:
                    "حساب‌های مربوط به صندوق‌ها"
            }
        );

        getOrCreate(
            db,
            "accounts",
            "102",
            {
                parent_id: assetsId,
                name: "بانک‌ها",
                account_type: "asset",
                normal_balance: "debit",
                level: 2,
                is_system: 1,
                is_active: 1,
                description:
                    "حساب‌های مربوط به بانک‌ها"
            }
        );

        getOrCreate(
            db,
            "accounts",
            "103",
            {
                parent_id: assetsId,
                name: "موجودی کالا",
                account_type: "asset",
                normal_balance: "debit",
                level: 2,
                is_system: 1,
                is_active: 1,
                description:
                    "ارزش موجودی کالا و مواد"
            }
        );


        /*
         * -------------------------------------------------
         * حساب‌های پایه بدهی
         * -------------------------------------------------
         */

        getOrCreate(
            db,
            "accounts",
            "201",
            {
                parent_id: liabilitiesId,
                name: "بستانکاران و تأمین‌کنندگان",
                account_type: "liability",
                normal_balance: "credit",
                level: 2,
                is_system: 1,
                is_active: 1,
                description:
                    "بدهی به تأمین‌کنندگان"
            }
        );


        /*
         * -------------------------------------------------
         * حساب سرمایه
         * -------------------------------------------------
         */

        getOrCreate(
            db,
            "accounts",
            "301",
            {
                parent_id: equityId,
                name: "سرمایه",
                account_type: "equity",
                normal_balance: "credit",
                level: 2,
                is_system: 1,
                is_active: 1,
                description:
                    "سرمایه مالک"
            }
        );


        /*
         * -------------------------------------------------
         * درآمد فروش
         * -------------------------------------------------
         */

        getOrCreate(
            db,
            "accounts",
            "401",
            {
                parent_id: revenueId,
                name: "فروش",
                account_type: "revenue",
                normal_balance: "credit",
                level: 2,
                is_system: 1,
                is_active: 1,
                description:
                    "درآمد حاصل از فروش"
            }
        );


        /*
         * -------------------------------------------------
         * هزینه‌های پایه
         * -------------------------------------------------
         */

        getOrCreate(
            db,
            "accounts",
            "501",
            {
                parent_id: expenseId,
                name: "هزینه‌های عملیاتی",
                account_type: "expense",
                normal_balance: "debit",
                level: 2,
                is_system: 1,
                is_active: 1,
                description:
                    "هزینه‌های جاری و عملیاتی"
            }
        );


        /*
         * -------------------------------------------------
         * جلوگیری از unused variable در مراحل فعلی
         * -------------------------------------------------
         */

        void mainCashId;
        void mainWarehouseId;
        void mainBankId;
        void liabilitiesId;
        void equityId;
        void revenueId;
        void expenseId;
    });

    transaction();
}


function initializeInitialData() {

    const db = createConnection();

    try {

        seedInitialData(db);

        console.log(
            "Initial data created successfully."
        );

    } finally {

        db.close();

    }
}


if (require.main === module) {
    initializeInitialData();
}


module.exports = {
    seedInitialData,
    initializeInitialData
};