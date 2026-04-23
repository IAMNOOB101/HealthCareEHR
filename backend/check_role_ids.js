import { Role } from "./src/models/index.js";
import { sequelize } from "./src/config/database.js";

async function checkRoleIds() {
    try {
        await sequelize.authenticate();
        const roles = await Role.findAll();
        console.log("Roles in DB:");
        roles.forEach(r => console.log(`- ID: ${r.id}, Role: ${r.roleName}`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRoleIds();
