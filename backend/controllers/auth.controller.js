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
  checkExistingEmail,
  updateAdminAccount,
  insertAdminUser,
  selectAllAdmins,
  deleteUser,
  upsertRegistrationOtp,
  getRegistrationOtp,
  markRegistrationEmailVerified,
  deleteRegistrationOtp,
  upsertAdmin2FA,
  getAdmin2FA,
  deleteAdmin2FA,
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

    // ── If Admin, require 2FA Email OTP Verification ──────────────────────────
    if (user.role === 'admin') {
      const otp = crypto.randomInt(100000, 999999).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await upsertAdmin2FA(user.id, hashedOtp, expiresAt);

      // Sign temporary 10-minute token for 2FA completion
      const mfaToken = jwt.sign(
        { id: user.id, email: user.email, purpose: 'admin_2fa' },
        JWT_SECRET,
        { expiresIn: '10m' }
      );

      // Mask email for display: e.g. "adm***@citivoice.gov.ph"
      const maskedEmail = user.email.replace(/(.{3})(.*)(@.*)/, '$1***$3');

      // Send branded CitiVoice Admin 2FA Email
      const htmlBody = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background-color: #0B1120; color: #E2E8F0; max-width: 580px; margin: auto; border-radius: 16px; border: 1px solid #1E293B;">
          <div style="background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #3B82F6 100%); padding: 32px 20px; text-align: center; border-radius: 12px; margin-bottom: 28px; box-shadow: 0 4px 20px rgba(37, 99, 235, 0.25);">
            <div style="font-size: 32px; margin-bottom: 8px;">🔐</div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CitiVoice Administrator Console</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Kabankalan City Citizen Engagement System</p>
          </div>
          <div style="padding: 0 10px;">
            <h2 style="font-size: 20px; color: #F8FAFC; margin-top: 0;">Two-Factor Authentication (2FA)</h2>
            <p style="font-size: 14px; color: #94A3B8; line-height: 1.6;">An administrator login attempt was initiated for your CitiVoice account. Enter the 6-digit one-time verification code below to authorize your sign-in:</p>
            <div style="background: #111827; padding: 24px; border-radius: 12px; border: 1px solid #374151; margin: 24px 0; text-align: center; box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);">
              <p style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #38BDF8; margin: 0; font-family: monospace;">${otp}</p>
            </div>
            <p style="font-size: 13px; color: #64748B; line-height: 1.5;">This security code will expire in <strong style="color: #CBD5E1;">10 minutes</strong>.<br>If you did not attempt to log in to the CitiVoice Admin Console, please change your password immediately.</p>
          </div>
          <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #1E293B; text-align: center;">
            <p style="font-size: 11px; color: #64748B; margin: 0;">City Government of Kabankalan — Security & Information Systems Office</p>
          </div>
        </div>
      `;

      await sendEmail(user.email, 'CitiVoice Admin — 2FA Verification Code', htmlBody);

      return res.json({
        requires2FA: true,
        mfaToken,
        email: maskedEmail,
        message: 'A 6-digit verification code has been sent to your administrator email.',
      });
    }

    const token = sign({
      id: user.id,
      role: user.role,
      name: user.name,
      is_super_admin: Boolean(user.is_super_admin),
    });
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
      // Issue a cryptographically signed 1-hour verification token for streamlined registration
      const verificationToken = jwt.sign(
        { email, name: payload.name || '', type: 'google_email_verified' },
        JWT_SECRET,
        { expiresIn: '1h' },
      );

      return res.status(404).json({
        error: 'auth/not-registered',
        message: 'This Google account is not registered in CitiVoice. Please complete registration to continue.',
        email,
        name: payload.name || '',
        isGoogleVerified: true,
        verificationToken,
      });
    }

    const token = sign({
      id: user.id,
      role: user.role,
      name: user.name,
      is_super_admin: Boolean(user.is_super_admin),
    });
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
    // Run database duplicate checks in parallel for maximum speed
    const [existingName, existingEmail, existingPhone, existingId] = await Promise.all([
      selectByName(name),
      selectByEmail(email),
      phone ? selectByPhone(phone) : Promise.resolve(null),
      idNumber ? checkExistingIdNumber(idNumber, 0) : Promise.resolve(null),
    ]);

    if (existingName) return res.status(400).json({ error: 'auth/name-already-in-use', field: 'name', message: 'Name already registered' });
    if (existingEmail) return res.status(400).json({ error: 'auth/email-already-in-use', field: 'email', message: 'Email already registered' });
    if (existingPhone) return res.status(400).json({ error: 'auth/phone-already-in-use', field: 'phone', message: 'Phone number already registered' });
    if (existingId) return res.status(400).json({ error: 'auth/id-already-in-use', field: 'idNumber', message: 'This ID number is already linked to another account.' });

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
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!password || password.length < 8 || !hasLower || !hasUpper || !hasDigit || !hasSpecial) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters and include uppercase, lowercase, numbers, and symbols.',
      });
    }

    const hash = await bcrypt.hash(password, 10);
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

// ── Verify Admin 2FA Code ───────────────────────────────────────────────────
const verifyAdmin2FA = async (req, res) => {
  const { mfaToken, otp } = req.body || {};
  if (!mfaToken || !otp) {
    return res.status(400).json({ error: '2FA verification code is required.', field: 'otp' });
  }

  let decoded;
  try {
    decoded = jwt.verify(mfaToken, JWT_SECRET);
    if (decoded.purpose !== 'admin_2fa') {
      return res.status(401).json({ error: 'Invalid 2FA session token. Please sign in again.' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Your 2FA session has expired. Please sign in again.' });
  }

  try {
    const user = await selectById(decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    const record = await getAdmin2FA(user.id);
    if (!record) {
      return res.status(400).json({ error: 'No active 2FA code found. Please request a new code.', field: 'otp' });
    }

    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired. Please click "Resend Code".', field: 'otp' });
    }

    const isValid = await bcrypt.compare(String(otp).trim(), record.otp_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Incorrect 6-digit verification code. Please check your email.', field: 'otp' });
    }

    // Clear used 2FA code
    await deleteAdmin2FA(user.id);

    // Issue standard admin JWT
    const token = sign({
      id: user.id,
      role: user.role,
      name: user.name,
      is_super_admin: Boolean(user.is_super_admin),
    });
    res.json({
      success: true,
      token,
      user: safe(user),
    });
  } catch (err) {
    console.error('Verify admin 2FA error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
};

// ── Resend Admin 2FA Code ─────────────────────────────────────────────────────
const resendAdmin2FA = async (req, res) => {
  const { mfaToken } = req.body || {};
  if (!mfaToken) {
    return res.status(400).json({ error: 'Invalid 2FA session. Please sign in again.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(mfaToken, JWT_SECRET);
    if (decoded.purpose !== 'admin_2fa') {
      return res.status(401).json({ error: 'Invalid 2FA session token.' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Your 2FA session has expired. Please sign in again.' });
  }

  try {
    const user = await selectById(decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Cooldown check (prevent spamming: 30 seconds between requests)
    const record = await getAdmin2FA(user.id);
    if (record && record.updated_at) {
      const secondsSinceLast = (Date.now() - new Date(record.updated_at).getTime()) / 1000;
      if (secondsSinceLast < 30) {
        const waitSec = Math.ceil(30 - secondsSinceLast);
        return res.status(429).json({
          error: `Please wait ${waitSec}s before requesting a new code.`,
          retryAfter: waitSec,
        });
      }
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await upsertAdmin2FA(user.id, hashedOtp, expiresAt);

    const htmlBody = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background-color: #0B1120; color: #E2E8F0; max-width: 580px; margin: auto; border-radius: 16px; border: 1px solid #1E293B;">
        <div style="background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #3B82F6 100%); padding: 32px 20px; text-align: center; border-radius: 12px; margin-bottom: 28px;">
          <div style="font-size: 32px; margin-bottom: 8px;">🔐</div>
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CitiVoice Administrator Console</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Kabankalan City Citizen Engagement System</p>
        </div>
        <div style="padding: 0 10px;">
          <h2 style="font-size: 20px; color: #F8FAFC; margin-top: 0;">New 2FA Verification Code</h2>
          <p style="font-size: 14px; color: #94A3B8; line-height: 1.6;">Here is your replacement 6-digit one-time verification code for administrator sign-in:</p>
          <div style="background: #111827; padding: 24px; border-radius: 12px; border: 1px solid #374151; margin: 24px 0; text-align: center;">
            <p style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #38BDF8; margin: 0; font-family: monospace;">${otp}</p>
          </div>
          <p style="font-size: 13px; color: #64748B; line-height: 1.5;">This code will expire in <strong style="color: #CBD5E1;">10 minutes</strong>.</p>
        </div>
      </div>
    `;

    await sendEmail(user.email, 'CitiVoice Admin — New 2FA Verification Code', htmlBody);

    res.json({
      success: true,
      message: 'A new 6-digit code has been sent to your email.',
    });
  } catch (err) {
    console.error('Resend admin 2FA error:', err);
    res.status(500).json({ error: 'Failed to resend code. Please try again.' });
  }
};

