import { connectDB } from './src/config/database.js';
import { User, Role, Doctor, Patient, PortalUser, Appointment } from './src/models/index.js';
import { isEligiblePair } from './src/controllers/chat.controller.js';
import bcrypt from 'bcryptjs';

const runTest = async () => {
    await connectDB();
    
    console.log("Database connected. Starting test flow...");

    // 1. Create a Doctor User & Doctor profile
    const doctorRole = await Role.findOne({ where: { roleName: 'Doctor' }});
    const doctorEmail = 'testdoc_' + Date.now() + '@example.com';
    const pwd = await bcrypt.hash('password123', 10);
    
    const newDocUser = await User.create({
        username: doctorEmail,
        passwordHash: pwd,
        firstName: 'Test',
        lastName: 'Doc',
        roleId: doctorRole.id,
        isActive: true
    });
    
    const newDoctor = await Doctor.create({
        firstName: 'Test',
        lastName: 'Doc',
        specialization: 'Testing',
        department: 'QA',
        email: doctorEmail,
        licenseNumber: 'DOC' + Date.now(),
        isActive: true
