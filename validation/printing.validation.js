function validatePrinterInput(input) {
    if (!input || typeof input !== "object") {
        throw new Error("ورودی چاپگر معتبر نیست.");
    }

    const data = {
        code:
            typeof input.code === "string"
                ? input.code.trim()
                : "",

        name:
            typeof input.name === "string"
                ? input.name.trim()
                : "",

        printer_type:
            typeof input.printer_type === "string"
                ? input.printer_type.trim()
                : "system",

        connection_value:
            input.connection_value ?? null,

        paper_width_mm:
            input.paper_width_mm ?? null,

        description:
            input.description ?? null,

        is_active:
            input.is_active === undefined
                ? 1
                : input.is_active
    };

    const errors = [];

    if (!data.code) {
        errors.push("کد چاپگر الزامی است.");
    }

    if (!data.name) {
        errors.push("نام چاپگر الزامی است.");
    }

    if (
        ![
            "system",
            "network",
            "usb",
            "pdf"
        ].includes(data.printer_type)
    ) {
        errors.push("نوع چاپگر معتبر نیست.");
    }

    if (
        data.paper_width_mm !== null &&
        (
            !Number.isFinite(
                Number(data.paper_width_mm)
            ) ||
            Number(data.paper_width_mm) <= 0
        )
    ) {
        errors.push("عرض کاغذ معتبر نیست.");
    }

    if (
        data.description !== null &&
        typeof data.description !== "string"
    ) {
        errors.push("توضیحات چاپگر باید متنی باشد.");
    }

    if (
        ![0, 1].includes(
            Number(data.is_active)
        )
    ) {
        errors.push("وضعیت چاپگر معتبر نیست.");
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "PRINTING_VALIDATION_ERROR";

        error.details = errors;

        throw error;
    }

    return {
        ...data,

        paper_width_mm:
            data.paper_width_mm === null
                ? null
                : Number(data.paper_width_mm),

        is_active:
            Number(data.is_active)
    };
}


