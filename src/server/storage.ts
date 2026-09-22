import {
  Universe,
  Character,
  Story,
  StoryEvent,
  StoryLocation,
  StoryObject,
  Relationship,
  ProposedKnowledgeChange,
  StoryPlan,
  LLMConfig,
  LorebookEntry,
} from '../types';
import { FullStory } from '../domain/storyModel';
import { legacyStoryToFullStory, fullStoryToLegacyStory } from '../domain/adapters';
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
} from './storage/types';
import { SQLiteStorage } from './storage/sqliteStorage';
import { initialData } from './storage/initialData';
import type { StorageData } from './storage/initialData';

export { initialData };
export type { StorageData };
export { SQLiteStorage };

/**
 * MemoryStorage: In-memory implementation of StoryStorage.
 * Ideal for unit and integration testing without disk I/O.
 */
export class MemoryStorage implements StoryStorage {
  private data: StorageData;
  private fullStories: Map<string, FullStory> = new Map();
  private storyVersions: Map<string, StoryVersionRecord[]> = new Map();
  private storyRevisions: Map<string, number> = new Map();

  constructor() {
    this.data = JSON.parse(JSON.stringify(initialData));
    if (!this.data.lorebookEntries) {
      this.data.lorebookEntries = [];
    }

    // Initialize full stories and initial versions
    for (const legacy of this.data.stories) {
      const universe = this.getUniverse(legacy.universeId) || this.data.universes[0];
      const chars = this.getCharacters(legacy.universeId);
      const locs = this.getLocations(legacy.universeId);
      const full = legacyStoryToFullStory(legacy, universe, chars, locs);
      this.fullStories.set(full.id, full);
      this.storyRevisions.set(full.id, 1);
      this.storyVersions.set(full.id, [
        {
          id: `ver-${full.id}-1`,
          storyId: full.id,
          version: 1,
          data: full,
          reason: 'Начальная каноническая редакция',
          createdAt: full.createdAt || new Date().toISOString(),
        },
      ]);
    }
  }

  // --- Universes ---
  getUniverses(): Universe[] {
    return this.data.universes;
  }

  getUniverse(id: string): Universe | null {
    return this.data.universes.find((u) => u.id === id) || null;
  }

  createUniverse(
    universe: Omit<Universe, 'id' | 'createdAt' | 'updatedAt'> | Universe
  ): Universe {
    const id =
      'id' in universe && universe.id ? universe.id : `uni-${Date.now()}`;
    const newUni: Universe = {
      ...universe,
      id,
      tags: universe.tags || [],
      rules: universe.rules || [],
      status: universe.status || 'active',
      createdAt:
        'createdAt' in universe && universe.createdAt
          ? universe.createdAt
          : new Date().toISOString(),
      updatedAt:
        'updatedAt' in universe && universe.updatedAt
          ? universe.updatedAt
          : new Date().toISOString(),
    };
    this.data.universes.push(newUni);
    return newUni;
  }

  updateUniverse(id: string, updates: Partial<Universe>): Universe | null {
    const uni = this.getUniverse(id);
    if (!uni) return null;
    Object.assign(uni, updates, { updatedAt: new Date().toISOString() });
    return uni;
  }

  deleteUniverse(id: string): boolean {
    const index = this.data.universes.findIndex((u) => u.id === id);
    if (index === -1) return false;
    this.data.universes.splice(index, 1);
    return true;
  }

  // --- Characters ---
  getCharacters(universeId?: string): Character[] {
    if (universeId) {
      return this.data.characters.filter((c) => c.universeId === universeId);
    }
    return this.data.characters;
  }

  getCharacter(id: string): Character | null {
    return this.data.characters.find((c) => c.id === id) || null;
  }

  createCharacter(
    char: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> | Character
  ): Character {
    const id = 'id' in char && char.id ? char.id : `char-${Date.now()}`;
    const newChar: Character = {
      ...char,
      id,
      aliases: char.aliases || [],
      tags: char.tags || [],
      states: char.states || [],
      status: char.status || 'alive',
      role: char.role || 'supporting',
      createdAt:
        'createdAt' in char && char.createdAt
          ? char.createdAt
          : new Date().toISOString(),
      updatedAt:
        'updatedAt' in char && char.updatedAt
          ? char.updatedAt
          : new Date().toISOString(),
    };
    this.data.characters.push(newChar);
    return newChar;
  }

