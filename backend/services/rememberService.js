const crypto = require('crypto');
const { getDb } = require('../db/database.js');
const settings = require('../repositories/settingsRepository.js');
const { seal, unseal, canSeal } = require('../utils/secrets.js');

// "Keep me signed in" on this computer. A random token is kept sealed with the
// OS (utils/secrets.js) in the settings table; the database only stores its
// SHA-256 with the user and an expiry. Opening the app restores that user;
// logging out, deleting the account or the token expiring forgets it.

const SETTING = 'remembered_session';
const DAYS    = 30;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/** Drops this computer's remembered session, if any. */
function forget() {
  const token = unseal(settings.get(SETTING));
  if (token) getDb().prepare('DELETE FROM remembered_sessions WHERE token_hash = ?').run(hashToken(token));
  settings.remove(SETTING);
}

/** Remembers `userId` on this computer; returns false when the OS cannot seal the token. */
function remember(userId) {
  if (!canSeal()) return false;
  forget();
  const db = getDb();
  db.prepare("DELETE FROM remembered_sessions WHERE expires_at <= datetime('now')").run();
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare(`INSERT INTO remembered_sessions (token_hash, user_id, expires_at)
              VALUES (?, ?, datetime('now', '+${DAYS} days'))`).run(hashToken(token), userId);
  settings.set(SETTING, seal(token));
  return true;
}

/** The remembered user's id, renewing the expiry, or null. */
function restore() {
  const sealed = settings.get(SETTING);
  if (!sealed) return null;
  const token = unseal(sealed);
  const db = getDb();
  const row = token && db.prepare(`SELECT user_id FROM remembered_sessions
                                   WHERE token_hash = ? AND expires_at > datetime('now')`).get(hashToken(token));
  if (!row) { forget(); return null; }
  db.prepare(`UPDATE remembered_sessions SET expires_at = datetime('now', '+${DAYS} days')
              WHERE token_hash = ?`).run(hashToken(token));
  return row.user_id;
}

module.exports = { remember, restore, forget, DAYS };
