import UploadAnalysis from '../models/UploadAnalysis.js';
import * as parserService from './parserService.js';
import { analyzeErrorWithAI } from './aiService.js';
import { isDatabaseReady } from './databaseService.js';
import fs from 'fs/promises';

const memoryAnalyses = [];

export async function processUpload(userId, files) {
  const analyzedFiles = files.map(f => ({
    name: String(f.originalname),
    type: String(f.mimetype),
    size: Number(f.size)
  }));

  let analysis;
  const initialData = {
    userId,
    status: 'PARSING',
    analyzedFiles,
    issues: [],
    totalIssues: 0,
    criticalIssues: 0,
    createdAt: new Date()
  };

  if (isDatabaseReady()) {
    analysis = await UploadAnalysis.create(initialData);
  } else {
    analysis = {
      _id: `analysis-${Date.now()}`,
      ...initialData,
      save: async function() { return this; }
    };
    memoryAnalyses.unshift(analysis);
  }

  // Run parsing and analysis in background
  performAnalysis(analysis, files).catch(err => {
    console.error('Background analysis failed:', err);
    analysis.status = 'FAILED';
    analysis.save();
  });

  return analysis;
}

async function performAnalysis(analysis, files) {
  const allIssues = [];
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file.path, 'utf8');
      const language = parserService.detectLanguage(file.originalname, content);
      
      // Update file language in DB
      const fileMeta = analysis.analyzedFiles.find(f => f.name === file.originalname);
      if (fileMeta) fileMeta.language = language;

      const extracted = parserService.extractIssues(content, file.originalname, language);
      allIssues.push(...extracted);
      
      // Cleanup temp file
      await fs.unlink(file.path);
    } catch (err) {
      console.error(`Failed to process file ${file.originalname}:`, err);
    }
  }

  analysis.issues = allIssues;
  analysis.totalIssues = allIssues.length;
  analysis.criticalIssues = allIssues.filter(i => i.severity === 'CRITICAL').length;
  analysis.status = 'ANALYZING';
  await analysis.save();

  // Optionally run AI analysis on top 5 critical issues immediately
  // For the rest, we can do it on-demand when the user clicks
  const topIssues = allIssues.filter(i => i.severity === 'CRITICAL').slice(0, 3);
  for (const issue of topIssues) {
    try {
      const aiResult = await analyzeErrorWithAI(issue.message, issue.codeSnippet);
      issue.explanation = aiResult.explanation;
      issue.suggestedFix = aiResult.suggestedFix;
      issue.correctedCode = aiResult.exampleCode;
    } catch (err) {
      console.error('AI enrichment failed for issue:', err);
    }
  }

  analysis.status = 'COMPLETED';
  await analysis.save();
}

export async function getAnalysisResults(analysisId) {
  const idStr = String(analysisId);
  if (isDatabaseReady() && !idStr.startsWith('analysis-')) {
    return await UploadAnalysis.findById(analysisId);
  }
  return memoryAnalyses.find(a => String(a._id) === idStr) || null;
}