  updateCharacter(id: string, updates: Partial<Character>): Character | null {
    const char = this.getCharacter(id);
    if (!char) return null;
    Object.assign(char, updates, { updatedAt: new Date().toISOString() });
    return char;
  }

  deleteCharacter(id: string): boolean {
    const index = this.data.characters.findIndex((c) => c.id === id);
    if (index === -1) return false;
    this.data.characters.splice(index, 1);
    return true;
  }

  // --- Locations ---
  getLocations(universeId?: string): StoryLocation[] {
    if (universeId) {
      return this.data.locations.filter((l) => l.universeId === universeId);
    }
    return this.data.locations;
  }

  getLocation(id: string): StoryLocation | null {
    return this.data.locations.find((l) => l.id === id) || null;
  }

  createLocation(
    loc: Omit<StoryLocation, 'id' | 'createdAt' | 'updatedAt'> | StoryLocation
  ): StoryLocation {
    const id = 'id' in loc && loc.id ? loc.id : `loc-${Date.now()}`;
    const newLoc: StoryLocation = {
      ...loc,
      id,
      status: loc.status || 'intact',
      createdAt:
        'createdAt' in loc && loc.createdAt
          ? loc.createdAt
          : new Date().toISOString(),
      updatedAt:
        'updatedAt' in loc && loc.updatedAt
          ? loc.updatedAt
          : new Date().toISOString(),
    };
    this.data.locations.push(newLoc);
    return newLoc;
  }

  updateLocation(id: string, updates: Partial<StoryLocation>): StoryLocation | null {
    const loc = this.getLocation(id);
    if (!loc) return null;
    Object.assign(loc, updates, { updatedAt: new Date().toISOString() });
    return loc;
  }

  deleteLocation(id: string): boolean {
    const index = this.data.locations.findIndex((l) => l.id === id);
    if (index === -1) return false;
    this.data.locations.splice(index, 1);
    return true;
  }

  // --- Events ---
  getEvents(universeId?: string): StoryEvent[] {
    if (universeId) {
      return this.data.events.filter((e) => e.universeId === universeId);
    }
    return this.data.events;
  }

  getEvent(id: string): StoryEvent | null {
    return this.data.events.find((e) => e.id === id) || null;
  }

  createEvent(
    evt: Omit<StoryEvent, 'id' | 'createdAt' | 'updatedAt'> | StoryEvent
  ): StoryEvent {
    const id = 'id' in evt && evt.id ? evt.id : `evt-${Date.now()}`;
    const newEvt: StoryEvent = {
      ...evt,
      id,
      canonStatus: evt.canonStatus || 'canon',
      createdAt:
        'createdAt' in evt && evt.createdAt
          ? evt.createdAt
          : new Date().toISOString(),
      updatedAt:
        'updatedAt' in evt && evt.updatedAt
          ? evt.updatedAt
          : new Date().toISOString(),
    };
    this.data.events.push(newEvt);
    return newEvt;
  }

  deleteEvent(id: string): boolean {
    const index = this.data.events.findIndex((e) => e.id === id);
    if (index === -1) return false;
    this.data.events.splice(index, 1);
    return true;
  }

  // --- Objects ---
  getObjects(universeId?: string): StoryObject[] {
    if (universeId) {
      return this.data.objects.filter((o) => o.universeId === universeId);
    }
    return this.data.objects;
  }

  getObject(id: string): StoryObject | null {
    return this.data.objects.find((o) => o.id === id) || null;
  }

  createObject(
    obj: Omit<StoryObject, 'id' | 'createdAt' | 'updatedAt'> | StoryObject
  ): StoryObject {
    const id = 'id' in obj && obj.id ? obj.id : `obj-${Date.now()}`;
    const newObj: StoryObject = {
      ...obj,
      id,
      properties: obj.properties || {},
      createdAt:
        'createdAt' in obj && obj.createdAt
          ? obj.createdAt
          : new Date().toISOString(),
      updatedAt:
        'updatedAt' in obj && obj.updatedAt
          ? obj.updatedAt
          : new Date().toISOString(),
    };
    this.data.objects.push(newObj);
    return newObj;
  }