function validatePrintProfileInput(input) {
    if (!input || typeof input !== "object") {
        throw new Error("ورودی پروفایل چاپ معتبر نیست.");
    }

    const data = {
        code:
            typeof input.code === "string"
                ? input.code.trim()
                : "",

        name:
            typeof input.name === "string"
                ? input.name.trim()
                : "",

        branch_id:
            input.branch_id ?? null,

        user_id:
            input.user_id ?? null,

        printer_id:
            input.printer_id ?? null,

        paper_type:
            input.paper_type || "thermal",

        paper_width_mm:
            input.paper_width_mm ?? null,

        paper_height_mm:
            input.paper_height_mm ?? null,

        orientation:
            input.orientation || "portrait",

        margin_top_mm:
            input.margin_top_mm ?? 0,

        margin_right_mm:
            input.margin_right_mm ?? 0,

        margin_bottom_mm:
            input.margin_bottom_mm ?? 0,

        margin_left_mm:
            input.margin_left_mm ?? 0,

        copies:
            input.copies ?? 1,

        auto_print:
            input.auto_print === undefined
                ? 0
                : input.auto_print,

        is_default:
            input.is_default === undefined
                ? 0
                : input.is_default,

        is_active:
            input.is_active === undefined
                ? 1
                : input.is_active
    };

    const errors = [];

    if (!data.code) {
        errors.push("کد پروفایل چاپ الزامی است.");
    }

    if (!data.name) {
        errors.push("نام پروفایل چاپ الزامی است.");
    }

    if (
        ![
            "thermal",
            "a4",
            "a5",
            "custom"
        ].includes(data.paper_type)
    ) {
        errors.push("نوع کاغذ معتبر نیست.");
    }

    if (
        ![
            "portrait",
            "landscape"
        ].includes(data.orientation)
    ) {
        errors.push("جهت چاپ معتبر نیست.");
    }

    for (
        const field of [
            "branch_id",
            "user_id",
            "printer_id"
        ]
    ) {
        if (
            data[field] !== null &&
            (
                !Number.isInteger(
                    Number(data[field])
                ) ||
                Number(data[field]) <= 0
            )
        ) {
            errors.push(
                `${field} معتبر نیست.`
            );
        }
    }

    for (
        const field of [
            "paper_width_mm",
            "paper_height_mm",
            "margin_top_mm",
            "margin_right_mm",
            "margin_bottom_mm",
            "margin_left_mm"
        ]
    ) {
        if (
            !Number.isFinite(
                Number(data[field])
            ) ||
            Number(data[field]) < 0
        ) {
            errors.push(
                `${field} معتبر نیست.`
            );
        }
    }

    if (
        !Number.isInteger(
            Number(data.copies)
        ) ||
        Number(data.copies) <= 0
    ) {
        errors.push("تعداد نسخه معتبر نیست.");
    }

    if (
        ![0, 1].includes(
            Number(data.auto_print)
        )
    ) {
        errors.push("وضعیت چاپ خودکار معتبر نیست.");
    }

    if (
        ![0, 1].includes(
            Number(data.is_default)
        )
    ) {
        errors.push("وضعیت پیش‌فرض بودن معتبر نیست.");
    }

    if (
        ![0, 1].includes(
            Number(data.is_active)
        )
    ) {
        errors.push("وضعیت فعال بودن معتبر نیست.");
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "PRINTING_VALIDATION_ERROR";

        error.details = errors;

        throw error;
    }

    return {
        ...data,

        branch_id:
            data.branch_id === null
                ? null
                : Number(data.branch_id),

        user_id:
            data.user_id === null
                ? null
                : Number(data.user_id),

        printer_id:
            data.printer_id === null
                ? null
                : Number(data.printer_id),

        paper_width_mm:
            data.paper_width_mm === null
                ? null
                : Number(data.paper_width_mm),

        paper_height_mm:
            data.paper_height_mm === null
                ? null
                : Number(data.paper_height_mm),

        margin_top_mm:
            Number(data.margin_top_mm),

        margin_right_mm:
            Number(data.margin_right_mm),

        margin_bottom_mm:
            Number(data.margin_bottom_mm),

        margin_left_mm:
            Number(data.margin_left_mm),

        copies:
            Number(data.copies),

        auto_print:
            Number(data.auto_print),

        is_default:
            Number(data.is_default),

        is_active:
            Number(data.is_active)
    };
}


