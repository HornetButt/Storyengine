import { Beat, Scene, StoryBibleData } from '../domain/storyModel';

export interface BeatSequenceValidationResult {
  valid: boolean;
  issues: string[];
}

/**
 * Validates and normalizes raw beats received from an LLM or fallback source.
 * Enforces:
 * - Deterministic sequential index (1..N)
 * - Strict sceneId match (never trust external input)
 * - Strict id generation: `beat-${scene.id}-${beatIndex}`
 * - Strict status: 'pending'
 * - Positive targetWordCount with safe fallbacks
 * - Character whitelisting: unknown characters are removed
 * - Safe stateChanges normalization without phantom characters
 * - Deduplication of identical consecutive beats
 */
export function validateAndNormalizeBeats(
  rawInput: any,
  scene: Scene,
  bible: StoryBibleData
): Beat[] {
  // Extract beats array safely
  let rawList: any[] = [];
  if (Array.isArray(rawInput)) {
    rawList = rawInput;
  } else if (rawInput && typeof rawInput === 'object' && Array.isArray(rawInput.beats)) {
    rawList = rawInput.beats;
  }

  // Build whitelist of allowed character names (case-insensitive mapping to canonical name)
  const allowedNameMap = new Map<string, string>();
  
  // Characters from scene
  if (Array.isArray(scene.characters)) {
    for (const name of scene.characters) {
      if (typeof name === 'string' && name.trim()) {
        allowedNameMap.set(name.trim().toLowerCase(), name.trim());
      }
    }
  }

  // Characters from Bible
  if (Array.isArray(bible?.characters)) {
    for (const c of bible.characters) {
      if (c && typeof c.name === 'string' && c.name.trim()) {
        const lower = c.name.trim().toLowerCase();
        if (!allowedNameMap.has(lower)) {
          allowedNameMap.set(lower, c.name.trim());
        }
      }
    }
  }

  const defaultSceneCharacters = scene.characters && scene.characters.length > 0
    ? scene.characters
    : bible?.characters?.[0]?.name
    ? [bible.characters[0].name]
    : ['Герой'];

  // If no raw beats available, provide a single safe deterministic fallback beat
  if (!rawList || rawList.length === 0) {
    return [
      {
        id: `beat-${scene.id}-1`,
        sceneId: scene.id,
        beatIndex: 1,
        title: 'Вход в сцену',
        purpose: scene.purpose || 'Начало развития драматического действия сцены',
        action: scene.conflict || 'Герой начинает действовать в рамках сцены',
        characters: defaultSceneCharacters,
        information: scene.informationRevealed?.[0] || '',
        emotionalChange: scene.emotionalChange || '',
        stateChanges: [],
        status: 'pending',
        targetWordCount: 200,
      },
    ];
  }

  const normalized: Beat[] = [];
  let prevActionPurposeKey = '';

  for (let i = 0; i < rawList.length; i++) {
    const raw = rawList[i];
    if (!raw || typeof raw !== 'object') continue;

    // Safe string fields
    const title = typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim()
      : `Бит ${normalized.length + 1}`;

    const purpose = typeof raw.purpose === 'string' && raw.purpose.trim()
      ? raw.purpose.trim()
      : typeof raw.action === 'string' && raw.action.trim()
      ? raw.action.trim()
      : 'Развитие драматической ситуации';

    const action = typeof raw.action === 'string' && raw.action.trim()
      ? raw.action.trim()
      : typeof raw.purpose === 'string' && raw.purpose.trim()
      ? raw.purpose.trim()
      : 'Герой совершает действие в сцене';

    // Requirement 11: Deduplication of completely identical consecutive beats
    const actionPurposeKey = `${action.toLowerCase()}:::${purpose.toLowerCase()}`;
    if (actionPurposeKey === prevActionPurposeKey) {
      continue; // Skip identical duplicate beat
    }
    prevActionPurposeKey = actionPurposeKey;

    // Characters validation (Requirement 8)
    let characters: string[] = [];
    if (Array.isArray(raw.characters)) {
      for (const charItem of raw.characters) {
        if (typeof charItem === 'string' && charItem.trim()) {
          const canonical = allowedNameMap.get(charItem.trim().toLowerCase());
          if (canonical && !characters.includes(canonical)) {
            characters.push(canonical);
          }
        }
      }
    }

    // Fallback characters if model omitted or returned only unknown characters
    if (characters.length === 0) {
      characters = [...defaultSceneCharacters];
    }

    const information = typeof raw.information === 'string'
      ? raw.information.trim()
      : '';

    const emotionalChange = typeof raw.emotionalChange === 'string'
      ? raw.emotionalChange.trim()
      : '';

    // Target word count validation (Requirement 5 & 7)
    let targetWordCount = 200;
    if (typeof raw.targetWordCount === 'number' && Number.isFinite(raw.targetWordCount) && raw.targetWordCount > 0) {
      targetWordCount = Math.round(raw.targetWordCount);
      // Bound to sensible range (min 50, max 1000)
      if (targetWordCount < 50) targetWordCount = 50;
      if (targetWordCount > 1000) targetWordCount = 1000;
    }

    // State changes normalization & character validation (Requirements 2, 6, 8)
    const stateChanges: {
      character?: string;
      newKnowledge?: string;
      newEmotion?: string;
      flag?: string;
    }[] = [];

    if (Array.isArray(raw.stateChanges)) {
      for (const sc of raw.stateChanges) {
        if (!sc || typeof sc !== 'object') continue;

        const change: {
          character?: string;
          newKnowledge?: string;
          newEmotion?: string;
          flag?: string;
        } = {};

        // Character validation: only assign if character exists in allowed characters
        if (typeof sc.character === 'string' && sc.character.trim()) {
          const canonical = allowedNameMap.get(sc.character.trim().toLowerCase());
          if (canonical) {
            change.character = canonical;
          }
          // Note: if unknown character was provided, do not assign or invent a new character!
        }

        if (typeof sc.newKnowledge === 'string' && sc.newKnowledge.trim()) {
          change.newKnowledge = sc.newKnowledge.trim();
        }

        if (typeof sc.newEmotion === 'string' && sc.newEmotion.trim()) {
          change.newEmotion = sc.newEmotion.trim();
        }

        if (typeof sc.flag === 'string' && sc.flag.trim()) {
          change.flag = sc.flag
            .trim()
            .replace(/[^\w\d_.-]/g, '_')
            .replace(/_+/g, '_')
            .toLowerCase();
        }

        // Only include state change if it has at least one meaningful field
        if (change.character || change.newKnowledge || change.newEmotion || change.flag) {
          stateChanges.push(change);
        }
      }
    }

    const nextIndex = normalized.length + 1;

    normalized.push({
      id: `beat-${scene.id}-${nextIndex}`,
      sceneId: scene.id,
      beatIndex: nextIndex,
      title,
      purpose,
      action,
      characters,
      information,
      emotionalChange,
      stateChanges,
      status: 'pending',
      targetWordCount,
    });
  }

  // If all beats were somehow skipped/filtered, return single safe fallback beat
  if (normalized.length === 0) {
    return [
      {
        id: `beat-${scene.id}-1`,
        sceneId: scene.id,
        beatIndex: 1,
        title: 'Вход в сцену',
        purpose: scene.purpose || 'Начало развития драматического действия сцены',
        action: scene.conflict || 'Герой начинает действовать в рамках сцены',
        characters: defaultSceneCharacters,
        information: scene.informationRevealed?.[0] || '',
        emotionalChange: scene.emotionalChange || '',
        stateChanges: [],
        status: 'pending',
        targetWordCount: 200,
      },
    ];
  }

  return normalized;
}

