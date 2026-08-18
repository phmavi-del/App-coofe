
const {
    createConnection
} = require("../core/connection");

const {
    validatePrinterInput,
    validatePrintProfileInput,
    validatePrintTemplateInput,
    validatePrintRouteInput,
    validatePrintJobInput,
    validatePrintSettingInput
} = require("../validation/printing.validation");

const {
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
} = require("../repositories/printing.repository");

const {
    createAuditLogInTransaction
} = require("./audit.service");


function createAudit(
    db,
    {
        userId,
        action,
        recordId,
        beforeData,
        afterData
    }
) {
    return createAuditLogInTransaction(
        db,
        {
            user_id:
                userId ?? null,

            module:
                "printing",

            action,

            record_id:
                recordId ?? null,

            before_data:
                beforeData
                    ? JSON.stringify(beforeData)
                    : null,

            after_data:
                afterData
                    ? JSON.stringify(afterData)
                    : null
        }
    );
}


function createPrinterInTransaction(
    db,
    input,
    userId
) {
    const data =
        validatePrinterInput(
            input
        );

    if (
        getPrinterByCode(
            db,
            data.code
        )
    ) {
        throw new Error(
            `کد چاپگر «${data.code}» قبلاً ثبت شده است.`
        );
    }

    const printerId =
        insertPrinter(
            db,
            data
        );

    createAudit(
        db,
        {
            userId,
            action: "CREATE_PRINTER",
            recordId: printerId,
            beforeData: null,
            afterData: data
        }
    );

    return printerId;
}


function updatePrinterInTransaction(
    db,
    input,
    userId
) {
    const current =
        getPrinterById(
            db,
            input.id
        );

    if (!current) {
        throw new Error(
            "چاپگر پیدا نشد."
        );
    }

    const data =
        validatePrinterInput(
            input
        );

    const sameCode =
        getPrinterByCode(
            db,
            data.code
        );

    if (
        sameCode &&
        sameCode.id !== current.id
    ) {
        throw new Error(
            `کد چاپگر «${data.code}» قبلاً ثبت شده است.`
        );
    }

    const changes =
        updatePrinter(
            db,
            {
                ...data,
                id: current.id
            }
        );

    if (!changes) {
        throw new Error(
            "تغییری در چاپگر ایجاد نشد."
        );
    }

    const updated =
        getPrinterById(
            db,
            current.id
        );

    createAudit(
        db,
        {
            userId,
            action: "UPDATE_PRINTER",
            recordId: current.id,
            beforeData: current,
            afterData: updated
        }
    );

    return updated;
}


function savePrinter(
    input,
    userId
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                if (input.id) {
                    return updatePrinterInTransaction(
                        db,
                        input,
                        userId
                    );
                }

                const id =
                    createPrinterInTransaction(
                        db,
                        input,
                        userId
                    );

                return getPrinterById(
                    db,
                    id
                );
            });

        return transaction();

    } finally {
        db.close();
    }
}


function listPrinters(
    filters = {}
) {
    const db =
        createConnection();

    try {
        return getPrinters(
            db,
            filters
        );
    } finally {
        db.close();
    }
}


function createPrintProfileInTransaction(
    db,
    input,
    userId
) {
    const data =
        validatePrintProfileInput(
            input
        );

    const profileId =
        insertPrintProfile(
            db,
            data
        );

    createAudit(
        db,
        {
            userId,
            action: "CREATE_PRINT_PROFILE",
            recordId: profileId,
            beforeData: null,
            afterData: data
        }
    );

    return profileId;
}


function updatePrintProfileInTransaction(
    db,
    input,
    userId
) {
    const current =
        getPrintProfileById(
            db,
            input.id
        );

    if (!current) {
        throw new Error(
            "پروفایل چاپ پیدا نشد."
        );
    }

    const data =
        validatePrintProfileInput(
            input
        );

    const changes =
        updatePrintProfile(
            db,
            {
                ...data,
                id: current.id
            }
        );

    if (!changes) {
        throw new Error(
            "تغییری در پروفایل چاپ ایجاد نشد."
        );
    }

    const updated =
        getPrintProfileById(
            db,
            current.id
        );

    createAudit(
        db,
        {
            userId,
            action: "UPDATE_PRINT_PROFILE",
            recordId: current.id,
            beforeData: current,
            afterData: updated
        }
    );

    return updated;
}


function savePrintProfile(
    input,
    userId
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                if (input.id) {
                    return updatePrintProfileInTransaction(
                        db,
                        input,
                        userId
                    );
                }

                const id =
                    createPrintProfileInTransaction(
                        db,
                        input,
                        userId
                    );

                return getPrintProfileById(
                    db,
                    id
                );
            });

        return transaction();

    } finally {
        db.close();
    }
}


function listPrintProfiles(
    filters = {}
) {
    const db =
        createConnection();

    try {
        return getPrintProfiles(
            db,
            filters
        );
    } finally {
        db.close();
    }
}


