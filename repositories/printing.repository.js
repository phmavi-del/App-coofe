function getPrinterById(
    db,
    printerId
) {
    return db
        .prepare(`
            SELECT
                p.*
            FROM printers p
            WHERE p.id = ?
        `)
        .get(printerId);
}


function getPrinterByCode(
    db,
    code
) {
    return db
        .prepare(`
            SELECT
                p.*
            FROM printers p
            WHERE p.code = ?
        `)
        .get(code);
}


function getPrinters(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.is_active !== undefined &&
        filters.is_active !== null
    ) {
        conditions.push(
            "p.is_active = @is_active"
        );

        params.is_active =
            Number(filters.is_active);
    }

    if (
        filters.printer_type !== undefined &&
        filters.printer_type !== null &&
        filters.printer_type !== ""
    ) {
        conditions.push(
            "p.printer_type = @printer_type"
        );

        params.printer_type =
            filters.printer_type;
    }

    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

    return db
        .prepare(`
            SELECT
                p.*
            FROM printers p
            ${whereClause}
            ORDER BY
                p.name,
                p.id
        `)
        .all(params);
}


function insertPrinter(
    db,
    printer
) {
    const result =
        db
            .prepare(`
                INSERT INTO printers (
                    code,
                    name,
                    printer_type,
                    connection_value,
                    paper_width_mm,
                    description,
                    is_active
                )
                VALUES (
                    @code,
                    @name,
                    @printer_type,
                    @connection_value,
                    @paper_width_mm,
                    @description,
                    @is_active
                )
            `)
            .run({
                code:
                    printer.code,

                name:
                    printer.name,

                printer_type:
                    printer.printer_type,

                connection_value:
                    printer.connection_value ??
                    null,

                paper_width_mm:
                    printer.paper_width_mm ??
                    null,

                description:
                    printer.description ??
                    null,

                is_active:
                    printer.is_active === undefined
                        ? 1
                        : printer.is_active
            });

    return result.lastInsertRowid;
}


function updatePrinter(
    db,
    printer
) {
    return db
        .prepare(`
            UPDATE printers
            SET
                code = @code,
                name = @name,
                printer_type = @printer_type,
                connection_value = @connection_value,
                paper_width_mm = @paper_width_mm,
                description = @description,
                is_active = @is_active,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `)
        .run({
            id:
                printer.id,

            code:
                printer.code,

            name:
                printer.name,

            printer_type:
                printer.printer_type,

            connection_value:
                printer.connection_value ??
                null,

            paper_width_mm:
                printer.paper_width_mm ??
                null,

            description:
                printer.description ??
                null,

            is_active:
                printer.is_active === undefined
                    ? 1
                    : printer.is_active
        }).changes;
}


function getPrintProfileById(
    db,
    profileId
) {
    return db
        .prepare(`
            SELECT
                pp.*,

                b.code AS branch_code,
                b.name AS branch_name,

                u.username,
                u.full_name,

                p.code AS printer_code,
                p.name AS printer_name

            FROM print_profiles pp

            LEFT JOIN branches b
                ON b.id = pp.branch_id

            LEFT JOIN users u
                ON u.id = pp.user_id

            LEFT JOIN printers p
                ON p.id = pp.printer_id

            WHERE pp.id = ?
        `)
        .get(profileId);
}


function getPrintProfiles(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.branch_id !== undefined &&
        filters.branch_id !== null
    ) {
        conditions.push(
            "pp.branch_id = @branch_id"
        );

        params.branch_id =
            filters.branch_id;
    }

    if (
        filters.user_id !== undefined &&
        filters.user_id !== null
    ) {
        conditions.push(
            "pp.user_id = @user_id"
        );

        params.user_id =
            filters.user_id;
    }

    if (
        filters.is_active !== undefined &&
        filters.is_active !== null
    ) {
        conditions.push(
            "pp.is_active = @is_active"
        );

        params.is_active =
            Number(filters.is_active);
    }

    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

    return db
        .prepare(`
            SELECT
                pp.*,

                b.code AS branch_code,
                b.name AS branch_name,

                u.username,
                u.full_name,

                p.code AS printer_code,
                p.name AS printer_name

            FROM print_profiles pp

            LEFT JOIN branches b
                ON b.id = pp.branch_id

            LEFT JOIN users u
                ON u.id = pp.user_id

            LEFT JOIN printers p
                ON p.id = pp.printer_id

            ${whereClause}

            ORDER BY
                pp.is_default DESC,
                pp.name,
                pp.id
        `)
        .all(params);
}


