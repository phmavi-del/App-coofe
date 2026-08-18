const fs = require("fs");
const path = require("path");

const Database = require("better-sqlite3");

const {
    createConnection,
    DATABASE_FILE,
    DATA_DIR
} = require("../core/connection");

const {
    MIGRATIONS_DIR,
    getMigrationFiles
} = require("../core/migrations");

const {
    validateBackupName,
    validateRestoreFile
} = require("../validation/backup.validation");

const {
    createAuditLogInTransaction
} = require("./audit.service");


const BACKUP_DIR =
    path.join(
        DATA_DIR,
        "backups"
    );


function ensureBackupDirectory() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(
            BACKUP_DIR,
            {
                recursive: true
            }
        );
    }
}


function sanitizeBackupName(
    value
) {
    return validateBackupName(
        value
    );
}


function buildBackupPath(
    backupName
) {
    ensureBackupDirectory();

    const safeName =
        sanitizeBackupName(
            backupName
        );

    return path.join(
        BACKUP_DIR,
        `${safeName}.db`
    );
}


function getCurrentMigrationVersion(
    db
) {
    try {
        const row =
            db
                .prepare(`
                    SELECT
                        MAX(version) AS version
                    FROM schema_migrations
                `)
                .get();

        return Number(
            row?.version || 0
        );
    } catch {
        return 0;
    }
}


function getAvailableMigrationVersion() {
    const files =
        getMigrationFiles();

    if (!files.length) {
        return 0;
    }

    return Math.max(
        ...files.map(
            file =>
                Number(
                    file.split("_")[0]
                )
        )
    );
}


function getDatabaseFileSize(
    filePath
) {
    if (
        !fs.existsSync(filePath)
    ) {
        return 0;
    }

    return fs.statSync(
        filePath
    ).size;
}


function runIntegrityCheckOnDatabase(
    filePath
) {
    if (
        !fs.existsSync(filePath)
    ) {
        throw new Error(
            "فایل دیتابیس برای Integrity Check پیدا نشد."
        );
    }

    const db =
        new Database(
            filePath,
            {
                readonly: true
            }
        );

    try {
        db.pragma(
            "foreign_keys = ON"
        );

        const integrity =
            db
                .prepare(
                    "PRAGMA integrity_check"
                )
                .all();

        const foreignKeys =
            db
                .prepare(
                    "PRAGMA foreign_key_check"
                )
                .all();

        const migrationVersion =
            getCurrentMigrationVersion(
                db
            );

        const availableMigrationVersion =
            getAvailableMigrationVersion();

        const integrityOk =
            integrity.length === 1 &&
            integrity[0].integrity_check ===
                "ok";

        const foreignKeysOk =
            foreignKeys.length === 0;

        const migrationsExist =
            db
                .prepare(`
                    SELECT
                        name
                    FROM sqlite_master
                    WHERE
                        type = 'table'
                        AND name = 'schema_migrations'
                `)
                .get();

        const migrationVersionCompatible =
            migrationVersion <=
            availableMigrationVersion;

        return {
            file:
                filePath,

            size:
                getDatabaseFileSize(
                    filePath
                ),

            integrity,
            foreignKeys,

            integrityOk,
            foreignKeysOk,

            migrationVersion,
            availableMigrationVersion,

            migrationVersionCompatible,

            schemaMigrationsTableExists:
                Boolean(
                    migrationsExist
                ),

            valid:
                integrityOk &&
                foreignKeysOk &&
                migrationVersionCompatible &&
                Boolean(
                    migrationsExist
                )
        };
    } finally {
        db.close();
    }
}


