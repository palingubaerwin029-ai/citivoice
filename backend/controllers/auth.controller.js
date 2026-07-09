const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  selectByEmail,
  selectByName,
  selectByPhone,
  insertUser,
  selectById,
  updateResetOtp,
  updatePasswordByEmail,
  checkExistingIdNumber,
} = require('../models/user.model');
const { sendEmail } = require('../services/notificationService');

const JWT_SECRET = process.env.JWT_SECRET;

const sign = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

const safe = (user) => {
  const { password_hash, reset_otp, reset_otp_expires, fcm_token, ...rest } = user;
  return rest;
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await selectByEmail(email);
    if (!user) return res.status(401).json({ error: 'auth/user-not-found' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'auth/wrong-password' });
    const token = sign({ id: user.id, role: user.role });
    res.json({ token, user: safe(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const register = async (req, res) => {
  const { name, email, password, phone, barangay, idType, idNumber, idImageUrl } = req.body;
  try {
    const existingName = await selectByName(name);
    if (existingName) return res.status(400).json({ error: 'Name already registered' });

    const existingEmail = await selectByEmail(email);
    if (existingEmail) return res.status(400).json({ error: 'Email already registered' });

    if (phone) {
      const existingPhone = await selectByPhone(phone);
      if (existingPhone) return res.status(400).json({ error: 'Phone number already registered' });
    }

    if (idNumber) {
      const exists = await checkExistingIdNumber(idNumber, 0);
      if (exists) {
        return res.status(400).json({ error: 'This ID number is already linked to another account.' });
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
    const token = sign({ id: newUser.id, role: newUser.role });
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

    await sendEmail(email, 'CitiVoice — Password Reset Code', htmlBody);

    res.json({ message: 'If this email is registered, a reset code has been sent.' });
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

module.exports = {
  login,
  register,
  getMe,
  forgotPassword,
  resetPassword,
};
