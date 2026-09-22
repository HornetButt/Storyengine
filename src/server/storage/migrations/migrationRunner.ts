import Database from 'better-sqlite3';
import { MigrationError } from '../types';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
  down?: (db: Database.Database) => void;
}

export class MigrationRunner {
  private db: Database.Database;
  private migrations: Migration[];

  constructor(db: Database.Database, migrations: Migration[]) {
    this.db = db;
    this.migrations = [...migrations].sort((a, b) => a.version - b.version);
  }

  public run(): void {
    // 1. Ensure migrations tracking table exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    // 2. Fetch applied migration versions
    const appliedRows = this.db
      .prepare('SELECT version FROM schema_migrations ORDER BY version ASC')
      .all() as { version: number }[];
    const appliedSet = new Set<number>(appliedRows.map((r) => r.version));

    // 3. Find pending migrations
    const pending = this.migrations.filter((m) => !appliedSet.has(m.version));

    if (pending.length === 0) {
      return;
    }

    console.log(`[Storage] Found ${pending.length} pending schema migration(s)...`);

    // 4. Run each migration in its own atomic transaction
    for (const migration of pending) {
      try {
        const executeTransaction = this.db.transaction(() => {
          migration.up(this.db);
          this.db
            .prepare(
              'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
            )
            .run(migration.version, migration.name, new Date().toISOString());
        });

        executeTransaction();
        console.log(
          `[Storage] Migration applied successfully: ${migration.version.toString().padStart(3, '0')}_${migration.name}`
        );
      } catch (err: unknown) {
        console.error(
          `[Storage] FAILED migration ${migration.version}_${migration.name}:`,
          err
        );
        throw new MigrationError(`${migration.version}_${migration.name}`, err);
      }
    }

    console.log('[Storage] All database migrations completed successfully.');
  }
}