/**
 * Deterministic validation of a beat sequence (Requirement 11).
 * Checks:
 * - Non-empty array
 * - Sequential beatIndex (1, 2, 3...)
 * - Proper ID formatting and sceneId consistency
 * - Presence of characters and non-empty action
 * - Non-duplicate consecutive beats
 */
export function validateBeatSequence(beats: Beat[]): BeatSequenceValidationResult {
  const issues: string[] = [];

  if (!Array.isArray(beats) || beats.length === 0) {
    return { valid: false, issues: ['Список битов пуст'] };
  }

  const sceneId = beats[0].sceneId;
  const seenIds = new Set<string>();

  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    const expectedIndex = i + 1;

    if (b.beatIndex !== expectedIndex) {
      issues.push(`Бит на позиции ${i} имеет некорректный beatIndex=${b.beatIndex}, ожидался ${expectedIndex}`);
    }

    if (b.sceneId !== sceneId) {
      issues.push(`Бит ${b.id} привязан к чужой сцене ${b.sceneId} вместо ${sceneId}`);
    }

    if (seenIds.has(b.id)) {
      issues.push(`Обнаружен дубликат ID бита: ${b.id}`);
    }
    seenIds.add(b.id);

    if (!b.action || !b.action.trim()) {
      issues.push(`Бит ${b.id} не содержит описания действия (action)`);
    }

    if (!Array.isArray(b.characters) || b.characters.length === 0) {
      issues.push(`Бит ${b.id} не имеет назначенных действующих лиц`);
    }

    if (i > 0) {
      const prev = beats[i - 1];
      if (
        b.action.trim().toLowerCase() === prev.action.trim().toLowerCase() &&
        b.purpose.trim().toLowerCase() === prev.purpose.trim().toLowerCase()
      ) {
        issues.push(`Биты #${prev.beatIndex} и #${b.beatIndex} полностью идентичны`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
