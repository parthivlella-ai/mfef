const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const mockStore = require('../utils/mockStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Register a new user (Always created as 'user' role)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone, pharmacyName, licenseNumber } = req.body;

    // Validation 1: Required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password',
      });
    }

    // Validation 2: Full name length
    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Full name must be at least 2 characters long',
      });
    }

    // Validation 3: Email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address (e.g., user@domain.com)',
      });
    }

    // Validation 4: Password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Validation 5: Password confirmation
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation does not match password',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    // Enforce role: 'user' for public registration (Admin security)
    const assignedRole = 'user';

    if (isDbConnected()) {
      const userExists = await User.findOne({ email: cleanEmail });
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists. Please log in.',
        });
      }

      const user = await User.create({
        name: cleanName,
        email: cleanEmail,
        password,
        role: assignedRole,
        phone: phone ? phone.trim() : '',
        pharmacyName: pharmacyName ? pharmacyName.trim() : 'MediTrack Pharmacy',
        licenseNumber: licenseNumber ? licenseNumber.trim() : '',
      });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully! Welcome to MediTrack.',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          pharmacyName: user.pharmacyName,
          licenseNumber: user.licenseNumber,
          token: generateToken(user._id),
        },
      });
    } else {
      // In-Memory Fallback
      const userExists = mockStore.getUserByEmail(cleanEmail);
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists. Please log in.',
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = mockStore.addUser({
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        plainPassword: password,
        role: assignedRole,
        phone: phone || '',
        pharmacyName: pharmacyName || 'MediTrack Pharmacy',
        licenseNumber: licenseNumber || '',
        status: 'active',
      });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully! (Preview Mode)',
        data: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
          pharmacyName: newUser.pharmacyName,
          licenseNumber: newUser.licenseNumber,
          token: generateToken(newUser._id),
        },
      });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration',
    });
  }
};

// @desc    Authenticate user & get JWT token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email address and password',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (isDbConnected()) {
      const user = await User.findOne({ email: cleanEmail }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      if (user.status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'Your account is deactivated. Please contact your system administrator.',
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          pharmacyName: user.pharmacyName,
          licenseNumber: user.licenseNumber,
          token: generateToken(user._id),
        },
      });
    } else {
      // In-Memory Fallback
      const user = mockStore.getUserByEmail(cleanEmail);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      if (user.status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'Your account is deactivated. Please contact your system administrator.',
        });
      }

      let isMatch = false;
      if (user.plainPassword && user.plainPassword === password) {
        isMatch = true;
      } else {
        isMatch = await bcrypt.compare(password, user.password);
      }

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      return res.json({
        success: true,
        message: 'Login successful (Preview Mode)',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          pharmacyName: user.pharmacyName,
          licenseNumber: user.licenseNumber,
          token: generateToken(user._id),
        },
      });
    }
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login',
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    if (isDbConnected()) {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      return res.json({
        success: true,
        data: user,
      });
    } else {
      const user = mockStore.getUserById(req.user._id) || req.user;
      return res.json({
        success: true,
        data: user,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user profile',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const { name, phone, pharmacyName, licenseNumber } = req.body;

    if (name && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long',
      });
    }

    if (isDbConnected()) {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (name) user.name = name.trim();
      if (phone !== undefined) user.phone = phone.trim();
      if (pharmacyName !== undefined) user.pharmacyName = pharmacyName.trim();
      if (licenseNumber !== undefined) user.licenseNumber = licenseNumber.trim();

      const updatedUser = await user.save();

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          phone: updatedUser.phone,
          pharmacyName: updatedUser.pharmacyName,
          licenseNumber: updatedUser.licenseNumber,
        },
      });
    } else {
      const updatedUser = mockStore.updateUser(req.user._id, {
        name,
        phone,
        pharmacyName,
        licenseNumber,
      });

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile',
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match',
      });
    }

    if (isDbConnected()) {
      const user = await User.findById(req.user._id).select('+password');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }

      user.password = newPassword;
      await user.save();

      return res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } else {
      const user = mockStore.getUserById(req.user._id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      let isMatch = false;
      if (user.plainPassword && user.plainPassword === currentPassword) {
        isMatch = true;
      } else {
        isMatch = await bcrypt.compare(currentPassword, user.password);
      }

      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.plainPassword = newPassword;

      return res.json({
        success: true,
        message: 'Password changed successfully',
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to change password',
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
};