function getDefaultProfile(
    filters = {}
) {
    const db =
        createConnection();

    try {
        return getDefaultPrintProfile(
            db,
            filters
        );
    } finally {
        db.close();
    }
}


function createPrintTemplateInTransaction(
    db,
    input,
    userId
) {
    const data =
        validatePrintTemplateInput(
            input
        );

    const templateId =
        insertPrintTemplate(
            db,
            data
        );

    replacePrintTemplateFields(
        db,
        templateId,
        data.fields
    );

    const created =
        getPrintTemplateById(
            db,
            templateId
        );

    createAudit(
        db,
        {
            userId,
            action: "CREATE_PRINT_TEMPLATE",
            recordId: templateId,
            beforeData: null,
            afterData: created
        }
    );

    return templateId;
}


function updatePrintTemplateInTransaction(
    db,
    input,
    userId
) {
    const current =
        getPrintTemplateById(
            db,
            input.id
        );

    if (!current) {
        throw new Error(
            "قالب چاپ پیدا نشد."
        );
    }

    const data =
        validatePrintTemplateInput(
            input
        );

    const changes =
        updatePrintTemplate(
            db,
            {
                ...data,
                id: current.id
            }
        );

    if (!changes) {
        throw new Error(
            "تغییری در قالب چاپ ایجاد نشد."
        );
    }

    replacePrintTemplateFields(
        db,
        current.id,
        data.fields
    );

    const updated =
        getPrintTemplateById(
            db,
            current.id
        );

    createAudit(
        db,
        {
            userId,
            action: "UPDATE_PRINT_TEMPLATE",
            recordId: current.id,
            beforeData: current,
            afterData: updated
        }
    );

    return updated;
}


function savePrintTemplate(
    input,
    userId
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                if (input.id) {
                    return updatePrintTemplateInTransaction(
                        db,
                        input,
                        userId
                    );
                }

                const id =
                    createPrintTemplateInTransaction(
                        db,
                        input,
                        userId
                    );

                return getPrintTemplateById(
                    db,
                    id
                );
            });

        return transaction();

    } finally {
        db.close();
    }
}


function listPrintTemplates(
    filters = {}
) {
    const db =
        createConnection();

    try {
        return getPrintTemplates(
            db,
            filters
        );
    } finally {
        db.close();
    }
}


function createPrintRouteInTransaction(
    db,
    input,
    userId
) {
    const data =
        validatePrintRouteInput(
            input
        );

    const routeId =
        insertPrintRoute(
            db,
            data
        );

    const created =
        getPrintRouteById(
            db,
            routeId
        );

    createAudit(
        db,
        {
            userId,
            action: "CREATE_PRINT_ROUTE",
            recordId: routeId,
            beforeData: null,
            afterData: created
        }
    );

    return routeId;
}


function updatePrintRouteInTransaction(
    db,
    input,
    userId
) {
    const current =
        getPrintRouteById(
            db,
            input.id
        );

    if (!current) {
        throw new Error(
            "مسیر چاپ پیدا نشد."
        );
    }

    const data =
        validatePrintRouteInput(
            input
        );

    const changes =
        updatePrintRoute(
            db,
            {
                ...data,
                id: current.id
            }
        );

    if (!changes) {
        throw new Error(
            "تغییری در مسیر چاپ ایجاد نشد."
        );
    }

    const updated =
        getPrintRouteById(
            db,
            current.id
        );

    createAudit(
        db,
        {
            userId,
            action: "UPDATE_PRINT_ROUTE",
            recordId: current.id,
            beforeData: current,
            afterData: updated
        }
    );

    return updated;
}


function savePrintRoute(
    input,
    userId
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                if (input.id) {
                    return updatePrintRouteInTransaction(
                        db,
                        input,
                        userId
                    );
                }

                const id =
                    createPrintRouteInTransaction(
                        db,
                        input,
                        userId
                    );

                return getPrintRouteById(
                    db,
                    id
                );
            });

        return transaction();

    } finally {
        db.close();
    }
}


function listPrintRoutes(
    filters = {}
) {
    const db =
        createConnection();

    try {
        return getPrintRoutes(
            db,
            filters
        );
    } finally {
        db.close();
    }
}


function resolvePrintRoute(
    filters
) {
    const db =
        createConnection();

    try {
        return getRouteForDocument(
            db,
            filters
        );
    } finally {
        db.close();
    }
}


function savePrintSetting(
    input,
    userId
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                const data =
                    validatePrintSettingInput(
                        input
                    );

                const previous =
                    getPrintSettingByKey(
                        db,
                        data.setting_key
                    );

                const id =
                    upsertPrintSetting(
                        db,
                        data
                    );

                const current =
                    getPrintSettingByKey(
                        db,
                        data.setting_key
                    );

                createAudit(
                    db,
                    {
                        userId,
                        action:
                            previous
                                ? "UPDATE_PRINT_SETTING"
                                : "CREATE_PRINT_SETTING",
                        recordId: id,
                        beforeData: previous,
                        afterData: current
                    }
                );

                return current;
            });

        return transaction();

    } finally {
        db.close();
    }
}


