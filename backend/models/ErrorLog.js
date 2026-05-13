import mongoose from 'mongoose';

const errorLogSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    default: ''
  },
  updatedCode: {
    type: String,
    default: ''
  },
  errorType: {
    type: String,
    default: 'Unknown'
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  explanation: {
    type: String,
    required: true
  },
  fix: {
    type: String,
    required: true
  },
  exampleCode: {
    type: String,
    default: ''
  },
  isFixed: {
    type: Boolean,
    default: false
  },
  fixedAt: {
    type: Date
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'pending'
  },
  source: {
    type: String,
    default: 'Manual Analysis'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  }
});




export default mongoose.model('ErrorLog', errorLogSchema);
