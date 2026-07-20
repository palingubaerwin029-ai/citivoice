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

  // 1. Generate an empathetic personalized message using Gemini / Groq AI
  if (groqService.isAvailable() && notificationContext) {
    const prompt = `
      You are the official public relations assistant for the Office of the City Mayor, Kabankalan City.
      Write a short, professional, empathetic, and reassuring notification message to a citizen named ${user.name || 'Citizen'}.
      Context of Update: ${notificationContext}
      
      Instructions:
      - Keep it brief (2-3 sentences max).
      - Use a warm, professional, respectful tone representing the City Government of Kabankalan.
      - Do not include greetings or sign-offs (they are handled by the official template).
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

  // 2. Format HTML for emails (Official Government Executive Template)
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 15px; background-color: #0f172a; color: #334155;">
      
      <!-- Main Container Card -->
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid #1e293b;">
        
        <!-- Top Official Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          
          <div style="display: inline-block; padding: 4px 14px; background: rgba(217, 119, 6, 0.2); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 20px; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #fbbf24; margin-bottom: 10px;">
            Republic of the Philippines · City of Kabankalan
          </div>

          <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
            CitiVoice Public Service
          </h1>
          <div style="font-size: 12px; font-weight: 600; color: #93c5fd; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px;">
            Office of the City Mayor · Official Citizen Update
          </div>
        </div>

        <!-- Body Content -->
        <div style="padding: 30px 24px;">
          <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 16px;">
            Dear ${safeName},
          </div>

          <!-- Highlight Message Box -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid #2563eb; border-radius: 12px; padding: 20px; font-size: 14px; color: #1e293b; line-height: 1.6; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
            ${safeMsg.replace(/\n/g, '<br/>')}
          </div>

          <div style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 24px;">
            The Office of the City Mayor and the City Government of Kabankalan are committed to responding promptly to community concerns. Thank you for actively contributing to the safety and improvement of our city.
          </div>
        </div>

        <!-- Official Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
          <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
            City Government of Kabankalan
          </div>
          <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
            Office of the City Mayor · CitiVoice Governance Network<br/>
            This is an automated official update. Please do not reply directly to this notification.
          </div>
        </div>

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
  const approverLabel = approvedByName && approvedByName !== 'City Admin' 
    ? `Office of the City Mayor (${escapeHTML(approvedByName)})`
    : 'Office of the City Mayor';

  const subject = `[EXECUTIVE DIRECTIVE #${concern.id}] Office of the City Mayor — ${concern.title}`;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 15px; background-color: #0f172a; color: #334155;">
      
      <!-- Main Container Card -->
      <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid #1e293b;">
        
        <!-- Official Header Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%); padding: 36px 28px 28px 28px; text-align: center; color: #ffffff; position: relative;">
          
          <!-- Top Gold Seal Divider -->
          <div style="display: inline-block; padding: 4px 14px; background: rgba(217, 119, 6, 0.2); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 20px; font-size: 10px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; color: #fbbf24; margin-bottom: 12px;">
            Republic of the Philippines · City of Kabankalan
          </div>

          <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; font-family: 'Segoe UI', Arial, sans-serif;">
            Office of the City Mayor
          </h1>
          <div style="font-size: 13px; font-weight: 600; color: #93c5fd; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px;">
            Official Executive Directive & Department Assignment
          </div>

          <!-- Document Number Pill -->
          <div style="margin-top: 20px; display: inline-block; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(8px); padding: 8px 18px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.15); font-size: 12px; font-family: monospace; color: #e2e8f0;">
            DIRECTIVE REF: <strong style="color: #ffffff;">EXECUTIVE-2026-CONCERN-#${concern.id}</strong>
          </div>
        </div>

        <!-- Content Area -->
        <div style="padding: 32px 28px;">

          <!-- Executive Approval Alert Box -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 6px solid #16a34a; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="background: #16a34a; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 5px 12px; border-radius: 20px; display: inline-block;">
                ✓ ACTION APPROVED BY MAYOR
              </span>
              <span style="font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase;">
                Priority: ${safePriority}
              </span>
            </div>
            
            <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 10px; line-height: 1.3;">
              Assigned Department: <span style="color: #1d4ed8;">${deptName}</span>
            </div>
            <div style="font-size: 13px; color: #475569; margin-top: 6px;">
              Authority: <strong>${approverLabel}</strong>
            </div>
          </div>

          <!-- Report Details Table Card -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; margin-bottom: 28px;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 14px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">
              📄 Citizen Concern Metadata & Location
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 130px;">Concern ID:</td>
                <td style="padding: 8px 0; font-weight: 800; color: #0f172a;">#${concern.id}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Report Title:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${safeTitle}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #1e40af;">${safeCategory}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Location / Area:</td>
                <td style="padding: 8px 0; color: #0f172a;">📍 ${safeLocation} (Barangay ${safeBarangay})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Reporting Citizen:</td>
                <td style="padding: 8px 0; color: #0f172a;">👤 ${safeCitizen}</td>
              </tr>
            </table>
          </div>

          <!-- Citizen Description Block -->
          <div style="margin-bottom: 28px;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; margin-bottom: 10px;">
              📝 Reported Problem Summary
            </div>
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #64748b; border-radius: 8px; padding: 16px 20px; font-size: 14px; color: #1e293b; line-height: 1.6;">
              ${safeDesc.replace(/\n/g, '<br/>')}
            </div>
          </div>

          <!-- Executive Directive Notes Box -->
          <div style="margin-bottom: 32px;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #1e3a8a; margin-bottom: 10px;">
              🏛️ Executive Instructions & Action Required
            </div>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-left: 5px solid #2563eb; border-radius: 10px; padding: 18px 20px; font-size: 14px; color: #1e40af; line-height: 1.6; font-weight: 500;">
              ${safeNotes.replace(/\n/g, '<br/>')}
            </div>
          </div>

          <!-- Official Call to Action Button -->
          <div style="text-align: center; margin: 36px 0 24px 0;">
            <a href="http://localhost:8080/concerns/${concern.id}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 800; letter-spacing: 0.5px; box-shadow: 0 8px 16px rgba(15,23,42,0.25);">
              🏛️ Open Concern in CitiVoice Console →
            </a>
          </div>

        </div>

        <!-- Official Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 28px; text-align: center;">
          <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
            City Government of Kabankalan
          </div>
          <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
            Office of the City Mayor · CitiVoice Governance Network<br/>
            This is an automated official executive transmission. Confidential & Privileged.
          </div>
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

