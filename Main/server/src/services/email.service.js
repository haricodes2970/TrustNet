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

async function sendOtpVerificationEmail({ to, otp, expiresInMinutes }) {
  await sendEmail({
    to,
    subject: "Verify your TrustNet email address",
    text: `Your TrustNet email verification code is: ${otp}\n\nThis code expires in ${expiresInMinutes} minutes. If you did not create a TrustNet account, you can ignore this email.`,
    html: `<p>Your TrustNet email verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${otp}</p><p>This code expires in ${expiresInMinutes} minutes. If you did not create a TrustNet account, you can ignore this email.</p>`,
  });
}

async function sendVerificationSubmittedEmail({ to }) {
  await sendEmail({
    to,
    subject: "Your TrustNet verification is under review",
    text: "We've received your verification documents. Our team will review them and notify you of the outcome by email.",
    html: "<p>We've received your verification documents. Our team will review them and notify you of the outcome by email.</p>",
  });
}

async function sendVerificationApprovedEmail({ to }) {
  await sendEmail({
    to,
    subject: "Your TrustNet verification was approved",
    text: "Your account verification has been approved. You now have full access to TrustNet.",
    html: "<p>Your account verification has been approved. You now have full access to TrustNet.</p>",
  });
}

async function sendVerificationRejectedEmail({ to, reason }) {
  const reasonLine = reason ? `Reason: ${reason}` : "";
  await sendEmail({
    to,
    subject: "Your TrustNet verification was rejected",
    text: `Your account verification has been rejected. ${reasonLine}`,
    html: `<p>Your account verification has been rejected.</p>${reason ? `<p>Reason: ${reason}</p>` : ""}`,
  });
}

async function sendVerificationResubmissionEmail({ to, reason }) {
  const reasonLine = reason ? `Reason: ${reason}` : "";
  await sendEmail({
    to,
    subject: "Action needed: resubmit your TrustNet verification documents",
    text: `An admin has requested that you resubmit your verification documents. ${reasonLine}`,
    html: `<p>An admin has requested that you resubmit your verification documents.</p>${reason ? `<p>Reason: ${reason}</p>` : ""}`,
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendEmail,
  sendOtpVerificationEmail,
  sendVerificationSubmittedEmail,
  sendVerificationApprovedEmail,
  sendVerificationRejectedEmail,
  sendVerificationResubmissionEmail,
};
