import { Role } from "../models/index.js";

const DEFAULT_ROLES = [
    { roleName: "Admin",          description: "Full system access" },
    { roleName: "Doctor",         description: "Clinical documentation and orders" },
    { roleName: "Nurse",          description: "Medication administration and notes" },
    { roleName: "Pharmacist",     description: "Medication management" },
    { roleName: "Lab Technician", description: "Lab orders and results" },
    { roleName: "Receptionist",   description: "Patient registration and appointments" }
];

/**
 * Seeds the roles table with default roles if they don't already exist.
 * Uses findOrCreate so it's idempotent — safe to call on every startup.
 */
const seedRoles = async () => {
    try {
        for (const role of DEFAULT_ROLES) {
            await Role.findOrCreate({
                where: { roleName: role.roleName },
                defaults: role
            });
        }
        console.log("Roles seeded successfully");
    } catch (err) {
        console.error("Role seeding failed:", err.message);
    }
};

export { seedRoles };