function insertPrintProfile(
    db,
    profile
) {
    const result =
        db
            .prepare(`
                INSERT INTO print_profiles (
                    code,
                    name,
                    branch_id,
                    user_id,
                    printer_id,
                    paper_type,
                    paper_width_mm,
                    paper_height_mm,
                    orientation,
                    margin_top_mm,
                    margin_right_mm,
                    margin_bottom_mm,
                    margin_left_mm,
                    copies,
                    auto_print,
                    is_default,
                    is_active
                )
                VALUES (
                    @code,
                    @name,
                    @branch_id,
                    @user_id,
                    @printer_id,
                    @paper_type,
                    @paper_width_mm,
                    @paper_height_mm,
                    @orientation,
                    @margin_top_mm,
                    @margin_right_mm,
                    @margin_bottom_mm,
                    @margin_left_mm,
                    @copies,
                    @auto_print,
                    @is_default,
                    @is_active
                )
            `)
            .run({
                code:
                    profile.code,

                name:
                    profile.name,

                branch_id:
                    profile.branch_id ??
                    null,

                user_id:
                    profile.user_id ??
                    null,

                printer_id:
                    profile.printer_id ??
                    null,

                paper_type:
                    profile.paper_type ||
                    "thermal",

                paper_width_mm:
                    profile.paper_width_mm ??
                    null,

                paper_height_mm:
                    profile.paper_height_mm ??
                    null,

                orientation:
                    profile.orientation ||
                    "portrait",

                margin_top_mm:
                    profile.margin_top_mm ?? 0,

                margin_right_mm:
                    profile.margin_right_mm ?? 0,

                margin_bottom_mm:
                    profile.margin_bottom_mm ?? 0,

                margin_left_mm:
                    profile.margin_left_mm ?? 0,

                copies:
                    profile.copies || 1,

                auto_print:
                    profile.auto_print === undefined
                        ? 0
                        : profile.auto_print,

                is_default:
                    profile.is_default === undefined
                        ? 0
                        : profile.is_default,

                is_active:
                    profile.is_active === undefined
                        ? 1
                        : profile.is_active
            });

    return result.lastInsertRowid;
}


function updatePrintProfile(
    db,
    profile
) {
    return db
        .prepare(`
            UPDATE print_profiles
            SET
                code = @code,
                name = @name,
                branch_id = @branch_id,
                user_id = @user_id,
                printer_id = @printer_id,
                paper_type = @paper_type,
                paper_width_mm = @paper_width_mm,
                paper_height_mm = @paper_height_mm,
                orientation = @orientation,
                margin_top_mm = @margin_top_mm,
                margin_right_mm = @margin_right_mm,
                margin_bottom_mm = @margin_bottom_mm,
                margin_left_mm = @margin_left_mm,
                copies = @copies,
                auto_print = @auto_print,
                is_default = @is_default,
                is_active = @is_active,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `)
        .run({
            id:
                profile.id,

            code:
                profile.code,

            name:
                profile.name,

            branch_id:
                profile.branch_id ??
                null,

            user_id:
                profile.user_id ??
                null,

            printer_id:
                profile.printer_id ??
                null,

            paper_type:
                profile.paper_type ||
                "thermal",

            paper_width_mm:
                profile.paper_width_mm ??
                null,

            paper_height_mm:
                profile.paper_height_mm ??
                null,

            orientation:
                profile.orientation ||
                "portrait",

            margin_top_mm:
                profile.margin_top_mm ?? 0,

            margin_right_mm:
                profile.margin_right_mm ?? 0,

            margin_bottom_mm:
                profile.margin_bottom_mm ?? 0,

            margin_left_mm:
                profile.margin_left_mm ?? 0,

            copies:
                profile.copies || 1,

            auto_print:
                profile.auto_print === undefined
                    ? 0
                    : profile.auto_print,

            is_default:
                profile.is_default === undefined
                    ? 0
                    : profile.is_default,

            is_active:
                profile.is_active === undefined
                    ? 1
                    : profile.is_active
        })
        .changes;
}


function getDefaultPrintProfile(
    db,
    {
        branch_id = null,
        user_id = null
    } = {}
) {
    if (user_id !== null) {
        const userProfile =
            db
                .prepare(`
                    SELECT
                        pp.*
                    FROM print_profiles pp
                    WHERE pp.user_id = ?
                      AND pp.is_default = 1
                      AND pp.is_active = 1
                    ORDER BY
                        pp.id DESC
                    LIMIT 1
                `)
                .get(user_id);

        if (userProfile) {
            return getPrintProfileById(
                db,
                userProfile.id
            );
        }
    }

    if (branch_id !== null) {
        const branchProfile =
            db
                .prepare(`
                    SELECT
                        pp.*
                    FROM print_profiles pp
                    WHERE pp.branch_id = ?
                      AND pp.user_id IS NULL
                      AND pp.is_default = 1
                      AND pp.is_active = 1
                    ORDER BY
                        pp.id DESC
                    LIMIT 1
                `)
                .get(branch_id);

        if (branchProfile) {
            return getPrintProfileById(
                db,
                branchProfile.id
            );
        }
    }

    return db
        .prepare(`
            SELECT
                pp.*
            FROM print_profiles pp
            WHERE pp.branch_id IS NULL
              AND pp.user_id IS NULL
              AND pp.is_default = 1
              AND pp.is_active = 1
            ORDER BY
                pp.id DESC
            LIMIT 1
        `)
        .get() || null;
}


