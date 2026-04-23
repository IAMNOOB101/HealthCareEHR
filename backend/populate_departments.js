import { connectDB, sequelize } from './src/config/database.js';
import { Doctor } from './src/models/index.js';

const populateDepartments = async () => {
    try {
        await connectDB();
        console.log('Searching for doctors with missing departments...');
        
        const doctors = await Doctor.findAll({ where: { department: null } });
        console.log(`Found ${doctors.length} doctors to update.`);

        for (const doc of doctors) {
            // For older records, we use their specialization as their default department
            // to fulfill the "past information visibility" requirement.
            let dept = doc.specialization;
            if (dept === 'General') dept = 'General Medicine';
            if (!dept) dept = 'General Practice';

            console.log(`Updating Dr. ${doc.firstName} ${doc.lastName}: ${dept}`);
            await doc.update({ department: dept });
        }

        console.log('✅ Department population complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

populateDepartments();
