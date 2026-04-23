import { connectDB } from './src/config/database.js';
import Patient from './src/models/patient.model.js';

connectDB().then(async () => {
  try {
    const p = await Patient.findAll();
    console.log('Count:', p.length);
  } catch (e) {
    console.log('ERROR:', e.message);
  }
  process.exit();
});