function getPrintTemplateById(
    db,
    templateId
) {
    const template =
        db
            .prepare(`
                SELECT
                    pt.*,

                    pp.code AS profile_code,
                    pp.name AS profile_name

                FROM print_templates pt

                LEFT JOIN print_profiles pp
                    ON pp.id = pt.profile_id

                WHERE pt.id = ?
            `)
            .get(templateId);

    if (!template) {
        return null;
    }

    const fields =
        db
            .prepare(`
                SELECT
                    *
                FROM print_template_fields
                WHERE template_id = ?
                ORDER BY
                    section,
                    sort_order,
                    id
            `)
            .all(templateId);

    return {
        ...template,
        fields
    };
}


function getPrintTemplates(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.document_type !== undefined &&
        filters.document_type !== null &&
        filters.document_type !== ""
    ) {
        conditions.push(
            "pt.document_type = @document_type"
        );

        params.document_type =
            filters.document_type;
    }

    if (
        filters.template_type !== undefined &&
        filters.template_type !== null &&
        filters.template_type !== ""
    ) {
        conditions.push(
            "pt.template_type = @template_type"
        );

        params.template_type =
            filters.template_type;
    }

    if (
        filters.profile_id !== undefined &&
        filters.profile_id !== null
    ) {
        conditions.push(
            "pt.profile_id = @profile_id"
        );

        params.profile_id =
            filters.profile_id;
    }

    if (
        filters.is_active !== undefined &&
        filters.is_active !== null
    ) {
        conditions.push(
            "pt.is_active = @is_active"
        );

        params.is_active =
            Number(filters.is_active);
    }

    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

    const templates =
        db
            .prepare(`
                SELECT
                    pt.*,

                    pp.code AS profile_code,
                    pp.name AS profile_name

                FROM print_templates pt

                LEFT JOIN print_profiles pp
                    ON pp.id = pt.profile_id

                ${whereClause}

                ORDER BY
                    pt.is_default DESC,
                    pt.document_type,
                    pt.name,
                    pt.id
            `)
            .all(params);

    return templates.map(
        template => ({
            ...template,
            fields:
                db
                    .prepare(`
                        SELECT
                            *
                        FROM print_template_fields
                        WHERE template_id = ?
                        ORDER BY
                            section,
                            sort_order,
                            id
                    `)
                    .all(template.id)
        })
    );
}