function validatePrintTemplateInput(input) {
    if (!input || typeof input !== "object") {
        throw new Error("ورودی قالب چاپ معتبر نیست.");
    }

    const data = {
        code:
            typeof input.code === "string"
                ? input.code.trim()
                : "",

        name:
            typeof input.name === "string"
                ? input.name.trim()
                : "",

        document_type:
            typeof input.document_type === "string"
                ? input.document_type.trim()
                : "",

        template_type:
            input.template_type || "receipt",

        profile_id:
            input.profile_id ?? null,

        logo_path:
            input.logo_path ?? null,

        cafe_name:
            input.cafe_name ?? null,

        cafe_address:
            input.cafe_address ?? null,

        cafe_phone:
            input.cafe_phone ?? null,

        header_text:
            input.header_text ?? null,

        footer_text:
            input.footer_text ?? null,

        show_logo:
            input.show_logo === undefined
                ? 1
                : input.show_logo,

        show_cafe_name:
            input.show_cafe_name === undefined
                ? 1
                : input.show_cafe_name,

        show_customer:
            input.show_customer === undefined
                ? 1
                : input.show_customer,

        show_customer_phone:
            input.show_customer_phone === undefined
                ? 0
                : input.show_customer_phone,

        show_cashier:
            input.show_cashier === undefined
                ? 1
                : input.show_cashier,

        show_invoice_number:
            input.show_invoice_number === undefined
                ? 1
                : input.show_invoice_number,

        show_invoice_date:
            input.show_invoice_date === undefined
                ? 1
                : input.show_invoice_date,

        show_payment_method:
            input.show_payment_method === undefined
                ? 1
                : input.show_payment_method,

        show_paid_amount:
            input.show_paid_amount === undefined
                ? 1
                : input.show_paid_amount,

        show_remaining_amount:
            input.show_remaining_amount === undefined
                ? 1
                : input.show_remaining_amount,

        show_reference_number:
            input.show_reference_number === undefined
                ? 0
                : input.show_reference_number,

        show_notes:
            input.show_notes === undefined
                ? 1
                : input.show_notes,

        show_barcode:
            input.show_barcode === undefined
                ? 0
                : input.show_barcode,

        show_qr_code:
            input.show_qr_code === undefined
                ? 0
                : input.show_qr_code,

        rtl:
            input.rtl === undefined
                ? 1
                : input.rtl,

        font_family:
            input.font_family ?? null,

        font_size:
            input.font_size ?? 10,

        line_spacing:
            input.line_spacing ?? 1,

        custom_css:
            input.custom_css ?? null,

        layout_json:
            input.layout_json ?? null,

        is_default:
            input.is_default === undefined
                ? 0
                : input.is_default,

        is_active:
            input.is_active === undefined
                ? 1
                : input.is_active,

        fields:
            Array.isArray(input.fields)
                ? input.fields
                : []
    };

    const errors = [];

    if (!data.code) {
        errors.push("کد قالب چاپ الزامی است.");
    }

    if (!data.name) {
        errors.push("نام قالب چاپ الزامی است.");
    }

    if (!data.document_type) {
        errors.push("نوع سند چاپ الزامی است.");
    }

    if (
        ![
            "receipt",
            "invoice",
            "report",
            "kitchen",
            "bar",
            "custom"
        ].includes(data.template_type)
    ) {
        errors.push("نوع قالب چاپ معتبر نیست.");
    }

    if (
        data.profile_id !== null &&
        (
            !Number.isInteger(
                Number(data.profile_id)
            ) ||
            Number(data.profile_id) <= 0
        )
    ) {
        errors.push("پروفایل چاپ معتبر نیست.");
    }

    for (
        const field of [
            "show_logo",
            "show_cafe_name",
            "show_customer",
            "show_customer_phone",
            "show_cashier",
            "show_invoice_number",
            "show_invoice_date",
            "show_payment_method",
            "show_paid_amount",
            "show_remaining_amount",
            "show_reference_number",
            "show_notes",
            "show_barcode",
            "show_qr_code",
            "rtl",
            "is_default",
            "is_active"
        ]
    ) {
        if (
            ![0, 1].includes(
                Number(data[field])
            )
        ) {
            errors.push(
                `${field} معتبر نیست.`
            );
        }
    }

    if (
        !Number.isFinite(
            Number(data.font_size)
        ) ||
        Number(data.font_size) <= 0
    ) {
        errors.push("اندازه فونت معتبر نیست.");
    }

    if (
        !Number.isFinite(
            Number(data.line_spacing)
        ) ||
        Number(data.line_spacing) <= 0
    ) {
        errors.push("فاصله خطوط معتبر نیست.");
    }

    if (
        data.fields.some(
            field =>
                !field ||
                typeof field !== "object" ||
                typeof field.field_key !== "string" ||
                !field.field_key.trim()
        )
    ) {
        errors.push(
            "یکی از فیلدهای قالب چاپ معتبر نیست."
        );
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "PRINTING_VALIDATION_ERROR";

        error.details = errors;

        throw error;
    }

    return {
        ...data,

        profile_id:
            data.profile_id === null
                ? null
                : Number(data.profile_id),

        font_size:
            Number(data.font_size),

        line_spacing:
            Number(data.line_spacing),

        show_logo:
            Number(data.show_logo),

        show_cafe_name:
            Number(data.show_cafe_name),

        show_customer:
            Number(data.show_customer),

        show_customer_phone:
            Number(data.show_customer_phone),

        show_cashier:
            Number(data.show_cashier),

        show_invoice_number:
            Number(data.show_invoice_number),

        show_invoice_date:
            Number(data.show_invoice_date),

        show_payment_method:
            Number(data.show_payment_method),

        show_paid_amount:
            Number(data.show_paid_amount),

        show_remaining_amount:
            Number(data.show_remaining_amount),

        show_reference_number:
            Number(data.show_reference_number),

        show_notes:
            Number(data.show_notes),

        show_barcode:
            Number(data.show_barcode),

        show_qr_code:
            Number(data.show_qr_code),

        rtl:
            Number(data.rtl),

        is_default:
            Number(data.is_default),

        is_active:
            Number(data.is_active)
    };
}


