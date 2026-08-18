const crypto = require("crypto");

const {
    createConnection
} = require("../core/connection");


/*
 * -------------------------------------------------
 * Password Hashing
 * -------------------------------------------------
 */

const SCRYPT_OPTIONS = {
    N: 16384,
    r: 8,
    p: 1
};

function hashPassword(password) {

    if (
    typeof password !== "string" ||
    password.length < 4
) {
    throw new Error(
        "Password must contain at least 4 characters."
    );
}

    const salt = crypto.randomBytes(16);

    const hash = crypto.scryptSync(
        password,
        salt,
        64,
        SCRYPT_OPTIONS
    );

    return [
        "scrypt",
        SCRYPT_OPTIONS.N,
        SCRYPT_OPTIONS.r,
        SCRYPT_OPTIONS.p,
        salt.toString("base64"),
        hash.toString("base64")
    ].join("$");
}


/*
 * -------------------------------------------------
 * Permissions
 * -------------------------------------------------
 */

const PERMISSIONS = [

    {
        code: "dashboard.view",
        module: "dashboard",
        action: "view",
        name: "مشاهده داشبورد",
        description: "مشاهده داشبورد اصلی"
    },


    /*
     * فروش
     */

    {
        code: "sales.view",
        module: "sales",
        action: "view",
        name: "مشاهده فروش",
        description: "مشاهده بخش فروش"
    },

    {
        code: "sales.create",
        module: "sales",
        action: "create",
        name: "ثبت فروش",
        description: "ثبت فاکتور فروش"
    },

    {
        code: "sales.edit",
        module: "sales",
        action: "edit",
        name: "ویرایش فروش",
        description: "ویرایش فاکتور فروش"
    },

    {
        code: "sales.cancel",
        module: "sales",
        action: "cancel",
        name: "ابطال فروش",
        description: "ابطال فاکتور فروش"
    },

    {
        code: "sales.refund",
        module: "sales",
        action: "refund",
        name: "برگشت فروش",
        description: "ثبت برگشت از فروش"
    },

    {
        code: "sales.print",
        module: "sales",
        action: "print",
        name: "چاپ فاکتور فروش",
        description: "چاپ فاکتور فروش"
    },


    /*
     * کالا
     */

    {
        code: "products.view",
        module: "products",
        action: "view",
        name: "مشاهده کالاها",
        description: "مشاهده فهرست کالاها"
    },

    {
        code: "products.create",
        module: "products",
        action: "create",
        name: "ثبت کالا",
        description: "ایجاد کالای جدید"
    },

    {
        code: "products.edit",
        module: "products",
        action: "edit",
        name: "ویرایش کالا",
        description: "ویرایش کالا"
    },

    {
        code: "products.delete",
        module: "products",
        action: "delete",
        name: "حذف کالا",
        description: "غیرفعال یا حذف کالای مجاز"
    },


    /*
     * دسته‌بندی
     */

    {
        code: "categories.view",
        module: "categories",
        action: "view",
        name: "مشاهده دسته‌بندی‌ها",
        description: "مشاهده دسته‌بندی کالاها"
    },

    {
        code: "categories.create",
        module: "categories",
        action: "create",
        name: "ثبت دسته‌بندی",
        description: "ایجاد دسته‌بندی"
    },

    {
        code: "categories.edit",
        module: "categories",
        action: "edit",
        name: "ویرایش دسته‌بندی",
        description: "ویرایش دسته‌بندی"
    },

    {
        code: "categories.delete",
        module: "categories",
        action: "delete",
        name: "حذف دسته‌بندی",
        description: "حذف یا غیرفعال‌سازی دسته‌بندی"
    },


    /*
     * انبار
     */

    {
        code: "inventory.view",
        module: "inventory",
        action: "view",
        name: "مشاهده انبار",
        description: "مشاهده موجودی و گردش انبار"
    },

    {
        code: "inventory.create",
        module: "inventory",
        action: "create",
        name: "ثبت گردش انبار",
        description: "ثبت ورود و خروج کالا"
    },

    {
        code: "inventory.adjust",
        module: "inventory",
        action: "adjust",
        name: "اصلاح موجودی",
        description: "ثبت تعدیل موجودی"
    },

    {
        code: "inventory.transfer",
        module: "inventory",
        action: "transfer",
        name: "انتقال بین انبارها",
        description: "انتقال کالا بین انبارها"
    },

    {
        code: "inventory.stocktake",
        module: "inventory",
        action: "stocktake",
        name: "انبارگردانی",
        description: "ثبت و تکمیل انبارگردانی"
    },


    /*
     * انبارها
     */

    {
        code: "warehouses.view",
        module: "warehouses",
        action: "view",
        name: "مشاهده انبارها",
        description: "مشاهده فهرست انبارها"
    },

    {
        code: "warehouses.create",
        module: "warehouses",
        action: "create",
        name: "ایجاد انبار",
        description: "ایجاد انبار جدید"
    },

    {
        code: "warehouses.edit",
        module: "warehouses",
        action: "edit",
        name: "ویرایش انبار",
        description: "ویرایش اطلاعات انبار"
    },

    {
        code: "warehouses.delete",
        module: "warehouses",
        action: "delete",
        name: "غیرفعال‌سازی انبار",
        description: "غیرفعال‌سازی انبار"
    },


    /*
     * خرید
     */

    {
        code: "purchasing.view",
        module: "purchasing",
        action: "view",
        name: "مشاهده خرید",
        description: "مشاهده خریدها"
    },

    {
        code: "purchasing.create",
        module: "purchasing",
        action: "create",
        name: "ثبت خرید",
        description: "ثبت فاکتور خرید"
    },

    {
        code: "purchasing.edit",
        module: "purchasing",
        action: "edit",
        name: "ویرایش خرید",
        description: "ویرایش فاکتور خرید"
    },

    {
        code: "purchasing.cancel",
        module: "purchasing",
        action: "cancel",
        name: "ابطال خرید",
        description: "ابطال فاکتور خرید"
    },


    /*
     * مشتریان
     */

    {
        code: "customers.view",
        module: "customers",
        action: "view",
        name: "مشاهده مشتریان",
        description: "مشاهده فهرست مشتریان"
    },

    {
        code: "customers.create",
        module: "customers",
        action: "create",
        name: "ثبت مشتری",
        description: "ایجاد مشتری جدید"
    },

    {
        code: "customers.edit",
        module: "customers",
        action: "edit",
        name: "ویرایش مشتری",
        description: "ویرایش اطلاعات مشتری"
    },

    {
        code: "customers.delete",
        module: "customers",
        action: "delete",
        name: "غیرفعال‌سازی مشتری",
        description: "غیرفعال‌سازی مشتری"
    },


    /*
     * باشگاه مشتریان
     */

    {
        code: "loyalty.view",
        module: "loyalty",
        action: "view",
        name: "مشاهده باشگاه مشتریان",
        description: "مشاهده اطلاعات باشگاه"
    },

    {
        code: "loyalty.manage",
        module: "loyalty",
        action: "manage",
        name: "مدیریت باشگاه مشتریان",
        description: "مدیریت امتیاز، اعتبار و پاداش"
    },


    /*
     * تأمین‌کنندگان
     */

    {
        code: "suppliers.view",
        module: "suppliers",
        action: "view",
        name: "مشاهده تأمین‌کنندگان",
        description: "مشاهده تأمین‌کنندگان"
    },

    {
        code: "suppliers.create",
        module: "suppliers",
        action: "create",
        name: "ثبت تأمین‌کننده",
        description: "ثبت تأمین‌کننده جدید"
    },

    {
        code: "suppliers.edit",
        module: "suppliers",
        action: "edit",
        name: "ویرایش تأمین‌کننده",
        description: "ویرایش تأمین‌کننده"
    },


    /*
     * صندوق
     */

    {
        code: "cash.view",
        module: "cash",
        action: "view",
        name: "مشاهده صندوق",
        description: "مشاهده وضعیت صندوق"
    },

    {
        code: "cash.receipt",
        module: "cash",
        action: "receipt",
        name: "دریافت نقدی",
        description: "ثبت دریافت نقدی"
    },

    {
        code: "cash.payment",
        module: "cash",
        action: "payment",
        name: "پرداخت نقدی",
        description: "ثبت پرداخت نقدی"
    },

    {
        code: "cash.transfer",
        module: "cash",
        action: "transfer",
        name: "انتقال از صندوق",
        description: "انتقال وجه از صندوق"
    },

    {
        code: "cash.close",
        module: "cash",
        action: "close",
        name: "بستن صندوق",
        description: "بستن دوره صندوق"
    },


    /*
     * بانک
     */

    {
        code: "bank.view",
        module: "bank",
        action: "view",
        name: "مشاهده بانک",
        description: "مشاهده حساب‌های بانکی"
    },

    {
        code: "bank.receipt",
        module: "bank",
        action: "receipt",
        name: "دریافت بانکی",
        description: "ثبت دریافت بانکی"
    },

    {
        code: "bank.payment",
        module: "bank",
        action: "payment",
        name: "پرداخت بانکی",
        description: "ثبت پرداخت بانکی"
    },

    {
        code: "bank.transfer",
        module: "bank",
        action: "transfer",
        name: "انتقال بانکی",
        description: "انتقال بین حساب‌های بانکی"
    },


    /*
     * حسابداری
     */

    {
        code: "accounting.view",
        module: "accounting",
        action: "view",
        name: "مشاهده حسابداری",
        description: "مشاهده حساب‌ها و اسناد"
    },

    {
        code: "accounting.create",
        module: "accounting",
        action: "create",
        name: "ثبت سند حسابداری",
        description: "ثبت سند حسابداری"
    },

    {
        code: "accounting.edit",
        module: "accounting",
        action: "edit",
        name: "ویرایش سند حسابداری",
        description: "ویرایش سند مجاز"
    },

    {
        code: "accounting.cancel",
        module: "accounting",
        action: "cancel",
        name: "ابطال سند حسابداری",
        description: "ابطال سند حسابداری"
    },


    /*
     * گزارش‌ها
     */

    {
        code: "reports.view",
        module: "reports",
        action: "view",
        name: "مشاهده گزارش‌ها",
        description: "مشاهده گزارش‌های سیستم"
    },

    {
        code: "reports.print",
        module: "reports",
        action: "print",
        name: "چاپ گزارش",
        description: "چاپ گزارش‌ها"
    },

    {
        code: "reports.export",
        module: "reports",
        action: "export",
        name: "خروجی گزارش",
        description: "خروجی گرفتن از گزارش‌ها"
    },


    /*
     * پرسنل
     */

    {
        code: "personnel.view",
        module: "personnel",
        action: "view",
        name: "مشاهده پرسنل",
        description: "مشاهده کارکنان"
    },

    {
        code: "personnel.create",
        module: "personnel",
        action: "create",
        name: "ثبت پرسنل",
        description: "ثبت کارمند جدید"
    },

    {
        code: "personnel.edit",
        module: "personnel",
        action: "edit",
        name: "ویرایش پرسنل",
        description: "ویرایش اطلاعات پرسنل"
    },

    {
        code: "personnel.pay",
        module: "personnel",
        action: "pay",
        name: "پرداخت پرسنل",
        description: "ثبت پرداخت پرسنل"
    },


    /*
     * چاپگر
     */

    {
        code: "printers.view",
        module: "printers",
        action: "view",
        name: "مشاهده چاپگرها",
        description: "مشاهده تجهیزات چاپ"
    },

    {
        code: "printers.manage",
        module: "printers",
        action: "manage",
        name: "مدیریت چاپگرها",
        description: "تنظیم و مدیریت چاپگرها"
    },


    /*
     * کارت‌خوان
     */

    {
        code: "pos_terminal.view",
        module: "pos_terminal",
        action: "view",
        name: "مشاهده کارت‌خوان",
        description: "مشاهده کارت‌خوان‌ها"
    },

    {
        code: "pos_terminal.manage",
        module: "pos_terminal",
        action: "manage",
        name: "مدیریت کارت‌خوان",
        description: "تنظیم کارت‌خوان‌ها"
    },


    /*
     * کاربران
     */

    {
        code: "users.view",
        module: "users",
        action: "view",
        name: "مشاهده کاربران",
        description: "مشاهده کاربران"
    },

    {
        code: "users.create",
        module: "users",
        action: "create",
        name: "ایجاد کاربر",
        description: "ایجاد کاربر جدید"
    },

    {
        code: "users.edit",
        module: "users",
        action: "edit",
        name: "ویرایش کاربر",
        description: "ویرایش کاربر"
    },

    {
        code: "users.disable",
        module: "users",
        action: "disable",
        name: "غیرفعال‌سازی کاربر",
        description: "غیرفعال‌سازی کاربر"
    },

    {
        code: "users.permissions",
        module: "users",
        action: "permissions",
        name: "مدیریت دسترسی کاربران",
        description: "مدیریت نقش و دسترسی"
    },


    /*
     * تنظیمات
     */

    {
        code: "settings.view",
        module: "settings",
        action: "view",
        name: "مشاهده تنظیمات",
        description: "مشاهده تنظیمات برنامه"
    },

    {
        code: "settings.edit",
        module: "settings",
        action: "edit",
        name: "ویرایش تنظیمات",
        description: "تغییر تنظیمات برنامه"
    },


    /*
     * Backup
     */

    {
        code: "backup.create",
        module: "backup",
        action: "create",
        name: "ایجاد پشتیبان",
        description: "ایجاد نسخه پشتیبان"
    },

    {
        code: "backup.restore",
        module: "backup",
        action: "restore",
        name: "بازیابی پشتیبان",
        description: "بازیابی نسخه پشتیبان"
    }

];


