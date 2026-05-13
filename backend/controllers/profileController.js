import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = resolve(__dirname, '../uploads/profiles');

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function getProfile(req, res) {
  res.json({ user: req.user.toProfile() });
}

export async function updateProfile(req, res, next) {
  try {
    const user = req.user;
    const { fullName, email, biography, preferences } = req.body;

    if (fullName !== undefined) {
      if (!String(fullName).trim()) {
        return res.status(400).json({ error: 'Full name is required.' });
      }
      user.fullName = fullName.trim();
    }

    if (email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'A valid email is required.' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (biography !== undefined) {
      user.biography = biography;
    }

    if (preferences) {
      if (preferences.theme) user.preferences.theme = preferences.theme;
      if (preferences.accent) user.preferences.accent = preferences.accent;
      if (preferences.tokenRotation !== undefined) user.preferences.tokenRotation = preferences.tokenRotation;
      if (preferences.aiProvider) user.preferences.aiProvider = preferences.aiProvider;
      if (preferences.notifications) {
        Object.assign(user.preferences.notifications, preferences.notifications);
      }
    }

    await user.save();
    res.json({ user: user.toProfile() });
  } catch (error) {
    next(error);
  }
}

export async function uploadProfileImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const ext = extname(req.file.originalname).toLowerCase() || '.png';
    const filename = `profile-${req.user._id}-${Date.now()}${ext}`;
    const filepath = resolve(UPLOADS_DIR, filename);

    // Remove old profile image if exists
    if (req.user.profileImage) {
      const oldPath = resolve(__dirname, '..', req.user.profileImage.replace(/^\/api\//, ''));
      try { if (existsSync(oldPath)) unlinkSync(oldPath); } catch {}
    }

    // Write buffer to file
    const { writeFileSync } = await import('node:fs');
    writeFileSync(filepath, req.file.buffer);

    const imageUrl = `/api/uploads/profiles/${filename}`;
    req.user.profileImage = imageUrl;
    await req.user.save();

    res.json({ imageUrl, user: req.user.toProfile() });
  } catch (error) {
    next(error);
  }
}

export async function deleteProfileImage(req, res, next) {
  try {
    if (req.user.profileImage) {
      const oldPath = resolve(__dirname, '..', req.user.profileImage.replace(/^\/api\//, ''));
      try { if (existsSync(oldPath)) unlinkSync(oldPath); } catch {}
    }

    req.user.profileImage = '';
    await req.user.save();
    res.json({ user: req.user.toProfile() });
  } catch (error) {
    next(error);
  }
}

export async function uploadWorkspaceLogo(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const ext = extname(req.file.originalname).toLowerCase() || '.png';
    const filename = `logo-${req.user._id}-${Date.now()}${ext}`;
    const filepath = resolve(UPLOADS_DIR, filename);

    if (req.user.workspaceLogo) {
      const oldPath = resolve(__dirname, '..', req.user.workspaceLogo.replace(/^\/api\//, ''));
      try { if (existsSync(oldPath)) unlinkSync(oldPath); } catch {}
    }

    const { writeFileSync } = await import('node:fs');
    writeFileSync(filepath, req.file.buffer);

    const imageUrl = `/api/uploads/profiles/${filename}`;
    req.user.workspaceLogo = imageUrl;
    await req.user.save();

    res.json({ imageUrl, user: req.user.toProfile() });
  } catch (error) {
    next(error);
  }
}

export async function deleteWorkspaceLogo(req, res, next) {
  try {
    if (req.user.workspaceLogo) {
      const oldPath = resolve(__dirname, '..', req.user.workspaceLogo.replace(/^\/api\//, ''));
      try { if (existsSync(oldPath)) unlinkSync(oldPath); } catch {}
    }

    req.user.workspaceLogo = '';
    await req.user.save();
    res.json({ user: req.user.toProfile() });
  } catch (error) {
    next(error);
  }
}
