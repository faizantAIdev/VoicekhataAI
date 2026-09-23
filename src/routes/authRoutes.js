const express = require('express');

const {
  sendOtp,
  verifyOtp,
  logout,
  setupBusiness,
} = require('../controllers/authController');

const router = express.Router();

router.post('/send-otp', sendOtp);

router.post('/verify-otp', verifyOtp);

router.post('/logout', logout);

router.put('/business-setup', setupBusiness);

module.exports = router;