// ── Update Admin Account (Name, Email, Password) ────────────────────────────
const updateAdminProfile = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    const user = await selectById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(404).json({ error: 'Administrator account not found.' });
    }

    const rawName = req.body?.name !== undefined ? String(req.body.name).trim() : user.name;
    const rawEmail =
      req.body?.email !== undefined ? String(req.body.email).trim().toLowerCase() : user.email.toLowerCase();
    const { currentPassword, newPassword } = req.body || {};

    if (!rawName || rawName.length < 2 || rawName.length > 100) {
      return res.status(400).json({
        error: 'Name must be between 2 and 100 characters.',
        field: 'name',
      });
    }

    if (!rawEmail || !/^\S+@\S+\.\S+$/.test(rawEmail)) {
      return res.status(400).json({
        error: 'Please enter a valid email address.',
        field: 'email',
      });
    }

    const isEmailChanged = rawEmail !== user.email.toLowerCase();
    const isPasswordChanged = Boolean(newPassword && String(newPassword).length > 0);

    // Require current password verification when changing email or password
    if (isEmailChanged || isPasswordChanged) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Current password is required to change your email or password.',
          field: 'currentPassword',
        });
      }

      const validCurrent = await bcrypt.compare(String(currentPassword), user.password_hash);
      if (!validCurrent) {
        return res.status(401).json({
          error: 'Current password is incorrect.',
          field: 'currentPassword',
        });
      }
    }

    if (isEmailChanged) {
      const emailTaken = await checkExistingEmail(rawEmail, user.id);
      if (emailTaken) {
        return res.status(400).json({
          error: 'This email address is already in use by another account.',
          field: 'email',
        });
      }
    }

    let passwordHash = null;
    if (isPasswordChanged) {
      if (String(newPassword).length < 8) {
        return res.status(400).json({
          error: 'New password must be at least 8 characters long.',
          field: 'newPassword',
        });
      }
      passwordHash = await bcrypt.hash(String(newPassword), 10);
    }

    await updateAdminAccount(user.id, {
      name: rawName,
      email: rawEmail,
      passwordHash,
    });

    const updatedUser = await selectById(user.id);
    const token = sign({
      id: updatedUser.id,
      role: updatedUser.role,
      name: updatedUser.name,
      is_super_admin: Boolean(updatedUser.is_super_admin),
    });

    res.json({
      success: true,
      message: isPasswordChanged
        ? 'Password and account details updated successfully.'
        : 'Account profile updated successfully.',
      user: safe(updatedUser),
      token,
    });
  } catch (err) {
    console.error('Update admin profile error:', err);
    res.status(500).json({ error: 'Internal server error while updating account.' });
  }
};

