import path from 'path';

const LANGUAGES = {
  '.js': 'JavaScript',
  '.ts': 'TypeScript',
  '.jsx': 'React JS',
  '.tsx': 'React TS',
  '.py': 'Python',
  '.java': 'Java',
  '.cpp': 'C++',
  '.rs': 'Rust',
  '.go': 'Go',
  '.log': 'Log File',
  '.json': 'JSON Log'
};

const ERROR_PATTERNS = [
  // Stack traces and common errors
  {
    regex: /(?:TypeError|ReferenceError|SyntaxError|Error|Exception|Traceback):\s*(.+)/i,
    severity: 'CRITICAL',
    title: (m) => m[1].trim().replace(/[')"]+$/, '')
  },
  // Python tracebacks
  {
    regex: /File\s+"([^"]+)",\s+line\s+(\d+),\s+in\s+(.+)/i,
    severity: 'ERROR',
    title: (m) => `Error in ${m[3].trim().replace(/[')"]+$/, '')}`,
    file: (m) => m[1],
    line: (m) => parseInt(m[2])
  },
  // Node.js stack lines
  {
    regex: /at\s+(.+)\s+\((.+):(\d+):(\d+)\)/i,
    severity: 'INFO',
    title: (m) => `Execution path: ${m[1]}`,
    file: (m) => m[2],
    line: (m) => parseInt(m[3])
  },
  // Log level patterns
  {
    regex: /\b(ERROR|FATAL|CRITICAL)\b[:\s]+(.+)/i,
    severity: 'CRITICAL',
    title: (m) => m[2].trim().replace(/[')"]+$/, '')
  },
  {
    regex: /\b(WARN|WARNING)\b[:\s]+(.+)/i,
    severity: 'WARNING',
    title: (m) => m[2].trim().replace(/[')"]+$/, '')
  }
];

export function detectLanguage(filename, content) {
  const ext = path.extname(filename).toLowerCase();
  if (LANGUAGES[ext]) return LANGUAGES[ext];

  // Heuristics
  if (content.includes('import ') || content.includes('const ') || content.includes('function ')) return 'JavaScript';
  if (content.includes('def ') || content.includes('import os')) return 'Python';
  if (content.includes('public class ')) return 'Java';
  
  return 'Unknown';
}

export function extractIssues(content, filename, language) {
  const lines = content.split(/\r?\n/);
  const issues = [];

  lines.forEach((line, index) => {
    for (const pattern of ERROR_PATTERNS) {
      const match = line.match(pattern.regex);
      if (match) {
        issues.push({
          title: pattern.title(match),
          message: line.trim(),
          severity: pattern.severity,
          file: pattern.file ? pattern.file(match) : filename,
          line: pattern.line ? pattern.line(match) : index + 1,
          language,
          codeSnippet: getSnippet(lines, index),
          timestamp: new Date().toISOString()
        });
        break; // Only one issue per line
      }
    }
  });

  return issues;
}

function getSnippet(lines, index) {
  const start = Math.max(0, index - 2);
  const end = Math.min(lines.length, index + 3);
  return lines.slice(start, end).join('\n');
}
