const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const {
  selectByEmail,
  selectByName,
  selectByPhone,
  insertUser,
  selectById,
  updateResetOtp,
  updatePasswordByEmail,
  checkExistingIdNumber,
  upsertRegistrationOtp,
  getRegistrationOtp,
  markRegistrationEmailVerified,
  deleteRegistrationOtp,
} = require('../models/user.model');
const { OAuth2Client } = require('google-auth-library');
const { sendEmail } = require('../services/notificationService');
const { verifyNameOnId, verifyIdCard } = require('../services/idVerificationService');

const JWT_SECRET = process.env.JWT_SECRET;

// Comma-separated OAuth client IDs whose ID tokens we accept (usually just the Web client ID)
const GOOGLE_CLIENT_IDS = (process.env.GOOGLE_CLIENT_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const googleClient = new OAuth2Client();

const sign = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

const safe = (user) => {
  const { password_hash, reset_otp, reset_otp_expires, fcm_token, ...rest } = user;
  return rest;
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await selectByEmail(email);
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user) {
      return res.status(401).json({
        error: 'auth/user-not-found',
        field: 'email',
        message: 'No account found with this email address.',
      });
    }

    if (!valid) {
      return res.status(401).json({
        error: 'auth/wrong-password',
        field: 'password',
        message: 'Incorrect password. Please try again.',
      });
    }

    const token = sign({ id: user.id, role: user.role, name: user.name });
    res.json({ token, user: safe(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Google Sign-In (login only — email must already be registered) ─────────
const googleLogin = async (req, res) => {
  if (GOOGLE_CLIENT_IDS.length === 0) {
    return res.status(503).json({ error: 'Google sign-in is not configured on the server.' });
  }

  const { idToken } = req.body || {};
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ error: 'idToken is required.' });
  }

  let payload;
  try {
    // Verifies Google's signature, expiry, issuer and that the token was issued for OUR app
    const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_IDS });
    payload = ticket.getPayload();
  } catch (err) {
    console.warn('[Google Login] Token verification failed:', err.message);
    return res.status(401).json({ error: 'auth/invalid-google-token', message: 'Google sign-in failed. Please try again.' });
  }

  if (!payload?.email || !payload.email_verified) {
    return res.status(401).json({ error: 'auth/unverified-google-email', message: 'Your Google email is not verified.' });
  }

  try {
    const email = payload.email.toLowerCase();
    const user = await selectByEmail(email);

    if (!user) {
      return res.status(404).json({
        error: 'auth/not-registered',
        message: 'This Google account is not registered in CitiVoice. Please sign up first.',
        email,
        name: payload.name || '',
      });
    }

    const token = sign({ id: user.id, role: user.role, name: user.name });
    res.json({ token, user: safe(user) });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Send Registration Email OTP ──────────────────────────────────────────────
const sendRegistrationOtp = async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // Check if email already registered
    const existing = await selectByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({
        error: 'auth/email-already-in-use',
        message: 'This email is already registered. Please sign in instead.',
      });
    }

    // Cooldown check (prevent spamming: 45s between OTP requests)
    const existingOtp = await getRegistrationOtp(cleanEmail);
    if (existingOtp && existingOtp.updated_at) {
      const secondsSinceLast = (Date.now() - new Date(existingOtp.updated_at).getTime()) / 1000;
      if (secondsSinceLast < 45) {
        const waitSec = Math.ceil(45 - secondsSinceLast);
        return res.status(429).json({
          error: `Please wait ${waitSec}s before requesting a new code.`,
          retryAfter: waitSec,
        });
      }
    }

    // Generate 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await upsertRegistrationOtp(cleanEmail, hashedOtp, expiresAt);

    // Send email with official CitiVoice branding
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
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">This verification code will expire in <strong style="color: #cbd5e1;">10 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
        </div>
        <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #1e293b; text-align: center;">
          <p style="font-size: 11px; color: #64748b; margin: 0;">City Government of Kabankalan — Office of the City Mayor</p>
        </div>
      </div>
    `;

    // Await immediate email forwarding so the server completes handshake with Google SMTP before responding
    await sendEmail(cleanEmail, 'CitiVoice — Email Verification Code', htmlBody);

    res.json({
      success: true,
      message: 'Verification code sent! Please check your inbox and Spam/Promotions folder.',
    });
  } catch (err) {
    console.error('Send registration OTP error:', err);
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
  }
};

// ── Verify Registration Email OTP ────────────────────────────────────────────
const verifyRegistrationOtp = async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and 6-digit code are required.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const record = await getRegistrationOtp(cleanEmail);

    if (!record || !record.otp_hash || !record.expires_at) {
      return res.status(400).json({ error: 'No verification code was requested for this email. Please request a new code.' });
    }

    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const isValid = await bcrypt.compare(String(otp).trim(), record.otp_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    // Mark as verified in DB
    await markRegistrationEmailVerified(cleanEmail);

    // Sign a temporary 1-hour verification token
    const verificationToken = jwt.sign(
      { email: cleanEmail, type: 'registration_email_verified' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    res.json({
      success: true,
      verificationToken,
      message: 'Email verified successfully!',
    });
  } catch (err) {
    console.error('Verify registration OTP error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
};

const register = async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    barangay,
    idType,
    idNumber,
    idImageUrl,
    verificationToken,
  } = req.body;
  try {
    const existingName = await selectByName(name);
    if (existingName) return res.status(400).json({ error: 'auth/name-already-in-use', field: 'name', message: 'Name already registered' });

    const existingEmail = await selectByEmail(email);
    if (existingEmail) return res.status(400).json({ error: 'auth/email-already-in-use', field: 'email', message: 'Email already registered' });

    if (phone) {
      const existingPhone = await selectByPhone(phone);
      if (existingPhone) return res.status(400).json({ error: 'auth/phone-already-in-use', field: 'phone', message: 'Phone number already registered' });
    }

    if (idNumber) {
      const exists = await checkExistingIdNumber(idNumber, 0);
      if (exists) {
        return res.status(400).json({ error: 'auth/id-already-in-use', field: 'idNumber', message: 'This ID number is already linked to another account.' });
      }
    }

    // ── AI Name Verification (server-side enforcement) ───────────────────
    if (idImageUrl) {
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const cleanUrl = String(idImageUrl).split('?')[0];
      const imageName = path.basename(cleanUrl);
      const imagePath = path.join(uploadsDir, imageName);

      try {
        const verification = await verifyIdCard(imagePath, name, idNumber, idType);
        if (!verification.match) {
          if (verification.extractedName && !verification.nameMatch) {
            return res.status(400).json({
              error: `The name you entered does not match the name on your ID (${verification.extractedName}).`,
              idVerification: verification,
            });
          }
          if (verification.extractedIdNumber && !verification.numberMatch) {
            return res.status(400).json({
              error: `The ID number you entered does not match the number on your ID (${verification.extractedIdNumber}).`,
              idVerification: verification,
            });
          }
        }
      } catch (verifyErr) {
        // Log but don't block registration if AI service is completely down
        console.error('[Register] ID verification error (non-blocking):', verifyErr.message);
      }
    }

    // Password complexity check
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!complexityRegex.test(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters and include uppercase, lowercase, numbers, and symbols.',
      });
    }

    const hash = await bcrypt.hash(password, 12);
    const insertId = await insertUser(
      name,
      email,
      hash,
      phone,
      barangay,
      idType,
      idNumber,
      idImageUrl,
    );
    const newUser = await selectById(insertId);

    // Clean up temporary registration OTP record
    try {
      await deleteRegistrationOtp(email);
    } catch (_) {}

    const token = sign({ id: newUser.id, role: newUser.role, name: newUser.name });
    res.status(201).json({ token, user: safe(newUser) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await selectById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(safe(user));
  } catch (err) {
    console.error('Auth /me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Forgot Password ─────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await selectByEmail(email);

    // Always respond 200 to prevent user enumeration
    if (!user) {
      return res.json({ message: 'If this email is registered, a reset code has been sent.' });
    }

    // Generate a 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await updateResetOtp(email, hashedOtp, expiresAt);

    // Send OTP via email
    const htmlBody = `
      <div style="font-family: 'Inter', 'Segoe UI', sans-serif; padding: 40px 20px; background-color: #f4f7f6; color: #1e293b; max-width: 600px; margin: auto; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; margin: -40px -20px 30px -20px;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">CitiVoice</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">Password Reset</p>
        </div>
        <div style="padding: 0 20px;">
          <h2 style="font-size: 20px; color: #0f172a; margin-top: 0;">Password Reset Code</h2>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">You requested a password reset for your CitiVoice account. Use the code below to reset your password:</p>
          <div style="background: white; padding: 25px; border-radius: 12px; border-left: 5px solid #3b82f6; margin: 25px 0; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <p style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e293b; margin: 0;">${otp}</p>
          </div>
          <p style="font-size: 14px; color: #64748b;">This code expires in <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">This is an automated message from CitiVoice.</p>
        </div>
      </div>
    `;

    // Await immediate reset code email forwarding
    await sendEmail(email, 'CitiVoice — Password Reset Code', htmlBody);

    res.json({
      message: 'If this email is registered, a reset code has been sent.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Reset Password ──────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    }

    // Password complexity check (same as registration)
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!complexityRegex.test(newPassword)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include uppercase, lowercase, numbers, and symbols.',
      });
    }

    const user = await selectByEmail(email);
    if (!user || !user.reset_otp || !user.reset_otp_expires) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    // Check expiry
    if (new Date() > new Date(user.reset_otp_expires)) {
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    // Verify OTP
    const otpValid = await bcrypt.compare(otp, user.reset_otp);
    if (!otpValid) {
      return res.status(400).json({ error: 'Invalid reset code. Please check and try again.' });
    }

    // Hash new password and save
    const newHash = await bcrypt.hash(newPassword, 12);
    await updatePasswordByEmail(email, newHash);

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Verify ID Details (AI check for name and ID number) ───────────────────
const verifyIdName = async (req, res) => {
  const { idImageUrl, name, idNumber, idType } = req.body;

  if (!idImageUrl) {
    return res.status(400).json({ error: 'idImageUrl is required.' });
  }

  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const cleanUrl = String(idImageUrl).split('?')[0];
    const imageName = path.basename(cleanUrl);
    const imagePath = path.join(uploadsDir, imageName);

    const result = await verifyIdCard(imagePath, name || '', idNumber || '', idType || '');
    res.json(result);
  } catch (err) {
    console.error('Verify ID details error:', err);
    res.status(500).json({ error: 'Failed to verify ID details.' });
  }
};

module.exports = {
  login,
  googleLogin,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  register,
  getMe,
  forgotPassword,
  resetPassword,
  verifyIdName,
};
