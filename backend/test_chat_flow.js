import { connectDB } from './src/config/database.js';
import { User, Role, Doctor, Patient, PortalUser, Appointment } from './src/models/index.js';
import { isEligiblePair } from './src/controllers/chat.controller.js';
import bcrypt from 'bcryptjs';

const runTest = async () => {
