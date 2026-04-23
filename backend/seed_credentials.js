import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sequelize } from './src/config/database.js';
import { Role, User } from './src/models/index.js';

async function seedAdminOnly() {
    try {
        await sequelize.authenticate();
        console.log("Database connected. Seeding Admin only...");

        // Ensure roles exist (minimal set)
        const roles = [
            { roleName: 'Admin', description: 'Full system access' },
            { roleName: 'Doctor', description: 'Clinical access' },
            { roleName: 'Nurse', description: 'Clinical support' },
            { roleName: 'Pharmacist', description: 'Medication management' },
            { roleName: 'Lab Technician', description: 'Lab order management' },
            { roleName: 'Receptionist', description: 'Appointment management' },
            { roleName: 'Patient', description: 'Patient portal access' }
        ];

        for (const r of roles) {
            await Role.findOrCreate({ where: { roleName: r.roleName }, defaults: r });
        }

        const adminRole = await Role.findOne({ where: { roleName: 'Admin' } });
        
        // Seed only Admin
        const adminUsername = "admin123";
        const adminPassword = "admin123";
        const hash = await bcrypt.hash(adminPassword, 10);

        const [user, created] = await User.findOrCreate({
            where: { username: adminUsername },
            defaults: {
                passwordHash: hash,
                roleId: adminRole.id,
                isActive: true
            }
        });

        if (!created) {
            await user.update({ passwordHash: hash, roleId: adminRole.id });
            console.log(`[UPDATED] Admin: ${adminUsername}`);
        } else {
            console.log(`[CREATED] Admin: ${adminUsername}`);
        }

        console.log("\nSuccess! Admin credentials seeded.");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
}

seedAdminOnly();
