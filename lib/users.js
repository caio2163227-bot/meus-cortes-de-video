import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { DATA_DIR } from './jobIndex';

const USERS_PATH = path.join(DATA_DIR, 'users.json');

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getAllUsers() {
  if (!fs.existsSync(USERS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveAllUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

export function findUserByEmail(email) {
  return getAllUsers().find((u) => u.email === email) || null;
}

// Cria a conta com a senha já com hash — nunca guarda a senha em texto puro.
export async function createUser({ name, email, password }) {
  const users = getAllUsers();
  if (users.some((u) => u.email === email)) {
    throw new Error('EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: uuid(),
    name,
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  saveAllUsers(users);

  return { id: user.id, name: user.name, email: user.email };
}

export async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.passwordHash);
}
