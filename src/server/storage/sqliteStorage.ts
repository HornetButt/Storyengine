import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import {
  Universe,
  Character,
  StoryLocation,
  StoryEvent,
  StoryObject,
  Story,
  StoryPlan,
  ProposedKnowledgeChange,
  Relationship,
  LLMConfig,
  LorebookEntry,
} from '../../types';
import { FullStory } from '../../domain/storyModel';
import {
  legacyStoryToFullStory,
  fullStoryToLegacyStory,
} from '../../domain/adapters';
import {
  StoryStorage,
  SaveFullStoryOptions,
  StoryVersionRecord,
  StorageStats,
  UniverseExport,
  ImportOptions,
  ImportResult,
  NotFoundError,
  ValidationError,
  RevisionConflictError,
  ImportError,
} from './types';
import { MigrationRunner } from './migrations/migrationRunner';
import { migration001 } from './migrations/001_initial';
import { migration002 } from './migrations/002_story_versions';
import { initialData } from './initialData';

export class SQLiteStorage implements StoryStorage {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string = './data/storyengine.db') {
    this.dbPath = dbPath;

    // 1. Prepare directory structure if on filesystem
    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(path.resolve(this.dbPath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const backupsDir = path.join(dir, 'backups');
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }
    }

    // 2. Open SQLite connection once (singleton pattern for app lifetime)
    this.db = new Database(this.dbPath);

    // 3. Configure robust PRAGMAs
    if (this.dbPath !== ':memory:') {
      this.db.pragma('journal_mode = WAL');
    }
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('synchronous = NORMAL');

    const pragmaCheck = {
      journal_mode: this.db.pragma('journal_mode', { simple: true }),
      foreign_keys: this.db.pragma('foreign_keys', { simple: true }),
      busy_timeout: this.db.pragma('busy_timeout', { simple: true }),
      synchronous: this.db.pragma('synchronous', { simple: true }),
    };
    console.log('[Storage] SQLite initialized with pragmas:', pragmaCheck);

    // 4. Run Schema Migrations
    const runner = new MigrationRunner(this.db, [migration001, migration002]);
    runner.run();

