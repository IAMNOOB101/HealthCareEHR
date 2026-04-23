import { sequelize } from './src/config/database.js';

async function checkOrders() {
  try {
    const [lab] = await sequelize.query("SELECT count(*) as count FROM lab_orders");
    const [img] = await sequelize.query("SELECT count(*) as count FROM imaging_orders");
    const [labPending] = await sequelize.query("SELECT count(*) as count FROM lab_orders WHERE status != 'Completed'");
    const [imgPending] = await sequelize.query("SELECT count(*) as count FROM imaging_orders WHERE status != 'Completed'");
    
    console.log('Lab Orders Total:', lab[0].count);
    console.log('Imaging Orders Total:', img[0].count);
    console.log('Lab Orders Pending:', labPending[0].count);
    console.log('Imaging Orders Pending:', imgPending[0].count);
    
    // Check one sample status
    const [sample] = await sequelize.query("SELECT status FROM lab_orders LIMIT 1");
    if (sample.length > 0) console.log('Sample Lab Order Status:', sample[0].status);

  } catch (err) {
    console.error('Error checking orders:', err);
  } finally {
    await sequelize.close();
  }
}

checkOrders();
