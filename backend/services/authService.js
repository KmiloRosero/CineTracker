const path = require('path');

const frontendModules = path.resolve(__dirname, '../../frontend/node_modules');
if (!module.paths.includes(frontendModules)) {
  module.paths.unshift(frontendModules);
}

const bcrypt       = require('bcryptjs');
const userRepo     = require('../repositories/userRepository.js');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;

function stripHash(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

function validateRegisterInput(name, email, password) {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new Error('Name is required.');
  }
  if (!email || !EMAIL_RE.test(email)) {
    throw new Error('A valid email address is required.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
}

async function register(name, email, password) {
  validateRegisterInput(name, email, password);

  const existing = userRepo.findByEmail(email);
  if (existing) throw new Error('An account with that email already exists.');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = userRepo.create({ name: name.trim(), email: email.toLowerCase(), passwordHash });
  return stripHash(user);
}

async function login(email, password) {
  if (!email || !password) throw new Error('Invalid email or password.');

  const user = userRepo.findByEmail(email.toLowerCase());
  if (!user) throw new Error('Invalid email or password.');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new Error('Invalid email or password.');

  return stripHash(user);
}

function getCurrentUser(userId) {
  const user = userRepo.findById(userId);
  if (!user) throw new Error('User not found.');
  return stripHash(user);
}

module.exports = { register, login, getCurrentUser };
