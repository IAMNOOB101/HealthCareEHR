import bcrypt from "bcryptjs";
import { User, Role } from "./src/models/index.js";
import { sequelize } from "./src/config/database.js";

// Defined credentials for easy recognition
const credentials = [
    { 
        roleName: "Admin", 
        username: "admin123", 
        password: "admin123",
        description: "Main System Administrator" 
    },
    { 
        roleName: "Doctor", 
        username: "dr.anmolsachar", 
        password: "dr.anmolsachar",
        description: "Primary Doctor Login" 
    },
    { 
        roleName: "Patient", 
        username: "johnwick", 
        password: "12345678",
        description: "Test Patient Login" 
    }
];

async function seedCredentials() {
    try {
        await sequelize.authenticate();
        console.log("Database connected. Starting credential injection...\n");

        for (const cred of credentials) {
            // 1. Fetch or Create the exact role ID securely
            const [role] = await Role.findOrCreate({ 
                where: { roleName: cred.roleName },
                defaults: { description: `${cred.roleName} System Role` }
            });
            
            // 2. Safely hash the plaintext password using bcrypt
            const passwordHash = await bcrypt.hash(cred.password, 10);

            // 3. Inject or Update the record in the auth table
            const [user, created] = await User.findOrCreate({
                where: { username: cred.username },
                defaults: {
                    passwordHash: passwordHash,
                    roleId: role.id,
                    isActive: true
                }
            });

            if (!created) {
                // If it exists, force update the password to match this script explicitly
                await user.update({ passwordHash: passwordHash, roleId: role.id, isActive: true });
                console.log(`[UPDATED] ${cred.roleName}: ${cred.username} (Password synced to: ${cred.password})`);
            } else {
                console.log(`[CREATED] ${cred.roleName}: ${cred.username} (Password set to: ${cred.password})`);
            }
        }

        console.log("\nSuccess! Default credentials seeded properly.");
        process.exit(0);

    } catch (err) {
        console.error("\n[ERROR] Failed to seed credentials:", err);
        process.exit(1);
    }
}

seedCredentials();
