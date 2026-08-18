function getSettingByKey(
    db,
    settingKey
) {
    return db
        .prepare(`
            SELECT
                id,
                setting_key,
                setting_value,
                value_type,
                description,
                is_active,
                created_at,
                updated_at
            FROM app_settings
            WHERE setting_key = ?
        `)
        .get(settingKey);
}


function getActiveSettings(
    db
) {
    return db
        .prepare(`
            SELECT
                id,
                setting_key,
                setting_value,
                value_type,
                description,
                is_active,
                created_at,
                updated_at
            FROM app_settings
            WHERE is_active = 1
            ORDER BY
                setting_key
        `)
        .all();
}


function insertSetting(
    db,
    setting
) {
    const result =
        db
            .prepare(`
                INSERT INTO app_settings (
                    setting_key,
                    setting_value,
                    value_type,
                    description,
                    is_active
                )
                VALUES (
                    @setting_key,
                    @setting_value,
                    @value_type,
                    @description,
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

                description:
                    setting.description ??
                    null,

                is_active:
                    setting.is_active === undefined
                        ? 1
                        : setting.is_active
            });

    return result.lastInsertRowid;
}


function updateSetting(
    db,
    setting
) {
    const result =
        db
            .prepare(`
                UPDATE app_settings
                SET
                    setting_value = @setting_value,
                    value_type = @value_type,
                    description = @description,
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

                description:
                    setting.description ??
                    null,

                is_active:
                    setting.is_active === undefined
                        ? 1
                        : setting.is_active
            });

    return result.changes;
}


function upsertSetting(
    db,
    setting
) {
    const existing =
        getSettingByKey(
            db,
            setting.setting_key
        );

    if (existing) {
        updateSetting(
            db,
            setting
        );

        return existing.id;
    }

    return insertSetting(
        db,
        setting
    );
}


module.exports = {
    getSettingByKey,
    getActiveSettings,
    insertSetting,
    updateSetting,
    upsertSetting
};