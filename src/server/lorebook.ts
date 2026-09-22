import { LorebookEntry, LorebookMatch, LorebookScanResult, EntityType } from '../types';
import { storage } from './storage';

/**
 * Escapes regex special characters in a keyword string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes text for reliable matching across case, punctuation, and whitespace.
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[«»""'']/g, '"')
    .replace(/ё/g, 'е');
}

/**
 * Checks whether a single keyphrase matches the text.
 * Supports multi-word phrases, word boundaries, and Russian stem variations.
 */
function testKeyMatch(normText: string, rawKey: string): boolean {
  const normKey = normalize(rawKey.trim());
  if (!normKey) return false;

  // Multi-word phrase: substring match is natural and resilient
  if (normKey.includes(' ')) {
    return normText.includes(normKey);
  }

  // Single word: match with word-boundary or root stem
  // e.g., "михаил" matches "михаил", "михаила", "михаилу", "михаилом"
  // e.g., "артефакт" matches "артефакта", "артефакты", "артефактом"
  try {
    const escaped = escapeRegex(normKey);
    // Allow standard Russian inflection suffixes (1-3 letters)
    const pattern = new RegExp(`(?:^|[^a-zA-Zа-яА-Я0-9_])${escaped}(?:[а-яА-Яa-zA-Z]{0,3})(?=[^a-zA-Zа-яА-Я0-9_]|$)`, 'iu');
    return pattern.test(normText);
  } catch {
    return normText.includes(normKey);
  }
}

export interface ScanLorebookOptions {
  text: string;
  universeId?: string;
  maxEntries?: number;
  maxChars?: number;
  includeDisabled?: boolean;
}

/**
 * Dynamically scans input text (directive, scene, paragraph, beat)
 * against all Lorebook entries for the given universe.
 * Only entities explicitly mentioned or marked as constant are included.
 */
export function scanLorebook(options: ScanLorebookOptions): LorebookScanResult {
  const {
    text = '',
    universeId,
    maxEntries = 8,
    maxChars = 4000,
    includeDisabled = false,
  } = options;

  const allEntries = storage.getLorebookEntries(universeId);
  const eligibleEntries = includeDisabled ? allEntries : allEntries.filter((e) => e.enabled);
  const normText = normalize(text);

  const matchedList: LorebookMatch[] = [];

  for (const entry of eligibleEntries) {
    let isMatched = false;
    let matchedByRegex = false;
    const matchedKeys: string[] = [];

    // Constant entries are always active (e.g. foundational world laws)
    if (entry.constant) {
      isMatched = true;
    }

    // Custom regex check
    if (!isMatched && entry.regex && entry.regex.trim()) {
      try {
        const re = new RegExp(entry.regex, 'iu');
        if (re.test(text) || re.test(normText)) {
          isMatched = true;
          matchedByRegex = true;
          matchedKeys.push(`Regex: /${entry.regex}/`);
        }
      } catch (err) {
        console.warn(`Invalid regex in lorebook entry ${entry.id}:`, err);
      }
    }

    // Keyphrase matching
    if (!isMatched && entry.keys && entry.keys.length > 0) {
      for (const key of entry.keys) {
        if (testKeyMatch(normText, key)) {
          matchedKeys.push(key);
        }
      }

      if (matchedKeys.length > 0) {
        if (entry.selective && entry.secondaryKeys && entry.secondaryKeys.length > 0) {
          // Selective mode: require at least one secondary key to match as well
          const matchedSecondary: string[] = [];
          for (const sKey of entry.secondaryKeys) {
            if (testKeyMatch(normText, sKey)) {
              matchedSecondary.push(sKey);
            }
          }
          if (matchedSecondary.length > 0) {
            isMatched = true;
            matchedKeys.push(...matchedSecondary.map((k) => `(AND) ${k}`));
          }
        } else {
          isMatched = true;
        }
      }
    }

    if (isMatched) {
      matchedList.push({
        entryId: entry.id,
        title: entry.title,
        category: entry.category,
        matchedKeys,
        matchedByRegex,
        isConstant: entry.constant,
        priority: entry.priority ?? 50,
        snippet: entry.content,
      });
    }
  }

  // Sort matched entries:
  // 1. Constant entries first
  // 2. Highest priority first
  matchedList.sort((a, b) => {
    if (a.isConstant && !b.isConstant) return -1;
    if (!a.isConstant && b.isConstant) return 1;
    return b.priority - a.priority;
  });

  // Apply limits: maxEntries & maxChars
  const finalMatches: LorebookMatch[] = [];
  const activeEntries: LorebookEntry[] = [];
  let totalCharsUsed = 0;

  for (const match of matchedList) {
    if (finalMatches.length >= maxEntries) break;

    const entryObj = eligibleEntries.find((e) => e.id === match.entryId);
    if (!entryObj) continue;

    const entryContentLength = (entryObj.content || '').length;
    if (totalCharsUsed + entryContentLength > maxChars && finalMatches.length > 0) {
      // Exceeds character budget; skip lower-priority entries
      continue;
    }

    finalMatches.push(match);
    activeEntries.push(entryObj);
    totalCharsUsed += entryContentLength;
  }

  const prunedEntriesCount = Math.max(0, eligibleEntries.length - finalMatches.length);

  // Format clean context block for LLM prompt
  let loreContextBlock = '';
  if (finalMatches.length > 0) {
    const lines: string[] = [];
    lines.push('[АКТИВИРОВАННЫЙ LOREBOOK / WORLD INFO]');
    lines.push(
      `*(Динамически активировано по упоминаниям в сцене: ${finalMatches.length} статей; ${prunedEntriesCount} статей отсеяно для чистоты контекста)*`
    );

    for (const m of finalMatches) {
      const triggersInfo = m.isConstant
        ? 'ПОСТОЯННЫЙ ЗАКОН ВСЕЛЕННОЙ'
        : `Триггеры: ${m.matchedKeys.slice(0, 4).map((k) => `«${k}»`).join(', ')}`;

      const catBadge = m.category.toUpperCase();
      lines.push(`• [${catBadge}] ${m.title} (${triggersInfo})`);
      lines.push(`  ${m.snippet.trim()}`);
    }

    loreContextBlock = lines.join('\n');
  }

  return {
    matches: finalMatches,
    activeEntries,
    prunedEntriesCount,
    loreContextBlock,
    totalCharsUsed,
  };
}

