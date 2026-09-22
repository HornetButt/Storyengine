import {
  FullStory,
  StoryConcept,
  StoryBibleData,
  StoryCanon,
  StoryState,
  Plot,
  Act,
  Sequence,
  Scene,
  Beat,
} from './storyModel';
import { Story, Universe, StoryPlan, Character, StoryLocation } from '../types';

/**
 * Creates an empty, initialized FullStory structure from minimal inputs.
 */
export function createDefaultStory(
  title: string,
  universe: Universe,
  storyYear: number = 2026,
  ideaPrompt: string = ''
): FullStory {
  const now = new Date().toISOString();
  const storyId = `story-${Date.now()}`;

  const concept: StoryConcept = {
    premise: ideaPrompt || 'Исследование скрытой тайны и неизведанных явлений.',
    genre: universe.genre || 'Детектив / Драма',
    tone: 'Напряжённый, психологический, кинематографичный',
    themes: ['Память', 'Цена истины', 'Искупление'],
    centralConflict: 'Протагонист против скрытой аномалии и собственных иллюзий.',
    stakes: 'Выживание и сохранение человечности.',
    targetAudience: 'Любители глубокой драматургии и сюжетных тайн.',
    endingDirection: 'Открытие горькой правды с открытым финалом.',
    estimatedScenesCount: 6,
  };

  const storyBible: StoryBibleData = {
    universeId: universe.id,
    universeName: universe.name,
    storyYear,
    characters: [],
    locations: [],
    objects: [],
    rules: universe.rules || [],
    lore: [universe.description],
    mysteries: [
      {
        id: `myst-${Date.now()}-1`,
        question: 'Что скрывается за первым обнаруженным следом?',
        truth: 'Аномальное искажение пространства и следы прошлого наблюдателя.',
        cluesPlanned: ['Следы босых ног', 'Остывшее железо'],
        status: 'unresolved',
      },
    ],
    importantFacts: [
      `События разворачиваются в ${storyYear} году во вселенной «${universe.name}».`,
    ],
    timeline: [],
    forbiddenElements: [
      'Не нарушать установленный таймлайн и правила вселенной.',
    ],
  };

  const storyState: StoryState = {
    completedSceneIds: [],
    characters: {},
    events: {},
    mysteries: {},
    relationships: {},
    lastSceneSummary: '',
  };

  const canon: StoryCanon = {
    facts: [
      {
        id: `fact-${Date.now()}-1`,
        type: 'WORLD_RULE',
        subject: universe.name,
        statement: `Мир функционирует по правилам вселенной «${universe.name}».`,
        establishedInYear: storyYear,
        status: 'canon',
        createdAt: now,
      },
    ],
    proposals: [],
  };

  const act1: Act = {
    id: `act-${Date.now()}-1`,
    actIndex: 1,
    title: 'Акт 1: Нарушение равновесия',
    goal: 'Ввести протагониста в мир и поставить перед лицом неразрешимой загадки.',
    sequences: [
      {
        id: `seq-${Date.now()}-1`,
        actId: `act-${Date.now()}-1`,
        title: 'Экспозиция и первый сигнал',
        objective: 'Определить исходное положение героя и первое столкновение.',
        scenes: [
          {
            id: `sc-${Date.now()}-1`,
            actId: `act-${Date.now()}-1`,
            sequenceId: `seq-${Date.now()}-1`,
            sceneIndex: 1,
            title: 'Прибытие к порогу',
            purpose: 'Показать прибытие героя и первое ощущение опасности.',
            location: 'Входная локация',
            time: 'Утро, пасмурно',
            characters: ['Главный герой'],
            conflict: 'Герой ожидает привычный порядок, но натыкается на следы неизвестного.',
            informationRevealed: ['Место кажется заброшенным, но следы свежие.'],
            emotionalChange: 'От спокойствия к тревожной настороженности.',
            requiredEvents: ['Герой осматривает окружение и находит первую улику.'],
            forbiddenEvents: ['Никаких прямых атак или открытых боев на первом шаге.'],
            beats: [
              {
                id: `beat-${Date.now()}-1`,
                sceneId: `sc-${Date.now()}-1`,
                beatIndex: 1,
                title: 'Первый шаг в тишине',
                purpose: 'Погружение в звуковую и визуальную среду.',
                action: 'Герой делает первые шаги и вслушивается в звуки.',
                characters: ['Главный герой'],
                information: 'Местность давно обезлюдела.',
                emotionalChange: 'Легкое любопытство переходит в холодок на коже.',
                status: 'pending',
                targetWordCount: 250,
              },
            ],
            draft: '',
            drafts: [],
            status: 'planned',
            version: 1,
          },
        ],
      },
    ],
  };

  const plot: Plot = {
    acts: [act1],
  };

  return {
    id: storyId,
    projectId: `proj-${universe.id}`,
    universeId: universe.id,
    title,
    storyYear,
    concept,
    storyBible,
    canon,
    storyState,
    plot,
    drafts: [],
    status: 'concept',
    activeSceneId: act1.sequences[0].scenes[0].id,
    activeBeatId: act1.sequences[0].scenes[0].beats[0]?.id,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Converts a legacy flat Story to FullStory.
 */
export function legacyStoryToFullStory(
  legacy: Story,
  universe: Universe,
  allCharacters: Character[] = [],
  allLocations: StoryLocation[] = []
): FullStory {
  const full = createDefaultStory(legacy.title, universe, legacy.storyYear || 2026, legacy.synopsis);
  full.id = legacy.id;

  // Extract concept
  full.concept.premise = legacy.synopsis || full.concept.premise;
  if (universe.genre) full.concept.genre = universe.genre;

  // Convert planned scenes if present
  if (legacy.scenes && legacy.scenes.length > 0) {
    const scenes: Scene[] = legacy.scenes.map((s, idx) => ({
      id: s.id || `sc-${Date.now()}-${idx + 1}`,
      sceneIndex: idx + 1,
      title: s.title || `Сцена ${idx + 1}`,
      purpose: s.description || 'Развитие сюжета',
      location: s.locationName || 'Не указана',
      locationId: s.locationId,
      time: `${legacy.storyYear || 2026} год`,
      characters: s.characterNames || [],
      characterIds: s.characterIds || [],
      conflict: s.plotTwist || 'Драматическое противоречие сцены',
      informationRevealed: s.keyClueOrObject ? [s.keyClueOrObject] : [],
      emotionalChange: s.emotionalBeat || 'Развитие эмоционального напряжения',
      requiredEvents: [],
      forbiddenEvents: [],
      beats: (s.beats || []).map((b, bIdx) => ({
        id: b.id,
        sceneId: s.id,
        beatIndex: b.beatIndex || bIdx + 1,
        title: b.title || `Бит ${bIdx + 1}`,
        purpose: b.directive,
        action: b.directive,
        characters: b.charactersPresent || s.characterNames || [],
        information: '',
        emotionalChange: '',
        generatedText: b.generatedText,
        status: b.status || 'pending',
        targetWordCount: b.targetWordCount || 300,
      })),
      draft: s.sceneText || '',
      drafts: s.sceneText
        ? [
            {
              id: `ver-${s.id}-1`,
              versionNumber: 1,
              text: s.sceneText,
              changeDescription: 'Начальный черновик сцены',
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
      status: s.status === 'completed' ? 'completed' : 'planned',
      version: 1,
    }));

    full.plot.acts[0].sequences[0].scenes = scenes;
    full.activeSceneId = scenes[0]?.id;
    full.activeBeatId = scenes[0]?.beats[0]?.id;
  }

  // Populate Story Bible with universe-specific characters & locations
  const relChars = allCharacters.filter((c) => c.universeId === universe.id);
  full.storyBible.characters = relChars.map((c) => ({
    id: c.id,
    name: c.canonicalName,
    role: (c.role as any) || 'supporting',
    statusAtStart: c.status,
    description: c.description,
    motivation: 'Стремление раскрыть тайну и защитить близких.',
    knowledgeAtStart: [],
    relationships: [],
  }));

  const relLocs = allLocations.filter((l) => l.universeId === universe.id);
  full.storyBible.locations = relLocs.map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type || 'Локация',
    status: l.status,
    description: l.description,
  }));

  // Initial StoryState
  for (const c of full.storyBible.characters) {
    full.storyState.characters[c.id] = {
      characterId: c.id,
      name: c.name,
      status: c.statusAtStart,
      emotionalState: 'Спокойное / настороженное',
      knowledge: [],
      inventory: [],
    };
  }

  // Populate Draft if legacy has fullText
  if (legacy.fullText) {
    full.drafts = [
      {
        id: `draft-${Date.now()}-1`,
        versionNumber: 1,
        text: legacy.fullText,
        changeDescription: 'Импортированный канонический текст',
        createdAt: legacy.createdAt || new Date().toISOString(),
      },
    ];
  }

  return full;
}

/**
 * Converts FullStory back to legacy Story for backward compatibility.
 */
export function fullStoryToLegacyStory(full: FullStory): Story {
  // Aggregate all scenes from acts and sequences
  const allScenes: Scene[] = [];
  for (const act of full.plot.acts) {
    for (const seq of act.sequences) {
      allScenes.push(...seq.scenes);
    }
  }

  // Rebuild fullText from scenes or drafts
  let combinedDraft = full.drafts[0]?.text || '';
  if (!combinedDraft && allScenes.some((s) => s.draft || (s.beats && s.beats.some((b) => b.generatedText)))) {
    combinedDraft = allScenes
      .map((s) => {
        const beatTexts = (s.beats || [])
          .map((b) => b.generatedText)
          .filter(Boolean)
          .join('\n\n');
        return `## ${s.title}\n\n${s.draft || beatTexts || s.purpose}`;
      })
      .join('\n\n---\n\n');
  }

  return {
    id: full.id,
    universeId: full.universeId,
    title: full.title,
    synopsis: full.concept.premise,
    fullText: combinedDraft || full.concept.premise,
    status: full.status === 'final' ? 'published' : 'draft',
    canonStatus: 'canon',
    storyDate: `${full.storyYear}-06-01`,
    storyYear: full.storyYear,
    scenes: allScenes.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.purpose,
      locationName: s.location,
      characterNames: s.characters,
      characterIds: s.characterIds || [],
      year: full.storyYear,
      plotTwist: s.conflict,
      emotionalBeat: s.emotionalChange,
      beats: s.beats.map((b) => ({
        id: b.id,
        sceneId: s.id,
        beatIndex: b.beatIndex,
        title: b.title,
        directive: b.purpose || b.action,
        charactersPresent: b.characters,
        status: b.status,
        generatedText: b.generatedText,
        targetWordCount: b.targetWordCount,
      })),
      sceneText: s.draft,
      status: s.status === 'completed' ? 'completed' : 'planned',
    })),
    versions: full.drafts.map((d) => ({
      id: d.id,
      storyId: full.id,
      versionNumber: d.versionNumber,
      title: full.title,
      synopsis: full.concept.premise,
      fullText: d.text,
      changeSummary: d.changeDescription,
      createdAt: d.createdAt,
    })),
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
  };
}
