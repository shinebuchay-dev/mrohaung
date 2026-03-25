const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: process.env.SMTP_PORT || 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    // 2) Define the email options
    const mailOptions = {
        from: `"MROHAUNG" <${process.env.SMTP_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
    };

    // 3) Actually send the email
    await transporter.sendEmail(mailOptions);
};

// Fixed the typo in the name and used the correct transporter method
const sendEmailFixed = async (options) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const mailOptions = {
        from: `"MROHAUNG Support" <${process.env.SMTP_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
    };

    return transporter.sendMail(mailOptions);
};

module.exports = sendEmailFixed;
