import { Character, StoryLocation, StoryEvent, StoryObject, CharacterState } from '../types';

export type EntityTemporalStatus = 'alive' | 'deceased' | 'missing' | 'unborn' | 'unknown';

export interface CharacterMentionContext {
  characterId: string;
  canonicalName: string;
  matchedName: string;
  sentence: string;
  startIndex: number;
  endIndex: number;
  statusInYear: EntityTemporalStatus;
  deathYear?: number;
  deathDescription?: string;
  birthYear?: number;
  contextType: 'active_living' | 'memorial_retrospective' | 'neutral' | 'alive_described_dead';
  severity: 'error' | 'warning' | 'info' | 'success';
  title: string;
  explanation: string;
  activeSnippet?: string;
  suggestedFixes: {
    label: string;
    type: 'make_flashback' | 'change_year' | 'replace_character';
    actionPayload?: any;
  }[];
}

export interface LoreInspectionSummary {
  storyYear: number;
  universeId: string;
  totalCharactersDetected: number;
  conflictsCount: number;
  warningsCount: number;
  mentions: CharacterMentionContext[];
  charactersInText: {
    character: Character;
    statusInYear: EntityTemporalStatus;
    deathYear?: number;
    deathDescription?: string;
    mentionCount: number;
    hasConflict: boolean;
    conflicts: CharacterMentionContext[];
  }[];
  allUniverseCharactersStatus: {
    character: Character;
    statusInYear: EntityTemporalStatus;
    deathYear?: number;
    deathDescription?: string;
    currentOccupation?: string;
    isMentioned: boolean;
  }[];
}

// Russian verb indicators for active living action / dialogue / presence
const ACTIVE_LIVING_VERBS = [
  'сказал', 'сказала', 'говорит', 'говорила', 'ответил', 'ответила', 'спросил', 'спросила',
  'крикнул', 'крикнула', 'прошептал', 'прошептала', 'произнес', 'произнесла',
  'подошел', 'подошла', 'вошел', 'вошла', 'вышел', 'вышла', 'пришел', 'пришла', 'прибыл', 'прибыла',
  'взглянул', 'взглянула', 'посмотрел', 'посмотрела', 'улыбнулся', 'улыбнулась', 'усмехнулся', 'усмехнулась',
  'взял', 'взяла', 'протянул', 'протянула', 'схватил', 'схватила', 'поднял', 'подняла',
  'пошел', 'пошла', 'шагает', 'побежал', 'побежала', 'поспешил', 'поспешила',
  'живет', 'жил', 'жила', 'стоит', 'стоял', 'стояла', 'сидит', 'сидел', 'сидела',
  'дышит', 'вздохнул', 'вздохнула', 'почувствовал', 'почувствовала', 'решил', 'решила',
  'направился', 'направилась', 'присел', 'присела', 'открыл', 'открыла', 'закрыл', 'закрыла',
  'повернулся', 'повернулась', 'пожал плечами', 'пожала плечами', 'кивнул', 'кивнула',
  'заметил', 'заметила', 'услышал', 'услышала', 'увидел', 'увидела', 'задумался', 'задумалась',
  'протянул руку', 'пожал руку', 'подмигнул', 'обнял', 'обняла', 'вскрикнул', 'вскрикнула',
];

// Memory, memorial, and retrospective phrases indicating deceased person is remembered or referenced historically
const MEMORIAL_CONTEXT_MARKERS = [
  'вспомнил о', 'вспомнила о', 'вспоминал о', 'вспоминала о', 'вспоминает о',
  'в память о', 'памяти', 'память', 'погибший', 'погибшая', 'погибшего', 'погибшей',
  'покойный', 'покойная', 'покойного', 'покойной', 'мертвый', 'мертвая', 'мертвого', 'мертвой',
  'смерть', 'гибель', 'гибели', 'трагедия', 'похороны', 'могила', 'могиле', 'могилу',
  'кладбище', 'захоронение', 'после гибели', 'после смерти', 'до того как погиб', 'до своей гибели',
  'когда был жив', 'когда была жива', 'в те годы когда', 'тогда еще живой',
  'блокнот', 'записи', 'дневник', 'архив', 'фотография', 'портрет', 'вещи', 'пальто',
  'голос в воспоминаниях', 'образ', 'призрак', 'тень', 'дух', 'привидение',
  'снился', 'снилась', 'во сне', 'навсегда ушел', 'не вернуть', 'оставил после себя',
  'памятник', 'надгробие', 'пепел', 'останки', 'слова которые когда-то говорил',
  'в последний раз видел', 'в последний раз видела'
];