function validatePrintTemplateFieldInput(
    input
) {
    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new Error(
            "فیلد قالب چاپ معتبر نیست."
        );
    }

    const data = {
        field_key:
            typeof input.field_key === "string"
                ? input.field_key.trim()
                : "",

        field_label:
            input.field_label ?? null,

        field_type:
            input.field_type || "text",

        section:
            input.section || "body",

        sort_order:
            input.sort_order ?? 0,

        width_percent:
            input.width_percent ?? null,

        align:
            input.align || "right",

        font_size:
            input.font_size ?? null,

        bold:
            input.bold === undefined
                ? 0
                : input.bold,

        visible:
            input.visible === undefined
                ? 1
                : input.visible,

        configuration_json:
            input.configuration_json ?? null
    };

    const errors = [];

    if (!data.field_key) {
        errors.push("کلید فیلد چاپ الزامی است.");
    }

    if (
        ![
            "text",
            "number",
            "money",
            "date",
            "datetime",
            "image",
            "barcode",
            "qrcode",
            "separator",
            "custom"
        ].includes(data.field_type)
    ) {
        errors.push("نوع فیلد چاپ معتبر نیست.");
    }

    if (
        ![
            "header",
            "customer",
            "body",
            "totals",
            "payment",
            "footer",
            "custom"
        ].includes(data.section)
    ) {
        errors.push("بخش فیلد چاپ معتبر نیست.");
    }

    if (
        !Number.isInteger(
            Number(data.sort_order)
        ) ||
        Number(data.sort_order) < 0
    ) {
        errors.push("ترتیب فیلد چاپ معتبر نیست.");
    }

    if (
        data.width_percent !== null &&
        (
            !Number.isFinite(
                Number(data.width_percent)
            ) ||
            Number(data.width_percent) <= 0 ||
            Number(data.width_percent) > 100
        )
    ) {
        errors.push("عرض فیلد چاپ معتبر نیست.");
    }

    if (
        ![
            "left",
            "center",
            "right"
        ].includes(data.align)
    ) {
        errors.push("تراز فیلد چاپ معتبر نیست.");
    }

    if (
        data.font_size !== null &&
        (
            !Number.isFinite(
                Number(data.font_size)
            ) ||
            Number(data.font_size) <= 0
        )
    ) {
        errors.push("اندازه فونت فیلد معتبر نیست.");
    }

    if (
        ![0, 1].includes(
            Number(data.bold)
        )
    ) {
        errors.push("وضعیت Bold معتبر نیست.");
    }

    if (
        ![0, 1].includes(
            Number(data.visible)
        )
    ) {
        errors.push("وضعیت نمایش فیلد معتبر نیست.");
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "PRINTING_VALIDATION_ERROR";

        error.details = errors;

        throw error;
    }

    return {
        ...data,

        sort_order:
            Number(data.sort_order),

        width_percent:
            data.width_percent === null
                ? null
                : Number(data.width_percent),

        font_size:
            data.font_size === null
                ? null
                : Number(data.font_size),

        bold:
            Number(data.bold),

        visible:
            Number(data.visible)
    };
}


