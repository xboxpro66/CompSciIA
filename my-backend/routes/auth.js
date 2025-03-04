const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { userName, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ userName, email, password: hashedPassword, role: role || 'customer' });
    await newUser.save();

    res.status(201).json({ message: 'Signup Successful!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/test-jwt', (req, res) => {
  const token = jwt.sign({ test: 'data' }, 'testsecret', { expiresIn: '1h' });
  res.json({ token });
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const generateToken = (id) => {
      return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '2d',
      });
    };

    const token = generateToken(user._id);
    res.status(200).json({
      message: 'Login Successful!',
      user: {
        userName: user.userName,
        role: user.role,
        email: user.email,
      },
      token,
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Profile data
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Automated password reset by email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });    

    const resetURL = `http://localhost:3000/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      to: email,
      from: process.env.EMAIL_USER,
      subject: 'Password Reset',
      html: `<p>Click <a href="${resetURL}">here</a> to reset your password.</p>`
    });

    res.status(200).json({ message: 'Email sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ message: 'Token is invalid or has expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password has been reset!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});


module.exports = router;
