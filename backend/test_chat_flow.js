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
    });
    
    console.log(`Created new Doctor: ${newDoctor.firstName} ${newDoctor.lastName} (ID: ${newDoctor.id})`);

    // 2. Create a Patient & PortalUser
    const newPatient = await Patient.create({
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: '1990-01-01',
        gender: 'Other',
        contactInformation: { phone: '1234567890', address: '123 Test St' }
    });
    
    const patientEmail = 'testpatient_' + Date.now() + '@example.com';
    const newPortalUser = await PortalUser.create({
        patientId: newPatient.id,
        email: patientEmail,
        passwordHash: pwd,
        isActive: true,
        isVerified: true
    });
    
    console.log(`Created new Patient: ${newPatient.firstName} ${newPatient.lastName} (ID: ${newPatient.id})`);

    // 3. Check chatting status BEFORE appointment
    const eligibleBefore = await isEligiblePair(newPatient.id, newDoctor.id);
    console.log(`Chat Eligible BEFORE appointment: ${eligibleBefore}`);
    
    // 4. Create an Appointment (Completed)
    const newAppointment = await Appointment.create({
        patientId: newPatient.id,
        doctorId: newDoctor.id,
        appointmentDate: new Date(), // Today
        appointmentType: 'Consultation',
        status: 'Completed',
        notes: 'Test completed'
    });
    
    console.log(`Scheduled and Completed Appointment (ID: ${newAppointment.id})`);

    // 5. Check chatting status AFTER appointment
    const eligibleAfter = await isEligiblePair(newPatient.id, newDoctor.id);
    console.log(`Chat Eligible AFTER appointment: ${eligibleAfter}`);

    // Let's also check expiration logic (simulating an appointment 35 days ago)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 35);
    
    await newAppointment.update({ appointmentDate: oldDate });
    const eligibleExpired = await isEligiblePair(newPatient.id, newDoctor.id);
    console.log(`Chat Eligible AFTER changing appointment to 35 days ago: ${eligibleExpired}`);

    console.log("\n--- TEST COMPLETE ---");
    console.log(`Doctor Credentials -> Email: ${doctorEmail}, Password: password123`);
    console.log(`Patient Portal Credentials -> Email: ${patientEmail}, Password: password123`);
    
    process.exit(0);
};

runTest().catch(err => {
