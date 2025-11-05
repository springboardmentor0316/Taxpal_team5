const nodemailer = require('nodemailer');

let cachedTransporter;

const createTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const {
    EMAIL_SERVICE,
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_SECURE,
    EMAIL_USER,
    EMAIL_PASS,
  } = process.env;

  const options = {};

  if (EMAIL_SERVICE) {
    options.service = EMAIL_SERVICE;
  } else if (EMAIL_HOST) {
    options.host = EMAIL_HOST;
    options.port = EMAIL_PORT ? Number(EMAIL_PORT) : 587;
    options.secure = EMAIL_SECURE === 'true' || options.port === 465;
  } else {
    throw new Error('Email configuration is missing. Set EMAIL_SERVICE or EMAIL_HOST.');
  }

  if (EMAIL_USER && EMAIL_PASS) {
    options.auth = {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    };
  }

  cachedTransporter = nodemailer.createTransport(options);

  return cachedTransporter;
};

const sendOtpEmail = async ({ to, code, expiresInMinutes = 15 }) => {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  if (!from) {
    throw new Error('EMAIL_FROM or EMAIL_USER must be defined');
  }

  const mailOptions = {
    from,
    to,
    subject: 'Your TaxPal password reset code',
    text: `Your one-time password is ${code}. It expires in ${expiresInMinutes} minutes.`,
    html: `<p>Use the following one-time password to reset your TaxPal account password:</p>
<p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
<p>This code expires in ${expiresInMinutes} minutes. If you did not request a password reset, please ignore this email.</p>`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendOtpEmail,
};