    // 5. Seed initial canonical data if database is fresh and empty
    this.ensureInitialData();
  }

  // --- Initial Data Seeding ---

  private ensureInitialData(): void {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM universes').get() as {
      count: number;
    };
    if (row && row.count > 0) {
      return;
    }

    console.log('[Storage] Database is empty. Seeding initial canonical dataset...');
    const seedTransaction = this.db.transaction(() => {
      // LLM Config
      this.db
        .prepare(
          `INSERT OR REPLACE INTO llm_config 
          (id, provider, model, base_url, api_key, temperature, max_tokens, is_local, updated_at) 
          VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          initialData.llmConfig.provider,
          initialData.llmConfig.model,
          initialData.llmConfig.baseUrl || '',
          initialData.llmConfig.apiKey || '',
          initialData.llmConfig.temperature,
          initialData.llmConfig.maxTokens,
          initialData.llmConfig.isLocal ? 1 : 0,
          new Date().toISOString()
        );

      // Universes
      const insertUni = this.db.prepare(`
        INSERT INTO universes (id, name, description, genre, era, tags, rules, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const uni of initialData.universes) {
        insertUni.run(
          uni.id,
          uni.name,
          uni.description,
          uni.genre,
          uni.era || '',
          JSON.stringify(uni.tags || []),
          JSON.stringify(uni.rules || []),
          uni.status || 'active',
          uni.createdAt,
          uni.updatedAt
        );
      }

      // Characters
      const insertChar = this.db.prepare(`
        INSERT INTO characters 
        (id, universe_id, canonical_name, aliases, occupation, age, role, gender, tags, status, description, biography, personality, appearance, states, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const char of initialData.characters) {
        insertChar.run(
          char.id,
          char.universeId,
          char.canonicalName,
          JSON.stringify(char.aliases || []),
          char.occupation || '',
          char.age || '',
          char.role || 'supporting',
          char.gender || '',
          JSON.stringify(char.tags || []),
          char.status || 'alive',
          char.description || '',
          char.biography || '',
          char.personality || '',
          char.appearance || '',
          JSON.stringify(char.states || []),
          char.createdAt,
          char.updatedAt
        );
      }

      // Locations
      const insertLoc = this.db.prepare(`
        INSERT INTO locations (id, universe_id, name, description, status, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const loc of initialData.locations) {
        insertLoc.run(
          loc.id,
          loc.universeId,
          loc.name,
          loc.description || '',
          loc.status || 'intact',
          loc.type || '',
          loc.createdAt,
          loc.updatedAt
        );
      }

      // Events
      const insertEvt = this.db.prepare(`
        INSERT INTO events (id, universe_id, title, description, year, date_start, date_end, location_id, canon_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const evt of initialData.events) {
        insertEvt.run(
          evt.id,
          evt.universeId,
          evt.title,
          evt.description || '',
          evt.year,
          evt.dateStart || '',
          evt.dateEnd || '',
          evt.locationId || null,
          evt.canonStatus || 'canon',
          evt.createdAt,
          evt.updatedAt
        );
      }

      // Objects
      const insertObj = this.db.prepare(`
        INSERT INTO objects (id, universe_id, name, description, current_location_id, properties, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const obj of initialData.objects) {
        insertObj.run(
          obj.id,
          obj.universeId,
          obj.name,
          obj.description || '',
          obj.currentLocationId || null,
          JSON.stringify(obj.properties || {}),
          obj.createdAt,
          obj.updatedAt
        );
      }

      // Relationships
      const insertRel = this.db.prepare(`
        INSERT INTO relationships 
        (id, universe_id, source_id, source_type, target_id, target_type, relation_type, description, notes, confidence, canon_status, provenance, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const rel of initialData.relationships) {
        insertRel.run(
          rel.id,
          rel.universeId || 'uni-main',
          rel.sourceId,
          rel.sourceType,
          rel.targetId,
          rel.targetType,
          rel.relationType,
          rel.description || '',
          rel.notes || '',
          rel.confidence ?? 1.0,
          rel.canonStatus || 'canon',
          rel.provenance || 'seed',
          rel.createdAt
        );
      }

      // Stories & Stories Full
      const insertStory = this.db.prepare(`
        INSERT INTO stories 
        (id, universe_id, plan_id, title, synopsis, full_text, status, canon_status, story_date, story_year, consistency_status, consistency_report, character_ids, location_ids, event_ids, versions, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertFullStory = this.db.prepare(`
        INSERT INTO stories_full (id, universe_id, title, data, revision, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `);
      const insertStoryVer = this.db.prepare(`
        INSERT INTO story_versions (id, story_id, version, data, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const st of initialData.stories) {
        insertStory.run(
          st.id,
          st.universeId,
          st.planId || null,
          st.title,
          st.synopsis,
          st.fullText,
          st.status,
          st.canonStatus,
          st.storyDate,
          st.storyYear,
          st.consistencyStatus || 'not_checked',
          JSON.stringify(st.consistencyReport || null),
          JSON.stringify(st.characterIds || []),
          JSON.stringify(st.locationIds || []),
          JSON.stringify(st.eventIds || []),
          JSON.stringify(st.versions || []),
          st.createdAt,
          st.updatedAt
        );

        // Convert to FullStory representation and store in stories_full
        const universe =
          initialData.universes.find((u) => u.id === st.universeId) ||
          initialData.universes[0];
        const chars = initialData.characters.filter((c) => c.universeId === st.universeId);
        const locs = initialData.locations.filter((l) => l.universeId === st.universeId);
        const full = legacyStoryToFullStory(st, universe, chars, locs);

        insertFullStory.run(
          full.id,
          full.universeId,
          full.title,
          JSON.stringify(full),
          full.createdAt,
          full.updatedAt
        );

        // Seed initial story version
        insertStoryVer.run(
          `ver-${full.id}-1`,
          full.id,
          1,
          JSON.stringify(full),
          'Начальная каноническая редакция',
          st.createdAt
        );
      }

      // Proposed Changes
      const insertProp = this.db.prepare(`
        INSERT INTO proposed_changes 
        (id, story_id, universe_id, entity_type, change_type, action, target_name, summary, reasoning, details, payload, confidence, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const prop of initialData.proposedChanges) {
        insertProp.run(
          prop.id,
          prop.storyId || null,
          prop.universeId || 'uni-main',
          prop.entityType,
          prop.changeType || 'create',
          prop.action || '',
          prop.targetName || '',
          prop.summary || '',
          prop.reasoning || '',
          JSON.stringify(prop.details || {}),
          JSON.stringify(prop.payload || {}),
          prop.confidence ?? 1.0,
          prop.status || 'pending',
          prop.createdAt
        );
      }

      // Story Plans
      const insertPlan = this.db.prepare(`
        INSERT INTO story_plans 
        (id, universe_id, story_year, title, premise, genre, tone, selected_character_ids, selected_location_ids, selected_object_ids, scenes, plot_twists, canon_notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const plan of initialData.storyPlans) {
        insertPlan.run(
          plan.id,
          plan.universeId,
          plan.storyYear || 2024,
          plan.title,
          plan.premise,
          plan.genre,
          plan.tone,
          JSON.stringify(plan.selectedCharacterIds || []),
          JSON.stringify(plan.selectedLocationIds || []),
          JSON.stringify(plan.selectedObjectIds || []),
          JSON.stringify(plan.scenes || []),
          JSON.stringify(plan.plotTwists || []),
          JSON.stringify(plan.canonNotes || []),
          plan.status || 'draft',
          plan.createdAt,
          plan.updatedAt
        );
      }
    });

    seedTransaction();
    console.log('[Storage] Initial canonical dataset seeded successfully.');
  }

  // --- Universes ---

  getUniverses(): Universe[] {
    const rows = this.db
      .prepare('SELECT * FROM universes ORDER BY created_at ASC')
      .all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      genre: r.genre,
      era: r.era,
      tags: JSON.parse(r.tags || '[]'),
      rules: JSON.parse(r.rules || '[]'),
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  getUniverse(id: string): Universe | null {
    const r = this.db.prepare('SELECT * FROM universes WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      genre: r.genre,
      era: r.era,
      tags: JSON.parse(r.tags || '[]'),
      rules: JSON.parse(r.rules || '[]'),
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  createUniverse(
    universe: Omit<Universe, 'id' | 'createdAt' | 'updatedAt'> | Universe
  ): Universe {
    const now = new Date().toISOString();
    const id =
      'id' in universe && universe.id
        ? universe.id
        : `uni-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newUni: Universe = {
      ...universe,
      id,
      tags: universe.tags || [],
      rules: universe.rules || [],
      status: universe.status || 'active',
      createdAt: 'createdAt' in universe && universe.createdAt ? universe.createdAt : now,
      updatedAt: 'updatedAt' in universe && universe.updatedAt ? universe.updatedAt : now,
    };

    this.db
      .prepare(
        `INSERT INTO universes (id, name, description, genre, era, tags, rules, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newUni.id,
        newUni.name,
        newUni.description || '',
        newUni.genre || '',
        newUni.era || '',
        JSON.stringify(newUni.tags),
        JSON.stringify(newUni.rules),
        newUni.status,
        newUni.createdAt,
        newUni.updatedAt
      );

    return newUni;
  }

  updateUniverse(id: string, updates: Partial<Universe>): Universe | null {
    const existing = this.getUniverse(id);
    if (!existing) return null;

    const updated: Universe = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.db
      .prepare(
        `UPDATE universes SET 
        name = ?, description = ?, genre = ?, era = ?, tags = ?, rules = ?, status = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(
        updated.name,
        updated.description || '',
        updated.genre || '',
        updated.era || '',
        JSON.stringify(updated.tags || []),
        JSON.stringify(updated.rules || []),
        updated.status || 'active',
        updated.updatedAt,
        id
      );

    return updated;
  }

  deleteUniverse(id: string): boolean {
    const res = this.db.prepare('DELETE FROM universes WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // --- Characters ---

  getCharacters(universeId?: string): Character[] {
    let rows: any[];
    if (universeId) {
      rows = this.db
        .prepare('SELECT * FROM characters WHERE universe_id = ? ORDER BY canonical_name ASC')
        .all(universeId) as any[];
    } else {
      rows = this.db
        .prepare('SELECT * FROM characters ORDER BY canonical_name ASC')
        .all() as any[];
    }

    return rows.map((r) => ({
      id: r.id,
      universeId: r.universe_id,
      canonicalName: r.canonical_name,
      aliases: JSON.parse(r.aliases || '[]'),
      occupation: r.occupation,
      age: r.age,
      role: r.role,
      gender: r.gender,
      tags: JSON.parse(r.tags || '[]'),
      status: r.status,
      description: r.description,
      biography: r.biography,
      personality: r.personality,
      appearance: r.appearance,
      states: JSON.parse(r.states || '[]'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  getCharacter(id: string): Character | null {
    const r = this.db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      universeId: r.universe_id,
      canonicalName: r.canonical_name,
      aliases: JSON.parse(r.aliases || '[]'),
      occupation: r.occupation,
      age: r.age,
      role: r.role,
      gender: r.gender,
      tags: JSON.parse(r.tags || '[]'),
      status: r.status,
      description: r.description,
      biography: r.biography,
      personality: r.personality,
      appearance: r.appearance,
      states: JSON.parse(r.states || '[]'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  createCharacter(
    character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> | Character
  ): Character {
    const now = new Date().toISOString();
    const id =
      'id' in character && character.id
        ? character.id
        : `char-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newChar: Character = {
      ...character,
      id,
      aliases: character.aliases || [],
      tags: character.tags || [],
      states: character.states || [],
      status: character.status || 'alive',
      role: character.role || 'supporting',
      createdAt: 'createdAt' in character && character.createdAt ? character.createdAt : now,
      updatedAt: 'updatedAt' in character && character.updatedAt ? character.updatedAt : now,
    };

    this.db
      .prepare(
        `INSERT INTO characters 
        (id, universe_id, canonical_name, aliases, occupation, age, role, gender, tags, status, description, biography, personality, appearance, states, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newChar.id,
        newChar.universeId,
        newChar.canonicalName,
        JSON.stringify(newChar.aliases),
        newChar.occupation || '',
        newChar.age || '',
        newChar.role,
        newChar.gender || '',
        JSON.stringify(newChar.tags),
        newChar.status,
        newChar.description || '',
        newChar.biography || '',
        newChar.personality || '',
        newChar.appearance || '',
        JSON.stringify(newChar.states),
        newChar.createdAt,
        newChar.updatedAt
      );

    return newChar;
  }

  updateCharacter(id: string, updates: Partial<Character>): Character | null {
    const existing = this.getCharacter(id);
    if (!existing) return null;

    const updated: Character = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.db
      .prepare(
        `UPDATE characters SET 
        canonical_name = ?, aliases = ?, occupation = ?, age = ?, role = ?, gender = ?, tags = ?, status = ?, description = ?, biography = ?, personality = ?, appearance = ?, states = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(
        updated.canonicalName,
        JSON.stringify(updated.aliases || []),
        updated.occupation || '',
        updated.age || '',
        updated.role,
        updated.gender || '',
        JSON.stringify(updated.tags || []),
        updated.status,
        updated.description || '',
        updated.biography || '',
        updated.personality || '',
        updated.appearance || '',
        JSON.stringify(updated.states || []),
        updated.updatedAt,
        id
      );

    return updated;
  }

  deleteCharacter(id: string): boolean {
    const res = this.db.prepare('DELETE FROM characters WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // --- Locations ---

  getLocations(universeId?: string): StoryLocation[] {
    let rows: any[];
    if (universeId) {
      rows = this.db
        .prepare('SELECT * FROM locations WHERE universe_id = ? ORDER BY name ASC')
        .all(universeId) as any[];
    } else {
      rows = this.db.prepare('SELECT * FROM locations ORDER BY name ASC').all() as any[];
    }

    return rows.map((r) => ({
      id: r.id,
      universeId: r.universe_id,
      name: r.name,
      description: r.description,
      status: r.status,
      type: r.type,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  getLocation(id: string): StoryLocation | null {
    const r = this.db.prepare('SELECT * FROM locations WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      universeId: r.universe_id,
      name: r.name,
      description: r.description,
      status: r.status,
      type: r.type,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  createLocation(
    location: Omit<StoryLocation, 'id' | 'createdAt' | 'updatedAt'> | StoryLocation
  ): StoryLocation {
    const now = new Date().toISOString();
    const id =
      'id' in location && location.id
        ? location.id
        : `loc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newLoc: StoryLocation = {
      ...location,
      id,
      status: location.status || 'intact',
      createdAt: 'createdAt' in location && location.createdAt ? location.createdAt : now,
      updatedAt: 'updatedAt' in location && location.updatedAt ? location.updatedAt : now,
    };

    this.db
      .prepare(
        `INSERT INTO locations (id, universe_id, name, description, status, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newLoc.id,
        newLoc.universeId,
        newLoc.name,
        newLoc.description || '',
        newLoc.status,
        newLoc.type || '',
        newLoc.createdAt,
        newLoc.updatedAt
      );

    return newLoc;
  }

  updateLocation(id: string, updates: Partial<StoryLocation>): StoryLocation | null {
    const existing = this.getLocation(id);
    if (!existing) return null;

    const updated: StoryLocation = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.db
      .prepare(
        `UPDATE locations SET 
        name = ?, description = ?, status = ?, type = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(
        updated.name,
        updated.description || '',
        updated.status,
        updated.type || '',
        updated.updatedAt,
        id
      );

    return updated;
  }

  deleteLocation(id: string): boolean {
    const res = this.db.prepare('DELETE FROM locations WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // --- Events ---

  getEvents(universeId?: string): StoryEvent[] {
    let rows: any[];
    if (universeId) {
      rows = this.db
        .prepare('SELECT * FROM events WHERE universe_id = ? ORDER BY year ASC')
        .all(universeId) as any[];
    } else {
      rows = this.db.prepare('SELECT * FROM events ORDER BY year ASC').all() as any[];
    }

    return rows.map((r) => ({
      id: r.id,
      universeId: r.universe_id,
      title: r.title,
      description: r.description,
      year: r.year,
      dateStart: r.date_start,
      dateEnd: r.date_end,
      locationId: r.location_id,
      canonStatus: r.canon_status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  getEvent(id: string): StoryEvent | null {
    const r = this.db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      universeId: r.universe_id,
      title: r.title,
      description: r.description,
      year: r.year,
      dateStart: r.date_start,
      dateEnd: r.date_end,
      locationId: r.location_id,
      canonStatus: r.canon_status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  createEvent(
    event: Omit<StoryEvent, 'id' | 'createdAt' | 'updatedAt'> | StoryEvent
  ): StoryEvent {
    const now = new Date().toISOString();
    const id =
      'id' in event && event.id
        ? event.id
        : `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newEvt: StoryEvent = {
      ...event,
      id,
      canonStatus: event.canonStatus || 'canon',
      createdAt: 'createdAt' in event && event.createdAt ? event.createdAt : now,
      updatedAt: 'updatedAt' in event && event.updatedAt ? event.updatedAt : now,
    };

    this.db
      .prepare(
        `INSERT INTO events (id, universe_id, title, description, year, date_start, date_end, location_id, canon_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newEvt.id,
        newEvt.universeId,
        newEvt.title,
        newEvt.description || '',
        newEvt.year,
        newEvt.dateStart || '',
        newEvt.dateEnd || '',
        newEvt.locationId || null,
        newEvt.canonStatus,
        newEvt.createdAt,
        newEvt.updatedAt
      );

    return newEvt;
  }

  deleteEvent(id: string): boolean {
    const res = this.db.prepare('DELETE FROM events WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // --- Objects ---

  getObjects(universeId?: string): StoryObject[] {
    let rows: any[];
    if (universeId) {
      rows = this.db
        .prepare('SELECT * FROM objects WHERE universe_id = ? ORDER BY name ASC')
        .all(universeId) as any[];
    } else {
      rows = this.db.prepare('SELECT * FROM objects ORDER BY name ASC').all() as any[];
    }

    return rows.map((r) => ({
      id: r.id,
      universeId: r.universe_id,
      name: r.name,
      description: r.description,
      currentLocationId: r.current_location_id,
      properties: JSON.parse(r.properties || '{}'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  getObject(id: string): StoryObject | null {
    const r = this.db.prepare('SELECT * FROM objects WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      universeId: r.universe_id,
      name: r.name,
      description: r.description,
      currentLocationId: r.current_location_id,
      properties: JSON.parse(r.properties || '{}'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  createObject(
    object: Omit<StoryObject, 'id' | 'createdAt' | 'updatedAt'> | StoryObject
  ): StoryObject {
    const now = new Date().toISOString();
    const id =
      'id' in object && object.id
        ? object.id
        : `obj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newObj: StoryObject = {
      ...object,
      id,
      properties: object.properties || {},
      createdAt: 'createdAt' in object && object.createdAt ? object.createdAt : now,
      updatedAt: 'updatedAt' in object && object.updatedAt ? object.updatedAt : now,
    };

    this.db
      .prepare(
        `INSERT INTO objects (id, universe_id, name, description, current_location_id, properties, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newObj.id,
        newObj.universeId,
        newObj.name,
        newObj.description || '',
        newObj.currentLocationId || null,
        JSON.stringify(newObj.properties),
        newObj.createdAt,
        newObj.updatedAt
      );

    return newObj;
  }

  deleteObject(id: string): boolean {
    const res = this.db.prepare('DELETE FROM objects WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // --- Relationships ---

  getRelationships(): Relationship[] {
    const rows = this.db
      .prepare('SELECT * FROM relationships ORDER BY created_at ASC')
      .all() as any[];
    return rows.map((r) => ({
      id: r.id,
      universeId: r.universe_id,
      sourceId: r.source_id,
      sourceType: r.source_type,
      targetId: r.target_id,
      targetType: r.target_type,
      relationType: r.relation_type,
      description: r.description,
      notes: r.notes,
      confidence: r.confidence,
      canonStatus: r.canon_status,
      provenance: r.provenance,
      createdAt: r.created_at,
    }));
  }

  createRelationship(
    relationship: Omit<Relationship, 'id' | 'createdAt'> | Relationship
  ): Relationship {
    const id =
      'id' in relationship && relationship.id
        ? relationship.id
        : `rel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newRel: Relationship = {
      ...relationship,
      id,
      confidence: relationship.confidence ?? 1.0,
      canonStatus: relationship.canonStatus || 'canon',
      createdAt:
        'createdAt' in relationship && relationship.createdAt ? relationship.createdAt : now,
    };

    this.db
      .prepare(
        `INSERT INTO relationships 
        (id, universe_id, source_id, source_type, target_id, target_type, relation_type, description, notes, confidence, canon_status, provenance, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newRel.id,
        newRel.universeId || null,
        newRel.sourceId,
        newRel.sourceType,
        newRel.targetId,
        newRel.targetType,
        newRel.relationType,
        newRel.description || '',
        newRel.notes || '',
        newRel.confidence,
        newRel.canonStatus,
        newRel.provenance || 'manual',
        newRel.createdAt
      );

    return newRel;
  }

  deleteRelationship(id: string): boolean {
    const res = this.db.prepare('DELETE FROM relationships WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // --- Stories (Legacy & Projection) ---

  getStories(filters?: { universeId?: string; canonStatus?: string; status?: string }): Story[] {
    let sql = 'SELECT * FROM stories WHERE 1=1';
    const params: any[] = [];

    if (filters?.universeId) {
      sql += ' AND universe_id = ?';
      params.push(filters.universeId);
    }
    if (filters?.canonStatus) {
      sql += ' AND canon_status = ?';
      params.push(filters.canonStatus);
    }
    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      universeId: r.universe_id,
      planId: r.plan_id || undefined,
      title: r.title,
      synopsis: r.synopsis,
      fullText: r.full_text,
      status: r.status,
      canonStatus: r.canon_status,
      storyDate: r.story_date,
      storyYear: r.story_year,
      consistencyStatus: r.consistency_status,
      consistencyReport: r.consistency_report ? JSON.parse(r.consistency_report) : undefined,
      characterIds: JSON.parse(r.character_ids || '[]'),
      locationIds: JSON.parse(r.location_ids || '[]'),
      eventIds: JSON.parse(r.event_ids || '[]'),
      versions: JSON.parse(r.versions || '[]'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  getStory(id: string): Story | null {
    const r = this.db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      universeId: r.universe_id,
      planId: r.plan_id || undefined,
      title: r.title,
      synopsis: r.synopsis,
      fullText: r.full_text,
      status: r.status,
      canonStatus: r.canon_status,
      storyDate: r.story_date,
      storyYear: r.story_year,
      consistencyStatus: r.consistency_status,
      consistencyReport: r.consistency_report ? JSON.parse(r.consistency_report) : undefined,
      characterIds: JSON.parse(r.character_ids || '[]'),
      locationIds: JSON.parse(r.location_ids || '[]'),
      eventIds: JSON.parse(r.event_ids || '[]'),
      versions: JSON.parse(r.versions || '[]'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  createStory(
    story: Omit<Story, 'id' | 'versions' | 'createdAt' | 'updatedAt'> | Story
  ): Story {
    const now = new Date().toISOString();
    const id =
      'id' in story && story.id
        ? story.id
        : `story-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newStory: Story = {
      ...story,
      id,
      versions: [
        {
          id: `ver-${id}-1`,
          storyId: id,
          versionNumber: 1,
          title: story.title,
          synopsis: story.synopsis,
          fullText: story.fullText,
          changeSummary: 'Начальная версия',
          createdAt: now,
        },
      ],
      createdAt: 'createdAt' in story && story.createdAt ? story.createdAt : now,
      updatedAt: 'updatedAt' in story && story.updatedAt ? story.updatedAt : now,
    };

    const transaction = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO stories 
          (id, universe_id, plan_id, title, synopsis, full_text, status, canon_status, story_date, story_year, consistency_status, consistency_report, character_ids, location_ids, event_ids, versions, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          newStory.id,
          newStory.universeId,
          newStory.planId || null,
          newStory.title,
          newStory.synopsis,
          newStory.fullText,
          newStory.status,
          newStory.canonStatus,
          newStory.storyDate,
          newStory.storyYear,
          newStory.consistencyStatus || 'not_checked',
          JSON.stringify(newStory.consistencyReport || null),
          JSON.stringify(newStory.characterIds || []),
          JSON.stringify(newStory.locationIds || []),
          JSON.stringify(newStory.eventIds || []),
          JSON.stringify(newStory.versions),
          newStory.createdAt,
          newStory.updatedAt
        );

      // Also create corresponding FullStory in stories_full
      const universe = this.getUniverse(newStory.universeId) || this.getUniverses()[0];
      const chars = this.getCharacters(newStory.universeId);
      const locs = this.getLocations(newStory.universeId);
      const full = legacyStoryToFullStory(newStory, universe, chars, locs);

      this.db
        .prepare(
          `INSERT OR REPLACE INTO stories_full (id, universe_id, title, data, revision, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, ?, ?)`
        )
        .run(full.id, full.universeId, full.title, JSON.stringify(full), now, now);

      this.db
        .prepare(
          `INSERT OR REPLACE INTO story_versions (id, story_id, version, data, reason, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(`ver-${full.id}-1`, full.id, 1, JSON.stringify(full), 'Начальная версия', now);
    });

    transaction();
    return newStory;
  }

  updateStory(id: string, updates: Partial<Story>, changeSummary?: string): Story | null {
    const existing = this.getStory(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const nextVerNumber = (existing.versions?.length || 0) + 1;

    let updatedVersions = existing.versions || [];
    if (updates.fullText && updates.fullText !== existing.fullText) {
      updatedVersions = [
        ...updatedVersions,
        {
          id: `ver-${id}-${nextVerNumber}`,
          storyId: id,
          versionNumber: nextVerNumber,
          title: updates.title || existing.title,
          synopsis: updates.synopsis || existing.synopsis,
          fullText: updates.fullText,
          changeSummary: changeSummary || `Версия ${nextVerNumber}`,
          createdAt: now,
        },
      ];
    }

    const updated: Story = {
      ...existing,
      ...updates,
      id,
      versions: updatedVersions,
      updatedAt: now,
    };

    const transaction = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE stories SET 
          title = ?, synopsis = ?, full_text = ?, status = ?, canon_status = ?, story_date = ?, story_year = ?, consistency_status = ?, consistency_report = ?, character_ids = ?, location_ids = ?, event_ids = ?, versions = ?, updated_at = ?
          WHERE id = ?`
        )
        .run(
          updated.title,
          updated.synopsis,
          updated.fullText,
          updated.status,
          updated.canonStatus,
          updated.storyDate,
          updated.storyYear,
          updated.consistencyStatus || 'not_checked',
          JSON.stringify(updated.consistencyReport || null),
          JSON.stringify(updated.characterIds || []),
          JSON.stringify(updated.locationIds || []),
          JSON.stringify(updated.eventIds || []),
          JSON.stringify(updated.versions || []),
          updated.updatedAt,
          id
        );

      // Keep stories_full in sync if it exists
      const fullRow = this.db
        .prepare('SELECT data, revision FROM stories_full WHERE id = ?')
        .get(id) as { data: string; revision: number } | undefined;

      if (fullRow) {
        const full: FullStory = JSON.parse(fullRow.data);
        full.title = updated.title;
        full.updatedAt = updated.updatedAt;
        if (updates.fullText) {
          // Sync draft of first scene or concept if present
          if (full.plot.acts[0]?.sequences[0]?.scenes[0]) {
            full.plot.acts[0].sequences[0].scenes[0].draft = updates.fullText;
          }
        }
        this.db
          .prepare(
            'UPDATE stories_full SET title = ?, data = ?, revision = revision + 1, updated_at = ? WHERE id = ?'
          )
          .run(full.title, JSON.stringify(full), full.updatedAt, id);
      }
    });

    transaction();
    return updated;
  }

  deleteStory(id: string): boolean {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM story_versions WHERE story_id = ?').run(id);
      this.db.prepare('DELETE FROM stories_full WHERE id = ?').run(id);
      this.db.prepare('DELETE FROM stories WHERE id = ?').run(id);
    });
    transaction();
    return true;
  }

  // --- Story Plans ---

  getStoryPlans(universeId?: string): StoryPlan[] {
    let rows: any[];
    if (universeId) {
      rows = this.db
        .prepare('SELECT * FROM story_plans WHERE universe_id = ? ORDER BY created_at DESC')
        .all(universeId) as any[];
    } else {
      rows = this.db
        .prepare('SELECT * FROM story_plans ORDER BY created_at DESC')
        .all() as any[];
    }

    return rows.map((r) => ({
      id: r.id,
      universeId: r.universe_id,
      storyYear: r.story_year,
      title: r.title,
      premise: r.premise,
      genre: r.genre,
      tone: r.tone,
      selectedCharacterIds: JSON.parse(r.selected_character_ids || '[]'),
      selectedLocationIds: JSON.parse(r.selected_location_ids || '[]'),
      selectedObjectIds: JSON.parse(r.selected_object_ids || '[]'),
      scenes: JSON.parse(r.scenes || '[]'),
      plotTwists: JSON.parse(r.plot_twists || '[]'),
      canonNotes: JSON.parse(r.canon_notes || '[]'),
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  getStoryPlan(id: string): StoryPlan | null {
    const r = this.db.prepare('SELECT * FROM story_plans WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      universeId: r.universe_id,
      storyYear: r.story_year,
      title: r.title,
      premise: r.premise,
      genre: r.genre,
      tone: r.tone,
      selectedCharacterIds: JSON.parse(r.selected_character_ids || '[]'),
      selectedLocationIds: JSON.parse(r.selected_location_ids || '[]'),
      selectedObjectIds: JSON.parse(r.selected_object_ids || '[]'),
      scenes: JSON.parse(r.scenes || '[]'),
      plotTwists: JSON.parse(r.plot_twists || '[]'),
      canonNotes: JSON.parse(r.canon_notes || '[]'),
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  createStoryPlan(
    plan: Omit<StoryPlan, 'id' | 'createdAt' | 'updatedAt'> | StoryPlan
  ): StoryPlan {
    const now = new Date().toISOString();
    const id =
      'id' in plan && plan.id
        ? plan.id
        : `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newPlan: StoryPlan = {
      ...plan,
      id,
      selectedCharacterIds: plan.selectedCharacterIds || [],
      selectedLocationIds: plan.selectedLocationIds || [],
      selectedObjectIds: plan.selectedObjectIds || [],
      scenes: plan.scenes || [],
      plotTwists: plan.plotTwists || [],
      canonNotes: plan.canonNotes || [],
      status: plan.status || 'draft',
      createdAt: 'createdAt' in plan && plan.createdAt ? plan.createdAt : now,
      updatedAt: 'updatedAt' in plan && plan.updatedAt ? plan.updatedAt : now,
    };

    this.db
      .prepare(
        `INSERT INTO story_plans 
        (id, universe_id, story_year, title, premise, genre, tone, selected_character_ids, selected_location_ids, selected_object_ids, scenes, plot_twists, canon_notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newPlan.id,
        newPlan.universeId,
        newPlan.storyYear || 2024,
        newPlan.title,
        newPlan.premise,
        newPlan.genre,
        newPlan.tone,
        JSON.stringify(newPlan.selectedCharacterIds),
        JSON.stringify(newPlan.selectedLocationIds),
        JSON.stringify(newPlan.selectedObjectIds),
        JSON.stringify(newPlan.scenes),
        JSON.stringify(newPlan.plotTwists),
        JSON.stringify(newPlan.canonNotes),
        newPlan.status,
        newPlan.createdAt,
        newPlan.updatedAt
      );

    return newPlan;
  }

  updateStoryPlan(id: string, updates: Partial<StoryPlan>): StoryPlan | null {
    const existing = this.getStoryPlan(id);
    if (!existing) return null;

    const updated: StoryPlan = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.db
      .prepare(
        `UPDATE story_plans SET 
        title = ?, premise = ?, genre = ?, tone = ?, story_year = ?, selected_character_ids = ?, selected_location_ids = ?, selected_object_ids = ?, scenes = ?, plot_twists = ?, canon_notes = ?, status = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(
        updated.title,
        updated.premise,
        updated.genre,
        updated.tone,
        updated.storyYear,
        JSON.stringify(updated.selectedCharacterIds || []),
        JSON.stringify(updated.selectedLocationIds || []),
        JSON.stringify(updated.selectedObjectIds || []),
        JSON.stringify(updated.scenes || []),
        JSON.stringify(updated.plotTwists || []),
        JSON.stringify(updated.canonNotes || []),
        updated.status,
        updated.updatedAt,
        id
      );

    return updated;
  }

  deleteStoryPlan(id: string): boolean {
    const res = this.db.prepare('DELETE FROM story_plans WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // --- Proposed Changes ---

  addProposedChange(
    change:
      | Omit<ProposedKnowledgeChange, 'id' | 'createdAt' | 'status'>
      | ProposedKnowledgeChange
  ): ProposedKnowledgeChange {
    const now = new Date().toISOString();
    const id =
      'id' in change && change.id
        ? change.id
        : `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newProp: ProposedKnowledgeChange = {
      ...change,
      id,
      confidence: change.confidence ?? 1.0,
      status: 'status' in change && change.status ? change.status : 'pending',
      createdAt: 'createdAt' in change && change.createdAt ? change.createdAt : now,
    };

    this.db
      .prepare(
        `INSERT INTO proposed_changes 
        (id, story_id, universe_id, entity_type, change_type, action, target_name, summary, reasoning, details, payload, confidence, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newProp.id,
        newProp.storyId || null,
        newProp.universeId || 'uni-main',
        newProp.entityType,
        newProp.changeType || 'create',
        newProp.action || '',
        newProp.targetName || '',
        newProp.summary || '',
        newProp.reasoning || '',
        JSON.stringify(newProp.details || {}),
        JSON.stringify(newProp.payload || {}),
        newProp.confidence,
        newProp.status,
        newProp.createdAt
      );

    return newProp;
  }

  getProposedChanges(status?: string): ProposedKnowledgeChange[] {
    let rows: any[];
    if (status) {
      rows = this.db
        .prepare('SELECT * FROM proposed_changes WHERE status = ? ORDER BY created_at DESC')
        .all(status) as any[];
    } else {
      rows = this.db
        .prepare('SELECT * FROM proposed_changes ORDER BY created_at DESC')
        .all() as any[];
    }

    return rows.map((r) => ({
      id: r.id,
      storyId: r.story_id || undefined,
      universeId: r.universe_id || undefined,
      entityType: r.entity_type,
      changeType: r.change_type,
      action: r.action,
      targetName: r.target_name,
      summary: r.summary,
      reasoning: r.reasoning,
      details: JSON.parse(r.details || '{}'),
      payload: JSON.parse(r.payload || '{}'),
      confidence: r.confidence,
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  updateProposedChangeStatus(
    id: string,
    status: 'accepted' | 'rejected'
  ): ProposedKnowledgeChange | null {
    const res = this.db
      .prepare('UPDATE proposed_changes SET status = ? WHERE id = ?')
      .run(status, id);
    if (res.changes === 0) return null;

    const r = this.db
      .prepare('SELECT * FROM proposed_changes WHERE id = ?')
      .get(id) as any;
    if (!r) return null;

    return {
      id: r.id,
      storyId: r.story_id || undefined,
      universeId: r.universe_id || undefined,
      entityType: r.entity_type,
      changeType: r.change_type,
      action: r.action,
      targetName: r.target_name,
      summary: r.summary,
      reasoning: r.reasoning,
      details: JSON.parse(r.details || '{}'),
      payload: JSON.parse(r.payload || '{}'),
      confidence: r.confidence,
      status: r.status,
      createdAt: r.created_at,
    };
  }

  // --- LLM Config ---

  getLLMConfig(): LLMConfig {
    const row = this.db
      .prepare('SELECT * FROM llm_config WHERE id = ?')
      .get('default') as any;
    if (!row) {
      return initialData.llmConfig;
    }
    return {
      provider: row.provider as any,
      model: row.model,
      baseUrl: row.base_url || '',
      apiKey: row.api_key || '',
      temperature: row.temperature,
      maxTokens: row.max_tokens,
      isLocal: row.is_local === 1,
    };
  }

  updateLLMConfig(updates: Partial<LLMConfig>): LLMConfig {
    const current = this.getLLMConfig();
    const updated: LLMConfig = {
      ...current,
      ...updates,
    };

    this.db
      .prepare(
        `INSERT OR REPLACE INTO llm_config 
        (id, provider, model, base_url, api_key, temperature, max_tokens, is_local, updated_at) 
        VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        updated.provider,
        updated.model,
        updated.baseUrl || '',
        updated.apiKey || '',
        updated.temperature,
        updated.maxTokens,
        updated.isLocal ? 1 : 0,
        new Date().toISOString()
      );

    return updated;
  }

  // --- Lorebook Entries ---

  getLorebookEntries(universeId?: string): LorebookEntry[] {
    let rows: any[];
    if (universeId) {
      rows = this.db
        .prepare('SELECT * FROM lorebook_entries WHERE universe_id = ? ORDER BY priority DESC')
        .all(universeId) as any[];
    } else {
      rows = this.db
        .prepare('SELECT * FROM lorebook_entries ORDER BY priority DESC')
        .all() as any[];
    }

    return rows.map((r) => ({
      id: r.id,
      universeId: r.universe_id,
      title: r.title,
      keys: JSON.parse(r.keys || '[]'),
      content: r.content,
      category: r.category,
      enabled: r.enabled === 1,
      constant: r.constant === 1,
      priority: r.priority,
      entityId: r.entity_id || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  createLorebookEntry(
    entry: Omit<LorebookEntry, 'id' | 'createdAt' | 'updatedAt'> | LorebookEntry
  ): LorebookEntry {
    const now = new Date().toISOString();
    const id =
      'id' in entry && entry.id
        ? entry.id
        : `lore-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newEntry: LorebookEntry = {
      ...entry,
      id,
      enabled: entry.enabled ?? true,
      constant: entry.constant ?? false,
      priority: entry.priority ?? 10,
      createdAt: 'createdAt' in entry && entry.createdAt ? entry.createdAt : now,
      updatedAt: 'updatedAt' in entry && entry.updatedAt ? entry.updatedAt : now,
    };

    this.db
      .prepare(
        `INSERT INTO lorebook_entries 
        (id, universe_id, title, keys, content, category, enabled, constant, priority, entity_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newEntry.id,
        newEntry.universeId,
        newEntry.title,
        JSON.stringify(newEntry.keys || []),
        newEntry.content,
        newEntry.category,
        newEntry.enabled ? 1 : 0,
        newEntry.constant ? 1 : 0,
        newEntry.priority,
        newEntry.entityId || null,
        newEntry.createdAt,
        newEntry.updatedAt
      );

    return newEntry;
  }

  updateLorebookEntry(id: string, updates: Partial<LorebookEntry>): LorebookEntry | null {
    const r = this.db
      .prepare('SELECT * FROM lorebook_entries WHERE id = ?')
      .get(id) as any;
    if (!r) return null;

    const existing: LorebookEntry = {
      id: r.id,
      universeId: r.universe_id,
      title: r.title,
      keys: JSON.parse(r.keys || '[]'),
      content: r.content,
      category: r.category,
      enabled: r.enabled === 1,
      constant: r.constant === 1,
      priority: r.priority,
      entityId: r.entity_id || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };

    const updated: LorebookEntry = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.db
      .prepare(
        `UPDATE lorebook_entries SET 
        title = ?, keys = ?, content = ?, category = ?, enabled = ?, constant = ?, priority = ?, entity_id = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(
        updated.title,
        JSON.stringify(updated.keys || []),
        updated.content,
        updated.category,
        updated.enabled ? 1 : 0,
        updated.constant ? 1 : 0,
        updated.priority,
        updated.entityId || null,
        updated.updatedAt,
        id
      );

    return updated;
  }

  deleteLorebookEntry(id: string): boolean {
    const res = this.db.prepare('DELETE FROM lorebook_entries WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // --- Story Engine v2 Domain Model Support (FullStory) ---

  getFullStories(universeId?: string): FullStory[] {
    let rows: { data: string }[];
    if (universeId) {
      rows = this.db
        .prepare('SELECT data FROM stories_full WHERE universe_id = ? ORDER BY updated_at DESC')
        .all(universeId) as { data: string }[];
    } else {
      rows = this.db
        .prepare('SELECT data FROM stories_full ORDER BY updated_at DESC')
        .all() as { data: string }[];
    }

    return rows.map((r) => JSON.parse(r.data));
  }

  getFullStory(id: string): FullStory | null {
    const row = this.db
      .prepare('SELECT data FROM stories_full WHERE id = ?')
      .get(id) as { data: string } | undefined;

    if (row) {
      return JSON.parse(row.data);
    }

    // Fallback: If not yet in stories_full, check legacy stories
    const legacy = this.getStory(id);
    if (!legacy) return null;

    const universe = this.getUniverse(legacy.universeId) || this.getUniverses()[0];
    const chars = this.getCharacters(legacy.universeId);
    const locs = this.getLocations(legacy.universeId);
    const full = legacyStoryToFullStory(legacy, universe, chars, locs);

    this.saveFullStory(full);
    return full;
  }

  getStoryRevision(id: string): number {
    const row = this.db
      .prepare('SELECT revision FROM stories_full WHERE id = ?')
      .get(id) as { revision: number } | undefined;
    return row ? row.revision : 0;
  }

  saveFullStory(story: FullStory, options?: SaveFullStoryOptions): FullStory {
    const now = new Date().toISOString();
    story.updatedAt = now;

    const executeTransaction = this.db.transaction(() => {
      // 1. Check existing record and verify optimistic concurrency
      const existing = this.db
        .prepare('SELECT revision FROM stories_full WHERE id = ?')
        .get(story.id) as { revision: number } | undefined;

      let nextRevision = 1;
      if (existing) {
        if (
          options?.expectedRevision !== undefined &&
          existing.revision !== options.expectedRevision
        ) {
          throw new RevisionConflictError(
            story.id,
            options.expectedRevision,
            existing.revision
          );
        }
        nextRevision = existing.revision + 1;
      }

      // 2. Upsert stories_full first so story_versions foreign key is satisfied
      this.db
        .prepare(
          `INSERT INTO stories_full (id, universe_id, title, data, revision, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            universe_id = excluded.universe_id,
            data = excluded.data,
            revision = excluded.revision,
            updated_at = excluded.updated_at`
        )
        .run(
          story.id,
          story.universeId,
          story.title,
          JSON.stringify(story),
          nextRevision,
          story.createdAt || now,
          now
        );

      // 3. If a version checkpoint is requested, record in story_versions
      if (options?.createVersion) {
        const verRow = this.db
          .prepare(
            'SELECT COALESCE(MAX(version), 0) + 1 AS nextVer FROM story_versions WHERE story_id = ?'
          )
          .get(story.id) as { nextVer: number };
        const nextVersionNumber = verRow?.nextVer || 1;

        const verId = `ver-${story.id}-${nextVersionNumber}`;
        this.db
          .prepare(
            `INSERT INTO story_versions (id, story_id, version, data, reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`
          )
          .run(
            verId,
            story.id,
            nextVersionNumber,
            JSON.stringify(story),
            options.versionReason || `Версия ${nextVersionNumber}`,
            now
          );
      }

      // 4. Synchronize with legacy stories table
      const legacy = fullStoryToLegacyStory(story);
      const existingLegacy = this.db
        .prepare('SELECT id, versions FROM stories WHERE id = ?')
        .get(story.id) as { id: string; versions: string } | undefined;

      let versionsList: any[] = [];
      if (existingLegacy?.versions) {
        try {
          versionsList = JSON.parse(existingLegacy.versions);
        } catch {
          versionsList = [];
        }
      }

      if (options?.createVersion) {
        versionsList.push({
          id: `ver-${story.id}-${versionsList.length + 1}`,
          storyId: story.id,
          versionNumber: versionsList.length + 1,
          title: story.title,
          synopsis: story.concept?.premise || legacy.synopsis,
          fullText: legacy.fullText,
          changeSummary: options.versionReason || 'Контрольная точка',
          createdAt: now,
        });
      }

      this.db
        .prepare(
          `INSERT INTO stories 
          (id, universe_id, plan_id, title, synopsis, full_text, status, canon_status, story_date, story_year, consistency_status, consistency_report, character_ids, location_ids, event_ids, versions, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            synopsis = excluded.synopsis,
            full_text = excluded.full_text,
            status = excluded.status,
            canon_status = excluded.canon_status,
            story_date = excluded.story_date,
            story_year = excluded.story_year,
            versions = excluded.versions,
            updated_at = excluded.updated_at`
        )
        .run(
          legacy.id,
          legacy.universeId,
          legacy.planId || null,
          legacy.title,
          legacy.synopsis,
          legacy.fullText,
          legacy.status,
          legacy.canonStatus,
          legacy.storyDate,
          legacy.storyYear,
          legacy.consistencyStatus || 'not_checked',
          JSON.stringify(legacy.consistencyReport || null),
          JSON.stringify(legacy.characterIds || []),
          JSON.stringify(legacy.locationIds || []),
          JSON.stringify(legacy.eventIds || []),
          JSON.stringify(versionsList),
          legacy.createdAt || now,
          now
        );
    });

    executeTransaction();
    return story;
  }

  deleteFullStory(id: string): boolean {
    const executeTransaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM story_versions WHERE story_id = ?').run(id);
      this.db.prepare('DELETE FROM stories_full WHERE id = ?').run(id);
      this.db.prepare('DELETE FROM stories WHERE id = ?').run(id);
    });
    executeTransaction();
    return true;
  }

  // --- Story Versioning & Checkpoints ---

  getStoryVersions(storyId: string): StoryVersionRecord[] {
    const rows = this.db
      .prepare(
        'SELECT id, story_id, version, data, reason, created_at FROM story_versions WHERE story_id = ? ORDER BY version ASC'
      )
      .all(storyId) as any[];

    return rows.map((r) => ({
      id: r.id,
      storyId: r.story_id,
      version: r.version,
      data: JSON.parse(r.data),
      reason: r.reason || undefined,
      createdAt: r.created_at,
    }));
  }

  getStoryVersion(storyId: string, versionId: string): StoryVersionRecord | null {
    const row = this.db
      .prepare(
        `SELECT id, story_id, version, data, reason, created_at 
        FROM story_versions 
        WHERE story_id = ? AND (id = ? OR CAST(version AS TEXT) = ?)`
      )
      .get(storyId, versionId, versionId) as any;

    if (!row) return null;
    return {
      id: row.id,
      storyId: row.story_id,
      version: row.version,
      data: JSON.parse(row.data),
      reason: row.reason || undefined,
      createdAt: row.created_at,
    };
  }

  createStoryVersion(storyId: string, data: FullStory, reason?: string): StoryVersionRecord {
    const existing = this.getFullStory(storyId);
    if (!existing) {
      throw new NotFoundError('История', storyId);
    }

    const now = new Date().toISOString();
    let record: StoryVersionRecord | null = null;

    const executeTransaction = this.db.transaction(() => {
      const verRow = this.db
        .prepare(
          'SELECT COALESCE(MAX(version), 0) + 1 AS nextVer FROM story_versions WHERE story_id = ?'
        )
        .get(storyId) as { nextVer: number };
      const nextVerNumber = verRow?.nextVer || 1;
      const verId = `ver-${storyId}-${nextVerNumber}`;

      this.db
        .prepare(
          `INSERT INTO story_versions (id, story_id, version, data, reason, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          verId,
          storyId,
          nextVerNumber,
          JSON.stringify(data),
          reason || `Контрольная точка #${nextVerNumber}`,
          now
        );

      // Increment story revision
      this.db
        .prepare(
          'UPDATE stories_full SET revision = revision + 1, updated_at = ? WHERE id = ?'
        )
        .run(now, storyId);

      record = {
        id: verId,
        storyId,
        version: nextVerNumber,
        data,
        reason: reason || `Контрольная точка #${nextVerNumber}`,
        createdAt: now,
      };
    });

    executeTransaction();
    if (!record) {
      throw new Error('Не удалось создать контрольную точку версии');
    }
    return record;
  }

  restoreStoryVersion(storyId: string, versionId: string): FullStory {
    const targetVersion = this.getStoryVersion(storyId, versionId);
    if (!targetVersion) {
      throw new NotFoundError(`Версия истории "${versionId}"`, storyId);
    }

    const currentStory = this.getFullStory(storyId);
    if (!currentStory) {
      throw new NotFoundError('История', storyId);
    }

    const now = new Date().toISOString();
    const restoredStory: FullStory = {
      ...targetVersion.data,
      id: storyId,
      updatedAt: now,
    };

    const executeTransaction = this.db.transaction(() => {
      // 1. Snapshot the current state before restoring so work is never lost!
      const currentVerRow = this.db
        .prepare(
          'SELECT COALESCE(MAX(version), 0) + 1 AS nextVer FROM story_versions WHERE story_id = ?'
        )
        .get(storyId) as { nextVer: number };
      const preRestoreVerNumber = currentVerRow?.nextVer || 1;
      const preRestoreVerId = `ver-${storyId}-${preRestoreVerNumber}`;

      this.db
        .prepare(
          `INSERT INTO story_versions (id, story_id, version, data, reason, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          preRestoreVerId,
          storyId,
          preRestoreVerNumber,
          JSON.stringify(currentStory),
          `Авто-сохранение перед откатом к версии v${targetVersion.version}`,
          now
        );

      // 2. Create a new version checkpoint for the restored state
      const postRestoreVerNumber = preRestoreVerNumber + 1;
      const postRestoreVerId = `ver-${storyId}-${postRestoreVerNumber}`;

      this.db
        .prepare(
          `INSERT INTO story_versions (id, story_id, version, data, reason, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          postRestoreVerId,
          storyId,
          postRestoreVerNumber,
          JSON.stringify(restoredStory),
          `Восстановлено из версии v${targetVersion.version} (${targetVersion.reason || 'чекпоинт'})`,
          now
        );

      // 3. Update stories_full with restored story data
      this.db
        .prepare(
          `UPDATE stories_full SET 
          title = ?, universe_id = ?, data = ?, revision = revision + 1, updated_at = ?
          WHERE id = ?`
        )
        .run(
          restoredStory.title,
          restoredStory.universeId,
          JSON.stringify(restoredStory),
          now,
          storyId
        );

      // 4. Update legacy projection
      const legacy = fullStoryToLegacyStory(restoredStory);
      this.db
        .prepare(
          `UPDATE stories SET 
          title = ?, synopsis = ?, full_text = ?, updated_at = ?
          WHERE id = ?`
        )
        .run(legacy.title, legacy.synopsis, legacy.fullText, now, storyId);
    });

    executeTransaction();
    return restoredStory;
  }

  // --- Aggregate Stats ---

  getStats(): StorageStats {
    const getCount = (table: string): number => {
      const r = this.db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as any;
      return r ? r.cnt : 0;
    };

    const getPendingChangesCount = (): number => {
      const r = this.db
        .prepare("SELECT COUNT(*) as cnt FROM proposed_changes WHERE status = 'pending'")
        .get() as any;
      return r ? r.cnt : 0;
    };

    return {
      universes: getCount('universes'),
      characters: getCount('characters'),
      locations: getCount('locations'),
      events: getCount('events'),
      objects: getCount('objects'),
      relationships: getCount('relationships'),
      stories: getCount('stories'),
      fullStories: getCount('stories_full'),
      storyVersions: getCount('story_versions'),
      storyPlans: getCount('story_plans'),
      proposedChanges: getCount('proposed_changes'),
      pendingChanges: getPendingChangesCount(),
      backend: 'sqlite',
    };
  }

  // --- Live Backup ---

  public async createBackup(): Promise<string> {
    if (this.dbPath === ':memory:') {
      return ':memory:';
    }

    const dir = path.dirname(path.resolve(this.dbPath));
    const backupsDir = path.join(dir, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupsDir, `storyengine-${timestamp}.db`);

    await this.db.backup(backupFile);
    console.log(`[Storage] Database backup successfully created at: ${backupFile}`);
    return backupFile;
  }

  // --- Universe Export & Import ---

  exportUniverse(universeId: string): UniverseExport {
    const universe = this.getUniverse(universeId);
    if (!universe) {
      throw new NotFoundError('Вселенная', universeId);
    }

    const characters = this.getCharacters(universeId);
    const locations = this.getLocations(universeId);
    const events = this.getEvents(universeId);
    const objects = this.getObjects(universeId);
    const relationships = this.getRelationships().filter(
      (r) => r.universeId === universeId
    );
    const stories = this.getStories({ universeId });
    const fullStories = this.getFullStories(universeId);
    const storyPlans = this.getStoryPlans(universeId);
    const proposedChanges = this.getProposedChanges().filter(
      (p) => p.universeId === universeId
    );
    const lorebookEntries = this.getLorebookEntries(universeId);

    // Fetch all versions for the universe's fullStories
    const storyVersions: StoryVersionRecord[] = [];
    for (const fs of fullStories) {
      const vers = this.getStoryVersions(fs.id);
      storyVersions.push(...vers);
    }

    return {
      format: 'storyengine-universe',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      applicationVersion: '0.1.0',
      universe,
      characters,
      locations,
      events,
      objects,
      relationships,
      stories,
      fullStories,
      storyVersions,
      storyPlans,
      proposedChanges,
      lorebookEntries,
    };
  }

  importUniverse(archive: UniverseExport, options?: ImportOptions): ImportResult {
    // 1. Validation
    if (!archive || typeof archive !== 'object') {
      throw new ValidationError('Неверный формат архива вселенной: ожидался JSON-объект');
    }
    if (archive.format !== 'storyengine-universe') {
      throw new ValidationError(
        `Неподдерживаемый формат архива: "${archive.format}". Ожидался "storyengine-universe"`
      );
    }
    if (!archive.schemaVersion || archive.schemaVersion < 1) {
      throw new ValidationError(`Неподдерживаемая версия схемы: ${archive.schemaVersion}`);
    }
    if (!archive.universe || !archive.universe.id || !archive.universe.name) {
      throw new ValidationError('В архиве отсутствуют обязательные данные о вселенной');
    }

    const strategy = options?.strategy || 'copy';
    let backupPath: string | undefined;

    // If replace strategy is requested, create a live backup first
    if (strategy === 'replace') {
      try {
        if (this.dbPath !== ':memory:') {
          const dir = path.dirname(path.resolve(this.dbPath));
          const backupsDir = path.join(dir, 'backups');
          if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
          }
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          backupPath = path.join(backupsDir, `storyengine-pre-import-${timestamp}.db`);
          // Sync copy or backup
          fs.copyFileSync(this.dbPath, backupPath);
        }
      } catch (e) {
        console.warn('[Storage] Warning: Failed to create pre-import backup:', e);
      }
    }

    const resultStats = {
      characters: 0,
      locations: 0,
      events: 0,
      objects: 0,
      relationships: 0,
      stories: 0,
      fullStories: 0,
      storyVersions: 0,
      storyPlans: 0,
    };

    let targetUniverseId = archive.universe.id;
    let targetUniverseName = archive.universe.name;

    const executeTransaction = this.db.transaction(() => {
      if (strategy === 'replace') {
        // Clean out existing records for this universe
        const uniId = archive.universe.id;
        this.db.prepare('DELETE FROM lorebook_entries WHERE universe_id = ?').run(uniId);
        this.db.prepare('DELETE FROM proposed_changes WHERE universe_id = ?').run(uniId);
        this.db.prepare('DELETE FROM story_plans WHERE universe_id = ?').run(uniId);
        this.db.prepare('DELETE FROM relationships WHERE universe_id = ?').run(uniId);
        this.db.prepare('DELETE FROM objects WHERE universe_id = ?').run(uniId);
        this.db.prepare('DELETE FROM events WHERE universe_id = ?').run(uniId);
        this.db.prepare('DELETE FROM locations WHERE universe_id = ?').run(uniId);
        this.db.prepare('DELETE FROM characters WHERE universe_id = ?').run(uniId);
        this.db
          .prepare(
            'DELETE FROM story_versions WHERE story_id IN (SELECT id FROM stories_full WHERE universe_id = ?)'
          )
          .run(uniId);
        this.db.prepare('DELETE FROM stories_full WHERE universe_id = ?').run(uniId);
        this.db.prepare('DELETE FROM stories WHERE universe_id = ?').run(uniId);
        this.db.prepare('DELETE FROM universes WHERE id = ?').run(uniId);

        // Insert universe
        this.createUniverse(archive.universe);

        // Insert characters
        for (const c of archive.characters || []) {
          this.createCharacter(c);
          resultStats.characters++;
        }

        // Insert locations
        for (const l of archive.locations || []) {
          this.createLocation(l);
          resultStats.locations++;
        }

        // Insert events
        for (const e of archive.events || []) {
          this.createEvent(e);
          resultStats.events++;
        }

        // Insert objects
        for (const o of archive.objects || []) {
          this.createObject(o);
          resultStats.objects++;
        }

        // Insert relationships
        for (const r of archive.relationships || []) {
          this.createRelationship(r);
          resultStats.relationships++;
        }

        // Insert story plans
        for (const p of archive.storyPlans || []) {
          this.createStoryPlan(p);
          resultStats.storyPlans++;
        }

        // Insert stories
        for (const s of archive.stories || []) {
          this.createStory(s);
          resultStats.stories++;
        }

        // Insert full stories
        for (const fs of archive.fullStories || []) {
          this.saveFullStory(fs);
          resultStats.fullStories++;
        }

        // Insert story versions
        for (const sv of archive.storyVersions || []) {
          this.db
            .prepare(
              `INSERT OR REPLACE INTO story_versions (id, story_id, version, data, reason, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`
            )
            .run(
              sv.id,
              sv.storyId,
              sv.version,
              JSON.stringify(sv.data),
              sv.reason || '',
              sv.createdAt
            );
          resultStats.storyVersions++;
        }
      } else if (strategy === 'copy') {
        // Strategy: 'copy' -> Generate new IDs and remap ALL entity relationships
        const idSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newUniId = `uni-${idSuffix}`;
        targetUniverseId = newUniId;
        targetUniverseName = `${archive.universe.name} (Копия)`;

        const idMap = new Map<string, string>();
        idMap.set(archive.universe.id, newUniId);

        // Pre-generate IDs for all entities
        for (const c of archive.characters || []) {
          idMap.set(c.id, `char-${idSuffix}-${Math.random().toString(36).substring(2, 6)}`);
        }
        for (const l of archive.locations || []) {
          idMap.set(l.id, `loc-${idSuffix}-${Math.random().toString(36).substring(2, 6)}`);
        }
        for (const e of archive.events || []) {
          idMap.set(e.id, `evt-${idSuffix}-${Math.random().toString(36).substring(2, 6)}`);
        }
        for (const o of archive.objects || []) {
          idMap.set(o.id, `obj-${idSuffix}-${Math.random().toString(36).substring(2, 6)}`);
        }
        for (const s of archive.stories || []) {
          idMap.set(s.id, `story-${idSuffix}-${Math.random().toString(36).substring(2, 6)}`);
        }
        for (const fs of archive.fullStories || []) {
          if (!idMap.has(fs.id)) {
            idMap.set(fs.id, `story-${idSuffix}-${Math.random().toString(36).substring(2, 6)}`);
          }
        }
        for (const p of archive.storyPlans || []) {
          idMap.set(p.id, `plan-${idSuffix}-${Math.random().toString(36).substring(2, 6)}`);
        }

        // 1. Insert new Universe
        this.createUniverse({
          ...archive.universe,
          id: newUniId,
          name: targetUniverseName,
        });

        // 2. Remap & Insert Characters
        for (const c of archive.characters || []) {
          const remappedStates = (c.states || []).map((st) => ({
            ...st,
            id: `state-${idSuffix}-${Math.random().toString(36).substring(2, 6)}`,
            characterId: (st.characterId && idMap.get(st.characterId)) || st.characterId || idMap.get(c.id) || c.id,
            locationId: st.locationId ? idMap.get(st.locationId) || st.locationId : undefined,
            eventId: st.eventId ? idMap.get(st.eventId) || st.eventId : undefined,
          }));

          this.createCharacter({
            ...c,
            id: idMap.get(c.id)!,
            universeId: newUniId,
            states: remappedStates,
          });
          resultStats.characters++;
        }

        // 3. Remap & Insert Locations
        for (const l of archive.locations || []) {
          this.createLocation({
            ...l,
            id: idMap.get(l.id)!,
            universeId: newUniId,
          });
          resultStats.locations++;
        }

        // 4. Remap & Insert Events
        for (const e of archive.events || []) {
          this.createEvent({
            ...e,
            id: idMap.get(e.id)!,
            universeId: newUniId,
            locationId: e.locationId ? idMap.get(e.locationId) || e.locationId : undefined,
          });
          resultStats.events++;
        }

        // 5. Remap & Insert Objects
        for (const o of archive.objects || []) {
          this.createObject({
            ...o,
            id: idMap.get(o.id)!,
            universeId: newUniId,
            currentLocationId: o.currentLocationId
              ? idMap.get(o.currentLocationId) || o.currentLocationId
              : undefined,
          });
          resultStats.objects++;
        }

        // 6. Remap & Insert Relationships
        for (const r of archive.relationships || []) {
          this.createRelationship({
            ...r,
            id: `rel-${idSuffix}-${Math.random().toString(36).substring(2, 6)}`,
            universeId: newUniId,
            sourceId: idMap.get(r.sourceId) || r.sourceId,
            targetId: idMap.get(r.targetId) || r.targetId,
          });
          resultStats.relationships++;
        }

        // 7. Remap & Insert Story Plans
        for (const p of archive.storyPlans || []) {
          this.createStoryPlan({
            ...p,
            id: idMap.get(p.id)!,
            universeId: newUniId,
            selectedCharacterIds: (p.selectedCharacterIds || []).map(
              (cid) => idMap.get(cid) || cid
            ),
            selectedLocationIds: (p.selectedLocationIds || []).map(
              (lid) => idMap.get(lid) || lid
            ),
            selectedObjectIds: (p.selectedObjectIds || []).map(
              (oid) => idMap.get(oid) || oid
            ),
          });
          resultStats.storyPlans++;
        }

        // 8. Remap & Insert FullStories
        for (const fs of archive.fullStories || []) {
          const newStoryId = idMap.get(fs.id)!;
          const remappedFullStory: FullStory = {
            ...fs,
            id: newStoryId,
            universeId: newUniId,
            storyBible: {
              ...fs.storyBible,
              characters: (fs.storyBible?.characters || []).map((bc) => ({
                ...bc,
                id: idMap.get(bc.id) || bc.id,
              })),
              locations: (fs.storyBible?.locations || []).map((bl) => ({
                ...bl,
                id: idMap.get(bl.id) || bl.id,
              })),
            },
          };

          this.saveFullStory(remappedFullStory, {
            createVersion: true,
            versionReason: 'Импортированная версия',
          });
          resultStats.fullStories++;
          resultStats.stories++;
        }
      } else if (strategy === 'skip') {
        // Strategy: 'skip' -> If universe exists, skip. Otherwise import.
        const existing = this.getUniverse(archive.universe.id);
        if (existing) {
          console.log(
            `[Storage] Universe ${archive.universe.id} already exists. Skipping import.`
          );
          return;
        }

        this.createUniverse(archive.universe);
        for (const c of archive.characters || []) this.createCharacter(c);
        for (const l of archive.locations || []) this.createLocation(l);
        for (const e of archive.events || []) this.createEvent(e);
        for (const o of archive.objects || []) this.createObject(o);
        for (const r of archive.relationships || []) this.createRelationship(r);
        for (const p of archive.storyPlans || []) this.createStoryPlan(p);
        for (const s of archive.stories || []) this.createStory(s);
        for (const fs of archive.fullStories || []) this.saveFullStory(fs);
      }
    });

    try {
      executeTransaction();
    } catch (err: unknown) {
      console.error('[Storage] Error during universe import. Transaction rolled back:', err);
      throw new ImportError(err instanceof Error ? err.message : String(err));
    }

    return {
      success: true,
      universeId: targetUniverseId,
      universeName: targetUniverseName,
      strategy,
      importedCounts: resultStats,
      backupPath,
    };
  }

  // --- Shutdown Lifecycle ---

  shutdown(): void {
    if (this.db && this.db.open) {
      console.log('[Storage] Closing SQLite database connection...');
      this.db.close();
      console.log('[Storage] SQLite connection closed.');
    }
  }
}
