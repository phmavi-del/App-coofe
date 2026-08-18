function validateBackupName(
    input
) {
    if (
        typeof input !== "string"
    ) {
        throw new Error(
            "نام Backup معتبر نیست."
        );
    }

    const value =
        input.trim();

    if (!value) {
        throw new Error(
            "نام Backup نمی‌تواند خالی باشد."
        );
    }

    if (value.length > 100) {
        throw new Error(
            "نام Backup بیش از حد طولانی است."
        );
    }

    if (
        /[<>:"/\\|?*\x00-\x1F]/.test(
            value
        )
    ) {
        throw new Error(
            "نام Backup شامل کاراکتر غیرمجاز است."
        );
    }

    return value;
}


function validateRestoreFile(
    input
) {
    if (
        typeof input !== "string"
    ) {
        throw new Error(
            "مسیر فایل Restore معتبر نیست."
        );
    }

    const value =
        input.trim();

    if (!value) {
        throw new Error(
            "مسیر فایل Restore نمی‌تواند خالی باشد."
        );
    }

    return value;
}


module.exports = {
    validateBackupName,
    validateRestoreFile
};