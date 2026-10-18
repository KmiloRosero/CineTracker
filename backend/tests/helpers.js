const fs   = require('fs');
const os   = require('os');
const path = require('path');

const database = require('../db/database.js');

/**
 * Opens a fresh SQLite file in a temp folder for one test file.
 * Returns a cleanup function to call in afterAll.
 */
function useTempDatabase() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetracker-test-'));
  const dbPath = path.join(dir, 'test.db');
  database.initDatabase(dbPath);
  return {
    dbPath,
    db: database.getDb(),
    cleanup() {
      database.closeDatabase();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

const authService = require('../services/authService.js');
let counter = 0;

/** Registers a user with a unique email and returns it. */
function createUser(name = 'Test User') {
  counter += 1;
  return authService.register(name, `user${counter}-${Date.now()}@test.co`, 'secret123');
}

module.exports = { useTempDatabase, createUser };
