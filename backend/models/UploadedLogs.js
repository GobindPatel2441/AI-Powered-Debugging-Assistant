import mongoose from 'mongoose';

const parsedErrorSchema = new mongoose.Schema(
  {
    lineNumber: Number,
    severity: String,
    message: String,
    raw: String
  },
  { _id: false }
);

const uploadedLogsSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  parsedErrors: {
    type: [parsedErrorSchema],
    default: []
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('UploadedLogs', uploadedLogsSchema);
