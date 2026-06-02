const { notifyUser } = require('../services/notificationService');
const { insertNotification } = require('../models/notification.model');
const {
  selectById,
  selectAllCitizens,
  checkExistingIdNumber,
  updateUserDetails,
  updateUserVerification,
  selectUserContactInfo,
  updateUserFcmToken
} = require('../models/user.model');

const safe = (user) => {
  if (!user) return user;
  const { password_hash, ...rest } = user;
  return rest;
};

const listCitizens = async (req, res) => {
  try {
    const rows = await selectAllCitizens();
    res.json(rows.map(safe));
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
  const { name, phone, barangay, id_type, id_number, id_image_url, submitted_at } = req.body;
  
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    if (id_number) {
      const exists = await checkExistingIdNumber(id_number, req.params.id);
      if (exists) return res.status(400).json({ error: 'This ID number is already linked to another account.' });
    }

    await updateUserDetails(req.params.id, name, phone, barangay, id_type, id_number, id_image_url, submitted_at);
    const updatedUser = await selectById(req.params.id);
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
        'Great news! Your CitiVoice account has been successfully verified. You can now log into the app.'
      );
      notifyUser(contactInfo, "Account Verified!", "Great news! Your CitiVoice account has been successfully verified. You can now log into the app.");
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
    await updateUserVerification(req.params.id, 'rejected', 0, reason, 'NULL');

    const contactInfo = await selectUserContactInfo(req.params.id);
    if (contactInfo) {
      await insertNotification(
        req.params.id, 
        '❌ Verification Rejected', 
        `Your identity verification was rejected. Reason: "${reason}". Please resubmit another ID.`
      );
      notifyUser(contactInfo, "Account Verification Failed", `Unfortunately, your identity verification was rejected for the following reason:\n"${reason}"\nPlease log into the app to resubmit another ID.`);
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

module.exports = {
  listCitizens,
  getUser,
  updateUser,
  verifyUser,
  rejectUser,
  revokeUser,
  updateFcmToken
};
