import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });


async function testGemini() {
  const key = process.env.GEMINI_API_KEY;
  console.log('Using Key:', key);
  
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-latest',
      generationConfig: { responseMimeType: 'application/json' }
    });




    const prompt = 'Return a JSON object with key "test" and value "ok".';
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log('Response:', response.text());
  } catch (error) {
    console.error('Gemini Error:', error.message);
  }
}

testGemini();