function listPrintSettings(
    filters = {}
) {
    const db =
        createConnection();

    try {
        return getPrintSettings(
            db,
            filters
        );
    } finally {
        db.close();
    }
}


function createPrintJob(
    input
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                const data =
                    validatePrintJobInput(
                        input
                    );

                const jobId =
                    insertPrintJob(
                        db,
                        data
                    );

                createAudit(
                    db,
                    {
                        userId:
                            data.user_id,

                        action:
                            "CREATE_PRINT_JOB",

                        recordId:
                            jobId,

                        beforeData:
                            null,

                        afterData:
                            data
                    }
                );

                return getPrintJobById(
                    db,
                    jobId
                );
            });

        return transaction();

    } finally {
        db.close();
    }
}


function updatePrintJobStatusService(
    jobId,
    status,
    options = {},
    userId = null
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                const current =
                    getPrintJobById(
                        db,
                        jobId
                    );

                if (!current) {
                    throw new Error(
                        "صف چاپ پیدا نشد."
                    );
                }

                const changes =
                    updatePrintJobStatus(
                        db,
                        jobId,
                        status,
                        options
                    );

                if (!changes) {
                    throw new Error(
                        "وضعیت صف چاپ تغییر نکرد."
                    );
                }

                const updated =
                    getPrintJobById(
                        db,
                        jobId
                    );

                createAudit(
                    db,
                    {
                        userId:
                            userId ??
                            current.user_id,

                        action:
                            `PRINT_JOB_${status.toUpperCase()}`,

                        recordId:
                            jobId,

                        beforeData:
                            current,

                        afterData:
                            updated
                    }
                );

                return updated;
            });

        return transaction();

    } finally {
        db.close();
    }
}


function getPrintJob(
    jobId
) {
    const db =
        createConnection();

    try {
        return getPrintJobById(
            db,
            jobId
        );
    } finally {
        db.close();
    }
}


function listPrintJobs(
    filters = {}
) {
    const db =
        createConnection();

    try {
        return getPrintJobs(
            db,
            filters
        );
    } finally {
        db.close();
    }
}


function getPrintJobCount(
    filters = {}
) {
    const db =
        createConnection();

    try {
        return countPrintJobs(
            db,
            filters
        );
    } finally {
        db.close();
    }
}



function createCompletePrintConfigurationInTransaction(
    db,
    {
        printer,
        profile,
        template,
        route,
        setting = null,
        userId = null
    }
) {
    const printerId =
        createPrinterInTransaction(
            db,
            printer,
            userId
        );

    const profileId =
        createPrintProfileInTransaction(
            db,
            {
                ...profile,
                printer_id: printerId
            },
            userId
        );

    const templateId =
        createPrintTemplateInTransaction(
            db,
            {
                ...template,
                profile_id: profileId
            },
            userId
        );

    const routeId =
        createPrintRouteInTransaction(
            db,
            {
                ...route,
                printer_id: printerId,
                profile_id: profileId,
                template_id: templateId
            },
            userId
        );

    let savedSetting = null;

    if (setting) {
        const data =
            validatePrintSettingInput(
                setting
            );

        const previous =
            getPrintSettingByKey(
                db,
                data.setting_key
            );

        const settingId =
            upsertPrintSetting(
                db,
                data
            );

        savedSetting =
            getPrintSettingByKey(
                db,
                data.setting_key
            );

        createAudit(
            db,
            {
                userId,
                action:
                    previous
                        ? "UPDATE_PRINT_SETTING"
                        : "CREATE_PRINT_SETTING",

                recordId:
                    settingId,

                beforeData:
                    previous,

                afterData:
                    savedSetting
            }
        );
    }

    return {
        printerId,
        profileId,
        templateId,
        routeId,
        settingId:
            savedSetting
                ? savedSetting.id
                : null
    };
}


module.exports = {
    savePrinter,
    listPrinters,

    savePrintProfile,
    listPrintProfiles,
    getDefaultProfile,

    savePrintTemplate,
    listPrintTemplates,

    savePrintRoute,
    listPrintRoutes,
    resolvePrintRoute,

    savePrintSetting,
    listPrintSettings,

    createPrintJob,
    updatePrintJobStatusService,
    getPrintJob,
    listPrintJobs,
    getPrintJobCount,




    createPrinterInTransaction,
    updatePrinterInTransaction,
    createPrintProfileInTransaction,
    updatePrintProfileInTransaction,
    createPrintTemplateInTransaction,
    updatePrintTemplateInTransaction,
    createPrintRouteInTransaction,
    updatePrintRouteInTransaction,
createCompletePrintConfigurationInTransaction

};