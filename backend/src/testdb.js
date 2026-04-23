// Quick DB connection test — run with: node src/testdb.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const s = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host:    process.env.DB_HOST,
        port:    parseInt(process.env.DB_PORT) || 5432,
        dialect: process.env.DB_DIALECT || 'postgres',
        logging: false
    }
);

try {
    await s.authenticate();
    console.log('✅ DB connection OK');
    console.log(`   Host:     ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   User:     ${process.env.DB_USER}`);
} catch (e) {
    console.error('❌ DB connection FAILED');
    console.error('   Message:', e.message);
    console.error('   Code:   ', e.original?.code);
    console.error('   Detail: ', e.original?.detail);
} finally {
    await s.close();
}
