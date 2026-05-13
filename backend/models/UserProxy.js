import UserMongoose from './User.js';
import { isDatabaseReady } from '../services/databaseService.js';
import { readUsers, writeUsers } from '../services/storageService.js';
import bcrypt from 'bcryptjs';

class MockUser {
  constructor(data) {
    this._id = data.id || Math.random().toString(36).substring(2, 15);
    this.fullName = data.fullName;
    this.email = data.email;
    this.passwordHash = data.passwordHash;
    this.biography = data.biography || '';
    this.profileImage = data.profileImage || '';
    this.workspaceLogo = data.workspaceLogo || '';
    this.preferences = data.preferences || {
      theme: 'dark',
      accent: 'primary',
      tokenRotation: true,
      aiProvider: 'gemini',
      notifications: {
        criticalErrors: true,
        weeklyReport: false,
        slackIntegration: true
      }
    };
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this._isNew = !data.id;
  }

  async save() {
    const users = await readUsers();
    if (this._isNew) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
      users.push(this.toJSON());
    } else {
      const idx = users.findIndex(u => u.id === this._id);
      if (idx !== -1) {
        users[idx] = this.toJSON();
      }
    }
    await writeUsers(users);
    this._isNew = false;
    return this;
  }

  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  }

  toProfile() {
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
  }

  toJSON() {
    return {
      id: this._id,
      fullName: this.fullName,
      email: this.email,
      passwordHash: this.passwordHash,
      biography: this.biography,
      profileImage: this.profileImage,
      workspaceLogo: this.workspaceLogo,
      preferences: this.preferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static async findOne(query) {
    const users = await readUsers();
    if (query.email) {
      const u = users.find(u => u.email === query.email.toLowerCase().trim());
      return u ? new MockUser(u) : null;
    }
    if (query._id) {
      const u = users.find(u => u.id === query._id);
      return u ? new MockUser(u) : null;
    }
    return null;
  }

  static async findById(id) {
    return this.findOne({ _id: id });
  }
}

const UserProxy = {
  findOne: (...args) => isDatabaseReady() ? UserMongoose.findOne(...args) : MockUser.findOne(...args),
  findById: (...args) => isDatabaseReady() ? UserMongoose.findById(...args) : MockUser.findById(...args),
  create: async (data) => {
    if (isDatabaseReady()) {
      const u = new UserMongoose(data);
      await u.save();
      return u;
    } else {
      const u = new MockUser(data);
      await u.save();
      return u;
    }
  },
  // This allows 'new User()' syntax to work if we export a constructor-like function
  MockUser: MockUser,
  MongooseUser: UserMongoose
};

export default UserProxy;