  deleteObject(id: string): boolean {
    const index = this.data.objects.findIndex((o) => o.id === id);
    if (index === -1) return false;
    this.data.objects.splice(index, 1);
    return true;
  }

  // --- Relationships ---
  getRelationships(): Relationship[] {
    return this.data.relationships;
  }

  createRelationship(
    rel: Omit<Relationship, 'id' | 'createdAt'> | Relationship
  ): Relationship {
    const id = 'id' in rel && rel.id ? rel.id : `rel-${Date.now()}`;
    const newRel: Relationship = {
      ...rel,
      id,
      confidence: rel.confidence ?? 1.0,
      canonStatus: rel.canonStatus || 'canon',
      createdAt:
        'createdAt' in rel && rel.createdAt
          ? rel.createdAt
          : new Date().toISOString(),
    };
    this.data.relationships.push(newRel);
    return newRel;
  }

  deleteRelationship(id: string): boolean {
    const index = this.data.relationships.findIndex((r) => r.id === id);
    if (index === -1) return false;
    this.data.relationships.splice(index, 1);
    return true;
  }

  // --- Stories ---
  getStories(filters?: { universeId?: string; canonStatus?: string; status?: string }): Story[] {
    let stories = this.data.stories;
    if (filters?.universeId) {
      stories = stories.filter((s) => s.universeId === filters.universeId);
    }
    if (filters?.canonStatus) {
      stories = stories.filter((s) => s.canonStatus === filters.canonStatus);
    }
    if (filters?.status) {
      stories = stories.filter((s) => s.status === filters.status);
    }
    return stories;
  }

  getStory(id: string): Story | null {
    return this.data.stories.find((s) => s.id === id) || null;
  }

  createStory(story: Omit<Story, 'id' | 'versions' | 'createdAt' | 'updatedAt'> | Story): Story {
    const now = new Date().toISOString();
    const id = 'id' in story && story.id ? story.id : `story-${Date.now()}`;
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
    this.data.stories.unshift(newStory);

    const universe = this.getUniverse(newStory.universeId) || this.data.universes[0];
    const full = legacyStoryToFullStory(
      newStory,
      universe,
      this.getCharacters(newStory.universeId),
      this.getLocations(newStory.universeId)
    );
    this.fullStories.set(id, full);
    this.storyRevisions.set(id, 1);
    this.storyVersions.set(id, [
      {
        id: `ver-${id}-1`,
        storyId: id,
        version: 1,
        data: full,
        reason: 'Начальная версия',
        createdAt: now,
      },
    ]);

    return newStory;
  }

  updateStory(id: string, updates: Partial<Story>, changeSummary?: string): Story | null {
    const story = this.getStory(id);
    if (!story) return null;

    const now = new Date().toISOString();
    const nextVer = (story.versions?.length || 0) + 1;

    let updatedVersions = story.versions || [];
    if (updates.fullText && updates.fullText !== story.fullText) {
      updatedVersions = [
        ...updatedVersions,
        {
          id: `ver-${id}-${nextVer}`,
          storyId: id,
          versionNumber: nextVer,
          title: updates.title || story.title,
          synopsis: updates.synopsis || story.synopsis,
          fullText: updates.fullText,
          changeSummary: changeSummary || `Версия ${nextVer}`,
          createdAt: now,
        },
      ];
    }

    Object.assign(story, updates, {
      versions: updatedVersions,
      updatedAt: now,
    });

    const full = this.fullStories.get(id);
    if (full) {
      full.title = story.title;
      full.updatedAt = now;
      if (updates.fullText && full.plot?.acts?.[0]?.sequences?.[0]?.scenes?.[0]) {
        full.plot.acts[0].sequences[0].scenes[0].draft = updates.fullText;
      }
      this.storyRevisions.set(id, (this.storyRevisions.get(id) || 1) + 1);
    }

    return story;
  }

  deleteStory(id: string): boolean {
    const index = this.data.stories.findIndex((s) => s.id === id);
    if (index === -1) return false;
    this.data.stories.splice(index, 1);
    this.fullStories.delete(id);
    this.storyVersions.delete(id);
    this.storyRevisions.delete(id);
    return true;
  }

  // --- Story Plans ---
  getStoryPlans(universeId?: string): StoryPlan[] {
    const plans = this.data.storyPlans || [];
    if (universeId) {
      return plans.filter((p) => p.universeId === universeId);
    }
    return plans;
  }

