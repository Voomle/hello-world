const jwt = require('jsonwebtoken');
require('dotenv').config(); // To access JWT_SECRET

const verifyToken = (req, res, next) => {
  // Get token from header (format: Bearer <token>)
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1]; // Get token after "Bearer "

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user; // Attach user from payload to request object
    next(); // Proceed to the next middleware/route handler
  } catch (err) {
    console.error('Token verification error:', err.message);
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ msg: 'Token is not valid (expired)' });
    }
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ msg: 'Token is not valid (malformed/invalid signature)' });
    }
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

module.exports = {
  verifyToken,
};
