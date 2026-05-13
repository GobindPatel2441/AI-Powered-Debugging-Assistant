import { getDashboardStats } from './services/historyService.js';
import { connectDatabase } from './services/databaseService.js';
import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });


async function testStats() {
  await connectDatabase(process.env.MONGO_URI);
  try {
    const stats = await getDashboardStats();
    console.log('Stats:', JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testStats();
