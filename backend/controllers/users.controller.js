const fs = require('fs');
const path = require('path');
const { notifyUser } = require('../services/notificationService');
const { insertNotification } = require('../models/notification.model');
const {
  selectById,
  selectAllCitizens,
  countCitizens,
  checkExistingIdNumber,
  updateUserDetails,
  updateUserVerification,
  selectUserContactInfo,
  updateUserFcmToken,
  updateUserAvatar,
  deleteUser,
} = require('../models/user.model');

const { verifyNameOnId } = require('../services/idVerificationService');

const safe = (user) => {
  if (!user) return user;
  const { password_hash, reset_otp, reset_otp_expires, fcm_token, ...rest } = user;
  return rest;
};

const listCitizens = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { search, barangay, status } = req.query;

    const [rows, total] = await Promise.all([
      selectAllCitizens(limit, offset, search, barangay, status),
      countCitizens(search, barangay, status),
    ]);

    res.json({
      data: rows.map(safe),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Users list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const user = await selectById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(safe(user));
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUser = async (req, res) => {
  const { name, phone, barangay, address, id_type, id_number, id_image_url, submitted_at } = req.body;

  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    if (id_number) {
      const exists = await checkExistingIdNumber(id_number, req.params.id);
      if (exists)
        return res
          .status(400)
          .json({ error: 'This ID number is already linked to another account.' });
    }

    await updateUserDetails(
      req.params.id,
      name,
      phone,
      barangay,
      id_type,
      id_number,
      id_image_url,
      submitted_at,
      address,
    );

    let updatedUser = await selectById(req.params.id);

    // When a citizen submits/updates their ID, mark status as 'pending' for manual admin review
    if (submitted_at && updatedUser.verification_status !== 'verified') {
      await updateUserVerification(req.params.id, 'pending', 0, null, 'NULL');
      updatedUser = await selectById(req.params.id);
    }

    res.json(safe(updatedUser));
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const verifyUser = async (req, res) => {
  try {
    await updateUserVerification(req.params.id, 'verified', 1, null, 'NOW()');

    const contactInfo = await selectUserContactInfo(req.params.id);
    if (contactInfo) {
      await insertNotification(
        req.params.id,
        '✅ Account Verified!',
        'Great news! Your CitiVoice account has been successfully verified. You can now log into the app.',
      );
      notifyUser(
        contactInfo,
        'Account Verified!',
        'Great news! Your CitiVoice account has been successfully verified. You can now log into the app.',
        "An admin just manually reviewed and approved the citizen's ID. Their account is now fully verified. Welcome them to the platform.",
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('User verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const rejectUser = async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Rejection reason required' });
  try {
    const contactInfo = await selectUserContactInfo(req.params.id);

    // Mark the user as rejected and save the rejection reason
    await updateUserVerification(req.params.id, 'rejected', 0, reason, 'NULL');

    if (contactInfo) {
      notifyUser(
        contactInfo,
        'Account Verification Failed',
        `Unfortunately, your identity verification was rejected for the following reason:\n"${reason}"\nPlease register again with a valid ID.`,
        `The citizen's ID verification was rejected by an admin for the following reason: "${reason}". Kindly ask them to submit a clearer or more valid ID.`,
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('User reject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const revokeUser = async (req, res) => {
  try {
    await updateUserVerification(req.params.id, 'unverified', 0, null, 'NULL');
    res.json({ success: true });
  } catch (err) {
    console.error('User revoke error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateFcmToken = async (req, res) => {
  const { fcm_token } = req.body;
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    await updateUserFcmToken(req.params.id, fcm_token);
    res.json({ success: true });
  } catch (err) {
    console.error('FCM Token update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const uploadAvatar = async (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  try {
    const avatarUrl = `/uploads/${req.file.filename}`;
    await updateUserAvatar(req.params.id, avatarUrl);
    const updatedUser = await selectById(req.params.id);
    res.json(safe(updatedUser));
  } catch (err) {
    console.error('Upload avatar error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getVerificationStats = async (req, res) => {
  try {
    const [rows] = await require('../db').query(`
      SELECT verification_status, COUNT(*) as count 
      FROM users 
      WHERE role = 'citizen' 
      GROUP BY verification_status
    `);

    // Some users might have no verification_status (null)
    const [nullRows] = await require('../db').query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'citizen' AND verification_status IS NULL
    `);

    const stats = {
      pending: 0,
      verified: 0,
      rejected: 0,
      unverified: nullRows[0].count,
      all: 0
    };

    rows.forEach(r => {
      const status = r.verification_status || 'unverified';
      stats[status] = r.count;
    });

    stats.all = Object.values(stats).reduce((a, b) => a + b, 0);

    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteFileByUrl = (fileUrl) => {
  if (!fileUrl) return;
  try {
    const filename = fileUrl.split('/uploads/')[1] || fileUrl.replace(/^\/?(uploads\/)?/, '');
    if (filename && !filename.includes('..')) {
      const filePath = path.join(__dirname, '..', 'uploads', filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  } catch (_) {}
};

const deleteCitizen = async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (req.user.id === targetId) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  try {
    const user = await selectById(targetId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clean up uploaded files if present
    if (user.avatar_url) deleteFileByUrl(user.avatar_url);
    if (user.id_image_url) deleteFileByUrl(user.id_image_url);

    await deleteUser(targetId);
    res.json({ success: true, message: `User "${user.name}" was successfully deleted.` });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error while deleting user' });
  }
};

module.exports = {
  listCitizens,
  getUser,
  updateUser,
  verifyUser,
  rejectUser,
  revokeUser,
  updateFcmToken,
  uploadAvatar,
  getVerificationStats,
  deleteCitizen,
};
