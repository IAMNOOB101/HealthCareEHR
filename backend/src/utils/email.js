import nodemailer from 'nodemailer';
import 'dotenv/config';

/**
 * Nodemailer transporter using Gmail SMTP.
 * Requires in .env:
 *   EMAIL_USER  — your Gmail address (e.g. yourapp@gmail.com)
 *   EMAIL_PASS  — Gmail App Password (NOT your normal password)
 *   EMAIL_FROM  — Display name + address (e.g. "Healthcare EHR <yourapp@gmail.com>")
 *
 * To create a Gmail App Password:
 *   1. Enable 2-Step Verification on your Google Account
 *   2. Go to Google Account → Security → App Passwords
 *   3. Generate a password for "Mail" → use that as EMAIL_PASS
 */
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Send an email.
 * @param {object} options
 * @param {string} options.to       Recipient email address
 * @param {string} options.subject  Email subject line
 * @param {string} options.html     HTML body
 * @param {string} [options.text]   Plain-text fallback (optional)
 */
export const sendEmail = async ({ to, subject, html, text }) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM || `"Healthcare EHR" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // strip HTML for plain-text fallback
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (err) {
        console.error('❌ Email send failed:', err.message);
        throw err;
    }
};

/**
 * Send an OTP email for password reset.
 * @param {string} to       Recipient email / username label
 * @param {string} otp      6-digit OTP code
 * @param {string} userType 'staff' | 'patient'
 */
export const sendPasswordResetOtp = async (to, otp, userType = 'staff') => {
    const label = userType === 'patient' ? 'Patient Portal' : 'Healthcare EHR Staff';
    await sendEmail({
        to,
        subject: `${label} — Password Reset OTP`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>You requested a password reset for your <strong>${label}</strong> account.</p>
            <div style="background: #f1f5f9; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">Your one-time OTP code (valid for 15 minutes):</p>
                <span style="font-size: 40px; font-weight: 700; letter-spacing: 8px; color: #2563eb;">${otp}</span>
            </div>
            <p style="color: #64748b; font-size: 14px;">
                If you did not request this, please ignore this email. Your password will not change.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px;">Healthcare EHR System — Confidential</p>
        </div>
        `,
    });
};
