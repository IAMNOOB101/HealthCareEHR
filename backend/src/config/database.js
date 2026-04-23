import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host:    process.env.DB_HOST,
        port:    process.env.DB_PORT || 5432,
        dialect: process.env.DB_DIALECT || "postgres",
        logging: false,
        pool: {
            max:     10,
            min:     0,
            acquire: 30000,
            idle:    10000
        }
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(" PostgreSQL connected successfully");

        // Load all model associations before sync
        await import("../models/index.js");
        await sequelize.sync({ alter: true });
        console.log(" All tables synced successfully");

        // Seed default roles
        const { seedRoles } = await import("./seeder.js");
        await seedRoles();

    } catch (error) {
        console.error(" Database connection failed:");
        console.error("   Message:", error.message || "(no message)");
        console.error("   Code:   ", error.original?.code || error.code);
        console.error("   Detail: ", error.original?.detail || "(none)");
        process.exit(1);
    }
};

export { sequelize, connectDB };