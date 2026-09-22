import fs from 'fs';
import path from 'path';
import { SQLiteStorage } from '../server/storage/sqliteStorage';
import { MemoryStorage } from '../server/storage';
import { createDefaultStory } from '../domain/adapters';
import { RevisionConflictError, NotFoundError } from '../server/storage/types';
import { Universe } from '../types';

let passed = 0;
let total = 0;

function assert(cond: boolean, name: string, details?: string) {
  total++;
  if (!cond) {
    console.error(`❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
    throw new Error(`Test failed: ${name}`);
  }
  passed++;
  console.log(`✅ PASS: ${name}`);
}

async function runStorageTests() {
  console.log('\n=== RUNNING SQLITE STORAGE INTEGRATION TESTS ===\n');

  const testDbDir = path.resolve('./data/test');
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }
  const testDbPath = path.join(testDbDir, `test-${Date.now()}.db`);

  try {
    // -------------------------------------------------------------
    // Test 1: Initialization, Pragmas, and Migrations
    // -------------------------------------------------------------
    console.log('[1. Initialization & Schema Migrations]');
    const storage1 = new SQLiteStorage(testDbPath);
    const stats1 = storage1.getStats();

    assert(stats1.backend === 'sqlite', 'Storage identifies backend as sqlite');
    assert(stats1.universes >= 2, 'Default canonical universes seeded');
    assert(stats1.characters >= 3, 'Default canonical characters seeded');
    assert(stats1.stories >= 2, 'Default canonical stories seeded');
    assert(stats1.fullStories >= 2, 'Default canonical fullStories seeded');

    // -------------------------------------------------------------
    // Test 2: Persistence Across Restarts
    // -------------------------------------------------------------
    console.log('\n[2. Persistence Across Server Restarts]');
    // Create new entity in storage1
    const testChar = storage1.createCharacter({
      universeId: 'uni-main',
      canonicalName: 'Тестовый Исследователь',
      description: 'Исследователь, созданный для тестов персистентности',
      role: 'protagonist',
      status: 'alive',
      tags: ['персистентность', 'тест'],
      aliases: ['ТИ'],
      states: [
        {
          id: 'state-test-1',
          characterId: 'char-test',
          year: 2026,
          status: 'alive',
          description: 'Прибыл на станцию для проверки персистентности',
        },
      ],
    });

    // Close storage1 to simulate server restart
    storage1.shutdown();

    // Reopen same database file with storage2
    const storage2 = new SQLiteStorage(testDbPath);
    const persistedChar = storage2.getCharacter(testChar.id);

    assert(!!persistedChar, 'Created character survives server restart');
    assert(
      persistedChar?.canonicalName === 'Тестовый Исследователь',
      'Character properties correctly persisted'
    );
    assert(
      persistedChar?.tags?.includes('персистентность') || false,
      'Complex JSON tags correctly deserialized'
    );
    assert(
      persistedChar?.states.length === 1,
      'Character temporal states array correctly deserialized'
    );

    // -------------------------------------------------------------
    // Test 3: FullStory Aggregate Root & Domain Modeling
    // -------------------------------------------------------------
    console.log('\n[3. FullStory Aggregate Root Storage & Mapping]');
    const mainUniverse = storage2.getUniverse('uni-main')!;
    const story = createDefaultStory('Сценарий Персистентности', mainUniverse, 2026);
    story.concept.premise = 'Сценарий для проверки SQLite хранилища';
    story.storyBible.characters.push({
      id: persistedChar!.id,
      name: persistedChar!.canonicalName,
      description: 'Тестовый персонаж в библии',
      motivation: 'Проверить надежность хранилища',
      role: 'protagonist',
      statusAtStart: 'alive',
      knowledgeAtStart: ['Знает о базе данных SQLite'],
      relationships: [],
    });

    const savedStory = storage2.saveFullStory(story, {
      createVersion: true,
      versionReason: 'Базовая редакция',
    });

    assert(savedStory.id === story.id, 'FullStory saved and returned');

    const fetchedFull = storage2.getFullStory(story.id);
    assert(!!fetchedFull, 'FullStory fetched by id');
    assert(
      fetchedFull?.title === 'Сценарий Персистентности',
      'Title preserved in FullStory aggregate'
    );
    assert(
      fetchedFull?.storyBible.characters.some((c) => c.name === 'Тестовый Исследователь') ||
        false,
      'StoryBible characters preserved in JSON payload'
    );

    // Legacy projection check
    const legacyProjection = storage2.getStory(story.id);
    assert(!!legacyProjection, 'Legacy story projection kept synchronized automatically');
    assert(
      legacyProjection?.title === 'Сценарий Персистентности',
      'Legacy projection title matches domain model'
    );

    // -------------------------------------------------------------
    // Test 4: Optimistic Concurrency & Revision Conflict
    // -------------------------------------------------------------
    console.log('\n[4. Optimistic Concurrency Control]');
    const currentRev = storage2.getStoryRevision(story.id);
    assert(currentRev >= 1, 'Story has valid initial revision');

    // Mutate and save with matching expectedRevision -> should succeed
    fetchedFull!.concept.themes = ['Тема проверки конкурентности'];
    storage2.saveFullStory(fetchedFull!, { expectedRevision: currentRev });

    const newRev = storage2.getStoryRevision(story.id);
    assert(newRev === currentRev + 1, 'Revision incremented after successful save');

    // Attempt save with stale revision -> should throw RevisionConflictError
    let threwConflict = false;
    try {
      storage2.saveFullStory(fetchedFull!, { expectedRevision: currentRev });
    } catch (e: any) {
      if (e instanceof RevisionConflictError) {
        threwConflict = true;
      }
    }
    assert(threwConflict, 'RevisionConflictError thrown when expectedRevision does not match');

    // -------------------------------------------------------------
    // Test 5: Story Versioning & Checkpoints & Restore
    // -------------------------------------------------------------
    console.log('\n[5. Story Versioning, Checkpoints & Restore]');
    const initialVersions = storage2.getStoryVersions(story.id);
    assert(initialVersions.length >= 1, 'Story has initial version checkpoint');

    // Make an intentional change in text
    fetchedFull!.plot.acts[0].sequences[0].scenes[0].draft =
      'Черновик версии 2: новые события и улики.';
    const v2Record = storage2.createStoryVersion(
      story.id,
      fetchedFull!,
      'Добавлен черновик v2'
    );

    assert(v2Record.version === initialVersions.length + 1, 'Version number auto-incremented');

    const versionsAfterV2 = storage2.getStoryVersions(story.id);
    assert(versionsAfterV2.length === initialVersions.length + 1, 'Version registered in list');

    // Restore back to version 1
    const v1Id = initialVersions[0].id;
    const restored = storage2.restoreStoryVersion(story.id, v1Id);

    assert(
      restored.id === story.id,
      'Restored story matches story id'
    );
    // Check that auto-checkpoint before restore was created
    const versionsAfterRestore = storage2.getStoryVersions(story.id);
    assert(
      versionsAfterRestore.length === versionsAfterV2.length + 2,
      'Restore creates pre-restore safety snapshot and post-restore checkpoint'
    );

    // -------------------------------------------------------------
    // Test 6: Universe Export & Import Strategies
    // -------------------------------------------------------------
    console.log('\n[6. Universe Export & Import]');
    const exportedArchive = storage2.exportUniverse('uni-main');

    assert(
      exportedArchive.format === 'storyengine-universe',
      'Archive has correct format header'
    );
    assert(
      exportedArchive.universe.id === 'uni-main',
      'Archive contains correct universe root'
    );
    assert(
      exportedArchive.characters.length > 0,
      'Archive contains exported characters'
    );
    assert(
      exportedArchive.fullStories.length > 0,
      'Archive contains exported full stories'
    );

    // Test import with strategy: 'copy'
    const importResult = storage2.importUniverse(exportedArchive, {
      strategy: 'copy',
    });

    assert(importResult.success, 'Import with strategy copy succeeded');
    assert(
      importResult.universeId !== 'uni-main',
      'Imported copy universe generated a new unique ID'
    );

    const importedUniverse = storage2.getUniverse(importResult.universeId);
    assert(!!importedUniverse, 'Imported universe copy exists in database');
    assert(
      importedUniverse?.name.includes('Копия') || false,
      'Imported universe copy name flagged as copy'
    );

    const importedCharacters = storage2.getCharacters(importResult.universeId);
    assert(
      importedCharacters.length === exportedArchive.characters.length,
      'All characters remapped and imported to copy universe'
    );

    // -------------------------------------------------------------
    // Test 7: MemoryStorage Parity
    // -------------------------------------------------------------
    console.log('\n[7. MemoryStorage Parity]');
    const memory = new MemoryStorage();
    const memStats = memory.getStats();
    assert(memStats.backend === 'memory', 'MemoryStorage backend is memory');
    assert(memStats.universes >= 2, 'MemoryStorage has default seed universes');

    const memStory = memory.getFullStory('story-001');
    assert(!!memStory, 'MemoryStorage retrieves FullStory aggregate');

    storage2.shutdown();

    console.log(`\n=================================================`);
    console.log(`ALL SQLITE STORAGE TESTS PASSED: ${passed}/${total}`);
    console.log(`=================================================\n`);
  } finally {
    // Cleanup temporary test files
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const walPath = `${testDbPath}-wal`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      const shmPath = `${testDbPath}-shm`;
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      if (fs.existsSync(testDbDir)) fs.rmdirSync(testDbDir, { recursive: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

runStorageTests().catch((err) => {
  console.error('\n❌ SQLITE TEST RUN FAILED:', err);
  process.exit(1);
});
