/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EntityType =
  | 'character'
  | 'story'
  | 'location'
  | 'event'
  | 'object'
  | 'universe'
  | 'relationship';

export interface Universe {
  id: string;
  name: string;
  description: string;
  genre?: string;
  era?: string;
  tags?: string[];
  status?: string;
  rules?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CharacterState {
  id?: string;
  characterId?: string;
  eventId?: string;
  year: number;
  status: 'alive' | 'deceased' | 'missing' | 'unknown' | 'transformed';
  description: string;
  locationId?: string;
}

export interface Character {
  id: string;
  universeId: string;
  canonicalName: string;
  aliases: string[];
  occupation?: string;
  age?: number | string;
  role?: string;
  gender?: string;
  tags?: string[];
  status: 'alive' | 'deceased' | 'missing' | 'unknown';
  description: string;
  biography?: string;
  personality?: string;
  appearance?: string;
  states: CharacterState[];
  createdAt: string;
  updatedAt: string;
}

export interface StoryLocation {
  id: string;
  universeId: string;
  name: string;
  description: string;
  status: 'intact' | 'ruined' | 'abandoned' | 'unknown';
  type?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoryEvent {
  id: string;
  universeId: string;
  title: string;
  description: string;
  year: number;
  dateStart?: string;
  dateEnd?: string;
  locationId?: string;
  canonStatus: 'canon' | 'apocrypha' | 'legend' | 'retconned';
  createdAt: string;
  updatedAt: string;
}

export interface StoryObject {
  id: string;
  universeId: string;
  name: string;
  description: string;
  currentLocationId?: string;
  properties?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: string;
  universeId?: string;
  sourceId: string;
  sourceType: EntityType;
  targetId: string;
  targetType: EntityType;
  relationType: string;
  description?: string;
  notes?: string;
  confidence: number;
  canonStatus: 'canon' | 'candidate' | 'rejected';
  provenance?: string;
  createdAt: string;
}

export interface ConsistencyIssue {
  id?: string;
  severity: 'error' | 'warning' | 'info';
  category?: 'temporal_paradox' | 'character_status' | 'world_rules' | 'location_state' | 'logic';
  type?: string;
  message: string;
  suggestedFix?: string;
  entityIds?: string[];
  targetEntityName?: string;
  resolutionSuggestion?: string;
}

export interface ConsistencyReport {
  passed: boolean;
  score: number; // 0..100
  summary: string;
  issues: ConsistencyIssue[];
}

export interface StoryVersion {
  id: string;
  storyId: string;
  versionNumber: number;
  title: string;
  synopsis?: string;
  fullText: string;
  changeDescription?: string;
  changeSummary?: string;
  createdAt: string;
}

export interface Story {
  id: string;
  universeId: string;
  planId?: string;
  title: string;
  synopsis: string;
  fullText: string;
  status: 'draft' | 'generated' | 'reviewed' | 'published';
  canonStatus: 'canon' | 'apocrypha' | 'alternative_timeline' | 'draft';
  storyDate: string;
  storyYear: number;
  consistencyStatus?: 'passed' | 'has_warnings' | 'has_conflicts' | 'not_checked';
  consistencyReport?: ConsistencyReport;
  characterIds?: string[];
  locationIds?: string[];
  eventIds?: string[];
  scenes?: PlannedScene[];
  activeBeatId?: string;
  versions?: StoryVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface ProposedKnowledgeChange {
  id: string;
  storyId?: string;
  universeId?: string;
  entityType: EntityType;
  changeType?: 'create' | 'update' | 'add_relation' | 'state_change';
  action?: string;
  targetName?: string;
  summary?: string;
  reasoning?: string;
  details?: Record<string, any>;
  payload?: any;
  confidence: number; // 0..1
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface StoryBible {
  universeId: string;
  universeName: string;
  storyYear: number;
  requestedPrompt?: string;
  relevantCharacters: {
    name: string;
    aliases: string[];
    currentStatusAtYear: string;
    biographySummary: string;
    isDeceased: boolean;
  }[];
  relevantLocations: {
    name: string;
    status: string;
    description: string;
  }[];
  relevantEvents: {
    title: string;
    year: number;
    description: string;
  }[];
  relevantObjects: {
    name: string;
    description: string;
  }[];
  canonConstraints: string[];
  forbiddenElements: string[];
  potentialReferences: {
    sourceStoryTitle: string;
    itemOrPhrase: string;
    suggestion: string;
  }[];
}

export interface GenerateStoryRequest {
  universeId: string;
  prompt: string;
  storyYear: number;
  style?: string;
  length?: 'short' | 'medium' | 'long';
  canonStatus: 'canon' | 'apocrypha' | 'alternative_timeline' | 'draft';
  referenceLevel: 'none' | 'subtle' | 'obvious';
  characterIds?: string[];
  locationIds?: string[];
  forbiddenElements?: string[];
}

// Story Planning & Story Beats
export interface StoryBeat {
  id: string;
  sceneId: string;
  beatIndex: number;
  title: string;
  directive: string;
  charactersPresent?: string[];
  status: 'pending' | 'generated' | 'approved';
  generatedText?: string;
  userNotes?: string;
  targetWordCount?: number;
}

export interface PlannedScene {
  id: string;
  title: string;
  description: string;
  locationId?: string;
  locationName?: string;
  characterIds: string[];
  characterNames: string[];
  year: number;
  plotTwist?: string;
  emotionalBeat?: string;
  keyClueOrObject?: string;
  beats?: StoryBeat[];
  sceneText?: string;
  status?: 'planned' | 'in_progress' | 'completed';
}

export interface BreakdownSceneRequest {
  universeId: string;
  storyYear: number;
  scene: PlannedScene;
  genre?: string;
  tone?: string;
  premise?: string;
}

export interface GenerateBeatProseRequest {
  universeId: string;
  storyYear: number;
  beat: StoryBeat;
  scene: PlannedScene;
  previousText?: string;
  genre?: string;
  tone?: string;
  styleNotes?: string;
}

export interface StoryPlan {
  id: string;
  universeId: string;
  storyYear: number;
  title: string;
  premise: string;
  genre: string;
  tone: string;
  selectedCharacterIds: string[];
  selectedLocationIds: string[];
  selectedObjectIds: string[];
  scenes: PlannedScene[];
  plotTwists: string[];
  canonNotes: string[];
  status: 'brainstorming' | 'ready_to_write' | 'written';
  createdAt: string;
  updatedAt: string;
}

export interface PlannerChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedPlanDelta?: {
    title?: string;
    premise?: string;
    plotTwists?: string[];
    suggestedCharacters?: { id?: string; name: string; statusHint?: string }[];
    suggestedLocations?: { id?: string; name: string }[];
    suggestedScenes?: Partial<PlannedScene>[];
    canonWarnings?: string[];
  };
}

export type LLMProviderType =
  | 'gemini'
  | 'ollama'
  | 'lmstudio'
  | 'vllm'
  | 'openai'
  | 'deepseek'
  | 'anthropic'
  | 'groq'
  | 'openrouter'
  | 'custom';

export interface LLMConfig {
  provider: LLMProviderType;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  customHeaders?: Record<string, string>;
  isLocal?: boolean;
}

export interface LLMTestResult {
  success: boolean;
  message?: string;
  model?: string;
  provider?: string;
  latencyMs?: number;
  error?: string;
  replySnippet?: string;
}

