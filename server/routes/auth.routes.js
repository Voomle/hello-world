const express = require('express');
const router = express.Router();
const userModel = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator'); // For input validation
require('dotenv').config(); // To access JWT_SECRET

// POST /api/auth/register
router.post(
  '/register',
  [
    // Validate inputs
    body('username', 'Username is required').notEmpty().trim().escape(),
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      // Check if user already exists (by email or username)
      let user = await userModel.findUserByEmail(email);
      if (user) {
        return res.status(400).json({ errors: [{ msg: 'User with this email already exists' }] });
      }
      user = await userModel.findUserByUsername(username);
      if (user) {
        return res.status(400).json({ errors: [{ msg: 'Username already taken' }] });
      }

      // Create user
      const newUser = await userModel.createUser(username, email, password);

      // Return new user (excluding password)
      const { password_hash, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password is required').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if user exists
      const user = await userModel.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ errors: [{ msg: 'Invalid credentials' }] });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ errors: [{ msg: 'Invalid credentials' }] });
      }

      // User matched, create JWT payload
      const payload = {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
          // Add other user fields if necessary, but keep payload small
        },
      };

      // Sign the token
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }, // Use from .env or default
        (err, token) => {
          if (err) throw err;
          const { password_hash, ...userWithoutPassword } = user;
          res.json({
            token,
            user: userWithoutPassword,
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// GET /api/auth/me (Protected Route)
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/me', verifyToken, async (req, res) => {
  try {
    // req.user is attached by the verifyToken middleware
    // We can fetch fresh user data from DB if needed, or return what's in the token
    // For this example, we'll return the user object from the token,
    // but in a real app, you might want to exclude sensitive info or re-fetch.
    const user = await userModel.findUserById(req.user.id); // Assuming you add findUserById to user.model.js
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    const { password_hash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