  getStoryPlan(id: string): StoryPlan | null {
    return (this.data.storyPlans || []).find((p) => p.id === id) || null;
  }

  createStoryPlan(
    plan: Omit<StoryPlan, 'id' | 'createdAt' | 'updatedAt'> | StoryPlan
  ): StoryPlan {
    const id = 'id' in plan && plan.id ? plan.id : `plan-${Date.now()}`;
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
      createdAt:
        'createdAt' in plan && plan.createdAt
          ? plan.createdAt
          : new Date().toISOString(),
      updatedAt:
        'updatedAt' in plan && plan.updatedAt
          ? plan.updatedAt
          : new Date().toISOString(),
    };
    if (!this.data.storyPlans) {
      this.data.storyPlans = [];
    }
    this.data.storyPlans.unshift(newPlan);
    return newPlan;
  }

  updateStoryPlan(id: string, updates: Partial<StoryPlan>): StoryPlan | null {
    const plan = this.getStoryPlan(id);
    if (!plan) return null;
    Object.assign(plan, updates, { updatedAt: new Date().toISOString() });
    return plan;
  }

  deleteStoryPlan(id: string): boolean {
    const idx = (this.data.storyPlans || []).findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.data.storyPlans.splice(idx, 1);
    return true;
  }

  // --- Proposed Changes ---
  getProposedChanges(status?: string): ProposedKnowledgeChange[] {
    if (status) {
      return this.data.proposedChanges.filter((p) => p.status === status);
    }
    return this.data.proposedChanges;
  }

  addProposedChange(
    change:
      | Omit<ProposedKnowledgeChange, 'id' | 'createdAt' | 'status'>
      | ProposedKnowledgeChange
  ): ProposedKnowledgeChange {
    const id = 'id' in change && change.id ? change.id : `prop-${Date.now()}`;
    const newProp: ProposedKnowledgeChange = {
      ...change,
      id,
      confidence: change.confidence ?? 1.0,
      status: 'status' in change && change.status ? change.status : 'pending',
      createdAt:
        'createdAt' in change && change.createdAt
          ? change.createdAt
          : new Date().toISOString(),
    };
    this.data.proposedChanges.unshift(newProp);
    return newProp;
  }

  updateProposedChangeStatus(
    id: string,
    status: 'accepted' | 'rejected'
  ): ProposedKnowledgeChange | null {
    const prop = this.data.proposedChanges.find((p) => p.id === id);
    if (!prop) return null;
    prop.status = status;
    return prop;
  }

  // --- LLM Config ---
  getLLMConfig(): LLMConfig {
    if (!this.data.llmConfig) {
      this.data.llmConfig = { ...initialData.llmConfig };
    }
    return this.data.llmConfig;
  }

  updateLLMConfig(updates: Partial<LLMConfig>): LLMConfig {
    const current = this.getLLMConfig();
    this.data.llmConfig = {
      ...current,
      ...updates,
    };
    return this.data.llmConfig;
  }

  // --- Lorebook ---
  getLorebookEntries(universeId?: string): LorebookEntry[] {
    const entries = this.data.lorebookEntries || [];
    if (universeId) {
      return entries.filter((e) => e.universeId === universeId);
    }
    return entries;
  }

  createLorebookEntry(
    entry: Omit<LorebookEntry, 'id' | 'createdAt' | 'updatedAt'> | LorebookEntry
  ): LorebookEntry {
    const id = 'id' in entry && entry.id ? entry.id : `lore-${Date.now()}`;
    const now = new Date().toISOString();
    const newEntry: LorebookEntry = {
      ...entry,
      id,
      enabled: entry.enabled ?? true,
      constant: entry.constant ?? false,
      priority: entry.priority ?? 10,
      createdAt: 'createdAt' in entry && entry.createdAt ? entry.createdAt : now,
      updatedAt: 'updatedAt' in entry && entry.updatedAt ? entry.updatedAt : now,
    };
    if (!this.data.lorebookEntries) {
      this.data.lorebookEntries = [];
    }
    this.data.lorebookEntries.unshift(newEntry);
    return newEntry;
  }

  updateLorebookEntry(id: string, updates: Partial<LorebookEntry>): LorebookEntry | null {
    const entry = (this.data.lorebookEntries || []).find((e) => e.id === id);
    if (!entry) return null;
    Object.assign(entry, updates, { updatedAt: new Date().toISOString() });
    return entry;
  }

  deleteLorebookEntry(id: string): boolean {
    const idx = (this.data.lorebookEntries || []).findIndex((e) => e.id === id);
    if (idx === -1) return false;
    this.data.lorebookEntries!.splice(idx, 1);
    return true;
  }

  // --- FullStory ---
  getFullStory(id: string): FullStory | null {
    if (this.fullStories.has(id)) {
      return this.fullStories.get(id)!;
    }

    const legacy = this.getStory(id);
    if (!legacy) return null;

    const universe = this.getUniverse(legacy.universeId) || this.data.universes[0];
    const full = legacyStoryToFullStory(
      legacy,
      universe,
      this.getCharacters(legacy.universeId),
      this.getLocations(legacy.universeId)
    );
    this.fullStories.set(id, full);
    this.storyRevisions.set(id, 1);
    return full;
  }

  getFullStories(universeId?: string): FullStory[] {
    for (const legacy of this.data.stories) {
      if (!this.fullStories.has(legacy.id)) {
        const universe = this.getUniverse(legacy.universeId) || this.data.universes[0];
        const full = legacyStoryToFullStory(
          legacy,
          universe,
          this.getCharacters(legacy.universeId),
          this.getLocations(legacy.universeId)
        );
        this.fullStories.set(legacy.id, full);
        this.storyRevisions.set(legacy.id, 1);
      }
    }

    const all = Array.from(this.fullStories.values());
    if (universeId) {
      return all.filter((s) => s.universeId === universeId);
    }
    return all;
  }

  getStoryRevision(id: string): number {
    return this.storyRevisions.get(id) || 0;
  }

  saveFullStory(full: FullStory, options?: SaveFullStoryOptions): FullStory {
    const existingRevision = this.storyRevisions.get(full.id) || 0;
    if (
      options?.expectedRevision !== undefined &&
      existingRevision !== options.expectedRevision
    ) {
      throw new RevisionConflictError(
        full.id,
        options.expectedRevision,
        existingRevision
      );
    }

    const nextRevision = existingRevision + 1;
    this.storyRevisions.set(full.id, nextRevision);

    const now = new Date().toISOString();
    full.updatedAt = now;
    this.fullStories.set(full.id, full);

    if (options?.createVersion) {
      const vers = this.storyVersions.get(full.id) || [];
      const nextVerNumber = vers.length + 1;
      vers.push({
        id: `ver-${full.id}-${nextVerNumber}`,
        storyId: full.id,
        version: nextVerNumber,
        data: JSON.parse(JSON.stringify(full)),
        reason: options.versionReason || `Версия ${nextVerNumber}`,
        createdAt: now,
      });
      this.storyVersions.set(full.id, vers);
    }

    const legacy = fullStoryToLegacyStory(full);
    const existingIndex = this.data.stories.findIndex((s) => s.id === full.id);
    if (existingIndex >= 0) {
      this.data.stories[existingIndex] = {
        ...this.data.stories[existingIndex],
        ...legacy,
        updatedAt: full.updatedAt,
      };
    } else {
      this.data.stories.unshift(legacy);
    }

    return full;
  }

  deleteFullStory(id: string): boolean {
    this.fullStories.delete(id);
    this.storyVersions.delete(id);
    this.storyRevisions.delete(id);
    return this.deleteStory(id);
  }

  // --- Story Versioning ---
  getStoryVersions(storyId: string): StoryVersionRecord[] {
    return this.storyVersions.get(storyId) || [];
  }

  getStoryVersion(storyId: string, versionId: string): StoryVersionRecord | null {
    const list = this.getStoryVersions(storyId);
    return (
      list.find((v) => v.id === versionId || String(v.version) === versionId) || null
    );
  }

  createStoryVersion(storyId: string, data: FullStory, reason?: string): StoryVersionRecord {
    const story = this.getFullStory(storyId);
    if (!story) {
      throw new NotFoundError('История', storyId);
    }

    const vers = this.storyVersions.get(storyId) || [];
    const nextVerNumber = vers.length + 1;
    const now = new Date().toISOString();
    const record: StoryVersionRecord = {
      id: `ver-${storyId}-${nextVerNumber}`,
      storyId,
      version: nextVerNumber,
      data: JSON.parse(JSON.stringify(data)),
      reason: reason || `Контрольная точка #${nextVerNumber}`,
      createdAt: now,
    };
    vers.push(record);
    this.storyVersions.set(storyId, vers);
    this.storyRevisions.set(storyId, (this.storyRevisions.get(storyId) || 1) + 1);

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

    // Save snapshot of current before restoring
    this.createStoryVersion(
      storyId,
      currentStory,
      `Авто-сохранение перед откатом к версии v${targetVersion.version}`
    );

    const restored: FullStory = JSON.parse(JSON.stringify(targetVersion.data));
    restored.id = storyId;
    restored.updatedAt = new Date().toISOString();

    this.saveFullStory(restored, {
      createVersion: true,
      versionReason: `Восстановлено из версии v${targetVersion.version}`,
    });

    return restored;
  }

  // --- Stats ---
  getStats(): StorageStats {
    let totalStoryVersions = 0;
    for (const vList of this.storyVersions.values()) {
      totalStoryVersions += vList.length;
    }

    return {
      universes: this.data.universes.length,
      characters: this.data.characters.length,
      locations: this.data.locations.length,
      events: this.data.events.length,
      objects: this.data.objects.length,
      relationships: this.data.relationships.length,
      stories: this.data.stories.length,
      fullStories: this.fullStories.size,
      storyVersions: totalStoryVersions,
      storyPlans: (this.data.storyPlans || []).length,
      proposedChanges: this.data.proposedChanges.length,
      pendingChanges: this.data.proposedChanges.filter((p) => p.status === 'pending').length,
      backend: 'memory',
    };
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
    if (!archive || archive.format !== 'storyengine-universe') {
      throw new ValidationError('Неверный формат архива');
    }

    const strategy = options?.strategy || 'copy';
    const counts = {
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

    if (strategy === 'replace') {
      this.deleteUniverse(archive.universe.id);
      this.createUniverse(archive.universe);
      for (const c of archive.characters || []) {
        this.createCharacter(c);
        counts.characters++;
      }
      for (const l of archive.locations || []) {
        this.createLocation(l);
        counts.locations++;
      }
      for (const e of archive.events || []) {
        this.createEvent(e);
        counts.events++;
      }
      for (const o of archive.objects || []) {
        this.createObject(o);
        counts.objects++;
      }
      for (const r of archive.relationships || []) {
        this.createRelationship(r);
        counts.relationships++;
      }
      for (const p of archive.storyPlans || []) {
        this.createStoryPlan(p);
        counts.storyPlans++;
      }
      for (const s of archive.stories || []) {
        this.createStory(s);
        counts.stories++;
      }
      for (const fs of archive.fullStories || []) {
        this.saveFullStory(fs);
        counts.fullStories++;
      }
    } else {
      // copy
      const suffix = Date.now().toString(36);
      const newUniId = `uni-${suffix}`;
      this.createUniverse({
        ...archive.universe,
        id: newUniId,
        name: `${archive.universe.name} (Копия)`,
      });
      for (const c of archive.characters || []) {
        this.createCharacter({ ...c, id: `char-${suffix}-${c.id}`, universeId: newUniId });
        counts.characters++;
      }
    }

    return {
      success: true,
      universeId: archive.universe.id,
      universeName: archive.universe.name,
      strategy,
      importedCounts: counts,
    };
  }

  shutdown(): void {
    // No-op for in-memory
  }
}

/**
 * Storage factory creating either SQLite or In-Memory storage.
 * Default is SQLiteStorage pointing to './data/storyengine.db'.
 */
export function createStorage(
  backend?: 'sqlite' | 'memory',
  dbPath?: string
): StoryStorage {
  const chosenBackend =
    backend ||
    (process.env.STORAGE_BACKEND as 'sqlite' | 'memory') ||
    'sqlite';

  if (chosenBackend === 'memory') {
    console.log('[Storage] Initializing MemoryStorage backend.');
    return new MemoryStorage();
  }

  const databasePath =
    dbPath || process.env.SQLITE_DB_PATH || './data/storyengine.db';
  console.log(`[Storage] Initializing SQLiteStorage backend at: ${databasePath}`);
  return new SQLiteStorage(databasePath);
}

// Global storage singleton instance
export const storage: StoryStorage = createStorage();
