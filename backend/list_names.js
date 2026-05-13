import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

async function listNames() {
  const key = process.env.GEMINI_API_KEY;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    if (data.models) {
      data.models.forEach(m => console.log(m.name));
    } else {
      console.log('No models found:', data);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listNames();
