import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  name: String,
  type: String,
  size: Number,
  language: String
}, { _id: false });

const issueSchema = new mongoose.Schema({
  title: String,
  message: String,
  severity: {
    type: String,
    enum: ['CRITICAL', 'WARNING', 'INFO'],
    default: 'INFO'
  },
  file: String,
  line: Number,
  column: Number,
  language: String,
  codeSnippet: String,
  timestamp: String,
  explanation: String,
  suggestedFix: String,
  correctedCode: String
}, { _id: true });

const uploadAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['UPLOADING', 'PARSING', 'ANALYZING', 'COMPLETED', 'FAILED'],
    default: 'UPLOADING'
  },
  analyzedFiles: { type: [fileSchema], default: [] },
  issues: [issueSchema],
  totalIssues: { type: Number, default: 0 },
  criticalIssues: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Avoid model recompilation errors
const UploadAnalysis = mongoose.models.UploadAnalysis || mongoose.model('UploadAnalysis', uploadAnalysisSchema);
export default UploadAnalysis;
