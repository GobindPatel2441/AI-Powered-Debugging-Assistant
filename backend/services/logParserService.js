const ERROR_PATTERN = /\b(error|exception|failed|failure|fatal|critical|traceback|typeerror|referenceerror|syntaxerror|timeout|cannot|uncaught|warn|warning)\b/i;

function detectSeverity(line) {
  if (/\b(fatal|critical|uncaught)\b/i.test(line)) return 'CRITICAL';
  if (/\b(error|exception|failed|failure|typeerror|referenceerror|syntaxerror|timeout)\b/i.test(line)) return 'ERROR';
  if (/\b(warn|warning)\b/i.test(line)) return 'WARNING';
  return 'INFO';
}

function parseJsonLog(text) {
  try {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows
      .map((row, index) => {
        const message = row.message || row.error || row.msg || JSON.stringify(row);
        return {
          lineNumber: index + 1,
          severity: String(row.level || row.severity || detectSeverity(message)).toUpperCase(),
          message,
          raw: JSON.stringify(row)
        };
      })
      .filter((row) => ERROR_PATTERN.test(row.message));
  } catch {
    return null;
  }
}

export function parseLogContent(text, filename = '') {
  if (filename.toLowerCase().endsWith('.json')) {
    const jsonRows = parseJsonLog(text);
    if (jsonRows) return jsonRows;
  }

  return text
    .split(/\r?\n/)
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => ERROR_PATTERN.test(line))
    .map(({ line, index }) => ({
      lineNumber: index + 1,
      severity: detectSeverity(line),
      message: line.trim().replace(/^\[[^\]]+\]\s*/, ''),
      raw: line
    }));
}