async function createBackup(
    {
        name,
        userId = null
    }
) {
    const backupPath =
        buildBackupPath(
            name
        );

    if (
        fs.existsSync(
            backupPath
        )
    ) {
        throw new Error(
            `فایل Backup «${path.basename(backupPath)}» از قبل وجود دارد.`
        );
    }

    const db =
        createConnection();

    let backupCompleted =
        false;

    try {
        const currentVersion =
            getCurrentMigrationVersion(
                db
            );

        const availableVersion =
            getAvailableMigrationVersion();

        if (
            currentVersion >
            availableVersion
        ) {
            throw new Error(
                "نسخه Migration دیتابیس از Migrationهای موجود جدیدتر است."
            );
        }

        await db.backup(
            backupPath
        );

        backupCompleted =
            true;

    } finally {
        db.close();
    }

    if (
        !backupCompleted ||
        !fs.existsSync(
            backupPath
        )
    ) {
        throw new Error(
            "ایجاد Backup با موفقیت تأیید نشد."
        );
    }

    const integrity =
        runIntegrityCheckOnDatabase(
            backupPath
        );

    if (!integrity.valid) {
        try {
            fs.unlinkSync(
                backupPath
            );
        } catch {}

        throw new Error(
            "Backup ایجاد شد اما Integrity Check آن موفق نبود."
        );
    }

    const verifyDb =
        createConnection();

    try {
        const transaction =
            verifyDb.transaction(
                () => {
                    createAuditLogInTransaction(
                        verifyDb,
                        {
                            user_id:
                                userId,

                            module:
                                "backup",

                            action:
                                "CREATE_BACKUP",

                            record_id:
                                null,

                            before_data:
                                null,

                            after_data:
                                JSON.stringify({
                                    path:
                                        backupPath,

                                    size:
                                        integrity.size,

                                    migration_version:
                                        integrity.migrationVersion
                                })
                        }
                    );
                }
            );

        transaction();

    } finally {
        verifyDb.close();
    }

    return {
        path:
            backupPath,

        fileName:
            path.basename(
                backupPath
            ),

        size:
            integrity.size,

        migrationVersion:
            integrity.migrationVersion,

        integrityOk:
            integrity.integrityOk,

        foreignKeysOk:
            integrity.foreignKeysOk,

        valid:
            integrity.valid
    };
}


function validateBackupFile(
    backupPath
) {
    const source =
        validateRestoreFile(
            backupPath
        );

    const absolutePath =
        path.resolve(
            source
        );

    if (
        !fs.existsSync(
            absolutePath
        )
    ) {
        throw new Error(
            "فایل Backup پیدا نشد."
        );
    }

    if (
        path.extname(
            absolutePath
        ).toLowerCase() !==
        ".db"
    ) {
        throw new Error(
            "فایل Backup باید با پسوند .db باشد."
        );
    }

    const integrity =
        runIntegrityCheckOnDatabase(
            absolutePath
        );

    if (!integrity.valid) {
        throw new Error(
            "فایل Backup از نظر Integrity یا Migration معتبر نیست."
        );
    }

    return integrity;
}


async function createSafetyBackup(
    {
        userId = null,
        reason = "pre_restore"
    } = {}
) {
    const timestamp =
        new Date()
            .toISOString()
            .replace(
                /[:.]/g,
                "-"
            );

    return createBackup({
        name:
            `safety_${reason}_${timestamp}`,

        userId
    });
}


function removeDatabaseSidecars() {
    for (
        const suffix of [
            "-wal",
            "-shm"
        ]
    ) {
        const file =
            `${DATABASE_FILE}${suffix}`;

        if (
            fs.existsSync(file)
        ) {
            fs.unlinkSync(
                file
            );
        }
    }
}


function restoreDatabaseFile(
    sourcePath
) {
    const source =
        path.resolve(
            sourcePath
        );

    const target =
        path.resolve(
            DATABASE_FILE
        );

    if (
        source.toLowerCase() ===
        target.toLowerCase()
    ) {
        throw new Error(
            "فایل Restore نمی‌تواند همان فایل دیتابیس فعلی باشد."
        );
    }

    const temporaryTarget =
        `${target}.restore-tmp`;

    const oldTarget =
        `${target}.restore-old`;

    try {
        if (
            fs.existsSync(
                temporaryTarget
            )
        ) {
            fs.unlinkSync(
                temporaryTarget
            );
        }

        if (
            fs.existsSync(
                oldTarget
            )
        ) {
            fs.unlinkSync(
                oldTarget
            );
        }

        fs.copyFileSync(
            source,
            temporaryTarget
        );

        fs.renameSync(
            target,
            oldTarget
        );

        try {
            fs.renameSync(
                temporaryTarget,
                target
            );
        } catch (
            moveError
        ) {
            if (
                fs.existsSync(
                    oldTarget
                ) &&
                !fs.existsSync(
                    target
                )
            ) {
                fs.renameSync(
                    oldTarget,
                    target
                );
            }

            throw moveError;
        }

        removeDatabaseSidecars();

        fs.unlinkSync(
            oldTarget
        );

    } catch (
        error
    ) {
        if (
            fs.existsSync(
                temporaryTarget
            )
        ) {
            try {
                fs.unlinkSync(
                    temporaryTarget
                );
            } catch {}
        }

        throw error;
    }
}


