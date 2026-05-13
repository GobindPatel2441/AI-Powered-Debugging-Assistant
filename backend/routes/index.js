import { Router } from 'express';
import multer from 'multer';
import { analyzeError, exportCsv, getError, getHistory, getStats, toggleFix, verifyErrorFix } from '../controllers/errorController.js';
import { deleteSettings, readSettings, saveSettings } from '../controllers/settingsController.js';
import { upload, processAnalysis, getAnalysisResults } from '../controllers/uploadController.js';
import { signup, login, forgotPassword, resetPassword } from '../controllers/authController.js';
import { getProfile, updateProfile, uploadProfileImage, deleteProfileImage, uploadWorkspaceLogo, deleteWorkspaceLogo } from '../controllers/profileController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Log file upload config
const logUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (/\.(txt|log|json)$/i.test(file.originalname)) {
      callback(null, true);
      return;
    }
    const error = new Error('Only .txt, .log, and .json files are supported.');
    error.status = 400;
    callback(error);
  }
});

// Image upload config (5MB, image types only)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    const error = new Error('Only JPG, PNG, and WebP images are supported.');
    error.status = 400;
    callback(error);
  }
});

// === Auth Routes (Public) ===
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

// === User Profile Routes (Protected) ===
router.get('/user/profile', authMiddleware, getProfile);
router.put('/user/profile', authMiddleware, updateProfile);
router.post('/user/profile-image', authMiddleware, imageUpload.single('profileImage'), uploadProfileImage);
router.delete('/user/profile-image', authMiddleware, deleteProfileImage);
router.post('/user/workspace-logo', authMiddleware, imageUpload.single('workspaceLogo'), uploadWorkspaceLogo);
router.delete('/user/workspace-logo', authMiddleware, deleteWorkspaceLogo);

// === Error Analysis Routes ===
router.post('/analyze-error', analyzeError);
router.get('/stats', getStats);
router.post('/uploads', authMiddleware, upload.array('files', 10), processAnalysis);
router.get('/uploads/:id', authMiddleware, getAnalysisResults);
router.get('/history', getHistory);
router.get('/history/export-csv', exportCsv);
router.get('/history/:id', getError);
router.patch('/history/:id/fix', toggleFix);
router.post('/history/:id/verify', verifyErrorFix);

// === Settings Routes (Legacy — still works without auth) ===
router.get('/settings', readSettings);
router.put('/settings', saveSettings);
router.delete('/settings', deleteSettings);

export default router;