function insertPrintTemplate(
    db,
    template
) {
    const result =
        db
            .prepare(`
                INSERT INTO print_templates (
                    code,
                    name,
                    document_type,
                    template_type,
                    profile_id,
                    logo_path,
                    cafe_name,
                    cafe_address,
                    cafe_phone,
                    header_text,
                    footer_text,
                    show_logo,
                    show_cafe_name,
                    show_customer,
                    show_customer_phone,
                    show_cashier,
                    show_invoice_number,
                    show_invoice_date,
                    show_payment_method,
                    show_paid_amount,
                    show_remaining_amount,
                    show_reference_number,
                    show_notes,
                    show_barcode,
                    show_qr_code,
                    rtl,
                    font_family,
                    font_size,
                    line_spacing,
                    custom_css,
                    layout_json,
                    is_default,
                    is_active
                )
                VALUES (
                    @code,
                    @name,
                    @document_type,
                    @template_type,
                    @profile_id,
                    @logo_path,
                    @cafe_name,
                    @cafe_address,
                    @cafe_phone,
                    @header_text,
                    @footer_text,
                    @show_logo,
                    @show_cafe_name,
                    @show_customer,
                    @show_customer_phone,
                    @show_cashier,
                    @show_invoice_number,
                    @show_invoice_date,
                    @show_payment_method,
                    @show_paid_amount,
                    @show_remaining_amount,
                    @show_reference_number,
                    @show_notes,
                    @show_barcode,
                    @show_qr_code,
                    @rtl,
                    @font_family,
                    @font_size,
                    @line_spacing,
                    @custom_css,
                    @layout_json,
                    @is_default,
                    @is_active
                )
            `)
            .run({
                code:
                    template.code,

                name:
                    template.name,

                document_type:
                    template.document_type,

                template_type:
                    template.template_type ||
                    "receipt",

                profile_id:
                    template.profile_id ??
                    null,

                logo_path:
                    template.logo_path ??
                    null,

                cafe_name:
                    template.cafe_name ??
                    null,

                cafe_address:
                    template.cafe_address ??
                    null,

                cafe_phone:
                    template.cafe_phone ??
                    null,

                header_text:
                    template.header_text ??
                    null,

                footer_text:
                    template.footer_text ??
                    null,

                show_logo:
                    template.show_logo === undefined
                        ? 1
                        : template.show_logo,

                show_cafe_name:
                    template.show_cafe_name === undefined
                        ? 1
                        : template.show_cafe_name,

                show_customer:
                    template.show_customer === undefined
                        ? 1
                        : template.show_customer,

                show_customer_phone:
                    template.show_customer_phone === undefined
                        ? 0
                        : template.show_customer_phone,

                show_cashier:
                    template.show_cashier === undefined
                        ? 1
                        : template.show_cashier,

                show_invoice_number:
                    template.show_invoice_number === undefined
                        ? 1
                        : template.show_invoice_number,

                show_invoice_date:
                    template.show_invoice_date === undefined
                        ? 1
                        : template.show_invoice_date,

                show_payment_method:
                    template.show_payment_method === undefined
                        ? 1
                        : template.show_payment_method,

                show_paid_amount:
                    template.show_paid_amount === undefined
                        ? 1
                        : template.show_paid_amount,

                show_remaining_amount:
                    template.show_remaining_amount === undefined
                        ? 1
                        : template.show_remaining_amount,

                show_reference_number:
                    template.show_reference_number === undefined
                        ? 0
                        : template.show_reference_number,

                show_notes:
                    template.show_notes === undefined
                        ? 1
                        : template.show_notes,

                show_barcode:
                    template.show_barcode === undefined
                        ? 0
                        : template.show_barcode,

                show_qr_code:
                    template.show_qr_code === undefined
                        ? 0
                        : template.show_qr_code,

                rtl:
                    template.rtl === undefined
                        ? 1
                        : template.rtl,

                font_family:
                    template.font_family ??
                    null,

                font_size:
                    template.font_size ?? 10,

                line_spacing:
                    template.line_spacing ?? 1,

                custom_css:
                    template.custom_css ??
                    null,

                layout_json:
                    template.layout_json ??
                    null,

                is_default:
                    template.is_default === undefined
                        ? 0
                        : template.is_default,

                is_active:
                    template.is_active === undefined
                        ? 1
                        : template.is_active
            });

    return result.lastInsertRowid;
}


function updatePrintTemplate(
    db,
    template
) {
    return db
        .prepare(`
            UPDATE print_templates
            SET
                code = @code,
                name = @name,
                document_type = @document_type,
                template_type = @template_type,
                profile_id = @profile_id,
                logo_path = @logo_path,
                cafe_name = @cafe_name,
                cafe_address = @cafe_address,
                cafe_phone = @cafe_phone,
                header_text = @header_text,
                footer_text = @footer_text,
                show_logo = @show_logo,
                show_cafe_name = @show_cafe_name,
                show_customer = @show_customer,
                show_customer_phone = @show_customer_phone,
                show_cashier = @show_cashier,
                show_invoice_number = @show_invoice_number,
                show_invoice_date = @show_invoice_date,
                show_payment_method = @show_payment_method,
                show_paid_amount = @show_paid_amount,
                show_remaining_amount = @show_remaining_amount,
                show_reference_number = @show_reference_number,
                show_notes = @show_notes,
                show_barcode = @show_barcode,
                show_qr_code = @show_qr_code,
                rtl = @rtl,
                font_family = @font_family,
                font_size = @font_size,
                line_spacing = @line_spacing,
                custom_css = @custom_css,
                layout_json = @layout_json,
                is_default = @is_default,
                is_active = @is_active,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `)
        .run({
            id:
                template.id,

            code:
                template.code,

            name:
                template.name,

            document_type:
                template.document_type,

            template_type:
                template.template_type ||
                "receipt",

            profile_id:
                template.profile_id ??
                null,

            logo_path:
                template.logo_path ??
                null,

            cafe_name:
                template.cafe_name ??
                null,

            cafe_phone:
                template.cafe_phone ??
                null,

            cafe_address:
                template.cafe_address ??
                null,

            header_text:
                template.header_text ??
                null,

            footer_text:
                template.footer_text ??
                null,

            show_logo:
                template.show_logo === undefined
                    ? 1
                    : template.show_logo,

            show_cafe_name:
                template.show_cafe_name === undefined
                    ? 1
                    : template.show_cafe_name,

            show_customer:
                template.show_customer === undefined
                    ? 1
                    : template.show_customer,

            show_customer_phone:
                template.show_customer_phone === undefined
                    ? 0
                    : template.show_customer_phone,

            show_cashier:
                template.show_cashier === undefined
                    ? 1
                    : template.show_cashier,

            show_invoice_number:
                template.show_invoice_number === undefined
                    ? 1
                    : template.show_invoice_number,

            show_invoice_date:
                template.show_invoice_date === undefined
                    ? 1
                    : template.show_invoice_date,

            show_payment_method:
                template.show_payment_method === undefined
                    ? 1
                    : template.show_payment_method,

            show_paid_amount:
                template.show_paid_amount === undefined
                    ? 1
                    : template.show_paid_amount,

            show_remaining_amount:
                template.show_remaining_amount === undefined
                    ? 1
                    : template.show_remaining_amount,

            show_reference_number:
                template.show_reference_number === undefined
                    ? 0
                    : template.show_reference_number,

            show_notes:
                template.show_notes === undefined
                    ? 1
                    : template.show_notes,

            show_barcode:
                template.show_barcode === undefined
                    ? 0
                    : template.show_barcode,

            show_qr_code:
                template.show_qr_code === undefined
                    ? 0
                    : template.show_qr_code,

            rtl:
                template.rtl === undefined
                    ? 1
                    : template.rtl,

            font_family:
                template.font_family ??
                null,

            font_size:
                template.font_size ?? 10,

            line_spacing:
                template.line_spacing ?? 1,

            custom_css:
                template.custom_css ??
                null,

            layout_json:
                template.layout_json ??
                null,

            is_default:
                template.is_default === undefined
                    ? 0
                    : template.is_default,

            is_active:
                template.is_active === undefined
                    ? 1
                    : template.is_active
        })
        .changes;
}


