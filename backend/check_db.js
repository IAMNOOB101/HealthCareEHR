import { sequelize } from './src/config/database.js';

async function checkEnum() {
  try {
    const [results] = await sequelize.query("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid WHERE typname = 'enum_prescriptions_status'");
    console.log('Current ENUM values in DB:', results.map(r => r.enumlabel));
  } catch (err) {
    console.error('Error checking enum:', err);
  } finally {
    await sequelize.close();
  }
}

checkEnum();
