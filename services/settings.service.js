const {
    createConnection
} = require("../core/connection");

const {
    validateSettingInput
} = require("../validation/settings.validation");

const {
    getSettingByKey,
    getActiveSettings,
    upsertSetting
} = require("../repositories/settings.repository");

const {
    createAuditLogInTransaction
} = require("./audit.service");


function getSetting(
    settingKey
) {
    const db =
        createConnection();

    try {
        return getSettingByKey(
            db,
            settingKey
        );
    } finally {
        db.close();
    }
}


function listActiveSettings() {
    const db =
        createConnection();

    try {
        return getActiveSettings(
            db
        );
    } finally {
        db.close();
    }
}


function saveSettingInTransaction(
    db,
    input,
    userId
) {
    const data =
        validateSettingInput(
            input
        );

    const previous =
        getSettingByKey(
            db,
            data.setting_key
        );

    const settingId =
        upsertSetting(
            db,
            data
        );

    createAuditLogInTransaction(
        db,
        {
            user_id:
                userId ?? null,

            module:
                "settings",

            action:
                previous
                    ? "UPDATE"
                    : "CREATE",

            record_id:
                settingId,

            before_data:
                previous
                    ? JSON.stringify(previous)
                    : null,

            after_data:
                JSON.stringify({
                    ...data,
                    id:
                        settingId
                })
        }
    );

    return settingId;
}


function saveSetting(
    input,
    userId
) {
    const db =
        createConnection();

    try {
        const transaction =
            db.transaction(() => {
                return saveSettingInTransaction(
                    db,
                    input,
                    userId
                );
            });

        const settingId =
            transaction();

        return getSetting(
            input.setting_key
        ) || {
            id: settingId
        };

    } finally {
        db.close();
    }
}


module.exports = {
    getSetting,
    listActiveSettings,
    saveSetting,
    saveSettingInTransaction
};