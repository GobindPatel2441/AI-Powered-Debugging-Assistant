import fs from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../data');
const USERS_FILE = resolve(DATA_DIR, 'users.json');

export async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {}
}

export async function readUsers() {
  await ensureDataDir();
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

export async function writeUsers(users) {
  await ensureDataDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}
