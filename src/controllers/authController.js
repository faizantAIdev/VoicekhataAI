const supabase = require('../config/supabase');

// Temporary OTP storage
const otpStore = new Map();

// ======================================
// SEND OTP
// ======================================

const sendOtp = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required',
      });
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid 10 digit mobile number',
      });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Store OTP
    otpStore.set(mobile, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // Development only
    console.log('================================');
    console.log(`OTP for ${mobile}: ${otp}`);
    console.log('================================');

    res.json({
      success: true,
      message: 'OTP generated successfully',
      // Development only
      otp,
    });

  } catch (error) {
    console.error('Send OTP Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// VERIFY OTP
// ======================================

const verifyOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and OTP are required',
      });
    }

    const storedOtp = otpStore.get(mobile);

    if (!storedOtp) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired',
      });
    }

    // Check expiry
    if (Date.now() > storedOtp.expiresAt) {
      otpStore.delete(mobile);

      return res.status(400).json({
        success: false,
        message: 'OTP has expired',
      });
    }

    // Check OTP
    if (storedOtp.otp !== otp.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    // OTP verified
    otpStore.delete(mobile);

    // Check existing user
    const { data: existingUser, error: userError } =
      await supabase
        .from('users')
        .select('id, name, mobile, business_name, created_at')
        .eq('mobile', mobile)
        .maybeSingle();

    if (userError) {
      console.error(userError);

      return res.status(500).json({
        success: false,
        message: userError.message,
      });
    }

    // Existing user
    if (existingUser) {
      return res.json({
        success: true,
        message: 'Login successful',
        isNewUser: false,
        user: existingUser,
      });
    }

    // New user
    const { data: newUser, error: createError } =
      await supabase
        .from('users')
        .insert([
          {
            mobile,
            name: 'User',
          },
        ])
        .select('id, name, mobile, business_name, created_at')
        .single();

    if (createError) {
      console.error(createError);

      return res.status(500).json({
        success: false,
        message: createError.message,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      isNewUser: true,
      user: newUser,
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


module.exports = {
  sendOtp,
  verifyOtp,
};