const nodemailer = require('nodemailer');
const twilio = require('twilio');

// ── Gmail (Nodemailer) Setup ──────────────────────────────────────────────────
// Ensure valid credentials before creating transporter or it will error
const isEmailEnabled = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
const isTwilioEnabled = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);

let mailTransporter = null;
if (isEmailEnabled) {
  mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ── Twilio (SMS) Setup ────────────────────────────────────────────────────────
let twilioClient = null;
if (isTwilioEnabled) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * Sends an email via Gmail
 */
const sendEmail = async (to, subject, htmlContent) => {
  if (!to) return;
  if (!isEmailEnabled) {
    console.log(`\n📧 [SIMULATION] EMAIL NOTIFICATION TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT: ${htmlContent} \n`);
    return;
  }
  
  try {
    const info = await mailTransporter.sendMail({
      from: `"CitiVoice Admin" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
};

/**
 * Formats a phone number to E.164 international format.
 * Converts Philippine local numbers (09XX) → +639XX
 */
const formatPhoneE164 = (phone) => {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-()]/g, ''); // strip spaces, dashes, parens
  // Philippine local format: 09XXXXXXXXX → +639XXXXXXXXX
  if (cleaned.startsWith('09') && cleaned.length === 11) {
    return '+63' + cleaned.substring(1);
  }
  // Already has country code but missing +
  if (cleaned.startsWith('63') && cleaned.length === 12) {
    return '+' + cleaned;
  }
  // Already in E.164
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  return cleaned;
};

/**
 * Sends an SMS text message via Twilio
 */
const sendSMS = async (to, messageBody) => {
  if (!to) return;
  const formattedTo = formatPhoneE164(to);
  if (!formattedTo) return;

  if (!isTwilioEnabled) {
    console.log(`\n📱 [SIMULATION] SMS NOTIFICATION TO: ${formattedTo}`);
    console.log(`MESSAGE: ${messageBody} \n`);
    return;
  }
  
  try {
    const message = await twilioClient.messages.create({
      body: messageBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedTo,
    });
    console.log(`📱 SMS sent to ${formattedTo}: ${message.sid}`);
  } catch (error) {
    console.error('❌ Failed to send SMS:', error);
  }
};


/**
 * Simple HTML escaping to prevent injection in emails
 */
const escapeHTML = (str) => {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
};

/**
 * Unified command to fire both Email and SMS to a user's known contacts
 * @param {Object} user 
 * @param {String} subject 
 * @param {String} message 
 */
const notifyUser = async (user, subject, message) => {
  if (!user) return;
  
  const safeName = escapeHTML(user.name || 'Citizen');
  const safeMsg  = escapeHTML(message);

  // Format HTML nicely for emails
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8; color: #333; max-width: 600px; margin: auto; border-radius: 8px;">
      <h2 style="color: #1A6BFF;">CitiVoice Update</h2>
      <p style="font-size: 16px; line-height: 1.5;">Hello ${safeName},</p>
      <p style="font-size: 16px; line-height: 1.5;">${safeMsg}</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
      <p style="font-size: 12px; color: #888;">This is an automated message from the CitiVoice Platform.</p>
    </div>
  `;

  // Determine user contacts (handling cases where they might be empty)
  const emailPromise = user.email ? sendEmail(user.email, subject, htmlBody) : Promise.resolve();
  const phonePromise = user.phone ? sendSMS(user.phone, `CitiVoice: ${message}`) : Promise.resolve();

  // Run efficiently in parallel
  await Promise.all([emailPromise, phonePromise]);
};

module.exports = {
  sendEmail,
  sendSMS,
  notifyUser
};
