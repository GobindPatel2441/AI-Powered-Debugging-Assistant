import User from '../models/UserProxy.js';
import { generateToken } from '../middleware/authMiddleware.js';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function signup(req, res, next) {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password
    });

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: user.toProfile()
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);
    res.json({
      token,
      user: user.toProfile()
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    // In production, send actual email. For demo, always succeed.
    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // For demo: update password by email directly
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    user.passwordHash = password;
    await user.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
}
