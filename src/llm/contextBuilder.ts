import {
  StoryConcept,
  StoryBibleData,
  StoryState,
  CanonFact,
  Scene,
  Beat,
  FullStory,
} from '../domain/storyModel';

export interface MinimalLLMContext {
  global: {
    premise: string;
    genre: string;
    tone: string;
    themes: string[];
    universeName: string;
    storyYear: number;
  };
  relevantCharacters: {
    name: string;
    status: string;
    emotionalState?: string;
    knowledge: string[];
    role?: string;
  }[];
  relevantLocations: {
    name: string;
    status: string;
    atmosphere?: string;
  }[];
  relevantCanon: string[];
  currentState: {
    eventsOccurred: string[];
    unresolvedMysteries: string[];
    previousSceneSummary: string;
  };
  sceneContext?: {
    id: string;
    title: string;
    purpose: string;
    conflict: string;
    emotionalChange: string;
    location: string;
    characters: string[];
  };
  beatContext?: {
    id: string;
    title: string;
    action: string;
    emotionalChange: string;
    targetWords: number;
  };
}

/**
 * Builds a lean, token-efficient, focused context for LLM tasks.
 * Avoids dumping full manuscripts or unnecessary database records.
 */
export class ContextBuilder {
  static build(params: {
    concept: StoryConcept;
    bible: StoryBibleData;
    state: StoryState;
    canonFacts: CanonFact[];
    scene?: Scene;
    beat?: Beat;
    maxCanonFacts?: number;
  }): MinimalLLMContext {
    const { concept, bible, state, canonFacts, scene, beat, maxCanonFacts = 6 } = params;

    // 1. Filter characters relevant to this scene/beat
    const activeCharNames = new Set(
      beat?.characters?.length
        ? beat.characters
        : scene?.characters?.length
        ? scene.characters
        : bible.characters.map((c) => c.name).slice(0, 3)
    );

    const relevantCharacters = bible.characters
      .filter((c) => activeCharNames.has(c.name) || activeCharNames.size === 0)
      .slice(0, 4)
      .map((c) => {
        const stateInfo = state.characters[c.id] || Object.values(state.characters).find((sc) => sc.name === c.name);
        return {
          name: c.name,
          status: stateInfo?.status || c.statusAtStart,
          emotionalState: stateInfo?.emotionalState || 'Сдержанность',
          knowledge: stateInfo?.knowledge?.slice(-3) || c.knowledgeAtStart?.slice(-3) || [],
          role: c.role,
        };
      });

    // 2. Filter locations relevant to this scene
    const locName = scene?.location?.toLowerCase() || '';
    const relevantLocations = bible.locations
      .filter((l) => locName.includes(l.name.toLowerCase()) || l.name.toLowerCase().includes(locName))
      .slice(0, 2)
      .map((l) => ({
        name: l.name,
        status: l.status,
        atmosphere: l.atmosphere || l.description?.slice(0, 100),
      }));

    if (relevantLocations.length === 0 && bible.locations.length > 0) {
      relevantLocations.push({
        name: bible.locations[0].name,
        status: bible.locations[0].status,
        atmosphere: bible.locations[0].description?.slice(0, 100),
      });
    }

    // 3. Relevant Canon facts (most recent or matching active characters/subject)
    const relevantCanon = canonFacts
      .filter((f) => f.status === 'canon')
      .filter((f) => {
        if (!activeCharNames.size) return true;
        const subj = f.subject.toLowerCase();
        for (const name of activeCharNames) {
          if (subj.includes(name.toLowerCase())) return true;
        }
        return f.type === 'WORLD_RULE';
      })
      .slice(-maxCanonFacts)
      .map((f) => `[${f.type}] ${f.subject}: ${f.statement}`);

    // 4. Current State snapshot
    const eventsOccurred = Object.entries(state.events)
      .filter(([_, v]) => v)
      .map(([k]) => k)
      .slice(-5);

    const unresolvedMysteries = Object.entries(state.mysteries)
      .filter(([_, m]) => m.status === 'unresolved')
      .map(([k]) => k)
      .slice(0, 3);

    return {
      global: {
        premise: concept.premise,
        genre: concept.genre,
        tone: concept.tone,
        themes: concept.themes || [],
        universeName: bible.universeName,
        storyYear: bible.storyYear,
      },
      relevantCharacters,
      relevantLocations,
      relevantCanon,
      currentState: {
        eventsOccurred,
        unresolvedMysteries,
        previousSceneSummary: state.lastSceneSummary || 'Начало повествования.',
      },
      sceneContext: scene
        ? {
            id: scene.id,
            title: scene.title,
            purpose: scene.purpose,
            conflict: scene.conflict,
            emotionalChange: scene.emotionalChange,
            location: scene.location,
            characters: scene.characters,
          }
        : undefined,
      beatContext: beat
        ? {
            id: beat.id,
            title: beat.title,
            action: beat.action,
            emotionalChange: beat.emotionalChange,
            targetWords: beat.targetWordCount || 300,
          }
        : undefined,
    };
  }

  /**
   * Serializes the MinimalLLMContext into formatted markdown prompt context block.
   */
  static formatForPrompt(ctx: MinimalLLMContext): string {
    const lines: string[] = [];

    lines.push(`=== СЮЖЕТНЫЙ КОНТЕКСТ (${ctx.global.universeName}, ${ctx.global.storyYear} г.) ===`);
    lines.push(`Жанр: ${ctx.global.genre} | Тональность: ${ctx.global.tone}`);
    lines.push(`Замысел: ${ctx.global.premise}`);
    if (ctx.global.themes.length) {
      lines.push(`Темы: ${ctx.global.themes.join(', ')}`);
    }

    if (ctx.relevantCharacters.length) {
      lines.push(`\nДЕЙСТВУЮЩИЕ ПЕРСОНАЖИ В СЦЕНЕ:`);
      for (const c of ctx.relevantCharacters) {
        lines.push(
          `- ${c.name} (${c.role || 'герой'}, статус: ${c.status}, настрой: ${c.emotionalState || 'нейтральный'})`
        );
        if (c.knowledge.length) {
          lines.push(`  Знает: ${c.knowledge.join('; ')}`);
        }
      }
    }

    if (ctx.relevantLocations.length) {
      lines.push(`\nЛОКАЦИЯ:`);
      for (const l of ctx.relevantLocations) {
        lines.push(`- ${l.name} (${l.status})${l.atmosphere ? `: ${l.atmosphere}` : ''}`);
      }
    }

    if (ctx.relevantCanon.length) {
      lines.push(`\nКАНОНИЧЕСКИЕ ПРАВИЛА И УСТАНОВЛЕННЫЕ ФАКТЫ:`);
      for (const f of ctx.relevantCanon) {
        lines.push(`* ${f}`);
      }
    }

    if (ctx.currentState.previousSceneSummary) {
      lines.push(`\nИТОГ ПРЕДЫДУЩИХ СОБЫТИЙ:`);
      lines.push(`"${ctx.currentState.previousSceneSummary}"`);
    }

    return lines.join('\n');
  }
}
