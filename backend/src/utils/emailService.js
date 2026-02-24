const nodemailer = require("nodemailer");

const smtpHost = String(process.env.SMTP_HOST || "").trim();
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = String(process.env.SMTP_USER || "").trim();
const smtpPass = String(process.env.SMTP_PASS || "").trim();
const smtpFrom = String(process.env.SMTP_FROM || smtpUser || "noreply@rusheelums.local").trim();
const smtpSecure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || smtpPort === 465;
const smtpEnabled = Boolean(smtpHost && smtpFrom);

let transporter = null;

const getTransporter = () => {
  if (!smtpEnabled) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: smtpUser || smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  });
  return transporter;
};

const sendOtpEmail = async ({
  to,
  name = "",
  code,
  subject = "Rusheel UMS Verification Code",
  purpose = "verification",
  expiresInMinutes = 10,
}) => {
  const recipient = String(to || "").trim();
  if (!recipient) {
    throw new Error("Missing recipient email address.");
  }

  const text = [
    `Hello ${name || "User"},`,
    "",
    `A ${purpose} was requested for your Rusheel UMS account.`,
    `Verification code: ${code}`,
    `This code expires in ${expiresInMinutes} minutes.`,
    "",
    "If you did not request this, please ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <p>Hello ${name || "User"},</p>
      <p>A ${purpose} was requested for your Rusheel UMS account.</p>
      <p style="font-size:20px;font-weight:700;letter-spacing:2px;">${code}</p>
      <p>This code expires in ${expiresInMinutes} minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;

  if (!smtpEnabled) {
    // eslint-disable-next-line no-console
    console.log(`[EMAIL_FALLBACK] ${purpose} code for ${recipient}: ${code}`);
    return { delivered: false, channel: "console" };
  }

  const transport = getTransporter();
  await transport.sendMail({
    from: smtpFrom,
    to: recipient,
    subject,
    text,
    html,
  });

  return { delivered: true, channel: "smtp" };
};

const sendPasswordChangeVerificationEmail = async (payload) =>
  sendOtpEmail({
    ...payload,
    subject: "Rusheel UMS Password Change Verification",
    purpose: "password change verification",
  });

const sendEmailVerificationOtp = async (payload) =>
  sendOtpEmail({
    ...payload,
    subject: "Rusheel UMS Email Verification",
    purpose: "email verification",
  });

module.exports = { sendPasswordChangeVerificationEmail, sendEmailVerificationOtp };
