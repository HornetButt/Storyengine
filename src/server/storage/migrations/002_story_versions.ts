import Database from 'better-sqlite3';
import { Migration } from './migrationRunner';

export const migration002: Migration = {
  version: 2,
  name: 'story_versions',
  up: (db: Database.Database) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS story_versions (
        id TEXT PRIMARY KEY,
        story_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        data TEXT NOT NULL,
        reason TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (story_id) REFERENCES stories_full(id) ON DELETE CASCADE,
        UNIQUE(story_id, version)
      );
      CREATE INDEX IF NOT EXISTS idx_story_versions_story_id ON story_versions(story_id);
      CREATE INDEX IF NOT EXISTS idx_story_versions_created_at ON story_versions(created_at);
    `);
  },
};