/*
 * -------------------------------------------------
 * Roles
 * -------------------------------------------------
 */

const ROLES = [

    {
        code: "system_admin",
        name: "مدیر سیستم",
        description:
            "دسترسی کامل به تمام بخش‌های برنامه",
        is_system: 1,
        is_active: 1
    },

    {
        code: "manager",
        name: "مدیر",
        description:
            "مدیریت عملیاتی مجموعه",
        is_system: 1,
        is_active: 1
    },

    {
        code: "cashier",
        name: "صندوقدار",
        description:
            "ثبت فروش و عملیات صندوق",
        is_system: 1,
        is_active: 1
    },

    {
        code: "salesperson",
        name: "فروشنده",
        description:
            "ثبت و پیگیری فروش",
        is_system: 1,
        is_active: 1
    },

    {
        code: "warehouse",
        name: "انباردار",
        description:
            "مدیریت موجودی و گردش انبار",
        is_system: 1,
        is_active: 1
    },

    {
        code: "accountant",
        name: "حسابدار",
        description:
            "مدیریت عملیات حسابداری",
        is_system: 1,
        is_active: 1
    }

];


/*
 * -------------------------------------------------
 * Database Helpers
 * -------------------------------------------------
 */

function getOrCreatePermission(
    db,
    permission
) {

    const existing = db
        .prepare(
            `
            SELECT id
            FROM permissions
            WHERE code = ?
            `
        )
        .get(permission.code);

    if (existing) {
        return existing.id;
    }

    const result = db
        .prepare(
            `
            INSERT INTO permissions (
                code,
                module,
                action,
                name,
                description,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, 1)
            `
        )
        .run(
            permission.code,
            permission.module,
            permission.action,
            permission.name,
            permission.description || null
        );

    return result.lastInsertRowid;
}


