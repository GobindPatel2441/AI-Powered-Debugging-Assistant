import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

async function listModels() {
  const key = process.env.GEMINI_API_KEY;
  try {
    const genAI = new GoogleGenerativeAI(key);
    // There is no direct listModels in the SDK for some versions, but let's try the fetch approach
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    console.log('Available Models:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listModels();