function replacePrintTemplateFields(
    db,
    templateId,
    fields
) {
    db.prepare(`
        DELETE FROM print_template_fields
        WHERE template_id = ?
    `).run(templateId);

    if (!Array.isArray(fields)) {
        return 0;
    }

    const insert =
        db.prepare(`
            INSERT INTO print_template_fields (
                template_id,
                field_key,
                field_label,
                field_type,
                section,
                sort_order,
                width_percent,
                align,
                font_size,
                bold,
                visible,
                configuration_json
            )
            VALUES (
                @template_id,
                @field_key,
                @field_label,
                @field_type,
                @section,
                @sort_order,
                @width_percent,
                @align,
                @font_size,
                @bold,
                @visible,
                @configuration_json
            )
        `);

    const transaction =
        db.transaction(() => {
            for (
                const field of fields
            ) {
                insert.run({
                    template_id:
                        templateId,

                    field_key:
                        field.field_key,

                    field_label:
                        field.field_label ??
                        null,

                    field_type:
                        field.field_type ||
                        "text",

                    section:
                        field.section ||
                        "body",

                    sort_order:
                        field.sort_order ?? 0,

                    width_percent:
                        field.width_percent ??
                        null,

                    align:
                        field.align ||
                        "right",

                    font_size:
                        field.font_size ??
                        null,

                    bold:
                        field.bold === undefined
                            ? 0
                            : field.bold,

                    visible:
                        field.visible === undefined
                            ? 1
                            : field.visible,

                    configuration_json:
                        field.configuration_json ??
                        null
                });
            }
        });

    transaction();

    return fields.length;
}


function getPrintRouteById(
    db,
    routeId
) {
    return db
        .prepare(`
            SELECT
                pr.*,

                p.code AS printer_code,
                p.name AS printer_name,

                pt.code AS template_code,
                pt.name AS template_name,

                pp.code AS profile_code,
                pp.name AS profile_name,

                b.code AS branch_code,
                b.name AS branch_name,

                u.username,
                u.full_name,

                fp.code AS fallback_printer_code,
                fp.name AS fallback_printer_name

            FROM print_routes pr

            LEFT JOIN printers p
                ON p.id = pr.printer_id

            LEFT JOIN print_templates pt
                ON pt.id = pr.template_id

            LEFT JOIN print_profiles pp
                ON pp.id = pr.profile_id

            LEFT JOIN branches b
                ON b.id = pr.branch_id

            LEFT JOIN users u
                ON u.id = pr.user_id

            LEFT JOIN printers fp
                ON fp.id = pr.fallback_printer_id

            WHERE pr.id = ?
        `)
        .get(routeId);
}


