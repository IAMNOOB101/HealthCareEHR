import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('./src/.env') });

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host:    process.env.DB_HOST,
        port:    process.env.DB_PORT || 5432,
        dialect: process.env.DB_DIALECT || "postgres",
        logging: false
    }
);

(async () => {
    try {
        await sequelize.authenticate();
        console.log("Connected to DB!");
        await sequelize.query("ALTER TYPE enum_imaging_orders_status ADD VALUE IF NOT EXISTS 'Rejected';");
        console.log("Added Rejected to enum_imaging_orders_status");
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
})();
