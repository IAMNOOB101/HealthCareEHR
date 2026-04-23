/**
 * Validates essential environment variables at startup.
 * Prevents the application from running in an invalid state.
 */
export const validateEnv = () => {
    const requiredVars = [
        'PORT',
        'DB_HOST',
        'DB_PORT',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'JWT_SECRET'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        console.error('\n❌ CRITICAL ERROR: Missing required environment variables:');
        missing.forEach(v => console.error(`   - ${v}`));
        console.error('The server refuse to start without these configurations.\n');
        process.exit(1);
    }

    // Secondary validation: JWT_SECRET length
    if (process.env.JWT_SECRET.length < 32) {
        console.warn('\n⚠️  SECURITY WARNING: JWT_SECRET is too short (< 32 chars). Consider increasing entropy in production.\n');
    }

    // Secondary validation: DB_PORT
    if (isNaN(parseInt(process.env.DB_PORT))) {
        console.error(`\n❌ CONFIG ERROR: DB_PORT must be a number (got: ${process.env.DB_PORT})\n`);
        process.exit(1);
    }

    console.log('✅ Environment Validation: PASSED');
};
