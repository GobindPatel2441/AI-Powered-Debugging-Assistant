import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

function mockAnalysis(errorMessage) {
  const normalized = errorMessage.toLowerCase();
  const isNullish = /null|undefined|cannot read|undefined/.test(normalized);
  const isNetwork = /timeout|failed to fetch|network|cors|connection/.test(normalized);

  if (isNullish) {
    return {
      explanation: 'The code is trying to read a value before it exists. This usually happens when async data has not loaded yet or a nested property is missing.',
      suggestedFix: 'Guard the value before reading it, provide a fallback, or move the logic after the async request resolves.',
      exampleCode: `const users = response?.data ?? [];\nconst names = users.map((user) => user.name);\n\nif (!currentUser?.id) {\n  throw new Error('currentUser.id is required before saving');\n}`
    };
  }

  if (isNetwork) {
    return {
      explanation: 'The application could not complete a network request. The service may be unreachable, slow, blocked by CORS, or configured with the wrong URL.',
      suggestedFix: 'Verify the API URL, server status, CORS configuration, and add timeout/retry handling around the request.',
      exampleCode: `const controller = new AbortController();\nconst timeout = setTimeout(() => controller.abort(), 5000);\n\ntry {\n  const res = await fetch('/api/resource', { signal: controller.signal });\n  if (!res.ok) throw new Error(\`API failed: \${res.status}\`);\n} finally {\n  clearTimeout(timeout);\n}`
    };
  }

  return {
    explanation: 'This error indicates the runtime hit an unexpected condition. The message and stack trace should be used to identify the failing module and the value or operation that caused it.',
    suggestedFix: 'Reproduce the error with the smallest input, inspect the stack frame where it starts, validate inputs, and add a targeted guard or correction at the source.',
    exampleCode: `function assertRequired(value, name) {\n  if (value === undefined || value === null || value === '') {\n    throw new Error(\`\${name} is required\`);\n  }\n  return value;\n}\n\nconst configValue = assertRequired(process.env.CONFIG_VALUE, 'CONFIG_VALUE');`
  };
}

function parseAIContent(content, fallbackMessage) {
  try {
    // Some models might wrap JSON in code blocks
    const cleanContent = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    return {
      explanation: parsed.explanation || 'No explanation returned.',
      suggestedFix: parsed.suggestedFix || parsed.fix || 'No fix returned.',
      exampleCode: parsed.exampleCode || ''
    };
  } catch {
    return {
      explanation: content || 'No explanation returned.',
      suggestedFix: 'Review the explanation and apply the recommended code changes.',
      exampleCode: mockAnalysis(fallbackMessage).exampleCode
    };
  }
}

async function analyzeWithOpenAI(errorMessage, code = '') {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `Error: ${errorMessage}\n\nUser's Source Code:\n${code}\n\nInstructions:
  1. Explain the error simply.
  2. Provide a specific fix.
  3. In 'exampleCode', provide the FULLY CORRECTED version of the User's Source Code so they can copy-paste it directly.
  Return concise JSON with keys: explanation, suggestedFix, exampleCode.`;

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a technical lead. Your job is to fix the user\'s code. Always return the corrected code in the "exampleCode" field.'
      },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  });

  return parseAIContent(completion.choices?.[0]?.message?.content, errorMessage);
}

async function analyzeWithGemini(errorMessage, code = '') {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
    generationConfig: { responseMimeType: 'application/json' }
  });



  const prompt = `Analyze this error and fix the provided code.
  
  Error Message: ${errorMessage}
  Original Source Code: ${code}

  Return a JSON object with:
  - "explanation": Why it failed.
  - "suggestedFix": What was changed.
  - "exampleCode": The COMPLETE FIXED VERSION of the Original Source Code. It must be a drop-in replacement.
  
  JSON Keys: explanation, suggestedFix, exampleCode.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return parseAIContent(response.text(), errorMessage);
}

async function analyzeWithOllama(errorMessage, code = '') {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3';
  const prompt = `Return a JSON object explaining this error and providing a full code fix. 
  Keys: "explanation", "suggestedFix", "exampleCode".
  "exampleCode" must be the full corrected version of this source code: ${code}.
  Error: ${errorMessage}`;

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: 'json'
    })
  });

  if (!response.ok) throw new Error('Ollama request failed');
  const data = await response.json();
  return parseAIContent(data.response, errorMessage);
}


import { getSettings } from './settingsService.js';

export async function analyzeErrorWithAI(errorMessage, code = '') {
  let provider = 'openai';
  try {
    const settings = await getSettings();
    provider = settings.preferences?.aiProvider || process.env.AI_PROVIDER || 'openai';
  } catch {
    provider = process.env.AI_PROVIDER || 'openai';
  }

  provider = provider.toLowerCase();

  try {
    if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
      return await analyzeWithGemini(errorMessage, code);
    }
    if (provider === 'ollama') {
      return await analyzeWithOllama(errorMessage, code);
    }
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      return await analyzeWithOpenAI(errorMessage, code);
    }
  } catch (error) {
    console.error(`AI analysis failed with ${provider}:`, error.message);
  }

  return mockAnalysis(errorMessage);
}