/**
 * Automatically creates or synchronizes Lorebook entries from
 * existing Universe characters, locations, objects, and core rules.
 */
export function syncEntitiesToLorebook(universeId: string): {
  createdCount: number;
  updatedCount: number;
  totalCount: number;
} {
  const characters = storage.getCharacters(universeId);
  const locations = storage.getLocations(universeId);
  const objects = storage.getObjects(universeId);
  const events = storage.getEvents(universeId);
  const universe = storage.getUniverse(universeId);

  let createdCount = 0;
  let updatedCount = 0;

  // 1. Sync Characters
  for (const char of characters) {
    const existing = storage.getLorebookEntries(universeId).find((e) => e.entityId === char.id);
    const keys = Array.from(
      new Set([
        char.canonicalName,
        ...char.canonicalName.split(/\s+/),
        ...(char.aliases || []),
      ].filter((k) => k && k.length >= 2))
    );

    const statesSummary = char.states?.length
      ? ` Состояния: ` +
        char.states
          .map((s) => `В ${s.year} г.: ${s.status === 'deceased' ? 'ПОГИБ' : s.status} (${s.description})`)
          .join('; ')
      : '';

    const content = `${char.canonicalName} (${char.role || 'Персонаж'}, ${char.gender || ''}). ${char.description}${char.biography ? ' ' + char.biography.slice(0, 200) : ''}${statesSummary}`;

    if (existing) {
      storage.updateLorebookEntry(existing.id, {
        title: char.canonicalName,
        keys,
        content,
      });
      updatedCount++;
    } else {
      storage.createLorebookEntry({
        universeId,
        title: char.canonicalName,
        category: 'character',
        keys,
        content,
        priority: char.role === 'protagonist' ? 90 : 75,
        constant: false,
        enabled: true,
        entityType: 'character',
        entityId: char.id,
      });
      createdCount++;
    }
  }

  // 2. Sync Locations
  for (const loc of locations) {
    const existing = storage.getLorebookEntries(universeId).find((e) => e.entityId === loc.id);
    const keys = Array.from(
      new Set([
        loc.name,
        ...loc.name.split(/\s+/).filter((w) => w.length > 3),
      ].filter(Boolean))
    );

    const content = `${loc.name} (${loc.type || 'Локация'}). Статус: ${loc.status}. ${loc.description}`;

    if (existing) {
      storage.updateLorebookEntry(existing.id, {
        title: loc.name,
        keys,
        content,
      });
      updatedCount++;
    } else {
      storage.createLorebookEntry({
        universeId,
        title: loc.name,
        category: 'location',
        keys,
        content,
        priority: 70,
        constant: false,
        enabled: true,
        entityType: 'location',
        entityId: loc.id,
      });
      createdCount++;
    }
  }

  // 3. Sync Objects
  for (const obj of objects) {
    const existing = storage.getLorebookEntries(universeId).find((e) => e.entityId === obj.id);
    const keys = Array.from(
      new Set([
        obj.name,
        ...obj.name.split(/\s+/).filter((w) => w.length > 3),
      ].filter(Boolean))
    );

    const content = `${obj.name} (Предмет/Артефакт). ${obj.description}`;

    if (existing) {
      storage.updateLorebookEntry(existing.id, {
        title: obj.name,
        keys,
        content,
      });
      updatedCount++;
    } else {
      storage.createLorebookEntry({
        universeId,
        title: obj.name,
        category: 'object',
        keys,
        content,
        priority: 85,
        constant: false,
        enabled: true,
        entityType: 'object',
        entityId: obj.id,
      });
      createdCount++;
    }
  }

  // 4. Sync Universe Rules as Constant World Law
  if (universe && universe.rules && universe.rules.length > 0) {
    const ruleTitle = `Законы мироздания: ${universe.name}`;
    const existing = storage
      .getLorebookEntries(universeId)
      .find((e) => e.category === 'rule' && e.constant);

    const content = `Фундаментальные правила вселенной "${universe.name}":\n` +
      universe.rules.map((r, i) => `${i + 1}. ${r}`).join('\n');

    if (existing) {
      storage.updateLorebookEntry(existing.id, {
        title: ruleTitle,
        content,
      });
      updatedCount++;
    } else {
      storage.createLorebookEntry({
        universeId,
        title: ruleTitle,
        category: 'rule',
        keys: ['правила', 'закон', 'вселенная', 'канон'],
        content,
        priority: 100,
        constant: true,
        enabled: true,
      });
      createdCount++;
    }
  }

  const totalCount = storage.getLorebookEntries(universeId).length;
  return { createdCount, updatedCount, totalCount };
}
