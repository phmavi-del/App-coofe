function getColumns(
    db,
    tableName
) {
    return db
        .prepare(
            `PRAGMA table_info(${tableName})`
        )
        .all()
        .map(column => column.name);
}


function addColumnIfMissing(
    db,
    tableName,
    columnName,
    definition
) {
    const columns =
        getColumns(
            db,
            tableName
        );

    if (!columns.includes(columnName)) {
        db.exec(`
            ALTER TABLE ${tableName}
            ADD COLUMN ${columnName} ${definition}
        `);
    }
}


function up(db) {

    /*
     * -------------------------------------------------
     * پروفایل چاپ
     * -------------------------------------------------
     */

    db.exec(`
        CREATE TABLE IF NOT EXISTS print_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            code TEXT NOT NULL UNIQUE,

            name TEXT NOT NULL,

            branch_id INTEGER,

            user_id INTEGER,

            printer_id INTEGER,

            paper_type TEXT NOT NULL DEFAULT 'thermal'
                CHECK (
                    paper_type IN (
                        'thermal',
                        'a4',
                        'a5',
                        'custom'
                    )
                ),

            paper_width_mm REAL,

            paper_height_mm REAL,

            orientation TEXT NOT NULL DEFAULT 'portrait'
                CHECK (
                    orientation IN (
                        'portrait',
                        'landscape'
                    )
                ),

            margin_top_mm REAL NOT NULL DEFAULT 0,

            margin_right_mm REAL NOT NULL DEFAULT 0,

            margin_bottom_mm REAL NOT NULL DEFAULT 0,

            margin_left_mm REAL NOT NULL DEFAULT 0,

            copies INTEGER NOT NULL DEFAULT 1
                CHECK (copies > 0),

            auto_print INTEGER NOT NULL DEFAULT 0
                CHECK (auto_print IN (0, 1)),

            is_default INTEGER NOT NULL DEFAULT 0
                CHECK (is_default IN (0, 1)),

            is_active INTEGER NOT NULL DEFAULT 1
                CHECK (is_active IN (0, 1)),

            created_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (branch_id)
                REFERENCES branches(id)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (printer_id)
                REFERENCES printers(id)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        )
    `);


    /*
     * -------------------------------------------------
     * قالب چاپ
     * -------------------------------------------------
     */

    db.exec(`
        CREATE TABLE IF NOT EXISTS print_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            code TEXT NOT NULL UNIQUE,

            name TEXT NOT NULL,

            document_type TEXT NOT NULL,

            template_type TEXT NOT NULL DEFAULT 'receipt'
                CHECK (
                    template_type IN (
                        'receipt',
                        'invoice',
                        'report',
                        'kitchen',
                        'bar',
                        'custom'
                    )
                ),

            profile_id INTEGER,

            logo_path TEXT,

            cafe_name TEXT,

            cafe_address TEXT,

            cafe_phone TEXT,

            header_text TEXT,

            footer_text TEXT,

            show_logo INTEGER NOT NULL DEFAULT 1
                CHECK (show_logo IN (0, 1)),

            show_cafe_name INTEGER NOT NULL DEFAULT 1
                CHECK (show_cafe_name IN (0, 1)),

            show_customer INTEGER NOT NULL DEFAULT 1
                CHECK (show_customer IN (0, 1)),

            show_customer_phone INTEGER NOT NULL DEFAULT 0
                CHECK (show_customer_phone IN (0, 1)),

            show_cashier INTEGER NOT NULL DEFAULT 1
                CHECK (show_cashier IN (0, 1)),

            show_invoice_number INTEGER NOT NULL DEFAULT 1
                CHECK (show_invoice_number IN (0, 1)),

            show_invoice_date INTEGER NOT NULL DEFAULT 1
                CHECK (show_invoice_date IN (0, 1)),

            show_payment_method INTEGER NOT NULL DEFAULT 1
                CHECK (show_payment_method IN (0, 1)),

            show_paid_amount INTEGER NOT NULL DEFAULT 1
                CHECK (show_paid_amount IN (0, 1)),

            show_remaining_amount INTEGER NOT NULL DEFAULT 1
                CHECK (show_remaining_amount IN (0, 1)),

            show_reference_number INTEGER NOT NULL DEFAULT 0
                CHECK (show_reference_number IN (0, 1)),

            show_notes INTEGER NOT NULL DEFAULT 1
                CHECK (show_notes IN (0, 1)),

            show_barcode INTEGER NOT NULL DEFAULT 0
                CHECK (show_barcode IN (0, 1)),

            show_qr_code INTEGER NOT NULL DEFAULT 0
                CHECK (show_qr_code IN (0, 1)),

            rtl INTEGER NOT NULL DEFAULT 1
                CHECK (rtl IN (0, 1)),

            font_family TEXT,

            font_size REAL NOT NULL DEFAULT 10,

            line_spacing REAL NOT NULL DEFAULT 1,

            custom_css TEXT,

            layout_json TEXT,

            is_default INTEGER NOT NULL DEFAULT 0
                CHECK (is_default IN (0, 1)),

            is_active INTEGER NOT NULL DEFAULT 1
                CHECK (is_active IN (0, 1)),

            created_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (profile_id)
                REFERENCES print_profiles(id)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        )
    `);


    /*
     * -------------------------------------------------
     * فیلدهای قابل چاپ
     * -------------------------------------------------
     */

    db.exec(`
        CREATE TABLE IF NOT EXISTS print_template_fields (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            template_id INTEGER NOT NULL,

            field_key TEXT NOT NULL,

            field_label TEXT,

            field_type TEXT NOT NULL DEFAULT 'text'
                CHECK (
                    field_type IN (
                        'text',
                        'number',
                        'money',
                        'date',
                        'datetime',
                        'image',
                        'barcode',
                        'qrcode',
                        'separator',
                        'custom'
                    )
                ),

            section TEXT NOT NULL DEFAULT 'body'
                CHECK (
                    section IN (
                        'header',
                        'customer',
                        'body',
                        'totals',
                        'payment',
                        'footer',
                        'custom'
                    )
                ),

            sort_order INTEGER NOT NULL DEFAULT 0,

            width_percent REAL,

            align TEXT NOT NULL DEFAULT 'right'
                CHECK (
                    align IN (
                        'left',
                        'center',
                        'right'
                    )
                ),

            font_size REAL,

            bold INTEGER NOT NULL DEFAULT 0
                CHECK (bold IN (0, 1)),

            visible INTEGER NOT NULL DEFAULT 1
                CHECK (visible IN (0, 1)),

            configuration_json TEXT,

            created_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (template_id)
                REFERENCES print_templates(id)
                ON UPDATE CASCADE
                ON DELETE CASCADE
        )
    `);


    /*
     * -------------------------------------------------
     * صف چاپ
     * -------------------------------------------------
     */

    db.exec(`
        CREATE TABLE IF NOT EXISTS print_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            job_number TEXT NOT NULL UNIQUE,

            document_type TEXT NOT NULL,

            document_id INTEGER,

            template_id INTEGER,

            profile_id INTEGER,

            printer_id INTEGER,

            user_id INTEGER,

            copies INTEGER NOT NULL DEFAULT 1
                CHECK (copies > 0),

            status TEXT NOT NULL DEFAULT 'queued'
                CHECK (
                    status IN (
                        'queued',
                        'printing',
                        'completed',
                        'failed',
                        'cancelled'
                    )
                ),

            requested_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            started_at TEXT,

            completed_at TEXT,

            error_message TEXT,

            payload_json TEXT,

            created_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (template_id)
                REFERENCES print_templates(id)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (profile_id)
                REFERENCES print_profiles(id)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (printer_id)
                REFERENCES printers(id)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        )
    `);


    /*
     * -------------------------------------------------
     * تکمیل print_routes موجود
     * -------------------------------------------------
     */

    addColumnIfMissing(
        db,
        "print_routes",
        "template_id",
        "INTEGER REFERENCES print_templates(id) ON UPDATE CASCADE ON DELETE SET NULL"
    );

    addColumnIfMissing(
        db,
        "print_routes",
        "profile_id",
        "INTEGER REFERENCES print_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL"
    );

    addColumnIfMissing(
        db,
        "print_routes",
        "user_id",
        "INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL"
    );

    addColumnIfMissing(
        db,
        "print_routes",
        "branch_id",
        "INTEGER REFERENCES branches(id) ON UPDATE CASCADE ON DELETE SET NULL"
    );

    addColumnIfMissing(
        db,
        "print_routes",
        "auto_print",
        "INTEGER NOT NULL DEFAULT 0 CHECK (auto_print IN (0, 1))"
    );

    addColumnIfMissing(
        db,
        "print_routes",
        "fallback_printer_id",
        "INTEGER REFERENCES printers(id) ON UPDATE CASCADE ON DELETE SET NULL"
    );


    /*
     * -------------------------------------------------
     * Indexها
     * -------------------------------------------------
     */

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_profiles_branch
        ON print_profiles(branch_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_profiles_user
        ON print_profiles(user_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_profiles_printer
        ON print_profiles(printer_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_profiles_active
        ON print_profiles(is_active)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_templates_document
        ON print_templates(document_type)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_templates_profile
        ON print_templates(profile_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_templates_active
        ON print_templates(is_active)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_template_fields_template
        ON print_template_fields(template_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_template_fields_section
        ON print_template_fields(section)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_jobs_document
        ON print_jobs(document_type, document_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_jobs_status
        ON print_jobs(status)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_jobs_printer
        ON print_jobs(printer_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_jobs_user
        ON print_jobs(user_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_routes_template
        ON print_routes(template_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_routes_profile
        ON print_routes(profile_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_routes_branch
        ON print_routes(branch_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_print_routes_user
        ON print_routes(user_id)
    `);


    /*
     * -------------------------------------------------
     * فقط یک پروفایل پیش‌فرض فعال
     * در هر Scope
     * -------------------------------------------------
     */

    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
        ux_print_profiles_default_branch
        ON print_profiles(branch_id)
        WHERE
            branch_id IS NOT NULL
            AND user_id IS NULL
            AND is_default = 1
            AND is_active = 1
    `);

    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
        ux_print_profiles_default_user
        ON print_profiles(user_id)
        WHERE
            user_id IS NOT NULL
            AND is_default = 1
            AND is_active = 1
    `);

    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
        ux_print_templates_default_document
        ON print_templates(document_type)
        WHERE
            is_default = 1
            AND is_active = 1
    `);
}


module.exports = {
    up
};