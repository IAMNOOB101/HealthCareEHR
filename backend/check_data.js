import { sequelize } from './src/config/database.js';

async function checkData() {
  try {
    const [results] = await sequelize.query("SELECT id, status FROM prescriptions WHERE status = 'Upcoming'");
    console.log('Prescriptions with Upcoming status:', results);
    
    const [counts] = await sequelize.query("SELECT count(*) as count FROM prescriptions");
    console.log('Total prescriptions in DB:', counts[0].count);
  } catch (err) {
    console.error('Error checking data:', err);
  } finally {
    await sequelize.close();
  }
}

checkData();
