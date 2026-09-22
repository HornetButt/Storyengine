import Database from 'better-sqlite3';
import { Migration } from './migrationRunner';

export const migration001: Migration = {
  version: 1,
  name: 'initial_schema',
  up: (db: Database.Database) => {
    // 1. Universes
    db.exec(`
      CREATE TABLE IF NOT EXISTS universes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        genre TEXT,
        era TEXT,
        tags TEXT,
        rules TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 2. Characters
    db.exec(`
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        universe_id TEXT NOT NULL,
        canonical_name TEXT NOT NULL,
        aliases TEXT,
        occupation TEXT,
        age TEXT,
        role TEXT,
        gender TEXT,
        tags TEXT,
        status TEXT NOT NULL DEFAULT 'alive',
        description TEXT,
        biography TEXT,
        personality TEXT,
        appearance TEXT,
        states TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_characters_universe_id ON characters(universe_id);
    `);

    // 3. Locations
    db.exec(`
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        universe_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT,
        type TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_locations_universe_id ON locations(universe_id);
    `);

    // 4. Events
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        universe_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        year INTEGER NOT NULL,
        date_start TEXT,
        date_end TEXT,
        location_id TEXT,
        canon_status TEXT NOT NULL DEFAULT 'canon',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_events_universe_id ON events(universe_id);
      CREATE INDEX IF NOT EXISTS idx_events_year ON events(year);
    `);

    // 5. Objects
    db.exec(`
      CREATE TABLE IF NOT EXISTS objects (
        id TEXT PRIMARY KEY,
        universe_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        current_location_id TEXT,
        properties TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_objects_universe_id ON objects(universe_id);
    `);

    // 6. Relationships
    db.exec(`
      CREATE TABLE IF NOT EXISTS relationships (
        id TEXT PRIMARY KEY,
        universe_id TEXT,
        source_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        description TEXT,
        notes TEXT,
        confidence REAL NOT NULL DEFAULT 1.0,
        canon_status TEXT NOT NULL DEFAULT 'canon',
        provenance TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_relationships_universe_id ON relationships(universe_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_id);
    `);

    // 7. Stories (Projection / Legacy)
    db.exec(`
      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        universe_id TEXT NOT NULL,
        plan_id TEXT,
        title TEXT NOT NULL,
        synopsis TEXT,
        full_text TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        canon_status TEXT NOT NULL DEFAULT 'draft',
        story_date TEXT,
        story_year INTEGER,
        consistency_status TEXT,
        consistency_report TEXT,
        character_ids TEXT,
        location_ids TEXT,
        event_ids TEXT,
        versions TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_stories_universe_id ON stories(universe_id);
    `);

    // 8. Story Plans
    db.exec(`
      CREATE TABLE IF NOT EXISTS story_plans (
        id TEXT PRIMARY KEY,
        universe_id TEXT NOT NULL,
        story_year INTEGER,
        title TEXT NOT NULL,
        premise TEXT,
        genre TEXT,
        tone TEXT,
        selected_character_ids TEXT,
        selected_location_ids TEXT,
        selected_object_ids TEXT,
        scenes TEXT,
        plot_twists TEXT,
        canon_notes TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_story_plans_universe_id ON story_plans(universe_id);
    `);

    // 9. Proposed Changes
    db.exec(`
      CREATE TABLE IF NOT EXISTS proposed_changes (
        id TEXT PRIMARY KEY,
        story_id TEXT,
        universe_id TEXT,
        entity_type TEXT NOT NULL,
        change_type TEXT,
        action TEXT,
        target_name TEXT,
        summary TEXT,
        reasoning TEXT,
        details TEXT,
        payload TEXT,
        confidence REAL NOT NULL DEFAULT 1.0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_proposed_changes_status ON proposed_changes(status);
      CREATE INDEX IF NOT EXISTS idx_proposed_changes_universe_id ON proposed_changes(universe_id);
    `);

    // 10. LLM Config
    db.exec(`
      CREATE TABLE IF NOT EXISTS llm_config (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        base_url TEXT,
        api_key TEXT,
        temperature REAL NOT NULL DEFAULT 0.7,
        max_tokens INTEGER NOT NULL DEFAULT 4096,
        is_local INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
    `);

    // 11. Lorebook Entries
    db.exec(`
      CREATE TABLE IF NOT EXISTS lorebook_entries (
        id TEXT PRIMARY KEY,
        universe_id TEXT NOT NULL,
        title TEXT NOT NULL,
        keys TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        constant INTEGER NOT NULL DEFAULT 0,
        priority INTEGER NOT NULL DEFAULT 10,
        entity_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_lorebook_universe_id ON lorebook_entries(universe_id);
    `);

    // 12. Stories Full (Domain Model Aggregate Root)
    db.exec(`
      CREATE TABLE IF NOT EXISTS stories_full (
        id TEXT PRIMARY KEY,
        universe_id TEXT NOT NULL,
        title TEXT NOT NULL,
        data TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_stories_full_universe_id ON stories_full(universe_id);
    `);
  },
};
