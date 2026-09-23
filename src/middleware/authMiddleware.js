const supabase = require('../config/supabase');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const token = authHeader.split(' ')[1];

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Actual authenticated Supabase user
    req.user = user;

    // Easy access to user ID
    req.userId = user.id;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

module.exports = authenticateUser;