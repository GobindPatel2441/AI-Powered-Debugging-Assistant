import { analyzeErrorWithAI } from '../services/aiService.js';
import { 
  getDashboardStats, 
  getErrorById, 
  getErrorHistory, 
  saveErrorAnalysis, 
  updateErrorStatus,
  verifyFix 
} from '../services/historyService.js';

export async function analyzeError(req, res, next) {
  try {
    const message = String(req.body?.message || req.body?.error || '').trim();
    const code = String(req.body?.code || '').trim();
    const severity = req.body?.severity || 'Medium';

    if (!message) {
      return res.status(400).json({ error: 'Error message is required.' });
    }

    const analysis = await analyzeErrorWithAI(message, code);
    const saved = await saveErrorAnalysis({
      message,
      code,
      severity,
      explanation: analysis.explanation,
      fix: analysis.suggestedFix,
      exampleCode: analysis.exampleCode
    });

    res.status(201).json({
      id: saved._id,
      message,
      explanation: analysis.explanation,
      fix: analysis.suggestedFix,
      suggestedFix: analysis.suggestedFix,
      exampleCode: analysis.exampleCode,
      createdAt: saved.createdAt
    });
  } catch (error) {
    next(error);
  }
}

export async function getHistory(req, res, next) {
  try {
    const filters = {
      severity: req.query.severity,
      status: req.query.status,
      type: req.query.type,
      search: req.query.search,
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      sort: req.query.sort || 'createdAt',
      order: req.query.order || 'desc'
    };
    const result = await getErrorHistory(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getError(req, res, next) {
  try {
    const { id } = req.params;
    const error = await getErrorById(id);

    if (!error) {
      return res.status(404).json({ error: 'Error log not found.' });
    }

    res.json(error);
  } catch (err) {
    next(err);
  }
}

export async function getStats(req, res, next) {
  try {
    const range = req.query.range || '24h';
    const stats = await getDashboardStats(range);
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

export async function toggleFix(req, res, next) {
  try {
    const { id } = req.params;
    const { isFixed } = req.body;
    
    const updated = await updateErrorStatus(id, isFixed);

    if (!updated) {
      return res.status(404).json({ error: 'Error log not found.' });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function verifyErrorFix(req, res, next) {
  try {
    const { id } = req.params;
    const { updatedCode } = req.body;

    if (!updatedCode) {
      return res.status(400).json({ error: 'Updated code is required for verification.' });
    }

    const result = await verifyFix(id, updatedCode);
    if (!result) {
      return res.status(404).json({ error: 'Error log not found.' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function exportCsv(req, res, next) {
  try {
    const { errors } = await getErrorHistory({ limit: 1000 }); // Export last 1000
    
    const headers = ['Timestamp', 'Error Type', 'Message', 'Severity', 'Status', 'Fixed At', 'Verification'];
    const rows = errors.map(e => [
      new Date(e.createdAt).toISOString(),
      e.errorType,
      `"${e.message.replace(/"/g, '""')}"`,
      e.severity,
      e.isFixed ? 'FIXED' : 'PENDING',
      e.fixedAt ? new Date(e.fixedAt).toISOString() : '',
      e.verificationStatus
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=debugai_history_export.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}
