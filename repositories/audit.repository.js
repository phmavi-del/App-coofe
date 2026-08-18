function insertAuditLog(
    db,
    audit
) {
    const result = db
        .prepare(`
            INSERT INTO audit_logs (
                user_id,
                module,
                action,
                record_id,
                before_data,
                after_data
            )
            VALUES (
                @user_id,
                @module,
                @action,
                @record_id,
                @before_data,
                @after_data
            )
        `)
        .run({
            user_id:
                audit.user_id ?? null,

            module:
                audit.module,

            action:
                audit.action,

            record_id:
                audit.record_id ?? null,

            before_data:
                audit.before_data ?? null,

            after_data:
                audit.after_data ?? null
        });

    return result.lastInsertRowid;
}


function getAuditLogById(
    db,
    auditId
) {
    return db
        .prepare(`
            SELECT
                al.*,
                u.username,
                u.full_name
            FROM audit_logs al
            LEFT JOIN users u
                ON u.id = al.user_id
            WHERE al.id = ?
        `)
        .get(auditId);
}


function getAuditLogs(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.user_id !== undefined &&
        filters.user_id !== null
    ) {
        conditions.push(
            "al.user_id = @user_id"
        );

        params.user_id =
            filters.user_id;
    }

    if (
        filters.module !== undefined &&
        filters.module !== null &&
        filters.module !== ""
    ) {
        conditions.push(
            "al.module = @module"
        );

        params.module =
            filters.module;
    }

    if (
        filters.action !== undefined &&
        filters.action !== null &&
        filters.action !== ""
    ) {
        conditions.push(
            "al.action = @action"
        );

        params.action =
            filters.action;
    }

    if (
        filters.record_id !== undefined &&
        filters.record_id !== null
    ) {
        conditions.push(
            "al.record_id = @record_id"
        );

        params.record_id =
            filters.record_id;
    }

    if (
        filters.from_date !== undefined &&
        filters.from_date !== null &&
        filters.from_date !== ""
    ) {
        conditions.push(
            "al.created_at >= @from_date"
        );

        params.from_date =
            filters.from_date;
    }

    if (
        filters.to_date !== undefined &&
        filters.to_date !== null &&
        filters.to_date !== ""
    ) {
        conditions.push(
            "al.created_at <= @to_date"
        );

        params.to_date =
            filters.to_date;
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
                al.*,
                u.username,
                u.full_name
            FROM audit_logs al
            LEFT JOIN users u
                ON u.id = al.user_id
            ${whereClause}
            ORDER BY
                al.id DESC
            LIMIT @limit
            OFFSET @offset
        `)
        .all({
            ...params,
            limit,
            offset
        });
}


function countAuditLogs(
    db,
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.user_id !== undefined &&
        filters.user_id !== null
    ) {
        conditions.push(
            "user_id = @user_id"
        );

        params.user_id =
            filters.user_id;
    }

    if (
        filters.module !== undefined &&
        filters.module !== null &&
        filters.module !== ""
    ) {
        conditions.push(
            "module = @module"
        );

        params.module =
            filters.module;
    }

    if (
        filters.action !== undefined &&
        filters.action !== null &&
        filters.action !== ""
    ) {
        conditions.push(
            "action = @action"
        );

        params.action =
            filters.action;
    }

    if (
        filters.record_id !== undefined &&
        filters.record_id !== null
    ) {
        conditions.push(
            "record_id = @record_id"
        );

        params.record_id =
            filters.record_id;
    }

    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

    const row = db
        .prepare(`
            SELECT
                COUNT(*) AS total
            FROM audit_logs
            ${whereClause}
        `)
        .get(params);

    return row.total;
}


module.exports = {
    insertAuditLog,
    getAuditLogById,
    getAuditLogs,
    countAuditLogs
};