function getOrCreateRole(
    db,
    role
) {

    const existing = db
        .prepare(
            `
            SELECT id
            FROM roles
            WHERE code = ?
            `
        )
        .get(role.code);

    if (existing) {
        return existing.id;
    }

    const result = db
        .prepare(
            `
            INSERT INTO roles (
                code,
                name,
                description,
                is_system,
                is_active
            )
            VALUES (?, ?, ?, ?, ?)
            `
        )
        .run(
            role.code,
            role.name,
            role.description || null,
            role.is_system,
            role.is_active
        );

    return result.lastInsertRowid;
}


function grantPermission(
    db,
    roleId,
    permissionId
) {

    db.prepare(
        `
        INSERT OR IGNORE INTO role_permissions (
            role_id,
            permission_id
        )
        VALUES (?, ?)
        `
    ).run(
        roleId,
        permissionId
    );
}


/*
 * -------------------------------------------------
 * Default Role Permissions
 * -------------------------------------------------
 */

function buildRolePermissionMap() {

    const all = PERMISSIONS.map(
        permission => permission.code
    );

    const map = {

        system_admin: all,

        manager: all.filter(
            code =>
                !code.startsWith("users.")
                &&
                !code.startsWith("backup.restore")
        ),

        cashier: [
            "dashboard.view",

            "sales.view",
            "sales.create",
            "sales.edit",
            "sales.print",

            "customers.view",
            "customers.create",
            "customers.edit",

            "loyalty.view",

            "cash.view",
            "cash.receipt",
            "cash.payment",

            "printers.view",

            "pos_terminal.view"
        ],

        salesperson: [
            "dashboard.view",

            "sales.view",
            "sales.create",
            "sales.edit",
            "sales.print",

            "customers.view",
            "customers.create",
            "customers.edit",

            "loyalty.view",

            "products.view",

            "printers.view",

            "pos_terminal.view"
        ],

        warehouse: [
            "dashboard.view",

            "products.view",
            "products.create",
            "products.edit",

            "categories.view",

            "inventory.view",
            "inventory.create",
            "inventory.adjust",
            "inventory.transfer",
            "inventory.stocktake",

            "warehouses.view",
            "warehouses.create",
            "warehouses.edit",

            "purchasing.view",
            "purchasing.create"
        ],

        accountant: [
            "dashboard.view",

            "accounting.view",
            "accounting.create",
            "accounting.edit",
            "accounting.cancel",

            "cash.view",
            "cash.receipt",
            "cash.payment",

            "bank.view",
            "bank.receipt",
            "bank.payment",
            "bank.transfer",

            "purchasing.view",

            "customers.view",

            "suppliers.view",

            "reports.view",
            "reports.print",
            "reports.export"
        ]

    };

    return map;
}


