function validateJournalEntryInput(
    input
) {
    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new Error(
            "اطلاعات سند حسابداری معتبر نیست."
        );
    }

    const data = {
        entry_date:
            input.entry_date ||
            new Date()
                .toISOString()
                .slice(0, 19)
                .replace("T", " "),

        reference_type:
            input.reference_type ?? null,

        reference_id:
            input.reference_id ?? null,

        description:
            input.description ?? null,

        status:
            input.status || "posted",

        lines:
            Array.isArray(input.lines)
                ? input.lines
                : []
    };

    const errors = [];

    if (
        ![
            "draft",
            "posted",
            "void"
        ].includes(data.status)
    ) {
        errors.push(
            "وضعیت سند حسابداری معتبر نیست."
        );
    }

    if (data.lines.length < 2) {
        errors.push(
            "سند حسابداری باید حداقل دو ردیف داشته باشد."
        );
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (
        let index = 0;
        index < data.lines.length;
        index++
    ) {
        const line = data.lines[index];

        const accountId =
            Number(line.account_id);

        const debit =
            Number(line.debit ?? 0);

        const credit =
            Number(line.credit ?? 0);

        if (
            !Number.isInteger(accountId) ||
            accountId <= 0
        ) {
            errors.push(
                `حساب ردیف ${index + 1} معتبر نیست.`
            );
        }

        if (
            !Number.isInteger(debit) ||
            debit < 0
        ) {
            errors.push(
                `بدهکار ردیف ${index + 1} معتبر نیست.`
            );
        }

        if (
            !Number.isInteger(credit) ||
            credit < 0
        ) {
            errors.push(
                `بستانکار ردیف ${index + 1} معتبر نیست.`
            );
        }

        if (
            debit > 0 &&
            credit > 0
        ) {
            errors.push(
                `یک ردیف نمی‌تواند هم‌زمان بدهکار و بستانکار باشد؛ ردیف ${index + 1}.`
            );
        }

        if (
            debit === 0 &&
            credit === 0
        ) {
            errors.push(
                `ردیف ${index + 1} باید مبلغ داشته باشد.`
            );
        }

        totalDebit += debit;
        totalCredit += credit;
    }

    if (
        totalDebit !== totalCredit
    ) {
        errors.push(
            `جمع بدهکار و بستانکار برابر نیست. بدهکار: ${totalDebit}، بستانکار: ${totalCredit}`
        );
    }

    if (errors.length > 0) {
        const error = new Error(
            errors.join("\n")
        );

        error.code =
            "JOURNAL_VALIDATION_ERROR";

        error.details = errors;

        throw error;
    }

    return {
        ...data,
        totalDebit,
        totalCredit
    };
}


module.exports = {
    validateJournalEntryInput
};