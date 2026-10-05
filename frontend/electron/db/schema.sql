PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS titles (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id          INTEGER UNIQUE,
  type             TEXT NOT NULL CHECK(type IN ('movie', 'series')),
  title            TEXT NOT NULL,
  original_title   TEXT,
  overview         TEXT,
  poster_path      TEXT,
  backdrop_path    TEXT,
  release_year     INTEGER,
  genres           TEXT,
  runtime          INTEGER,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK(status IN ('pending', 'watching', 'completed', 'dropped')),
  rating           REAL CHECK(rating BETWEEN 0 AND 10),
  notes            TEXT,
  added_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS records (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title_id     INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  watched_date TEXT NOT NULL DEFAULT (datetime('now')),
  rating       REAL CHECK(rating BETWEEN 0 AND 10),
  platform     TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK(status IN ('pending', 'watching', 'completed', 'dropped')),
  note         TEXT
);

CREATE TABLE IF NOT EXISTS lists (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS list_titles (
  list_id  INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  title_id INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (list_id, title_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark');

CREATE TRIGGER IF NOT EXISTS titles_updated_at
AFTER UPDATE ON titles
BEGIN
  UPDATE titles SET updated_at = datetime('now') WHERE id = NEW.id;
END;
