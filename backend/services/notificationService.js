const nodemailer = require('nodemailer');

const groqService = require('./groqService');
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
  if (groqService.isAvailable() && notificationContext) {
    const prompt = `
      You are the friendly, helpful AI assistant of CitiVoice (the city complaint tracking system).
      Write a short, professional, empathetic, and reassuring notification message to a citizen named ${user.name || 'Citizen'}.
      Context: ${notificationContext}
      
      Keep it very brief (2-3 sentences max). Use a warm, encouraging tone. No need for a greeting or sign-off since it goes into a template.
    `;

    const aiGenerated = await groqService.generateText(prompt, {
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

/**
 * Sends an official notification email to a city department when a concern is approved.
 * @param {Object} concern - The concern details
 * @param {String} approvalNotes - Official approval notes or directives
 * @param {Object} deptInfo - Department object { name, email, contact_phone }
 * @param {String} approvedByName - Name of the official who approved it
 */
const notifyDepartmentOnApproval = async (concern, approvalNotes, deptInfo, approvedByName = "City Admin / Mayor's Office") => {
  if (!deptInfo || (!deptInfo.email && !process.env.GMAIL_USER)) {
    console.log(`⚠️ Cannot notify department: No target email provided.`);
  }

  const targetEmail = deptInfo?.email || process.env.GMAIL_USER;
  const deptName = escapeHTML(deptInfo?.name || concern.department || 'Assigned Department');
  const safeTitle = escapeHTML(concern.title);
  const safeDesc = escapeHTML(concern.description);
  const safeCategory = escapeHTML(concern.category);
  const safePriority = escapeHTML(concern.priority);
  const safeLocation = escapeHTML(concern.location_address || 'Not specified');
  const safeCitizen = escapeHTML(concern.user_name || 'Citizen Report');
  const safeBarangay = escapeHTML(concern.user_barangay || 'N/A');
  const safeNotes = escapeHTML(approvalNotes || 'Approved for immediate evaluation and action.');
  const safeApprover = escapeHTML(approvedByName);

  const subject = `[OFFICIAL NOTICE - APPROVED CONCERN #${concern.id}] Action Required: ${concern.title}`;

  const htmlBody = `
    <div style="font-family: 'Inter', 'Segoe UI', Arial, sans-serif; padding: 40px 20px; background-color: #f1f5f9; color: #1e293b; max-width: 650px; margin: auto; border-radius: 16px; box-shadow: 0 12px 30px rgba(0,0,0,0.08);">
      
      <!-- Top Branding Bar -->
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 24px; text-align: center; border-radius: 12px 12px 0 0; color: white;">
        <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; opacity: 0.85; margin-bottom: 6px;">OFFICIAL EXECUTIVE NOTICE</div>
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">CitiVoice Governance Network</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">City Government of Kabankalan</p>
      </div>

      <div style="background: #ffffff; padding: 30px 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
        
        <!-- Status Banner -->
        <div style="background: #f0fdf4; border-left: 5px solid #22c55e; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="background: #22c55e; color: white; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">✅ CONCERN APPROVED</span>
              <h2 style="font-size: 18px; color: #0f172a; margin: 10px 0 4px 0;">Assigned to: ${deptName}</h2>
              <p style="margin: 0; font-size: 13px; color: #475569;">Approved By: <strong>${safeApprover}</strong></p>
            </div>
          </div>
        </div>

        <!-- Concern Summary Box -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 120px;"><strong>Concern ID:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">#${concern.id}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Title:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${safeTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Category:</strong></td>
              <td style="padding: 6px 0; color: #0f172a;">${safeCategory}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Priority:</strong></td>
              <td style="padding: 6px 0;"><span style="color: ${concern.priority === 'High' ? '#ef4444' : '#f59e0b'}; font-weight: 700;">${safePriority} Priority</span></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Location:</strong></td>
              <td style="padding: 6px 0; color: #0f172a;">📍 ${safeLocation} (Barangay ${safeBarangay})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Reported By:</strong></td>
              <td style="padding: 6px 0; color: #0f172a;">👤 ${safeCitizen}</td>
            </tr>
          </table>
        </div>

        <!-- Description -->
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin: 0 0 8px 0;">Citizen Description</h3>
          <div style="background: #f1f5f9; padding: 14px 18px; border-radius: 8px; font-size: 14px; color: #334155; line-height: 1.6; border-left: 3px solid #94a3b8;">
            ${safeDesc.replace(/\n/g, '<br/>')}
          </div>
        </div>

        <!-- Official Directive / Approval Notes -->
        <div style="margin-bottom: 28px;">
          <h3 style="font-size: 14px; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.5px; margin: 0 0 8px 0;">🏛️ Official Executive Directive / Notes</h3>
          <div style="background: #eff6ff; border: 1px dashed #3b82f6; padding: 16px 18px; border-radius: 8px; font-size: 14px; color: #1e40af; line-height: 1.6;">
            ${safeNotes.replace(/\n/g, '<br/>')}
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 13px; color: #64748b; margin: 0 0 6px 0;">Please log into the CitiVoice Admin Web Console to review assignments and post work-in-progress status.</p>
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">Automated System Notice • City Government of Kabankalan</p>
        </div>

      </div>
    </div>
  `;

  await sendEmail(targetEmail, subject, htmlBody);
  console.log(`🏛️ [APPROVED NOTICE DISPATCHED] Emailed ${deptName} at ${targetEmail} for concern #${concern.id}`);
};

/**
 * Unified command to fire database, socket, push, and email notifications to a user or room
 */
const dispatchSystemNotification = async ({
  userId,
  userObj,
  title,
  message,
  socketRoom,
  io,
  contextData = {}
}) => {
  try {
    if (userId) {
      const { insertNotification } = require('../models/concern.model');
      await insertNotification(userId, title, message);
    }
    if (io && socketRoom) {
      io.to(socketRoom).emit('new_notification', { title, message, ...contextData });
    }
    if (userObj) {
      await notifyUser(userObj, title, message, message);
    }
  } catch (err) {
    console.error('❌ Failed system notification dispatch:', err.message);
  }
};

module.exports = {
  sendEmail,
  notifyUser,
  notifyDepartmentOnApproval,
  dispatchSystemNotification,
};