// Indicators when a character is spoken of as dead/deceased
const DEATH_LABELS = [
  'покойный', 'покойная', 'покойного', 'покойной',
  'погибший', 'погибшая', 'погибшего', 'погибшей',
  'мертвый', 'мертвая', 'мертвого', 'мертвой',
  'похоронен', 'похоронена', 'на могиле'
];

/**
 * Calculates a character's state at a given year
 */
export function getCharacterStatusInYear(
  character: Character,
  targetYear: number
): { status: EntityTemporalStatus; deathYear?: number; deathDescription?: string; birthYear?: number } {
  // Sort states chronologically
  const states = [...(character.states || [])].sort((a, b) => a.year - b.year);

  // If character has explicit birth year or age
  const birthState = states.find((s) => s.description.toLowerCase().includes('родил'));
  let birthYear: number | undefined;
  if (birthState) {
    birthYear = birthState.year;
  }

  if (birthYear && targetYear < birthYear) {
    return { status: 'unborn', birthYear };
  }

  // Look for any death state up to and including targetYear
  const deathState = states.find((s) => s.status === 'deceased' && s.year <= targetYear);
  if (deathState) {
    return {
      status: 'deceased',
      deathYear: deathState.year,
      deathDescription: deathState.description || 'Погиб согласно хронологии канона',
    };
  }

  // If character's base status is deceased and all states are <= targetYear
  if (character.status === 'deceased') {
    const anyDeath = states.find((s) => s.status === 'deceased');
    if (anyDeath && anyDeath.year <= targetYear) {
      return {
        status: 'deceased',
        deathYear: anyDeath.year,
        deathDescription: anyDeath.description,
      };
    }
  }

  // Find most recent state before or at targetYear
  const pastStates = states.filter((s) => s.year <= targetYear);
  if (pastStates.length > 0) {
    const latest = pastStates[pastStates.length - 1];
    if (latest.status === 'deceased') {
      return { status: 'deceased', deathYear: latest.year, deathDescription: latest.description };
    }
    if (latest.status === 'missing') {
      return { status: 'missing' };
    }
    if (latest.status === 'alive') {
      return { status: 'alive' };
    }
  }

  // Fallback to base character status if no contradicting future state
  return { status: character.status === 'deceased' ? 'deceased' : 'alive' };
}

/**
 * Splits text into sentences while preserving approximate indices
 */
