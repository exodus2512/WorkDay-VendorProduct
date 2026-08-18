import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

export function createTransporter() {
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const isSecure = port === 465;

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure: isSecure, // true for 465, false for 587 / other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

const transporter = createTransporter();

export const sendEmail = async ({ to, cc, subject, html }) => {
    try {
        const client = createTransporter();
        const mailOptions = {
            from: `"Contingent Workforce Tracker" <${process.env.SMTP_USER || 'no-reply@workforce.com'}>`,
            to,
            subject,
            html,
        };

        if (cc) {
            mailOptions.cc = cc;
        }

        const info = await client.sendMail(mailOptions);
        console.log('✉️ Email sent successfully: %s to %s', info.messageId, to);
        return info;
    } catch (error) {
        console.error('❌ Error sending email to', to, ':', error.message);
        throw error;
    }
};

export default transporter;