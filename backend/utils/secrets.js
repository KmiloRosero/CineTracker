// Values that must not sit in plain text on disk (API keys typed in the app,
// the "keep me signed in" token) are sealed with the operating system's
// encryption: Electron's safeStorage (DPAPI on Windows, Keychain on macOS),
// configured by the main process. Sealed values only open for the same OS
// user on the same machine, so a copied database does not carry them along.

let cipher = null; // { encrypt(string) -> Buffer, decrypt(Buffer) -> string }

/** Called by electron/main.js once safeStorage is available (tests pass a fake). */
function configureSecrets(nextCipher) {
  cipher = nextCipher;
}

function canSeal() {
  return cipher !== null;
}

/** Encrypts `plain` to base64; throws when the OS offers no encryption. */
function seal(plain) {
  if (!cipher) throw new Error('Este equipo no permite guardar datos cifrados.');
  return Buffer.from(cipher.encrypt(String(plain))).toString('base64');
}

/** Decrypts a sealed value, or null if it cannot be opened here. */
function unseal(sealed) {
  if (!cipher || typeof sealed !== 'string' || !sealed) return null;
  try {
    return cipher.decrypt(Buffer.from(sealed, 'base64'));
  } catch {
    return null;
  }
}

module.exports = { configureSecrets, canSeal, seal, unseal };