function splitIntoSentencesWithIndices(text: string): { sentence: string; start: number; end: number }[] {
  const result: { sentence: string; start: number; end: number }[] = [];
  const regex = /[^.!?\n]+(?:[.!?\n]+|$)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const str = match[0].trim();
    if (str.length > 0) {
      result.push({
        sentence: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  if (result.length === 0 && text.trim().length > 0) {
    result.push({ sentence: text, start: 0, end: text.length });
  }

  return result;
}

/**
 * Escapes regex special characters
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Deep inspection of text against Universe canon and character temporal status
 */
export function inspectStoryCanon(
  text: string,
  storyYear: number,
  universeCharacters: Character[],
  universeLocations: StoryLocation[] = [],
  universeEvents: StoryEvent[] = [],
  universeObjects: StoryObject[] = []
): LoreInspectionSummary {
  const sentences = splitIntoSentencesWithIndices(text);
  const mentions: CharacterMentionContext[] = [];

  // Group characters by detected in text
  const characterDetectionsMap = new Map<
    string,
    {
      character: Character;
      statusInYear: EntityTemporalStatus;
      deathYear?: number;
      deathDescription?: string;
      mentionCount: number;
      hasConflict: boolean;
      conflicts: CharacterMentionContext[];
    }
  >();

  // Prepare names search table
  const searchEntries: {
    character: Character;
    searchName: string;
    isPrimary: boolean;
  }[] = [];

  for (const char of universeCharacters) {
    searchEntries.push({ character: char, searchName: char.canonicalName, isPrimary: true });
    // First name & last name
    const parts = char.canonicalName.split(/\s+/);
    if (parts.length > 1) {
      for (const p of parts) {
        if (p.length > 3) {
          searchEntries.push({ character: char, searchName: p, isPrimary: false });
        }
      }
    }
    // Aliases
    if (char.aliases && Array.isArray(char.aliases)) {
      for (const alias of char.aliases) {
        if (alias.trim().length > 2) {
          searchEntries.push({ character: char, searchName: alias.trim(), isPrimary: false });
        }
      }
    }
  }

  // Living characters list for potential character substitution suggestions
  const livingCharactersInYear = universeCharacters.filter((c) => {
    const st = getCharacterStatusInYear(c, storyYear);
    return st.status === 'alive';
  });

  // Scan sentences
  for (const item of sentences) {
    const sentenceText = item.sentence;
    const sentenceLower = sentenceText.toLowerCase();

    for (const entry of searchEntries) {
      const namePattern = new RegExp(`\\b${escapeRegExp(entry.searchName)}\\b`, 'i');
      const match = namePattern.exec(sentenceText);

      if (match) {
        const char = entry.character;
        const charStatus = getCharacterStatusInYear(char, storyYear);
        const startIndex = item.start + match.index;
        const endIndex = startIndex + match[0].length;

        // Check if we already recorded a mention of this character in this exact sentence
        const alreadyInSentence = mentions.some(
          (m) => m.characterId === char.id && Math.abs(m.startIndex - startIndex) < 30
        );
        if (alreadyInSentence) continue;

        // Context classification
        const hasMemorialMarker = MEMORIAL_CONTEXT_MARKERS.some((marker) =>
          sentenceLower.includes(marker)
        );
        const hasDeathLabel = DEATH_LABELS.some((label) =>
          sentenceLower.includes(label)
        );

        // Find active verbs present in the sentence
        const detectedActiveVerbs = ACTIVE_LIVING_VERBS.filter((verb) => {
          const verbRegex = new RegExp(`\\b${escapeRegExp(verb)}\\b`, 'i');
          return verbRegex.test(sentenceLower);
        });

        // Evaluation
        let contextType: CharacterMentionContext['contextType'] = 'neutral';
        let severity: CharacterMentionContext['severity'] = 'info';
        let title = '';
        let explanation = '';
        let activeSnippet: string | undefined;
        const suggestedFixes: CharacterMentionContext['suggestedFixes'] = [];

        if (charStatus.status === 'deceased') {
          const deathYear = charStatus.deathYear || 2025;
          const deathCause = charStatus.deathDescription || 'погиб по канону';

          if (detectedActiveVerbs.length > 0 && !hasMemorialMarker) {
            // CRITICAL CONFLICT: Character is dead, but acting alive!
            contextType = 'active_living';
            severity = 'error';
            activeSnippet = detectedActiveVerbs.slice(0, 3).join(', ');
            title = `Конфликт канона: «${char.canonicalName}» погиб в ${deathYear} г.!`;
            explanation = `В ${storyYear} году персонаж уже мёртв (${deathCause}). В тексте он описан как живой участник событий (действие: «${detectedActiveVerbs[0]}»). Живое присутствие противоречит канону.`;

            // Suggestion 1: Make it a memory
            suggestedFixes.push({
              label: 'Оформить как воспоминание',
              type: 'make_flashback',
              actionPayload: {
                originalSentence: sentenceText.trim(),
                replacement: `В памяти всплыло воспоминание, как когда-то ${char.canonicalName} ${detectedActiveVerbs[0]}...`,
              },
            });

            // Suggestion 2: Change story year
            suggestedFixes.push({
              label: `Перенести год истории на ${deathYear - 1} г. (когда герой был жив)`,
              type: 'change_year',
              actionPayload: { newYear: deathYear - 1 },
            });

            // Suggestion 3: Replace with living character
            const altCharacter = livingCharactersInYear.find((c) => c.id !== char.id);
            if (altCharacter) {
              suggestedFixes.push({
                label: `Заменить на живого персонажа (${altCharacter.canonicalName})`,
                type: 'replace_character',
                actionPayload: {
                  targetName: entry.searchName,
                  replacementName: altCharacter.canonicalName,
                },
              });
            }
          } else if (hasMemorialMarker) {
            // Compliant memory of deceased character
            contextType = 'memorial_retrospective';
            severity = 'success';
            title = `Каноничное упоминание: «${char.canonicalName}»`;
            explanation = `Персонаж погиб в ${deathYear} г. В данном предложении он упомянут корректно: в контексте памяти, архива или воспоминаний.`;
          } else {
            // Ambiguous mention
            contextType = 'neutral';
            severity = 'warning';
            title = `Внимание: «${char.canonicalName}» погиб в ${deathYear} г.`;
            explanation = `Убедитесь, что в этом предложении персонаж не выступает как физически живой собеседник ${storyYear} года.`;
          }
        } else if (charStatus.status === 'alive') {
          if (hasDeathLabel) {
            // Alive character mistakenly portrayed as deceased!
            contextType = 'alive_described_dead';
            severity = 'warning';
            title = `Внимание: «${char.canonicalName}» жив в ${storyYear} г.!`;
            explanation = `По канону вселенной в ${storyYear} году этот герой жив. В предложении встречены маркеры смерти/гибели («${hasDeathLabel}»). Проверьте, не является ли это ошибкой.`;
          } else {
            contextType = 'active_living';
            severity = 'info';
            title = `Живой персонаж: «${char.canonicalName}»`;
            explanation = `Персонаж активен и жив в ${storyYear} году согласно хронологии.`;
          }
        } else if (charStatus.status === 'unborn') {
          contextType = 'neutral';
          severity = 'error';
          title = `Временной парадокс: «${char.canonicalName}» ещё не родился!`;
          explanation = `В ${storyYear} году персонаж ещё не появился на свет (рождение: ${charStatus.birthYear} г.).`;
          suggestedFixes.push({
            label: `Установить год истории ${charStatus.birthYear || 2024}+`,
            type: 'change_year',
            actionPayload: { newYear: charStatus.birthYear || 2024 },
          });
        }

        const mentionObj: CharacterMentionContext = {
          characterId: char.id,
          canonicalName: char.canonicalName,
          matchedName: match[0],
          sentence: sentenceText.trim(),
          startIndex,
          endIndex,
          statusInYear: charStatus.status,
          deathYear: charStatus.deathYear,
          deathDescription: charStatus.deathDescription,
          birthYear: charStatus.birthYear,
          contextType,
          severity,
          title,
          explanation,
          activeSnippet,
          suggestedFixes,
        };

        mentions.push(mentionObj);

        // Update group detection
        const existing = characterDetectionsMap.get(char.id);
        if (existing) {
          existing.mentionCount += 1;
          if (severity === 'error') {
            existing.hasConflict = true;
            existing.conflicts.push(mentionObj);
          }
        } else {
          characterDetectionsMap.set(char.id, {
            character: char,
            statusInYear: charStatus.status,
            deathYear: charStatus.deathYear,
            deathDescription: charStatus.deathDescription,
            mentionCount: 1,
            hasConflict: severity === 'error',
            conflicts: severity === 'error' ? [mentionObj] : [],
          });
        }
      }
    }
  }

  // Build universe character status list
  const allUniverseCharactersStatus = universeCharacters.map((c) => {
    const st = getCharacterStatusInYear(c, storyYear);
    const isMentioned = characterDetectionsMap.has(c.id);
    return {
      character: c,
      statusInYear: st.status,
      deathYear: st.deathYear,
      deathDescription: st.deathDescription,
      currentOccupation: c.occupation,
      isMentioned,
    };
  });

  const conflictsCount = mentions.filter((m) => m.severity === 'error').length;
  const warningsCount = mentions.filter((m) => m.severity === 'warning').length;

  return {
    storyYear,
    universeId: universeCharacters[0]?.universeId || '',
    totalCharactersDetected: characterDetectionsMap.size,
    conflictsCount,
    warningsCount,
    mentions,
    charactersInText: Array.from(characterDetectionsMap.values()),
    allUniverseCharactersStatus,
  };
}
