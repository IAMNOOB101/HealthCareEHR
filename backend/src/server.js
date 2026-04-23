import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';

import { sanitizerMiddleware } from './middlewares/sanitizer.middleware.js';

import { connectDB } from "./config/database.js";

import patientRoutes from './routes/patient.route.js';
import appointmentRoutes from './routes/appointment.route.js';
import authRoutes from "./routes/auth.route.js";
import roleRoutes from "./routes/role.route.js";
import doctorRoutes from "./routes/doctor.route.js";
import medicationRoutes from "./routes/medication.route.js";
import medicalHistoryRoutes from './routes/medicalHistory.route.js';
import encounterNoteRoutes from './routes/encounterNote.route.js';
import prescriptionRoutes from "./routes/prescription.route.js";
import labOrderRoutes from './routes/labOrder.route.js';
import labResultRoutes from './routes/labResult.route.js';
import progressNoteRoutes from './routes/progressNote.route.js';
import documentTemplateRoutes from './routes/documentTemplate.route.js';
import imagingOrderRoutes from './routes/imagingOrder.route.js';
import marRoutes from './routes/mar.route.js';
import medReconciliationRoutes from './routes/medicationReconciliation.route.js';
import auditLogRoutes from './routes/auditLog.route.js';

// Portal Routes
import authPortalRoutes from "./routes/portal/auth.portal.route.js";
import appointmentsPortalRoutes from "./routes/portal/appointments.portal.route.js";
import recordsPortalRoutes from "./routes/portal/records.portal.route.js";
import prescriptionsPortalRoutes from "./routes/portal/prescriptions.portal.route.js";
import labResultsPortalRoutes from "./routes/portal/labResults.portal.route.js";
import messagesPortalRoutes from "./routes/portal/messages.portal.route.js";
import preferencesPortalRoutes from "./routes/portal/preferences.portal.route.js";

import GlobalTaskQueue from './services/queue.service.js';

import errorHandler from "./middlewares/errorHandler.middleware.js";
import { auditLogMiddleware } from "./middlewares/auditLog.middleware.js";
import { authLimiter, portalLimiter } from "./middlewares/rateLimiter.middleware.js";
import { validateEnv } from "./utils/startupGuard.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: "*", credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(sanitizerMiddleware);

// ── Rate Limiting (Security via 4.6) ───────────────────────────────────────────
app.use("/portal", portalLimiter);          // Broad limiter on all portal routes
app.use("/portal/auth/login", authLimiter); // Strict brute-force protection
app.use("/portal/auth/register", authLimiter);
app.use("/portal/auth/verify", authLimiter); // Protect against token enumeration
app.use("/api/auth/login", authLimiter);    // Apply strict protection to staff login too

// ── Global Audit Logger ────────────────────────────────────────────────────────
app.use(auditLogMiddleware);

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'EHR System API is Running',
        database: 'PostgreSQL (Sequelize)',
        version: '2.0.0',
        time: new Date().toISOString()
    });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/medical-history', medicalHistoryRoutes);
app.use('/api/encounters', encounterNoteRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/lab-orders', labOrderRoutes);
app.use('/api/lab-results', labResultRoutes);
app.use('/api/progress-notes', progressNoteRoutes);
app.use('/api/templates', documentTemplateRoutes);
app.use('/api/imaging-orders', imagingOrderRoutes);
app.use('/api/mar', marRoutes);
app.use('/api/medication-reconciliation', medReconciliationRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// ── PORTAL ROUTES (Phase 4) ────────────────────────────────────────────────────
app.use('/portal/auth', authPortalRoutes);
app.use('/portal/appointments', appointmentsPortalRoutes);
app.use('/portal/records', recordsPortalRoutes);
app.use('/portal/prescriptions', prescriptionsPortalRoutes);
app.use('/portal/lab-results', labResultsPortalRoutes);
app.use('/portal/messages', messagesPortalRoutes);
app.use('/portal/preferences', preferencesPortalRoutes);

// ── Error Handlers ─────────────────────────────────────────────────────────────
app.use(errorHandler);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`
    });
});

app.use((err, req, res, next) => {
    console.error('Server Error:', err.message);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ── Start Server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    validateEnv();
    await connectDB();

    const server = app.listen(PORT, () => {
        console.log('\n═══════════════════════════════════════════════════');
        console.log(`  EHR System API  v2.0.0 (Sequelize + PostgreSQL)`);
        console.log(`  Running on http://localhost:${PORT}`);
        console.log('═══════════════════════════════════════════════════');
    });

    // ── Graceful Shutdown (Task 5) ────────────────────────────────────────────────
    process.on('SIGTERM', () => shutdown(server));
    process.on('SIGINT', () => shutdown(server));
};

const shutdown = async (server) => {
    console.log('\n🛑 Graceful shutdown initiated...');

    // 1. Drains the task queue (Wait for pharmacy/lab syncs to finish)
    await GlobalTaskQueue.waitForDrain();

    // 2. Close the HTTP server
    server.close(() => {
        console.log('  HTTP server closed.');
        process.exit(0);
    });
};

startServer();