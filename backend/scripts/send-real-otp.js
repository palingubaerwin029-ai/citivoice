require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { sendEmail } = require('../services/notificationService');

async function sendRealOtp(targetEmail) {
  const cleanEmail = targetEmail.trim().toLowerCase();
  const otp = crypto.randomInt(100000, 999999).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  console.log(`1. Updating database for ${cleanEmail}...`);
  const query = `
    INSERT INTO email_verifications (email, otp_hash, expires_at, is_verified, updated_at)
    VALUES (?, ?, ?, 0, NOW())
    ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at), is_verified = 0, updated_at = NOW()
  `;
  await pool.query(query, [cleanEmail, hashedOtp, expiresAt]);
  console.log('2. Live database updated with fresh OTP!');

  const htmlBody = `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background-color: #0f172a; color: #e2e8f0; max-width: 580px; margin: auto; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 20px; text-align: center; border-radius: 12px; margin-bottom: 28px;">
        <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">CitiVoice</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Kabankalan City Citizen Portal</p>
      </div>
      <div style="padding: 0 10px;">
        <h2 style="font-size: 20px; color: #f8fafc; margin-top: 0;">Verify Your Email Address</h2>
        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">Thank you for registering with CitiVoice. To ensure your account security and verify that you own this email, enter the 6-digit code below in the registration form:</p>
        <div style="background: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #334155; margin: 24px 0; text-align: center;">
          <p style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; margin: 0; font-family: monospace;">${otp}</p>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">This verification code will expire in <strong style="color: #cbd5e1;">15 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
      </div>
      <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #1e293b; text-align: center;">
        <p style="font-size: 11px; color: #64748b; margin: 0;">City Government of Kabankalan — Office of the City Mayor</p>
      </div>
    </div>
  `;

  console.log(`3. Sending email from ${process.env.GMAIL_USER} to ${cleanEmail}...`);
  const result = await sendEmail(cleanEmail, 'CitiVoice — Email Verification Code', htmlBody);
  console.log('4. Google SMTP Response:', result ? result.response : 'No response');
  console.log('5. Message ID:', result ? result.messageId : 'none');
  console.log(`\n======================================================`);
  console.log(`>>> REAL OTP CODE IS: [ ${otp} ] <<<`);
  console.log(`======================================================\n`);
  process.exit(0);
}

const target = process.argv[2] || 'erwinpalinguba029@gmail.com';
sendRealOtp(target).catch(err => {
  console.error('Error sending OTP:', err);
  process.exit(1);
});