function validatePrintRouteInput(input) {
    if (!input || typeof input !== "object") {
        throw new Error("ورودی مسیر چاپ معتبر نیست.");
    }

    const data = {
        code:
            typeof input.code === "string"
                ? input.code.trim()
                : "",

        name:
            typeof input.name === "string"
                ? input.name.trim()
                : "",

        document_type:
            typeof input.document_type === "string"
                ? input.document_type.trim()
                : "",

        printer_id:
            input.printer_id ?? null,

        copies:
            input.copies ?? 1,

        is_active:
            input.is_active === undefined
                ? 1
                : input.is_active,

        template_id:
            input.template_id ?? null,

        profile_id:
            input.profile_id ?? null,

        user_id:
            input.user_id ?? null,

        branch_id:
            input.branch_id ?? null,

        auto_print:
            input.auto_print === undefined
                ? 0
                : input.auto_print,

        fallback_printer_id:
            input.fallback_printer_id ?? null
    };

    const errors = [];

    if (!data.code) {
        errors.push("کد مسیر چاپ الزامی است.");
    }

    if (!data.name) {
        errors.push("نام مسیر چاپ الزامی است.");
    }

    if (!data.document_type) {
        errors.push("نوع سند مسیر چاپ الزامی است.");
    }

    for (
        const field of [
            "printer_id",
            "template_id",
            "profile_id",
            "user_id",
            "branch_id",
            "fallback_printer_id"
        ]
    ) {
        if (
            data[field] !== null &&
            (
                !Number.isInteger(
                    Number(data[field])
                ) ||
                Number(data[field]) <= 0
            )
        ) {
            errors.push(
                `${field} معتبر نیست.`
            );
        }
    }

    if (
        !Number.isInteger(
            Number(data.copies)
        ) ||
        Number(data.copies) <= 0
    ) {
        errors.push("تعداد نسخه معتبر نیست.");
    }

    if (
        ![0, 1].includes(
            Number(data.is_active)
        )
    ) {
        errors.push("وضعیت فعال بودن معتبر نیست.");
    }

    if (
        ![0, 1].includes(
            Number(data.auto_print)
        )
    ) {
        errors.push("وضعیت چاپ خودکار معتبر نیست.");
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "PRINTING_VALIDATION_ERROR";

        error.details = errors;

        throw error;
    }

    return {
        ...data,

        printer_id:
            data.printer_id === null
                ? null
                : Number(data.printer_id),

        copies:
            Number(data.copies),

        is_active:
            Number(data.is_active),

        template_id:
            data.template_id === null
                ? null
                : Number(data.template_id),

        profile_id:
            data.profile_id === null
                ? null
                : Number(data.profile_id),

        user_id:
            data.user_id === null
                ? null
                : Number(data.user_id),

        branch_id:
            data.branch_id === null
                ? null
                : Number(data.branch_id),

        auto_print:
            Number(data.auto_print),

        fallback_printer_id:
            data.fallback_printer_id === null
                ? null
                : Number(data.fallback_printer_id)
    };
}