/*
 * -------------------------------------------------
 * Admin User
 * -------------------------------------------------
 */

function createInitialAdmin(db) {

    const existing = db
        .prepare(
            `
            SELECT
                id,
                username,
                password_changed_at
            FROM users
            WHERE username = ?
            `
        )
        .get("admin");

    if (existing) {

        return {
            created: false,
            userId: existing.id,
            username: existing.username,
            initialPassword: null
        };
    }

    const initialPassword = "1234";

    const passwordHash =
        hashPassword(initialPassword);

    const role = db
        .prepare(
            `
            SELECT id
            FROM roles
            WHERE code = ?
            `
        )
        .get("system_admin");

    if (!role) {
        throw new Error(
            "System administrator role was not created."
        );
    }

    const result = db
        .prepare(
            `
            INSERT INTO users (
                username,
                password_hash,
                password_algorithm,
                full_name,
                is_active,
                is_locked,
                failed_login_attempts,
                password_changed_at
            )
            VALUES (
                ?,
                ?,
                'scrypt',
                ?,
                1,
                0,
                0,
                NULL
            )
            `
        )
        .run(
            "admin",
            passwordHash,
            "مدیر سیستم"
        );

    const userId =
        result.lastInsertRowid;

    db.prepare(
        `
        INSERT INTO user_roles (
            user_id,
            role_id
        )
        VALUES (?, ?)
        `
    ).run(
        userId,
        role.id
    );

    return {
        created: true,
        userId,
        username: "admin",
        initialPassword
    };
}

