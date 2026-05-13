import ErrorLog from '../models/ErrorLog.js';
import UploadedLogs from '../models/UploadedLogs.js';
import { isDatabaseReady } from './databaseService.js';
import { analyzeErrorWithAI } from './aiService.js';

const memoryErrors = [];
const memoryUploads = [];

function identifyErrorType(message) {
  const msg = message.toLowerCase();
  if (msg.includes('referenceerror')) return 'ReferenceError';
  if (msg.includes('typeerror')) return 'TypeError';
  if (msg.includes('syntaxerror')) return 'SyntaxError';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) return 'NetworkError';
  if (msg.includes('mongo') || msg.includes('database') || msg.includes('connection')) return 'DatabaseError';
  return 'RuntimeException';
}

export async function saveErrorAnalysis(payload) {
  const errorType = identifyErrorType(payload.message);
  const data = { ...payload, errorType };

  if (isDatabaseReady()) {
    return ErrorLog.create(data);
  }

  const item = {
    _id: `memory-${Date.now()}`,
    createdAt: new Date(),
    ...data
  };

  memoryErrors.unshift(item);
  return item;
}

export async function getErrorHistory(filters = {}) {
  const { severity, status, type, search, page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = filters;
  
  if (isDatabaseReady()) {
    const query = {};
    if (severity) query.severity = severity;
    if (status === 'fixed') query.isFixed = true;
    if (status === 'pending') query.isFixed = false;
    if (type) query.errorType = type;
    if (search) {
      query.$or = [
        { message: { $regex: search, $options: 'i' } },
        { explanation: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sortObj = { [sort]: order === 'desc' ? -1 : 1 };

    const errors = await ErrorLog.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .lean();
    
    const total = await ErrorLog.countDocuments(query);

    return {
      errors,
      total,
      pages: Math.ceil(total / limit),
      currentPage: Number(page)
    };
  }

  // Memory fallback with basic filtering
  let filtered = [...memoryErrors];
  if (severity) filtered = filtered.filter(e => e.severity === severity);
  if (status === 'fixed') filtered = filtered.filter(e => e.isFixed);
  if (status === 'pending') filtered = filtered.filter(e => !e.isFixed);
  if (type) filtered = filtered.filter(e => e.errorType === type);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(e => e.message.toLowerCase().includes(s) || e.explanation.toLowerCase().includes(s));
  }

  const start = (page - 1) * limit;
  const sliced = filtered.slice(start, start + Number(limit));

  return {
    errors: sliced,
    total: filtered.length,
    pages: Math.ceil(filtered.length / limit),
    currentPage: Number(page)
  };
}

export async function saveUploadedLog(payload) {
  if (isDatabaseReady()) {
    return UploadedLogs.create(payload);
  }

  const item = {
    _id: `upload-${Date.now()}`,
    uploadedAt: new Date(),
    ...payload
  };
  memoryUploads.unshift(item);
  return item;
}

export async function getUploadedHistory() {
  if (isDatabaseReady()) {
    return UploadedLogs.find().sort({ uploadedAt: -1 }).lean();
  }

  return memoryUploads;
}

export async function getDashboardStats(range = '24h') {
  // We need raw errors for stats
  let errors = [];
  if (isDatabaseReady()) {
    errors = await ErrorLog.find().lean();
  } else {
    errors = memoryErrors;
  }
  
  const totalErrors = errors.length;
  const typeCounts = {};
  errors.forEach(e => {
    typeCounts[e.errorType] = (typeCounts[e.errorType] || 0) + 1;
  });

  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const mostCommonType = sortedTypes[0]?.[0] || 'None';
  const mostCommonCount = sortedTypes[0]?.[1] || 0;

  let priority = 'LOW';
  if (mostCommonCount >= 50) priority = 'HIGH';
  else if (mostCommonCount >= 10) priority = 'MEDIUM';

  const fixedCount = errors.filter(e => e.isFixed).length;
  const fixSuccessRate = totalErrors > 0 ? Math.round((fixedCount / totalErrors) * 100) : 0;

  const now = new Date();
  let timeBins = {};
  let labels = [];

  if (range === '24h') {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const label = `${d.getHours()}:00`;
      labels.push(label);
      timeBins[label] = 0;
    }
    errors.forEach(e => {
      const d = new Date(e.createdAt);
      if (now - d <= 24 * 60 * 60 * 1000) {
        const label = `${d.getHours()}:00`;
        if (timeBins[label] !== undefined) timeBins[label]++;
      }
    });
  } else if (range === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      labels.push(label);
      timeBins[label] = 0;
    }
    errors.forEach(e => {
      const d = new Date(e.createdAt);
      if (now - d <= 7 * 24 * 60 * 60 * 1000) {
        const label = d.toLocaleDateString(undefined, { weekday: 'short' });
        if (timeBins[label] !== undefined) timeBins[label]++;
      }
    });
  } else {
    for (let i = 4; i >= 0; i--) {
      const label = `Week ${5-i}`;
      labels.push(label);
      timeBins[label] = 0;
    }
    errors.forEach(e => {
      const d = new Date(e.createdAt);
      if (now - d <= 30 * 24 * 60 * 60 * 1000) {
        const weekNum = Math.floor((now - d) / (7 * 24 * 60 * 60 * 1000));
        const label = `Week ${4-weekNum + 1}`;
        if (timeBins[label] !== undefined) timeBins[label]++;
      }
    });
  }

  const frequencyData = labels.map(l => ({ label: l, count: timeBins[l] }));
  const totalForDistribution = Math.max(totalErrors, 1);
  const errorTypes = Object.entries(typeCounts).map(([type, count]) => ({
    type,
    count,
    percentage: Math.round((count / totalForDistribution) * 100)
  })).sort((a, b) => b.count - a.count);

  return {
    totalErrors,
    mostCommonError: {
      type: mostCommonType,
      count: mostCommonCount,
      priority
    },
    fixSuccessRate,
    errorFrequency: frequencyData,
    errorTypes,
    recentActivity: errors.slice(0, 10).map(e => ({
      id: e._id,
      message: e.message,
      type: e.errorType,
      isFixed: e.isFixed,
      createdAt: e.createdAt
    }))
  };
}

export async function updateErrorStatus(id, isFixed) {
  if (isDatabaseReady() && !id.toString().startsWith('memory-')) {
    return ErrorLog.findByIdAndUpdate(
      id, 
      { 
        isFixed: !!isFixed,
        resolvedAt: isFixed ? new Date() : null,
        fixedAt: isFixed ? new Date() : null,
        verificationStatus: isFixed ? 'verified' : 'pending'
      }, 
      { new: true }
    );
  }

  const index = memoryErrors.findIndex(e => e._id.toString() === id.toString());
  if (index !== -1) {
    memoryErrors[index].isFixed = !!isFixed;
    memoryErrors[index].resolvedAt = isFixed ? new Date() : null;
    memoryErrors[index].fixedAt = isFixed ? new Date() : null;
    memoryErrors[index].verificationStatus = isFixed ? 'verified' : 'pending';
    return memoryErrors[index];
  }
  return null;
}

export async function getErrorById(id) {
  if (isDatabaseReady() && !id.toString().startsWith('memory-')) {
    return ErrorLog.findById(id).lean();
  }

  return memoryErrors.find(e => e._id.toString() === id.toString()) || null;
}

export async function verifyFix(id, updatedCode) {
  const original = await getErrorById(id);
  if (!original) return null;

  // AI-based verification: ask AI if the error still exists in updatedCode
  const result = await analyzeErrorWithAI(original.message, updatedCode);
  
  // If the AI explanation indicates it's fixed or doesn't find the same error
  const isFixed = !result.explanation.toLowerCase().includes('still exists') && 
                  !result.explanation.toLowerCase().includes('error occurs');

  const status = isFixed ? 'verified' : 'failed';
  
  const updateData = {
    updatedCode,
    isFixed,
    verificationStatus: status,
    fixedAt: isFixed ? new Date() : null
  };

  if (isDatabaseReady() && !id.toString().startsWith('memory-')) {
    return ErrorLog.findByIdAndUpdate(id, updateData, { new: true });
  }

  const index = memoryErrors.findIndex(e => e._id.toString() === id.toString());
  if (index !== -1) {
    Object.assign(memoryErrors[index], updateData);
    return memoryErrors[index];
  }
  return null;
}
