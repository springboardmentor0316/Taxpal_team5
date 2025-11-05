const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Report = require('../models/Report');
const TaxEstimate = require('../models/TaxEstimate');
const generateToken = require('../utils/generateToken');
const { sendOtpEmail } = require('../utils/email');

const buildUserPayload = (user) => ({
  id: user._id,
  username: user.username,
  fullName: user.fullName,
  email: user.email,
  country: user.country,
  incomeBracket: user.incomeBracket,
});

const handleServerError = (res, error) => {
  console.error(error);
  return res.status(500).json({ message: 'Something went wrong' });
};

exports.signup = async (req, res) => {
  try {
    const { username, fullName, email, password, country, incomeBracket } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.status(409).json({ message: 'An account with that email or username already exists' });
    }

    const user = await User.create({
      username,
      fullName,
      email,
      password,
      country,
      incomeBracket,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: buildUserPayload(user),
    });
  } catch (error) {
    return handleServerError(res, error);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    return res.json({
      message: 'Login successful',
      token,
      user: buildUserPayload(user),
    });
  } catch (error) {
    return handleServerError(res, error);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'No account found with that email' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');

    user.resetCodeHash = hashedCode;
    user.resetCodeExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    try {
      await sendOtpEmail({ to: user.email, code: verificationCode, expiresInMinutes: 15 });
    } catch (emailError) {
      console.error('Failed to send reset code email', emailError);
      user.resetCodeHash = undefined;
      user.resetCodeExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res
        .status(500)
        .json({ message: 'Failed to send verification code email. Please try again later.' });
    }

    return res.json({
      message: 'Verification code sent to your email.',
    });
  } catch (error) {
    return handleServerError(res, error);
  }
};

exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    const user = await User.findOne({
      email,
      resetCodeHash: hashedCode,
      resetCodeExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    user.resetCodeHash = undefined;
    user.resetCodeExpires = undefined;
    await user.save();

    return res.json({
      message: 'Code verified successfully',
      resetToken: rawToken,
    });
  } catch (error) {
    return handleServerError(res, error);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    return handleServerError(res, error);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(422).json({ message: 'Current and new password are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const matches = await user.matchPassword(currentPassword);
    if (!matches) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return handleServerError(res, error);
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    await Promise.all([
      Transaction.deleteMany({ user: objectId }),
      Budget.deleteMany({ user: objectId }),
      Category.deleteMany({ user: objectId }),
      Report.deleteMany({ user: objectId }),
      TaxEstimate.deleteMany({ user: objectId }),
    ]);

    await User.findByIdAndDelete(objectId);

    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    return handleServerError(res, error);
  }
};