/*
 * -------------------------------------------------
 * Seed
 * -------------------------------------------------
 */

function seedUsers(db) {

    const transaction =
        db.transaction(() => {

            const permissionIds =
                new Map();

            for (
                const permission of PERMISSIONS
            ) {

                const id =
                    getOrCreatePermission(
                        db,
                        permission
                    );

                permissionIds.set(
                    permission.code,
                    id
                );
            }


            const roleIds =
                new Map();

            for (const role of ROLES) {

                const id =
                    getOrCreateRole(
                        db,
                        role
                    );

                roleIds.set(
                    role.code,
                    id
                );
            }


            const rolePermissionMap =
                buildRolePermissionMap();


            for (
                const [
                    roleCode,
                    permissionCodes
                ]
                of Object.entries(
                    rolePermissionMap
                )
            ) {

                const roleId =
                    roleIds.get(roleCode);

                if (!roleId) {
                    throw new Error(
                        `Role not found: ${roleCode}`
                    );
                }


                for (
                    const permissionCode
                    of permissionCodes
                ) {

                    const permissionId =
                        permissionIds.get(
                            permissionCode
                        );

                    if (!permissionId) {
                        throw new Error(
                            `Permission not found: ${permissionCode}`
                        );
                    }


                    grantPermission(
                        db,
                        roleId,
                        permissionId
                    );
                }
            }


            return createInitialAdmin(db);
        });

    return transaction();
}


/*
 * -------------------------------------------------
 * Initialization
 * -------------------------------------------------
 */

function initializeUsersSeed() {

    const db =
        createConnection();

    try {

        const result =
            seedUsers(db);

        console.log(
            "Users, roles and permissions initialized successfully."
        );


        if (result.created) {

            console.log("");
            console.log(
                "Initial administrator account created."
            );
            console.log(
                `Username: ${result.username}`
            );
            console.log(
                `Initial password: ${result.initialPassword}`
            );
            console.log("");
            console.log(
                "IMPORTANT: change this password after first login."
            );

        } else {

            console.log(
                "Administrator account already exists; password was not changed."
            );
        }

    } finally {

        db.close();
    }
}


/*
 * -------------------------------------------------
 * Direct Execution
 * -------------------------------------------------
 */

if (require.main === module) {
    initializeUsersSeed();
}


module.exports = {
    PERMISSIONS,
    ROLES,
    seedUsers,
    initializeUsersSeed,
    hashPassword
};