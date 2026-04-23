import { connectDB } from './src/config/database.js';
import EncounterNote from './src/models/encounterNote.model.js';
import LabOrder from './src/models/labOrder.model.js';
import ImagingOrder from './src/models/imagingOrder.model.js';

connectDB().then(async () => {
    try {
        const labs = await LabOrder.findAll({ limit: 1, order: [['createdAt', 'DESC']] });
        console.log('--- DB Data ---');
        console.dir(labs.map(l => l.toJSON()), { depth: null });
    } catch (e) {
        console.error('ERROR:', e.message);
    }
    process.exit();
});
