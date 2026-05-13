import { readUsers, writeUsers, ensureDataDir } from '../services/storageService.js';
import bcrypt from 'bcryptjs';

async function seed() {
  await ensureDataDir();
  const users = await readUsers();
  
  const testEmail = 'test@debugai.com';
  const existing = users.find(u => u.email === testEmail);
  
  if (!existing) {
    const passwordHash = await bcrypt.hash('Password123!', 12);
    users.push({
      id: 'test-user-id-001',
      fullName: 'Test User',
      email: testEmail,
      passwordHash: passwordHash,
      biography: 'Cyber-security specialist and DebugAI pioneer.',
      profileImage: '',
      workspaceLogo: '',
      preferences: {
        theme: 'dark',
        accent: 'primary',
        tokenRotation: true,
        aiProvider: 'gemini',
        notifications: {
          criticalErrors: true,
          weeklyReport: false,
          slackIntegration: true
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await writeUsers(users);
    console.log('Test user seeded successfully');
  } else {
    console.log('Test user already exists');
  }
}

seed().catch(console.error);