function getPrintRoutes(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.document_type !== undefined &&
        filters.document_type !== null &&
        filters.document_type !== ""
    ) {
        conditions.push(
            "pr.document_type = @document_type"
        );

        params.document_type =
            filters.document_type;
    }

    if (
        filters.branch_id !== undefined &&
        filters.branch_id !== null
    ) {
        conditions.push(
            "pr.branch_id = @branch_id"
        );

        params.branch_id =
            filters.branch_id;
    }

    if (
        filters.user_id !== undefined &&
        filters.user_id !== null
    ) {
        conditions.push(
            "pr.user_id = @user_id"
        );

        params.user_id =
            filters.user_id;
    }

    if (
        filters.is_active !== undefined &&
        filters.is_active !== null
    ) {
        conditions.push(
            "pr.is_active = @is_active"
        );

        params.is_active =
            Number(filters.is_active);
    }

    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

    return db
        .prepare(`
            SELECT
                pr.*,

                p.code AS printer_code,
                p.name AS printer_name,

                pt.code AS template_code,
                pt.name AS template_name,

                pp.code AS profile_code,
                pp.name AS profile_name,

                b.code AS branch_code,
                b.name AS branch_name,

                u.username,
                u.full_name,

                fp.code AS fallback_printer_code,
                fp.name AS fallback_printer_name

            FROM print_routes pr

            LEFT JOIN printers p
                ON p.id = pr.printer_id

            LEFT JOIN print_templates pt
                ON pt.id = pr.template_id

            LEFT JOIN print_profiles pp
                ON pp.id = pr.profile_id

            LEFT JOIN branches b
                ON b.id = pr.branch_id

            LEFT JOIN users u
                ON u.id = pr.user_id

            LEFT JOIN printers fp
                ON fp.id = pr.fallback_printer_id

            ${whereClause}

            ORDER BY
                pr.document_type,
                pr.id
        `)
        .all(params);
}


function insertPrintRoute(
    db,
    route
) {
    const result =
        db
            .prepare(`
                INSERT INTO print_routes (
                    code,
                    name,
                    document_type,
                    printer_id,
                    copies,
                    is_active,
                    template_id,
                    profile_id,
                    user_id,
                    branch_id,
                    auto_print,
                    fallback_printer_id
                )
                VALUES (
                    @code,
                    @name,
                    @document_type,
                    @printer_id,
                    @copies,
                    @is_active,
                    @template_id,
                    @profile_id,
                    @user_id,
                    @branch_id,
                    @auto_print,
                    @fallback_printer_id
                )
            `)
            .run({
                code:
                    route.code,

                name:
                    route.name,

                document_type:
                    route.document_type,

                printer_id:
                    route.printer_id ??
                    null,

                copies:
                    route.copies || 1,

                is_active:
                    route.is_active === undefined
                        ? 1
                        : route.is_active,

                template_id:
                    route.template_id ??
                    null,

                profile_id:
                    route.profile_id ??
                    null,

                user_id:
                    route.user_id ??
                    null,

                branch_id:
                    route.branch_id ??
                    null,

                auto_print:
                    route.auto_print === undefined
                        ? 0
                        : route.auto_print,

                fallback_printer_id:
                    route.fallback_printer_id ??
                    null
            });

    return result.lastInsertRowid;
}


function updatePrintRoute(
    db,
    route
) {
    return db
        .prepare(`
            UPDATE print_routes
            SET
                code = @code,
                name = @name,
                document_type = @document_type,
                printer_id = @printer_id,
                copies = @copies,
                is_active = @is_active,
                template_id = @template_id,
                profile_id = @profile_id,
                user_id = @user_id,
                branch_id = @branch_id,
                auto_print = @auto_print,
                fallback_printer_id = @fallback_printer_id
            WHERE id = @id
        `)
        .run({
            id:
                route.id,

            code:
                route.code,

            name:
                route.name,

            document_type:
                route.document_type,

            printer_id:
                route.printer_id ??
                null,

            copies:
                route.copies || 1,

            is_active:
                route.is_active === undefined
                    ? 1
                    : route.is_active,

            template_id:
                route.template_id ??
                null,

            profile_id:
                route.profile_id ??
                null,

            user_id:
                route.user_id ??
                null,

            branch_id:
                route.branch_id ??
                null,

            auto_print:
                route.auto_print === undefined
                    ? 0
                    : route.auto_print,

            fallback_printer_id:
                route.fallback_printer_id ??
                null
        })
        .changes;
}


function getPrintSettingByKey(
    db,
    settingKey
) {
    return db
        .prepare(`
            SELECT
                *
            FROM print_settings
            WHERE setting_key = ?
        `)
        .get(settingKey);
}