function validatePrintJobInput(input) {
    if (!input || typeof input !== "object") {
        throw new Error("ورودی صف چاپ معتبر نیست.");
    }

    const data = {
        job_number:
            typeof input.job_number === "string"
                ? input.job_number.trim()
                : "",

        document_type:
            typeof input.document_type === "string"
                ? input.document_type.trim()
                : "",

        document_id:
            input.document_id ?? null,

        template_id:
            input.template_id ?? null,

        profile_id:
            input.profile_id ?? null,

        printer_id:
            input.printer_id ?? null,

        user_id:
            input.user_id ?? null,

        copies:
            input.copies ?? 1,

        status:
            input.status || "queued",

        payload_json:
            input.payload_json ?? null
    };

    const errors = [];

    if (!data.job_number) {
        errors.push("شماره Job چاپ الزامی است.");
    }

    if (!data.document_type) {
        errors.push("نوع سند چاپ الزامی است.");
    }

    if (
        data.document_id !== null &&
        (
            !Number.isInteger(
                Number(data.document_id)
            ) ||
            Number(data.document_id) <= 0
        )
    ) {
        errors.push("شناسه سند چاپ معتبر نیست.");
    }

    for (
        const field of [
            "template_id",
            "profile_id",
            "printer_id",
            "user_id"
        ]
    ) {
        if (
            data[field] !== null &&
            (
                !Number.isInteger(
                    Number(data[field])
                ) ||
                Number(data[field]) <= 0
            )
        ) {
            errors.push(
                `${field} معتبر نیست.`
            );
        }
    }

    if (
        !Number.isInteger(
            Number(data.copies)
        ) ||
        Number(data.copies) <= 0
    ) {
        errors.push("تعداد نسخه معتبر نیست.");
    }

    if (
        ![
            "queued",
            "printing",
            "completed",
            "failed",
            "cancelled"
        ].includes(data.status)
    ) {
        errors.push("وضعیت Job چاپ معتبر نیست.");
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "PRINTING_VALIDATION_ERROR";

        error.details = errors;

        throw error;
    }

    return {
        ...data,

        document_id:
            data.document_id === null
                ? null
                : Number(data.document_id),

        template_id:
            data.template_id === null
                ? null
                : Number(data.template_id),

        profile_id:
            data.profile_id === null
                ? null
                : Number(data.profile_id),

        printer_id:
            data.printer_id === null
                ? null
                : Number(data.printer_id),

        user_id:
            data.user_id === null
                ? null
                : Number(data.user_id),

        copies:
            Number(data.copies)
    };
}


function validatePrintSettingInput(input) {
    if (!input || typeof input !== "object") {
        throw new Error("ورودی تنظیم چاپ معتبر نیست.");
    }

    const data = {
        setting_key:
            typeof input.setting_key === "string"
                ? input.setting_key.trim()
                : "",

        setting_value:
            input.setting_value ?? null,

        value_type:
            input.value_type || "string",

        is_active:
            input.is_active === undefined
                ? 1
                : input.is_active
    };

    const errors = [];

    if (!data.setting_key) {
        errors.push("کلید تنظیم چاپ الزامی است.");
    }

    if (
        ![
            "string",
            "number",
            "boolean",
            "json"
        ].includes(data.value_type)
    ) {
        errors.push("نوع مقدار تنظیم چاپ معتبر نیست.");
    }

    if (
        ![0, 1].includes(
            Number(data.is_active)
        )
    ) {
        errors.push("وضعیت تنظیم چاپ معتبر نیست.");
    }

    if (
        data.value_type === "number" &&
        data.setting_value !== null &&
        (
            data.setting_value === "" ||
            !Number.isFinite(
                Number(data.setting_value)
            )
        )
    ) {
        errors.push(
            "مقدار عددی تنظیم چاپ معتبر نیست."
        );
    }

    if (
        data.value_type === "boolean" &&
        data.setting_value !== null
    ) {
        const value =
            String(data.setting_value)
                .trim()
                .toLowerCase();

        if (
            ![
                "0",
                "1",
                "true",
                "false"
            ].includes(value)
        ) {
            errors.push(
                "مقدار منطقی تنظیم چاپ معتبر نیست."
            );
        }
    }

    if (
        data.value_type === "json" &&
        data.setting_value !== null
    ) {
        try {
            JSON.parse(
                String(data.setting_value)
            );
        } catch {
            errors.push(
                "مقدار JSON تنظیم چاپ معتبر نیست."
            );
        }
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "PRINTING_VALIDATION_ERROR";

        error.details = errors;

        throw error;
    }

    return {
        ...data,

        setting_value:
            data.setting_value === null
                ? null
                : String(data.setting_value),

        is_active:
            Number(data.is_active)
    };
}


module.exports = {
    validatePrinterInput,
    validatePrintProfileInput,
    validatePrintTemplateInput,
    validatePrintTemplateFieldInput,
    validatePrintRouteInput,
    validatePrintJobInput,
    validatePrintSettingInput
};