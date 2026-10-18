const path = require('path');

const frontendModules = path.resolve(__dirname, '../../frontend/node_modules');
if (!module.paths.includes(frontendModules)) {
  module.paths.unshift(frontendModules);
}

const bcrypt   = require('bcryptjs');
const userRepo = require('../repositories/userRepository.js');

const EMAIL_RE        = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS     = 10;
const MIN_PASSWORD    = 6;
const MAX_PASSWORD    = 128;
const MAX_NAME        = 60;
// Avatars are stored as data URLs (resized in the renderer), so cap their size.
const MAX_AVATAR_CHARS = 400_000;
const AVATAR_RE        = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

function stripHash(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

function validateName(name) {
  if (typeof name !== 'string' || name.trim() === '') throw new Error('El nombre es obligatorio.');
  if (name.trim().length > MAX_NAME) throw new Error(`El nombre debe tener como máximo ${MAX_NAME} caracteres.`);
  return name.trim();
}

function validatePassword(password, label = 'La contraseña') {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new Error(`${label} debe tener al menos ${MIN_PASSWORD} caracteres.`);
  }
  if (password.length > MAX_PASSWORD) {
    throw new Error(`${label} debe tener como máximo ${MAX_PASSWORD} caracteres.`);
  }
}

function validateAvatar(avatarUrl) {
  if (avatarUrl === null || avatarUrl === undefined) return null;
  if (typeof avatarUrl !== 'string' || !AVATAR_RE.test(avatarUrl)) {
    throw new Error('La foto debe ser una imagen PNG, JPEG o WebP.');
  }
  if (avatarUrl.length > MAX_AVATAR_CHARS) throw new Error('La foto es demasiado grande.');
  return avatarUrl;
}

function requireUser(userId) {
  const user = userRepo.findById(userId);
  if (!user) throw new Error('No se encontró el usuario.');
  return user;
}

async function verifyPassword(user, password) {
  const ok = typeof password === 'string' && await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error('La contraseña actual no es correcta.');
}

async function register(name, email, password) {
  const cleanName = validateName(name);
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw new Error('Escribe un correo electrónico válido.');
  }
  validatePassword(password);

  const cleanEmail = email.trim().toLowerCase();
  if (userRepo.findByEmail(cleanEmail)) throw new Error('Ya existe una cuenta con ese correo.');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = userRepo.create({ name: cleanName, email: cleanEmail, passwordHash });

  // Data saved before accounts existed belongs to the first account created.
  if (userRepo.count() === 1) userRepo.claimUnownedData(user.id);

  return stripHash(user);
}

async function login(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new Error('Correo o contraseña incorrectos.');
  }
  const user = userRepo.findByEmail(email.trim().toLowerCase());
  if (!user) throw new Error('Correo o contraseña incorrectos.');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new Error('Correo o contraseña incorrectos.');

  return stripHash(user);
}

function getCurrentUser(userId) {
  return stripHash(requireUser(userId));
}

/** Updates name and/or avatar. Pass `avatarUrl: null` to remove the avatar. */
function updateProfile(userId, data) {
  const user = requireUser(userId);
  if (!data || typeof data !== 'object') throw new Error('Los datos del perfil no son válidos.');
  const name      = 'name' in data ? validateName(data.name) : user.name;
  const avatarUrl = 'avatarUrl' in data ? validateAvatar(data.avatarUrl) : user.avatar_url;
  return stripHash(userRepo.updateProfile(userId, { name, avatarUrl }));
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = requireUser(userId);
  await verifyPassword(user, currentPassword);
  validatePassword(newPassword, 'La nueva contraseña');
  if (currentPassword === newPassword) throw new Error('La nueva contraseña debe ser distinta de la actual.');
  userRepo.updatePasswordHash(userId, await bcrypt.hash(newPassword, SALT_ROUNDS));
  return { ok: true };
}

/** Permanently deletes the account and all of its titles, records and lists. */
async function deleteAccount(userId, password) {
  const user = requireUser(userId);
  await verifyPassword(user, password);
  userRepo.remove(userId);
  return { deleted: true };
}

module.exports = {
  register, login, getCurrentUser, updateProfile, changePassword, deleteAccount,
  MIN_PASSWORD,
};