// ── List All Administrator Accounts ─────────────────────────────────────────
const listAdmins = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    const admins = await selectAllAdmins();
    res.json({ data: admins });
  } catch (err) {
    console.error('List admins error:', err);
    res.status(500).json({ error: 'Internal server error while fetching administrators.' });
  }
};

// ── Register / Create New Administrator Account ─────────────────────────────
const createAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    // Only Super Administrators can register new administrators
    const currentAdmin = await selectById(req.user.id);
    if (!currentAdmin || !currentAdmin.is_super_admin) {
      return res.status(403).json({
        error: 'Permission denied. Only Super Administrators can register new administrators.',
      });
    }

    const rawName = String(req.body?.name || '').trim();
    const rawEmail = String(req.body?.email || '').trim().toLowerCase();
    const rawPassword = String(req.body?.password || '');

    if (!rawName || rawName.length < 2 || rawName.length > 100) {
      return res.status(400).json({
        error: 'Name must be between 2 and 100 characters.',
        field: 'name',
      });
    }

    if (!rawEmail || !/^\S+@\S+\.\S+$/.test(rawEmail)) {
      return res.status(400).json({
        error: 'Please enter a valid email address.',
        field: 'email',
      });
    }

    if (!rawPassword || rawPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long.',
        field: 'password',
      });
    }

    const existingEmail = await selectByEmail(rawEmail);
    if (existingEmail) {
      return res.status(400).json({
        error: 'This email address is already registered.',
        field: 'email',
      });
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const newId = await insertAdminUser(rawName, rawEmail, passwordHash);
    const createdAdmin = await selectById(newId);

    res.status(201).json({
      success: true,
      message: `Administrator "${rawName}" registered successfully.`,
      admin: safe(createdAdmin),
    });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ error: 'Internal server error while registering administrator.' });
  }
};

// ── Delete Another Administrator Account ────────────────────────────────────
const deleteAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    // Only Super Administrators can remove administrator accounts
    const currentAdmin = await selectById(req.user.id);
    if (!currentAdmin || !currentAdmin.is_super_admin) {
      return res.status(403).json({
        error: 'Permission denied. Only Super Administrators can remove administrators.',
      });
    }

    const targetId = parseInt(req.params.id, 10);
    if (!targetId || isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid administrator ID.' });
    }

    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own active administrator account.' });
    }

    const targetUser = await selectById(targetId);
    if (!targetUser || targetUser.role !== 'admin') {
      return res.status(404).json({ error: 'Administrator account not found.' });
    }

    if (targetUser.is_super_admin) {
      return res.status(400).json({ error: 'Cannot delete a Super Administrator account.' });
    }

    const admins = await selectAllAdmins();
    if (admins.length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only remaining administrator account.' });
    }

    await deleteUser(targetId);
    res.json({
      success: true,
      message: `Administrator "${targetUser.name}" removed successfully.`,
    });
  } catch (err) {
    console.error('Delete admin error:', err);
    res.status(500).json({ error: 'Internal server error while removing administrator.' });
  }
};

module.exports = {
  login,
  verifyAdmin2FA,
  resendAdmin2FA,
  googleLogin,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  register,
  getMe,
  updateAdminProfile,
  listAdmins,
  createAdmin,
  deleteAdmin,
  forgotPassword,
  resetPassword,
  verifyIdName,
};
