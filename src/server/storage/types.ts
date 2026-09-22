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

// --- Custom Error Classes ---

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export class NotFoundError extends StorageError {
  constructor(entityName: string, id: string) {
    super(`${entityName} с идентификатором "${id}" не найден`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends StorageError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RevisionConflictError extends StorageError {
  constructor(storyId: string, expectedRevision: number, actualRevision: number) {
    super(
      `Конфликт ревизий для истории "${storyId}": ожидалась ревизия ${expectedRevision}, но текущая ревизия в базе ${actualRevision}`
    );
    this.name = 'RevisionConflictError';
  }
}

export class MigrationError extends StorageError {
  constructor(migrationName: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Ошибка выполнения миграции "${migrationName}": ${detail}`);
    this.name = 'MigrationError';
  }
}

export class ImportError extends StorageError {
  constructor(message: string) {
    super(`Ошибка импорта вселенной: ${message}`);
    this.name = 'ImportError';
  }
}

// --- Storage Options & Records ---

export interface SaveFullStoryOptions {
  createVersion?: boolean;
  versionReason?: string;
  expectedRevision?: number;
}

export interface StoryVersionRecord {
  id: string;
  storyId: string;
  version: number;
  data: FullStory;
  reason?: string;
  createdAt: string;
}

export interface StorageStats {
  universes: number;
  characters: number;
  locations: number;
  events: number;
  objects: number;
  relationships: number;
  stories: number;
  fullStories: number;
  storyVersions: number;
  storyPlans: number;
  proposedChanges: number;
  pendingChanges: number;
  backend: 'sqlite' | 'memory';
}

// --- Universe Export / Import Formats ---

export interface UniverseExport {
  format: 'storyengine-universe';
  schemaVersion: number;
  exportedAt: string;
  applicationVersion: string;
  universe: Universe;
  characters: Character[];
  locations: StoryLocation[];
  events: StoryEvent[];
  objects: StoryObject[];
  relationships: Relationship[];
  stories: Story[];
  fullStories: FullStory[];
  storyVersions?: StoryVersionRecord[];
  storyPlans?: StoryPlan[];
  proposedChanges?: ProposedKnowledgeChange[];
  lorebookEntries?: LorebookEntry[];
}

export interface ImportOptions {
  strategy?: 'copy' | 'replace' | 'skip';
}

export interface ImportResult {
  success: boolean;
  universeId: string;
  universeName: string;
  strategy: 'copy' | 'replace' | 'skip';
  importedCounts: {
    characters: number;
    locations: number;
    events: number;
    objects: number;
    relationships: number;
    stories: number;
    fullStories: number;
    storyVersions: number;
    storyPlans: number;
  };
  backupPath?: string;
}

// --- Common StoryStorage Interface ---

export interface StoryStorage {
  // Universes
  getUniverses(): Universe[];
  getUniverse(id: string): Universe | null | undefined;
  createUniverse(universe: Omit<Universe, 'id' | 'createdAt' | 'updatedAt'> | Universe): Universe;
  updateUniverse(id: string, updates: Partial<Universe>): Universe | null | undefined;
  deleteUniverse(id: string): boolean;

  // Characters
  getCharacters(universeId?: string): Character[];
  getCharacter(id: string): Character | null | undefined;
  createCharacter(character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> | Character): Character;
  updateCharacter(id: string, updates: Partial<Character>): Character | null | undefined;
  deleteCharacter(id: string): boolean;

  // Locations
  getLocations(universeId?: string): StoryLocation[];
  getLocation(id: string): StoryLocation | null | undefined;
  createLocation(location: Omit<StoryLocation, 'id' | 'createdAt' | 'updatedAt'> | StoryLocation): StoryLocation;
  updateLocation(id: string, updates: Partial<StoryLocation>): StoryLocation | null | undefined;
  deleteLocation(id: string): boolean;

  // Events
  getEvents(universeId?: string): StoryEvent[];
  getEvent(id: string): StoryEvent | null | undefined;
  createEvent(event: Omit<StoryEvent, 'id' | 'createdAt' | 'updatedAt'> | StoryEvent): StoryEvent;
  deleteEvent(id: string): boolean;

  // Objects
  getObjects(universeId?: string): StoryObject[];
  getObject(id: string): StoryObject | null | undefined;
  createObject(object: Omit<StoryObject, 'id' | 'createdAt' | 'updatedAt'> | StoryObject): StoryObject;
  deleteObject(id: string): boolean;

  // Stories (Legacy and Read-Model)
  getStories(filters?: { universeId?: string; canonStatus?: string; status?: string }): Story[];
  getStory(id: string): Story | null | undefined;
  createStory(story: Omit<Story, 'id' | 'versions' | 'createdAt' | 'updatedAt'> | Story): Story;
  updateStory(id: string, updates: Partial<Story>, changeSummary?: string): Story | null | undefined;
  deleteStory(id: string): boolean;

  // FullStory (Domain Aggregate Root)
  getFullStories(universeId?: string): FullStory[];
  getFullStory(id: string): FullStory | null | undefined;
  saveFullStory(story: FullStory, options?: SaveFullStoryOptions): FullStory;
  deleteFullStory(id: string): boolean;
  getStoryRevision(id: string): number;

  // Story Versions & Checkpoints
  getStoryVersions(storyId: string): StoryVersionRecord[];
  getStoryVersion(storyId: string, versionId: string): StoryVersionRecord | null | undefined;
  createStoryVersion(storyId: string, data: FullStory, reason?: string): StoryVersionRecord;
  restoreStoryVersion(storyId: string, versionId: string): FullStory;

  // Proposed Changes
  addProposedChange(
    change: Omit<ProposedKnowledgeChange, 'id' | 'createdAt' | 'status'> | ProposedKnowledgeChange
  ): ProposedKnowledgeChange;
  getProposedChanges(status?: string): ProposedKnowledgeChange[];
  updateProposedChangeStatus(id: string, status: 'accepted' | 'rejected'): ProposedKnowledgeChange | null | undefined;

  // Relationships
  getRelationships(): Relationship[];
  createRelationship(relationship: Omit<Relationship, 'id' | 'createdAt'> | Relationship): Relationship;
  deleteRelationship(id: string): boolean;

  // Story Plans
  getStoryPlans(universeId?: string): StoryPlan[];
  getStoryPlan(id: string): StoryPlan | null | undefined;
  createStoryPlan(plan: Omit<StoryPlan, 'id' | 'createdAt' | 'updatedAt'> | StoryPlan): StoryPlan;
  updateStoryPlan(id: string, updates: Partial<StoryPlan>): StoryPlan | null | undefined;
  deleteStoryPlan(id: string): boolean;

  // LLM Configuration
  getLLMConfig(): LLMConfig;
  updateLLMConfig(config: Partial<LLMConfig>): LLMConfig;

  // Lorebook Entries
  getLorebookEntries(universeId?: string): LorebookEntry[];
  createLorebookEntry(entry: Omit<LorebookEntry, 'id' | 'createdAt' | 'updatedAt'> | LorebookEntry): LorebookEntry;
  updateLorebookEntry(id: string, updates: Partial<LorebookEntry>): LorebookEntry | null | undefined;
  deleteLorebookEntry(id: string): boolean;

  // Aggregate Stats
  getStats(): StorageStats;

  // Universe Export & Import
  exportUniverse(universeId: string): UniverseExport;
  importUniverse(archive: UniverseExport, options?: ImportOptions): ImportResult;

  // Lifecycle
  shutdown(): Promise<void> | void;
}
