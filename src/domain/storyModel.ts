/**
 * Core Domain Model for Story Engine
 * 
 * Architectural Principle:
 * STORY = DATA
 * LLM = REASONING / GENERATION
 * ORCHESTRATOR = PROCESS
 * CANON = SOURCE OF TRUTH
 * STORY STATE = CURRENT STATE
 * USER = FINAL AUTHORITY
 */

// 1. Concept: High-level vision and creative premise
export interface StoryConcept {
  premise: string;
  genre: string;
  tone: string;
  themes: string[];
  centralConflict: string;
  stakes: string;
  targetAudience: string;
  endingDirection: string;
  estimatedScenesCount?: number;
}

// 2. Story Bible: Structured world knowledge & creative boundaries
export interface BibleCharacter {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  archetype?: string;
  statusAtStart: 'alive' | 'deceased' | 'missing' | 'unknown' | 'transformed';
  description: string;
  motivation: string;
  flaw?: string;
  voiceStyle?: string;
  knowledgeAtStart: string[];
  relationships: { targetCharacterId: string; relationType: string; description: string }[];
}

export interface BibleLocation {
  id: string;
  name: string;
  type: string;
  status: 'intact' | 'ruined' | 'abandoned' | 'anomalous' | 'unknown';
  description: string;
  atmosphere?: string;
  rulesOrDangers?: string[];
}

export interface BibleObject {
  id: string;
  name: string;
  description: string;
  significance: string;
  currentLocationId?: string;
  ownerCharacterId?: string;
  properties?: Record<string, any>;
}

export interface BibleMystery {
  id: string;
  question: string;
  truth: string;
  cluesPlanned: string[];
  status: 'unresolved' | 'partially_resolved' | 'resolved';
}

export interface BibleTimelineEvent {
  year: number;
  dateStr?: string;
  title: string;
  description: string;
  participatingCharacterIds?: string[];
}

export interface StoryBibleData {
  universeId: string;
  universeName: string;
  storyYear: number;
  characters: BibleCharacter[];
  locations: BibleLocation[];
  objects: BibleObject[];
  rules: string[];
  lore: string[];
  mysteries: BibleMystery[];
  importantFacts: string[];
  timeline: BibleTimelineEvent[];
  forbiddenElements: string[];
}

export type StoryBible = StoryBibleData;

// 3. Canon: Source of truth (facts that are officially established)
export type CanonFactType =
  | 'CHARACTER_KNOWLEDGE'
  | 'CHARACTER_STATUS'
  | 'RELATIONSHIP_CHANGE'
  | 'WORLD_RULE'
  | 'EVENT_OCCURRED'
  | 'OBJECT_STATE'
  | 'MYSTERY_REVEAL';

export interface CanonFact {
  id: string;
  type: CanonFactType;
  subject: string;
  statement: string;
  sourceSceneId?: string;
  sourceBeatId?: string;
  establishedInYear: number;
  status: 'canon' | 'retconned';
  createdAt: string;
}

export interface CanonProposal {
  id: string;
  type: CanonFactType;
  character?: string;
  change: string;
  reason: string;
  source: string; // e.g. "Scene 2 / Beat 3"
  sourceSceneId?: string;
  sourceBeatId?: string;
  payload?: any;
  confidence: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface StoryCanon {
  facts: CanonFact[];
  proposals: CanonProposal[];
}

// 4. StoryState: Dynamic snapshot of the story world after scenes
export interface CharacterCurrentState {
  characterId: string;
  name: string;
  locationId?: string;
  locationName?: string;
  status: 'alive' | 'deceased' | 'missing' | 'transformed' | 'unknown';
  emotionalState: string;
  knowledge: string[];
  inventory: string[];
}

export interface StoryState {
  currentActId?: string;
  currentSceneId?: string;
  completedSceneIds: string[];
  characters: Record<string, CharacterCurrentState>; // keyed by characterId or canonical name
  events: Record<string, boolean>; // e.g. { "heard_steps": true, "roof_checked": true }
  mysteries: Record<string, { status: 'unresolved' | 'partially_resolved' | 'resolved'; cluesRevealed: string[] }>;
  relationships: Record<string, { state: string; trustLevel?: number }>;
  lastSceneSummary?: string;
}

// 5. Plot: Hierarchical structure (Acts -> Sequences -> Scenes -> Beats)
export interface Beat {
  id: string;
  sceneId: string;
  beatIndex: number;
  title: string;
  purpose: string;
  action: string;
  characters: string[];
  information: string;
  emotionalChange: string;
  stateChanges?: {
    character?: string;
    newKnowledge?: string;
    newEmotion?: string;
    flag?: string;
  }[];
  generatedText?: string;
  status: 'pending' | 'generated' | 'approved';
  targetWordCount?: number;
}

export interface DraftVersion {
  id: string;
  versionNumber: number;
  text: string;
  changeDescription: string;
  criticScore?: number;
  createdAt: string;
}

export interface Scene {
  id: string;
  actId?: string;
  sequenceId?: string;
  sceneIndex: number;
  title: string;
  purpose: string;
  location: string;
  locationId?: string;
  time: string;
  characters: string[];
  characterIds?: string[];
  conflict: string;
  informationRevealed: string[];
  emotionalChange: string;
  requiredEvents: string[];
  forbiddenEvents: string[];
  beats: Beat[];
  draft: string;
  drafts: DraftVersion[];
  status: 'planned' | 'in_progress' | 'completed' | 'reviewed';
  version: number;
  summary?: string;
  criticReport?: CriticReport;
}

export interface Sequence {
  id: string;
  actId: string;
  title: string;
  objective: string;
  scenes: Scene[];
}

export interface Act {
  id: string;
  actIndex: number;
  title: string;
  goal: string;
  summary?: string;
  sequences: Sequence[];
}

export interface Plot {
  acts: Act[];
}

// 6. Critic & Review
export interface CriticIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category:
    | 'canon_consistency'
    | 'character_consistency'
    | 'timeline_consistency'
    | 'world_rules'
    | 'plot_logic'
    | 'scene_purpose'
    | 'pacing'
    | 'repetition'
    | 'contradictions'
    | 'unresolved_threads'
    | 'ai_style_cliche';
  location: string; // e.g. "Scene 1 / Beat 2"
  explanation: string;
  suggestedFix: string;
}

export interface CriticReport {
  score: number; // 0..100
  passed: boolean;
  summary: string;
  issues: CriticIssue[];
  positiveHighlights?: string[];
  createdAt: string;
}

// 7. Full Story Entity
export interface FullStory {
  id: string;
  projectId: string;
  universeId: string;
  title: string;
  storyYear: number;
  concept: StoryConcept;
  storyBible: StoryBibleData;
  canon: StoryCanon;
  storyState: StoryState;
  plot: Plot;
  drafts: DraftVersion[];
  status: 'concept' | 'bible' | 'plotted' | 'writing' | 'review' | 'final';
  activeSceneId?: string;
  activeBeatId?: string;
  createdAt: string;
  updatedAt: string;
}

// 8. Project Root
export interface Project {
  id: string;
  title: string;
  description: string;
  activeStoryId?: string;
  universeId: string;
  createdAt: string;
  updatedAt: string;
}
