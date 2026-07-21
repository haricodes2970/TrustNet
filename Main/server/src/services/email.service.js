const nodemailer = require("nodemailer");
const env = require("../config/env");

function createTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new Error("Password reset email is not configured.");
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "Reset your TrustNet password",
    text: `You requested a password reset. Reset your password using this link: ${resetUrl}\n\nThis link expires in one hour. If you did not request this, you can ignore this email.`,
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>`,
  });
}

async function sendEmail({ to, subject, text, html }) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendPasswordResetEmail, sendEmail };
