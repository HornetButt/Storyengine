import {
  StoryConcept,
  StoryBibleData,
  Plot,
  Scene,
  Beat,
  StoryState,
  CanonFact,
  CanonProposal,
  CriticReport,
  DraftVersion,
} from '../domain/storyModel';

export type LLMTaskType =
  | 'CONCEPT_GENERATOR'
  | 'BIBLE_GENERATOR'
  | 'PLOT_PLANNER'
  | 'SCENE_PLANNER'
  | 'BEAT_PLANNER'
  | 'WRITER'
  | 'CRITIC'
  | 'CANON_EXTRACTOR'
  | 'STATE_UPDATER'
  | 'REVISER';

export interface ConceptGeneratorInput {
  idea: string;
  genre?: string;
  tone?: string;
  targetAudience?: string;
  universeName?: string;
  universeRules?: string[];
}

export interface BibleGeneratorInput {
  concept: StoryConcept;
  universeName: string;
  storyYear: number;
  existingLore?: string[];
  existingCharacters?: { name: string; status: string; desc: string }[];
  existingLocations?: { name: string; status: string; desc: string }[];
}

export interface PlotPlannerInput {
  concept: StoryConcept;
  bible: StoryBibleData;
  actsCount?: number;
  currentPlot?: Plot;
}

export interface ScenePlannerInput {
  sceneTitle?: string;
  sceneIndex: number;
  actGoal: string;
  sequenceObjective: string;
  concept: StoryConcept;
  bible: StoryBibleData;
  state: StoryState;
  canonFacts: CanonFact[];
  previousSceneSummary?: string;
}

export interface BeatPlannerInput {
  scene: Scene;
  concept: StoryConcept;
  bible: StoryBibleData;
  state: StoryState;
  canonFacts: CanonFact[];
}

export interface WriterInput {
  scene: Scene;
  beat: Beat;
  concept: StoryConcept;
  bible: StoryBibleData;
  state: StoryState;
  canonFacts: CanonFact[];
  previousText?: string;
  styleDirectives?: string;
}

export interface CriticInput {
  scene: Scene;
  draftText: string;
  concept: StoryConcept;
  bible: StoryBibleData;
  state: StoryState;
  canonFacts: CanonFact[];
}

export interface CanonExtractorInput {
  scene: Scene;
  draftText: string;
  bible: StoryBibleData;
  state: StoryState;
  existingCanon: CanonFact[];
}

export interface StateUpdaterInput {
  scene: Scene;
  draftText: string;
  currentState: StoryState;
  acceptedProposals?: CanonProposal[];
}

export interface ReviserInput {
  scene: Scene;
  currentDraft: string;
  criticReport: CriticReport;
  userInstructions?: string;
  canonFacts: CanonFact[];
  state: StoryState;
}

export interface LLMTaskMap {
  CONCEPT_GENERATOR: { input: ConceptGeneratorInput; output: StoryConcept };
  BIBLE_GENERATOR: { input: BibleGeneratorInput; output: Partial<StoryBibleData> };
  PLOT_PLANNER: { input: PlotPlannerInput; output: Plot };
  SCENE_PLANNER: { input: ScenePlannerInput; output: Partial<Scene> };
  BEAT_PLANNER: { input: BeatPlannerInput; output: Beat[] };
  WRITER: { input: WriterInput; output: { text: string; wordCount: number } };
  CRITIC: { input: CriticInput; output: CriticReport };
  CANON_EXTRACTOR: { input: CanonExtractorInput; output: CanonProposal[] };
  STATE_UPDATER: { input: StateUpdaterInput; output: Partial<StoryState> };
  REVISER: { input: ReviserInput; output: { revisedText: string; changeSummary: string } };
}

export interface LLMProvider {
  name: string;
  generate<T extends LLMTaskType>(task: T, input: LLMTaskMap[T]['input']): Promise<LLMTaskMap[T]['output']>;
}
