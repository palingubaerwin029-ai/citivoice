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
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; background: linear-gradient(135deg, #f0f7ff 0%, #e6f0ff 100%); color: #333; max-width: 600px; margin: auto; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center;">
      <div style="background-color: #1A6BFF; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">📢 CitiVoice Update</h2>
      </div>
      <p style="font-size: 18px; color: #444; font-weight: 500; text-align: left;">Hello ${safeName}, 👋</p>
      <div style="background: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #1A6BFF; margin: 20px 0; text-align: left; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
        <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #222;">${safeMsg}</p>
      </div>
      <p style="font-size: 15px; color: #666; margin-top: 25px;">Thank you for being an active part of our community!</p>
      <hr style="border: none; border-top: 1px dashed #ccc; margin: 30px 0;" />
      <p style="font-size: 12px; color: #888; margin: 0;">This is an automated message from your friendly <strong>CitiVoice Platform</strong>.</p>
      <p style="font-size: 12px; color: #aaa; margin-top: 5px;">Together, we make the city better! 🏙️</p>
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
