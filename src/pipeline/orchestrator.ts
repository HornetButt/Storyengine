import {
  FullStory,
  Scene,
  Beat,
  DraftVersion,
  CriticReport,
  CanonProposal,
  Plot,
} from '../domain/storyModel';
import { LLMProvider } from '../llm/types';
import { DefaultLLMProvider } from '../llm/defaultProvider';
import { validateAndNormalizeBeats } from '../llm/beatPlannerUtils';

export class StoryOrchestrator {
  private llm: LLMProvider;

  constructor(llmProvider?: LLMProvider) {
    this.llm = llmProvider || new DefaultLLMProvider();
  }

  setProvider(provider: LLMProvider) {
    this.llm = provider;
  }

  /**
   * Step 1: Idea -> Concept
   */
  async generateConcept(story: FullStory, customIdea?: string): Promise<FullStory> {
    const updated = { ...story };
    const concept = await this.llm.generate('CONCEPT_GENERATOR', {
      idea: customIdea || story.concept.premise,
      genre: story.concept.genre,
      tone: story.concept.tone,
      targetAudience: story.concept.targetAudience,
      universeName: story.storyBible.universeName,
      universeRules: story.storyBible.rules,
    });

    updated.concept = concept;
    updated.status = 'concept';
    updated.updatedAt = new Date().toISOString();
    return updated;
  }

  /**
   * Step 2: Concept -> Story Bible
   */
  async generateBible(story: FullStory): Promise<FullStory> {
    const updated = { ...story };
    const bibleData = await this.llm.generate('BIBLE_GENERATOR', {
      concept: story.concept,
      universeName: story.storyBible.universeName,
      storyYear: story.storyYear,
      existingLore: story.storyBible.lore,
      existingCharacters: story.storyBible.characters.map((c) => ({
        name: c.name,
        status: c.statusAtStart,
        desc: c.description,
      })),
      existingLocations: story.storyBible.locations.map((l) => ({
        name: l.name,
        status: l.status,
        desc: l.description,
      })),
    });

    updated.storyBible = {
      ...story.storyBible,
      ...bibleData,
      characters: (bibleData.characters && bibleData.characters.length > 0)
        ? (bibleData.characters as any)
        : story.storyBible.characters,
      locations: (bibleData.locations && bibleData.locations.length > 0)
        ? (bibleData.locations as any)
        : story.storyBible.locations,
    };

    // Initialize character states
    for (const char of updated.storyBible.characters) {
      if (!updated.storyState.characters[char.id]) {
        updated.storyState.characters[char.id] = {
          characterId: char.id,
          name: char.name,
          status: char.statusAtStart,
          emotionalState: 'Исходное спокойствие',
          knowledge: char.knowledgeAtStart || [],
          inventory: [],
        };
      }
    }

    updated.status = 'bible';
    updated.updatedAt = new Date().toISOString();
    return updated;
  }

  /**
   * Step 3: Bible + Concept -> Plot (Acts, Sequences, Scenes)
   */
  async generatePlot(story: FullStory): Promise<FullStory> {
    const updated = { ...story };
    const plot = await this.llm.generate('PLOT_PLANNER', {
      concept: story.concept,
      bible: story.storyBible,
      currentPlot: story.plot,
    });

    updated.plot = plot;
    const firstScene = plot.acts[0]?.sequences[0]?.scenes[0];
    if (firstScene) {
      updated.activeSceneId = firstScene.id;
    }
    updated.status = 'plotted';
    updated.updatedAt = new Date().toISOString();
    return updated;
  }

  /**
   * Step 4: Plan or re-plan a specific Scene
   */
  async planScene(story: FullStory, sceneId: string): Promise<{ story: FullStory; scene: Scene }> {
    const { foundScene, act, seq } = this.findScene(story.plot, sceneId);
    if (!foundScene) throw new Error(`Scene not found: ${sceneId}`);

    const plannedFields = await this.llm.generate('SCENE_PLANNER', {
      sceneTitle: foundScene.title,
      sceneIndex: foundScene.sceneIndex,
      actGoal: act?.goal || 'Развитие сюжета',
      sequenceObjective: seq?.objective || 'Движение к кульминации',
      concept: story.concept,
      bible: story.storyBible,
      state: story.storyState,
      canonFacts: story.canon.facts,
      previousSceneSummary: story.storyState.lastSceneSummary,
    });

    Object.assign(foundScene, plannedFields);
    story.updatedAt = new Date().toISOString();
    return { story, scene: foundScene };
  }

