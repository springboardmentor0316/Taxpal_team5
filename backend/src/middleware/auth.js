const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }

    req.user = { id: user._id.toString(), email: user.email };
    return next();
  } catch (error) {
    console.error('Auth middleware failed', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = auth;
