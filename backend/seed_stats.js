import { saveErrorAnalysis } from '../backend/services/historyService.js';
import { connectDatabase } from '../backend/services/databaseService.js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const fakeErrors = [
  { message: "ReferenceError: variable 'x' is not defined", isFixed: true },
  { message: "TypeError: Cannot read property 'map' of undefined", isFixed: false },
  { message: "SyntaxError: Unexpected token '}'", isFixed: true },
  { message: "MongoNetworkError: connection timed out", isFixed: false },
  { message: "TypeError: user.getName is not a function", isFixed: true },
  { message: "ReferenceError: config is not defined", isFixed: false },
  { message: "FetchError: failed to fetch resource", isFixed: true },
  { message: "TypeError: cannot read property 'id' of null", isFixed: false },
  { message: "ReferenceError: db is not defined", isFixed: true },
  { message: "ReferenceError: app is not defined", isFixed: true },
  { message: "ReferenceError: server is not defined", isFixed: true }
];

async function seedData() {
  await connectDatabase(process.env.MONGO_URI);
  console.log('Seeding data...');

  for (const err of fakeErrors) {
    await saveErrorAnalysis({
      message: err.message,
      explanation: "This is a seeded error for testing analytics.",
      fix: "Check your variable definitions.",
      exampleCode: "// Corrected code",
      isFixed: err.isFixed,
      source: "Test Suite",
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)) // Random time in last 24h
    });
  }

  console.log('Seeding complete.');
  process.exit(0);
}

seedData();
