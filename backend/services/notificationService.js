const nodemailer = require('nodemailer');

const geminiService = require('./geminiService');
const { Expo } = require('expo-server-sdk');

// ── Expo Setup ────────────────────────────────────────────────────────────────
const expo = new Expo();

// ── Gmail (Nodemailer) Setup ──────────────────────────────────────────────────
// Ensure valid credentials before creating transporter or it will error
const isEmailEnabled = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);


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
 * Simple HTML escaping to prevent injection in emails
 */
const escapeHTML = (str) => {
  if (!str) return '';
  return str.replace(
    /[&<>"']/g,
    (m) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[m],
  );
};

/**
 * Unified command to fire both Email and SMS to a user's known contacts
 * @param {Object} user
 * @param {String} subject
 * @param {String} defaultMessage - The standard message (used as fallback or context)
 * @param {String} notificationContext - Context for the AI to generate a better message
 */
const notifyUser = async (user, subject, defaultMessage, notificationContext) => {
  if (!user) return;

  const safeName = escapeHTML(user.name || 'Citizen');

  let finalMessage = defaultMessage;

  // 1. Generate an empathetic personalized message using Gemini
  if (geminiService.isAvailable() && notificationContext) {
    const prompt = `
      You are the friendly, helpful AI assistant of CitiVoice (the city complaint tracking system).
      Write a short, professional, empathetic, and reassuring notification message to a citizen named ${user.name || 'Citizen'}.
      Context: ${notificationContext}
      
      Keep it very brief (2-3 sentences max). Use a warm, encouraging tone. No need for a greeting or sign-off since it goes into a template.
    `;

    const aiGenerated = await geminiService.generateText(prompt, {
      temperature: 0.6,
      maxTokens: 200,
    });
    if (aiGenerated) {
      finalMessage = aiGenerated.trim();
    }
  }

  const safeMsg = escapeHTML(finalMessage);

  // 2. Format HTML nicely for emails (Premium Visual Design)
  const htmlBody = `
    <div style="font-family: 'Inter', 'Segoe UI', sans-serif; padding: 40px 20px; background-color: #f4f7f6; color: #1e293b; max-width: 600px; margin: auto; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; margin: -40px -20px 30px -20px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">CitiVoice</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">Your City, Your Voice</p>
      </div>
      
      <div style="padding: 0 20px;">
        <h2 style="font-size: 20px; color: #0f172a; margin-top: 0;">Hi ${safeName},</h2>
        
        <div style="background: white; padding: 25px; border-radius: 12px; border-left: 5px solid #3b82f6; margin: 25px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #334155;">${finalMessage.replace(/\n/g, '<br/>')}</p>
        </div>
        
        <p style="font-size: 15px; color: #475569; margin-top: 30px;">
          Thank you for helping us make the city a better place. Stay safe!
        </p>
      </div>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">This is an automated update from the CitiVoice platform.</p>
        <p style="font-size: 12px; color: #94a3b8; margin: 5px 0 0 0;">Please do not reply directly to this email.</p>
      </div>
    </div>
  `;

  // Determine user contacts (handling cases where they might be empty)
  const emailPromise = user.email ? sendEmail(user.email, subject, htmlBody) : Promise.resolve();



  // Push Notification via Expo
  let pushPromise = Promise.resolve();
  if (user.fcm_token && Expo.isExpoPushToken(user.fcm_token)) {
    const messages = [
      {
        to: user.fcm_token,
        sound: 'default',
        title: subject,
        body: finalMessage,
        data: { subject },
      },
    ];

    pushPromise = (async () => {
      try {
        const chunks = expo.chunkPushNotifications(messages);
        for (let chunk of chunks) {
          await expo.sendPushNotificationsAsync(chunk);
        }
        console.log(`🚀 Push Notification sent to ${user.name || 'User'}`);
      } catch (error) {
        console.error('❌ Failed to send Push Notification:', error);
      }
    })();
  } else if (user.fcm_token) {
    console.log(`⚠️ Push Token is invalid for user ${user.name}: ${user.fcm_token}`);
  }

  // Run efficiently in parallel
  await Promise.all([emailPromise, pushPromise]);
};

module.exports = {
  sendEmail,

  notifyUser,
};
