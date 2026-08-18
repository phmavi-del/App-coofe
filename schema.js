const {
    createConnection
} = require("./core/connection");

const {
    createCoreSchema
} = require("./schema_core");

const {
    createFinancialSchema
} = require("./schema_financial");

const {
    createInventorySchema
} = require("./schema_inventory");

const {
    createCustomerSchema
} = require("./schema_customers");

const {
    createUserSchema
} = require("./schema_users");

const {
    runMigrations
} = require("./core/migrations");


const {
    createRecipeSchema
} = require("./schema_recipe");


const {
    createSalesSchema
} = require("./schema_sales");


const {
    createPurchasingSchema
} = require("./schema_purchasing");



function initializeSchema() {

    const db = createConnection();

    try {

        createCoreSchema(db);

        createFinancialSchema(db);

        createInventorySchema(db);

        createCustomerSchema(db);

        createUserSchema(db);

        createRecipeSchema(db);
       
        createPurchasingSchema(db);

        createSalesSchema(db);

        runMigrations(db);

        console.log(
            "Database schema created successfully."
        );

    } finally {

        db.close();

    }
}


if (require.main === module) {
    initializeSchema();
}


module.exports = {
    initializeSchema
};