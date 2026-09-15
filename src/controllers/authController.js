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

    // ======================================
    // CHECK EXISTING USER
    // ======================================

    const { data: existingUser, error: userError } =
      await supabase
        .from('users')
        .select(
          'id, name, mobile, business_name, created_at'
        )
        .eq('mobile', mobile)
        .maybeSingle();

    if (userError) {
      console.error(userError);

      return res.status(500).json({
        success: false,
        message: userError.message,
      });
    }

    // ======================================
    // EXISTING USER
    // ======================================

    if (existingUser) {
      return res.json({
        success: true,
        message: 'Login successful',
        isNewUser: false,
        user: existingUser,
      });
    }

    // ======================================
    // NEW USER
    // ======================================

    const { data: newUser, error: createError } =
      await supabase
        .from('users')
        .insert([
          {
            mobile,
            name: 'User',
          },
        ])
        .select(
          'id, name, mobile, business_name, created_at'
        )
        .single();

    if (createError) {
      console.error(createError);

      return res.status(500).json({
        success: false,
        message: createError.message,
      });
    }

    return res.status(201).json({
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


// ======================================
// LOGOUT
// ======================================

const logout = async (req, res) => {
  try {
    const { user_id } = req.body;

    // user_id required
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Check user exists
    const { data: user, error: userError } =
      await supabase
        .from('users')
        .select('id')
        .eq('id', user_id)
        .maybeSingle();

    if (userError) {
      console.error('Logout User Check Error:', userError);

      return res.status(500).json({
        success: false,
        message: userError.message,
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // ======================================
    // LOGOUT SUCCESS
    // ======================================

    return res.json({
      success: true,
      message: 'Logout successful',
    });

  } catch (error) {
    console.error('Logout Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
const setupBusiness = async (req, res) => {
  try {
    const {
      user_id,
      business_name,
      business_type,
      owner_name,
      city,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    if (!business_name || !business_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Business name is required',
      });
    }

    if (!business_type || !business_type.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Business type is required',
      });
    }

    if (!owner_name || !owner_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Owner name is required',
      });
    }

    // Check user
    const {
      data: existingUser,
      error: userError,
    } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .maybeSingle();

    if (userError) {
      console.error(
        'Business Setup User Check Error:',
        userError
      );

      return res.status(500).json({
        success: false,
        message: userError.message,
      });
    }

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update business details
    const {
      data: updatedUser,
      error: updateError,
    } = await supabase
      .from('users')
      .update({
        name: owner_name.trim(),
        business_name: business_name.trim(),
        business_type: business_type.trim(),
        city: city ? city.trim() : null,
      })
      .eq('id', user_id)
      .select(
        'id, name, mobile, business_name, business_type, city, created_at'
      )
      .single();

    if (updateError) {
      console.error(
        'Business Setup Update Error:',
        updateError
      );

      return res.status(500).json({
        success: false,
        message: updateError.message,
      });
    }

    return res.json({
      success: true,
      message: 'Business setup completed successfully',
      user: updatedUser,
    });

  } catch (error) {
    console.error(
      'Business Setup Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  logout,
  setupBusiness
};