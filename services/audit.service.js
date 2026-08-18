const {
    createConnection
} = require("../core/connection");

const {
    validateAuditLogInput
} = require("../validation/audit.validation");

const {
    insertAuditLog,
    getAuditLogById,
    getAuditLogs,
    countAuditLogs
} = require("../repositories/audit.repository");


function createAuditLogInTransaction(
    db,
    input
) {
    const data =
        validateAuditLogInput(
            input
        );

    const auditId =
        insertAuditLog(
            db,
            data
        );

    return auditId;
}


function createAuditLog(
    input
) {
    const db =
        createConnection();

    try {

        const transaction =
            db.transaction(() => {
                return createAuditLogInTransaction(
                    db,
                    input
                );
            });

        const auditId =
            transaction();

        return getAuditLog(
            auditId
        );

    } finally {

        db.close();
    }
}


function getAuditLog(
    auditId
) {
    const db =
        createConnection();

    try {

        return getAuditLogById(
            db,
            auditId
        );

    } finally {

        db.close();
    }
}


function listAuditLogs(
    filters = {}
) {
    const db =
        createConnection();

    try {

        return getAuditLogs(
            db,
            filters
        );

    } finally {

        db.close();
    }
}


function getAuditLogCount(
    filters = {}
) {
    const db =
        createConnection();

    try {

        return countAuditLogs(
            db,
            filters
        );

    } finally {

        db.close();
    }
}


module.exports = {
    createAuditLog,
    createAuditLogInTransaction,
    getAuditLog,
    listAuditLogs,
    getAuditLogCount
};