  /**
   * Step 5: Scene -> Beats
   */
  async planBeats(story: FullStory, sceneId: string): Promise<{ story: FullStory; beats: Beat[] }> {
    const { foundScene } = this.findScene(story.plot, sceneId);
    if (!foundScene) throw new Error(`Scene not found: ${sceneId}`);

    const rawBeats = await this.llm.generate('BEAT_PLANNER', {
      scene: foundScene,
      concept: story.concept,
      bible: story.storyBible,
      state: story.storyState,
      canonFacts: story.canon.facts,
    });

    const beats = validateAndNormalizeBeats(rawBeats, foundScene, story.storyBible);

    foundScene.beats = beats;
    story.activeBeatId = beats[0]?.id;
    story.updatedAt = new Date().toISOString();
    return { story, beats };
  }

  /**
   * Step 6: Write prose for a specific Beat
   */
  async writeBeat(
    story: FullStory,
    sceneId: string,
    beatId: string,
    styleDirectives?: string
  ): Promise<{ story: FullStory; beat: Beat; text: string }> {
    const { foundScene } = this.findScene(story.plot, sceneId);
    if (!foundScene) throw new Error(`Scene not found: ${sceneId}`);

    const beat = foundScene.beats.find((b) => b.id === beatId);
    if (!beat) throw new Error(`Beat not found: ${beatId}`);

    // Aggregate preceding beat texts
    const prevBeatsText = foundScene.beats
      .filter((b) => b.beatIndex < beat.beatIndex && b.generatedText)
      .map((b) => b.generatedText)
      .join('\n\n');

    const result = await this.llm.generate('WRITER', {
      scene: foundScene,
      beat,
      concept: story.concept,
      bible: story.storyBible,
      state: story.storyState,
      canonFacts: story.canon.facts,
      previousText: prevBeatsText,
      styleDirectives,
    });

    beat.generatedText = result.text;
    beat.status = 'generated';

    // Synchronize scene draft
    this.syncSceneDraftFromBeats(foundScene);

    story.status = 'writing';
    story.updatedAt = new Date().toISOString();
    return { story, beat, text: result.text };
  }

  /**
   * Step 7: Write all remaining beats for a scene sequentially
   */
  async writeSceneAllBeats(story: FullStory, sceneId: string): Promise<FullStory> {
    const { foundScene } = this.findScene(story.plot, sceneId);
    if (!foundScene) throw new Error(`Scene not found: ${sceneId}`);

    if (!foundScene.beats || foundScene.beats.length === 0) {
      await this.planBeats(story, sceneId);
    }

    for (const beat of foundScene.beats) {
      if (!beat.generatedText) {
        await this.writeBeat(story, sceneId, beat.id);
      }
    }

    foundScene.status = 'in_progress';
    story.updatedAt = new Date().toISOString();
    return story;
  }

  /**
   * Step 8: Critic Review for a Scene
   */
  async reviewScene(story: FullStory, sceneId: string): Promise<{ story: FullStory; report: CriticReport }> {
    const { foundScene } = this.findScene(story.plot, sceneId);
    if (!foundScene) throw new Error(`Scene not found: ${sceneId}`);

    const textToReview = foundScene.draft || foundScene.beats.map((b) => b.generatedText).filter(Boolean).join('\n\n');
    if (!textToReview) throw new Error('Scene has no draft or generated beats to review.');

    const report = await this.llm.generate('CRITIC', {
      scene: foundScene,
      draftText: textToReview,
      concept: story.concept,
      bible: story.storyBible,
      state: story.storyState,
      canonFacts: story.canon.facts,
    });

    foundScene.criticReport = report;
    foundScene.status = 'reviewed';
    story.status = 'review';
    story.updatedAt = new Date().toISOString();
    return { story, report };
  }

