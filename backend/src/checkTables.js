// Quick table verification script — run with: node src/checkTables.js
import 'dotenv/config';
import { Sequelize } from 'sequelize';

const s = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    { host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT) || 5432, dialect: 'postgres', logging: false }
);

try {
    await s.authenticate();
    const [results] = await s.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");

    console.log('\n=== ALL TABLES IN DATABASE ===');
    results.forEach(r => console.log('  ', r.tablename));

    const phase1Tables = [
        'imaging_orders',
        'medication_administration_records',
        'medication_reconciliations'
    ];

    console.log('\n=== PHASE 1 TABLE VERIFICATION ===');
    let allFound = true;
    phase1Tables.forEach(t => {
        const found = results.some(r => r.tablename === t);
        console.log(found ? `  ✅ ${t}` : `  ❌ MISSING: ${t}`);
        if (!found) allFound = false;
    });

    console.log(allFound ? '\n✅ LEVEL 2 TABLE CHECK — PASSED' : '\n❌ LEVEL 2 TABLE CHECK — SOME TABLES MISSING');
} catch (e) {
    console.error('❌ Error:', e.message);
} finally {
    await s.close();
}