async function restoreBackup(
    {
        backupPath,
        userId = null
    }
) {
    const source =
        validateRestoreFile(
            backupPath
        );

    const absoluteSource =
        path.resolve(
            source
        );

    const validation =
        validateBackupFile(
            absoluteSource
        );

    const safetyBackup =
        await createSafetyBackup({
            userId,
            reason:
                "before_restore"
        });

    const db =
        createConnection();

    db.close();

    try {
        restoreDatabaseFile(
            absoluteSource
        );
    } catch (
        error
    ) {
        throw new Error(
            `Restore انجام نشد. Safety Backup: ${safetyBackup.path}. ${error.message}`
        );
    }

    const restoredIntegrity =
        runIntegrityCheckOnDatabase(
            DATABASE_FILE
        );

    if (
        !restoredIntegrity.valid
    ) {
        try {
            restoreDatabaseFile(
                safetyBackup.path
            );
        } catch {}

        throw new Error(
            `Integrity بعد از Restore معتبر نیست. Safety Backup: ${safetyBackup.path}`
        );
    }

    const finalDb =
        createConnection();

    try {
        const transaction =
            finalDb.transaction(
                () => {
                    createAuditLogInTransaction(
                        finalDb,
                        {
                            user_id:
                                userId,

                            module:
                                "backup",

                            action:
                                "RESTORE_BACKUP",

                            record_id:
                                null,

                            before_data:
                                JSON.stringify({
                                    safety_backup:
                                        safetyBackup.path
                                }),

                            after_data:
                                JSON.stringify({
                                    restored_file:
                                        absoluteSource,

                                    migration_version:
                                        validation.migrationVersion
                                })
                        }
                    );
                }
            );

        transaction();

    } finally {
        finalDb.close();
    }

    return {
        restored:
            true,

        source:
            absoluteSource,

        safetyBackup:
            safetyBackup.path,

        migrationVersion:
            restoredIntegrity.migrationVersion,

        integrityOk:
            restoredIntegrity.integrityOk,

        foreignKeysOk:
            restoredIntegrity.foreignKeysOk
    };
}


function checkDatabaseIntegrity() {
    return runIntegrityCheckOnDatabase(
        DATABASE_FILE
    );
}


function getBackupDirectory() {
    ensureBackupDirectory();

    return BACKUP_DIR;
}


function listBackups() {
    ensureBackupDirectory();

    return fs
        .readdirSync(
            BACKUP_DIR
        )
        .filter(
            file =>
                path.extname(
                    file
                ).toLowerCase() ===
                ".db"
        )
        .map(
            file => {
                const fullPath =
                    path.join(
                        BACKUP_DIR,
                        file
                    );

                const stat =
                    fs.statSync(
                        fullPath
                    );

                return {
                    fileName:
                        file,

                    path:
                        fullPath,

                    size:
                        stat.size,

                    createdAt:
                        stat.birthtime.toISOString(),

                    modifiedAt:
                        stat.mtime.toISOString()
                };
            }
        )
        .sort(
            (
                a,
                b
            ) =>
                new Date(
                    b.modifiedAt
                ) -
                new Date(
                    a.modifiedAt
                )
        );
}


module.exports = {
    BACKUP_DIR,

    createBackup,
    validateBackupFile,
    createSafetyBackup,
    restoreBackup,
    checkDatabaseIntegrity,
    getBackupDirectory,
    listBackups
};