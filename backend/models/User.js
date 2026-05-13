import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  biography: { type: String, default: '' },
  profileImage: { type: String, default: '' },
  workspaceLogo: { type: String, default: '' },
  preferences: {
    theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
    accent: { type: String, enum: ['primary', 'secondary', 'tertiary', 'error'], default: 'primary' },
    tokenRotation: { type: Boolean, default: true },
    aiProvider: { type: String, default: 'gemini' },
    notifications: {
      criticalErrors: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: false },
      slackIntegration: { type: Boolean, default: true }
    }
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Return safe profile (no password)
userSchema.methods.toProfile = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    biography: this.biography,
    profileImage: this.profileImage,
    workspaceLogo: this.workspaceLogo,
    preferences: this.preferences,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export default mongoose.model('User', userSchema);
