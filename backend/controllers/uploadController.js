import * as analysisService from '../services/analysisService.js';
import multer from 'multer';
import path from 'path';

// Configure multer for temp storage
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export async function processAnalysis(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required.' });
    }

    const analysis = await analysisService.processUpload(req.user._id, req.files);
    
    res.status(202).json({
      message: 'Analysis started',
      analysisId: analysis._id,
      status: analysis.status
    });
  } catch (error) {
    next(error);
  }
}

export async function getAnalysisResults(req, res, next) {
  try {
    const results = await analysisService.getAnalysisResults(req.params.id);
    if (!results) return res.status(404).json({ error: 'Analysis not found' });
    
    res.json(results);
  } catch (error) {
    next(error);
  }
}

