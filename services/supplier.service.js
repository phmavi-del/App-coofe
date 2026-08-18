const {
    createConnection
} = require("../core/connection");

const {
    validateSupplierInput
} = require("../validation/supplier.validation");

const {
    getSupplierById,
    getSupplierByCode,
    getSupplierByPhone,
    insertSupplier
} = require("../repositories/supplier.repository");


function assertCodeAvailable(
    db,
    code
) {
    const existing =
        getSupplierByCode(
            db,
            code
        );

    if (existing) {
        throw new Error(
            "کد تأمین‌کننده قبلاً ثبت شده است."
        );
    }
}


function assertPhoneAvailable(
    db,
    phone
) {
    if (!phone) {
        return;
    }

    const existing =
        getSupplierByPhone(
            db,
            phone
        );

    if (existing) {
        throw new Error(
            "شماره تلفن تأمین‌کننده قبلاً ثبت شده است."
        );
    }
}


function createSupplier(
    input
) {
    const data =
        validateSupplierInput(
            input
        );

    const db =
        createConnection();

    try {

        const transaction =
            db.transaction(() => {

                assertCodeAvailable(
                    db,
                    data.code
                );

                assertPhoneAvailable(
                    db,
                    data.phone
                );

                const supplierId =
                    insertSupplier(
                        db,
                        data
                    );

                return supplierId;
            });


        const supplierId =
            transaction();


        return getSupplier(
            supplierId
        );

    } finally {

        db.close();
    }
}


function getSupplier(
    supplierId
) {
    const db =
        createConnection();

    try {

        return getSupplierById(
            db,
            supplierId
        );

    } finally {

        db.close();
    }
}


module.exports = {
    createSupplier,
    getSupplier
};