  /**
   * Step 9: Extract Canon Proposals from Scene draft
   */
  async extractCanonProposals(story: FullStory, sceneId: string): Promise<{ story: FullStory; proposals: CanonProposal[] }> {
    const { foundScene } = this.findScene(story.plot, sceneId);
    if (!foundScene) throw new Error(`Scene not found: ${sceneId}`);

    const draftText = foundScene.draft || foundScene.beats.map((b) => b.generatedText).filter(Boolean).join('\n\n');
    if (!draftText) return { story, proposals: [] };

    const proposals = await this.llm.generate('CANON_EXTRACTOR', {
      scene: foundScene,
      draftText,
      bible: story.storyBible,
      state: story.storyState,
      existingCanon: story.canon.facts,
    });

    // Add unique proposals to Story Canon
    for (const p of proposals) {
      const exists = story.canon.proposals.some(
        (existing) => existing.change.toLowerCase() === p.change.toLowerCase()
      );
      if (!exists) {
        story.canon.proposals.push(p);
      }
    }

    story.updatedAt = new Date().toISOString();
    return { story, proposals };
  }

  /**
   * Step 10: Revise Scene draft (creates a new version in `scene.drafts`)
   */
  async reviseScene(
    story: FullStory,
    sceneId: string,
    userInstructions?: string
  ): Promise<{ story: FullStory; scene: Scene; newDraft: DraftVersion }> {
    const { foundScene } = this.findScene(story.plot, sceneId);
    if (!foundScene) throw new Error(`Scene not found: ${sceneId}`);

    const currentDraft = foundScene.draft || foundScene.beats.map((b) => b.generatedText).filter(Boolean).join('\n\n');
    const criticReport = foundScene.criticReport || {
      score: 80,
      passed: true,
      summary: 'Ручная ревизия',
      issues: [],
      createdAt: new Date().toISOString(),
    };

    const result = await this.llm.generate('REVISER', {
      scene: foundScene,
      currentDraft,
      criticReport,
      userInstructions,
      canonFacts: story.canon.facts,
      state: story.storyState,
    });

    const newVersionNum = (foundScene.drafts.length || 0) + 1;
    const newDraft: DraftVersion = {
      id: `draft-${foundScene.id}-v${newVersionNum}`,
      versionNumber: newVersionNum,
      text: result.revisedText,
      changeDescription: result.changeSummary,
      criticScore: criticReport.score,
      createdAt: new Date().toISOString(),
    };

    foundScene.drafts.push(newDraft);
    foundScene.draft = result.revisedText;
    foundScene.version = newVersionNum;

    story.updatedAt = new Date().toISOString();
    return { story, scene: foundScene, newDraft };
  }

  /**
   * Step 11: Update StoryState after a completed scene
   */
  async updateStoryState(story: FullStory, sceneId: string): Promise<FullStory> {
    const { foundScene } = this.findScene(story.plot, sceneId);
    if (!foundScene) throw new Error(`Scene not found: ${sceneId}`);

    const draftText = foundScene.draft || foundScene.beats.map((b) => b.generatedText).filter(Boolean).join('\n\n');
    const partialState = await this.llm.generate('STATE_UPDATER', {
      scene: foundScene,
      draftText,
      currentState: story.storyState,
    });

    story.storyState = {
      ...story.storyState,
      ...partialState,
      completedSceneIds: Array.from(
        new Set([...story.storyState.completedSceneIds, ...(partialState.completedSceneIds || [foundScene.id])])
      ),
      events: {
        ...story.storyState.events,
        ...(partialState.events || {}),
      },
      characters: {
        ...story.storyState.characters,
        ...(partialState.characters || {}),
      },
    };

    foundScene.status = 'completed';
    story.updatedAt = new Date().toISOString();
    return story;
  }

  // --- Helpers ---
  private syncSceneDraftFromBeats(scene: Scene) {
    const beatTexts = (scene.beats || [])
      .map((b) => b.generatedText)
      .filter(Boolean)
      .join('\n\n');

    if (beatTexts) {
      scene.draft = beatTexts;
      if (!scene.drafts.length) {
        scene.drafts.push({
          id: `draft-${scene.id}-v1`,
          versionNumber: 1,
          text: beatTexts,
          changeDescription: 'Первичная компиляция битов сцены',
          createdAt: new Date().toISOString(),
        });
      } else {
        scene.drafts[scene.drafts.length - 1].text = beatTexts;
      }
    }
  }

  findScene(
    plot: Plot,
    sceneId: string
  ): { foundScene?: Scene; act?: import('../domain/storyModel').Act; seq?: import('../domain/storyModel').Sequence } {
    for (const act of plot.acts) {
      for (const seq of act.sequences) {
        for (const sc of seq.scenes) {
          if (sc.id === sceneId) {
            return { foundScene: sc, act, seq };
          }
        }
      }
    }
    return {};
  }
}

export const orchestrator = new StoryOrchestrator();
