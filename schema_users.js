const USER_SCHEMA = [

    /*
     * -------------------------------------------------
     * کاربران
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        username TEXT NOT NULL UNIQUE,

        password_hash TEXT NOT NULL,

        password_algorithm TEXT NOT NULL DEFAULT 'scrypt',

        full_name TEXT NOT NULL,

        phone TEXT,

        email TEXT,

        branch_id INTEGER,

        default_cash_register_id INTEGER,

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        is_locked INTEGER NOT NULL DEFAULT 0
            CHECK (is_locked IN (0, 1)),

        failed_login_attempts INTEGER NOT NULL DEFAULT 0
            CHECK (failed_login_attempts >= 0),

        last_login_at TEXT,

        password_changed_at TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (branch_id)
            REFERENCES branches(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL,

        FOREIGN KEY (default_cash_register_id)
            REFERENCES cash_registers(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL
    )
    `,


    /*
     * -------------------------------------------------
     * نقش‌ها
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        code TEXT NOT NULL UNIQUE,

        name TEXT NOT NULL,

        description TEXT,

        is_system INTEGER NOT NULL DEFAULT 0
            CHECK (is_system IN (0, 1)),

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    `,


    /*
     * -------------------------------------------------
     * دسترسی‌ها
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        code TEXT NOT NULL UNIQUE,

        module TEXT NOT NULL,

        action TEXT NOT NULL,

        name TEXT NOT NULL,

        description TEXT,

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    `,


    /*
     * -------------------------------------------------
     * ارتباط کاربران و نقش‌ها
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER NOT NULL,

        role_id INTEGER NOT NULL,

        assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        assigned_by INTEGER,

        PRIMARY KEY (
            user_id,
            role_id
        ),

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,

        FOREIGN KEY (role_id)
            REFERENCES roles(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,

        FOREIGN KEY (assigned_by)
            REFERENCES users(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL
    )
    `,


    /*
     * -------------------------------------------------
     * ارتباط نقش‌ها و دسترسی‌ها
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER NOT NULL,

        permission_id INTEGER NOT NULL,

        granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        granted_by INTEGER,

        PRIMARY KEY (
            role_id,
            permission_id
        ),

        FOREIGN KEY (role_id)
            REFERENCES roles(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,

        FOREIGN KEY (permission_id)
            REFERENCES permissions(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,

        FOREIGN KEY (granted_by)
            REFERENCES users(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL
    )
    `,


    /*
     * -------------------------------------------------
     * نشست‌های ورود
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL,

        session_token_hash TEXT NOT NULL UNIQUE,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        last_activity_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        expires_at TEXT,

        closed_at TEXT,

        is_active INTEGER NOT NULL DEFAULT 1
            CHECK (is_active IN (0, 1)),

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE
    )
    `,


    /*
     * -------------------------------------------------
     * ثبت تلاش‌های ورود
     * -------------------------------------------------
     */

    `
    CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        username TEXT,

        user_id INTEGER,

        success INTEGER NOT NULL DEFAULT 0
            CHECK (success IN (0, 1)),

        reason TEXT,

        attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL
    )
    `,


    /*
     * -------------------------------------------------
     * شاخص‌ها
     * -------------------------------------------------
     */

    `
    CREATE INDEX IF NOT EXISTS idx_users_branch
        ON users(branch_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_users_cash_register
        ON users(default_cash_register_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_user_roles_user
        ON user_roles(user_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_user_roles_role
        ON user_roles(role_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_role_permissions_role
        ON role_permissions(role_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_role_permissions_permission
        ON role_permissions(permission_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user
        ON user_sessions(user_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_login_attempts_user
        ON login_attempts(user_id)
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_login_attempts_time
        ON login_attempts(attempted_at)
    `
];


function createUserSchema(db) {

    const transaction = db.transaction(() => {

        for (const sql of USER_SCHEMA) {
            db.exec(sql);
        }

    });

    transaction();
}


module.exports = {
    USER_SCHEMA,
    createUserSchema
};