function getPrintSettings(
    db,
    {
        is_active = null
    } = {}
) {
    if (
        is_active === null
    ) {
        return db
            .prepare(`
                SELECT
                    *
                FROM print_settings
                ORDER BY
                    setting_key
            `)
            .all();
    }

    return db
        .prepare(`
            SELECT
                *
            FROM print_settings
            WHERE is_active = ?
            ORDER BY
                setting_key
        `)
        .all(
            Number(is_active)
        );
}


function upsertPrintSetting(
    db,
    setting
) {
    const existing =
        getPrintSettingByKey(
            db,
            setting.setting_key
        );

    if (existing) {
        db
            .prepare(`
                UPDATE print_settings
                SET
                    setting_value = @setting_value,
                    value_type = @value_type,
                    is_active = @is_active,
                    updated_at = CURRENT_TIMESTAMP
                WHERE setting_key = @setting_key
            `)
            .run({
                setting_key:
                    setting.setting_key,

                setting_value:
                    setting.setting_value ??
                    null,

                value_type:
                    setting.value_type ||
                    "string",

                is_active:
                    setting.is_active === undefined
                        ? 1
                        : setting.is_active
            });

        return existing.id;
    }

    const result =
        db
            .prepare(`
                INSERT INTO print_settings (
                    setting_key,
                    setting_value,
                    value_type,
                    is_active
                )
                VALUES (
                    @setting_key,
                    @setting_value,
                    @value_type,
                    @is_active
                )
            `)
            .run({
                setting_key:
                    setting.setting_key,

                setting_value:
                    setting.setting_value ??
                    null,

                value_type:
                    setting.value_type ||
                    "string",

                is_active:
                    setting.is_active === undefined
                        ? 1
                        : setting.is_active
            });

    return result.lastInsertRowid;
}


function insertPrintJob(
    db,
    job
) {
    const result =
        db
            .prepare(`
                INSERT INTO print_jobs (
                    job_number,
                    document_type,
                    document_id,
                    template_id,
                    profile_id,
                    printer_id,
                    user_id,
                    copies,
                    status,
                    payload_json
                )
                VALUES (
                    @job_number,
                    @document_type,
                    @document_id,
                    @template_id,
                    @profile_id,
                    @printer_id,
                    @user_id,
                    @copies,
                    @status,
                    @payload_json
                )
            `)
            .run({
                job_number:
                    job.job_number,

                document_type:
                    job.document_type,

                document_id:
                    job.document_id ??
                    null,

                template_id:
                    job.template_id ??
                    null,

                profile_id:
                    job.profile_id ??
                    null,

                printer_id:
                    job.printer_id ??
                    null,

                user_id:
                    job.user_id ??
                    null,

                copies:
                    job.copies || 1,

                status:
                    job.status ||
                    "queued",

                payload_json:
                    job.payload_json ??
                    null
            });

    return result.lastInsertRowid;
}


function getPrintJobById(
    db,
    jobId
) {
    return db
        .prepare(`
            SELECT
                pj.*,

                p.code AS printer_code,
                p.name AS printer_name,

                pt.code AS template_code,
                pt.name AS template_name,

                pp.code AS profile_code,
                pp.name AS profile_name,

                u.username,
                u.full_name

            FROM print_jobs pj

            LEFT JOIN printers p
                ON p.id = pj.printer_id

            LEFT JOIN print_templates pt
                ON pt.id = pj.template_id

            LEFT JOIN print_profiles pp
                ON pp.id = pj.profile_id

            LEFT JOIN users u
                ON u.id = pj.user_id

            WHERE pj.id = ?
        `)
        .get(jobId);
}


function updatePrintJobStatus(
    db,
    jobId,
    status,
    {
        error_message = null
    } = {}
) {
    return db
        .prepare(`
            UPDATE print_jobs
            SET
                status = @status,

                started_at =
                    CASE
                        WHEN @status = 'printing'
                            AND started_at IS NULL
                        THEN CURRENT_TIMESTAMP
                        ELSE started_at
                    END,

                completed_at =
                    CASE
                        WHEN @status IN (
                            'completed',
                            'failed',
                            'cancelled'
                        )
                        THEN CURRENT_TIMESTAMP
                        ELSE completed_at
                    END,

                error_message = @error_message

            WHERE id = @id
        `)
        .run({
            id:
                jobId,

            status,

            error_message
        })
        .changes;
}


