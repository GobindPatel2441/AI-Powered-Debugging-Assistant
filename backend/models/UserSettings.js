import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'default',
    unique: true
  },
  profile: {
    fullName: { type: String, default: 'Alex Chen' },
    email: { type: String, default: 'alex.chen@debugai.tech' },
    biography: {
      type: String,
      default: 'Senior Backend Engineer specializing in distributed systems and automated error remediation.'
    }
  },
  preferences: {
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    accent: { type: String, enum: ['primary', 'secondary', 'tertiary', 'error'], default: 'primary' },
    tokenRotation: { type: Boolean, default: true },
    notifications: {
      criticalErrors: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: false },
      slackIntegration: { type: Boolean, default: true }
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('UserSettings', userSettingsSchema);