function getPrintJobs(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.status !== undefined &&
        filters.status !== null &&
        filters.status !== ""
    ) {
        conditions.push(
            "pj.status = @status"
        );

        params.status =
            filters.status;
    }

    if (
        filters.document_type !== undefined &&
        filters.document_type !== null &&
        filters.document_type !== ""
    ) {
        conditions.push(
            "pj.document_type = @document_type"
        );

        params.document_type =
            filters.document_type;
    }

    if (
        filters.document_id !== undefined &&
        filters.document_id !== null
    ) {
        conditions.push(
            "pj.document_id = @document_id"
        );

        params.document_id =
            filters.document_id;
    }

    if (
        filters.printer_id !== undefined &&
        filters.printer_id !== null
    ) {
        conditions.push(
            "pj.printer_id = @printer_id"
        );

        params.printer_id =
            filters.printer_id;
    }

    if (
        filters.user_id !== undefined &&
        filters.user_id !== null
    ) {
        conditions.push(
            "pj.user_id = @user_id"
        );

        params.user_id =
            filters.user_id;
    }

    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

    const limit =
        Number.isInteger(filters.limit) &&
        filters.limit > 0
            ? filters.limit
            : 100;

    const offset =
        Number.isInteger(filters.offset) &&
        filters.offset >= 0
            ? filters.offset
            : 0;

    return db
        .prepare(`
            SELECT
                pj.*,

                p.code AS printer_code,
                p.name AS printer_name,

                pt.code AS template_code,
                pt.name AS template_name,

                pp.code AS profile_code,
                pp.name AS profile_name,

                u.username,
                u.full_name

            FROM print_jobs pj

            LEFT JOIN printers p
                ON p.id = pj.printer_id

            LEFT JOIN print_templates pt
                ON pt.id = pj.template_id

            LEFT JOIN print_profiles pp
                ON pp.id = pj.profile_id

            LEFT JOIN users u
                ON u.id = pj.user_id

            ${whereClause}

            ORDER BY
                pj.id DESC

            LIMIT @limit
            OFFSET @offset
        `)
        .all({
            ...params,
            limit,
            offset
        });
}


function countPrintJobs(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.status !== undefined &&
        filters.status !== null &&
        filters.status !== ""
    ) {
        conditions.push(
            "status = @status"
        );

        params.status =
            filters.status;
    }

    if (
        filters.document_type !== undefined &&
        filters.document_type !== null &&
        filters.document_type !== ""
    ) {
        conditions.push(
            "document_type = @document_type"
        );

        params.document_type =
            filters.document_type;
    }

    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

    const row =
        db
            .prepare(`
                SELECT
                    COUNT(*) AS total
                FROM print_jobs
                ${whereClause}
            `)
            .get(params);

    return row.total;
}


function getRouteForDocument(
    db,
    {
        document_type,
        branch_id = null,
        user_id = null
    }
) {
    if (
        user_id !== null
    ) {
        const userRoute =
            db
                .prepare(`
                    SELECT
                        pr.*
                    FROM print_routes pr
                    WHERE pr.document_type = ?
                      AND pr.user_id = ?
                      AND pr.is_active = 1
                    ORDER BY
                        pr.id DESC
                    LIMIT 1
                `)
                .get(
                    document_type,
                    user_id
                );

        if (userRoute) {
            return getPrintRouteById(
                db,
                userRoute.id
            );
        }
    }

    if (
        branch_id !== null
    ) {
        const branchRoute =
            db
                .prepare(`
                    SELECT
                        pr.*
                    FROM print_routes pr
                    WHERE pr.document_type = ?
                      AND pr.branch_id = ?
                      AND pr.user_id IS NULL
                      AND pr.is_active = 1
                    ORDER BY
                        pr.id DESC
                    LIMIT 1
                `)
                .get(
                    document_type,
                    branch_id
                );

        if (branchRoute) {
            return getPrintRouteById(
                db,
                branchRoute.id
            );
        }
    }

    const globalRoute =
        db
            .prepare(`
                SELECT
                    pr.*
                FROM print_routes pr
                WHERE pr.document_type = ?
                  AND pr.branch_id IS NULL
                  AND pr.user_id IS NULL
                  AND pr.is_active = 1
                ORDER BY
                    pr.id DESC
                LIMIT 1
            `)
            .get(
                document_type
            );

    return globalRoute
        ? getPrintRouteById(
            db,
            globalRoute.id
        )
        : null;
}


module.exports = {
    getPrinterById,
    getPrinterByCode,
    getPrinters,
    insertPrinter,
    updatePrinter,

    getPrintProfileById,
    getPrintProfiles,
    insertPrintProfile,
    updatePrintProfile,
    getDefaultPrintProfile,

    getPrintTemplateById,
    getPrintTemplates,
    insertPrintTemplate,
    updatePrintTemplate,
    replacePrintTemplateFields,

    getPrintRouteById,
    getPrintRoutes,
    insertPrintRoute,
    updatePrintRoute,
    getRouteForDocument,

    getPrintSettingByKey,
    getPrintSettings,
    upsertPrintSetting,

    insertPrintJob,
    getPrintJobById,
    updatePrintJobStatus,
    getPrintJobs,
    countPrintJobs
};