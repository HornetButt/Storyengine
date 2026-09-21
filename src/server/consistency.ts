import { ConsistencyReport, ConsistencyIssue, Story, CharacterState } from '../types';
import { storage } from './storage';
import { callLLM, safeParseJson } from './llm';

export async function checkStoryConsistency(
  universeId: string,
  storyYear: number,
  storyText: string,
  storyTitle: string = ''
): Promise<ConsistencyReport> {
  const issues: ConsistencyIssue[] = [];
  const textLower = (storyTitle + ' ' + storyText).toLowerCase();

  const characters = storage.getCharacters(universeId);
  const locations = storage.getLocations(universeId);
  const objects = storage.getObjects(universeId);
  const previousStories = storage.getStories({ universeId });

  // 1. Check Character temporal states (e.g., Mikhail погиб в 2025 году, но история в 2026)
  for (const char of characters) {
    const isMentioned =
      textLower.includes(char.canonicalName.toLowerCase()) ||
      char.aliases.some((alias: string) => textLower.includes(alias.toLowerCase()));

    if (isMentioned) {
      // Find death/status events prior to storyYear
      const deathState = char.states.find(
        (s: CharacterState) => s.status === 'deceased' && s.year <= storyYear
      );

      if (deathState) {
        // Character is dead by or before this year
        // Check if text portrays character as an active alive participant
        const aliveKeywords = ['сказал', 'пошел', 'взглянул', 'прибыл', 'живет', 'ответил', 'подумал', 'улыбнулся', 'проснулся'];
        const appearsActive = aliveKeywords.some((kw) => textLower.includes(kw));

        issues.push({
          severity: 'error',
          type: 'character_death',
          message: `КОНФЛИКТ КАНОНА: Персонаж «${char.canonicalName}» погиб в ${deathState.year} году, однако описывается как действующий участник событий ${storyYear} года.`,
          suggestedFix: `1. Перенести дату истории на ${deathState.year - 1} год или ранее.\n2. Упомянуть персонажа исключительно в воспоминаниях или как архивную запись.\n3. Заменить действующее лицо на другого исследователя (например, Алексея Корнеева).`,
          entityIds: [char.id],
        });
      }
    }
  }

  // 2. Check Location destruction state
  for (const loc of locations) {
    if (textLower.includes(loc.name.toLowerCase())) {
      if (loc.status === 'ruined' && storyYear >= 2025) {
        // e.g. Старый дом сгорел в 2025 году
        issues.push({
          severity: 'warning',
          type: 'location_state',
          message: `ПРЕДУПРЕЖДЕНИЕ: Локация «${loc.name}» была уничтожена/сгорела в октябре 2025 года. В ${storyYear} году на этом месте находится пепелище/руины.`,
          suggestedFix: `Опишите здание как сгоревшее пепелище с каменным фундаментом, а не как уцелевший жилой особняк.`,
          entityIds: [loc.id],
        });
      }
    }
  }

  // 3. Reference and Easter egg detections
  for (const obj of objects) {
    if (textLower.includes(obj.name.toLowerCase())) {
      issues.push({
        severity: 'info',
        type: 'reference_found',
        message: `ОТСЫЛКА: Обнаружен канонический предмет «${obj.name}». Прекрасная деталь для создания связи между историями.`,
        entityIds: [obj.id],
      });
    }
  }

  for (const prevStory of previousStories) {
    if (textLower.includes(prevStory.title.toLowerCase())) {
      issues.push({
        severity: 'info',
        type: 'reference_found',
        message: `ПРЯМАЯ ОТСЫЛКА: Упоминание истории «${prevStory.title}».`,
        entityIds: [prevStory.id],
      });
    }
  }

  // 4. Optional AI-powered deep consistency analysis with the active LLM provider
  try {
    const prompt = `Ты — Story Engine Canon & Consistency Checker.
Проверь текст истории на логические противоречия и нестыковки.
Вселенная: ${universeId}
Год событий: ${storyYear}
Текст истории:
"""
${storyText.slice(0, 3000)}
"""

Известные факты канона:
- Михаил Северов погиб в пожаре 12 октября 2025 года.
- Старый дом сгорел в октябре 2025 года, остался лишь фундамент.
- В подвале дома находилась аномальная синяя дверь без ручки и замка.
- Алексей Корнеев заступил сторожем в архив в 2026 году.

Ответь строго в формате JSON:
{
  "hasErrors": boolean,
  "summary": "краткий итог проверки на русском",
  "extraIssues": [
    {
      "severity": "error" | "warning" | "info",
      "type": "temporal_paradox" | "character_death" | "canon_conflict" | "reference_found",
      "message": "краткое описание",
      "suggestedFix": "совет как исправить"
    }
  ]
}`;

    const rawReply = await callLLM({ prompt });
    if (rawReply) {
      const parsed = safeParseJson<any>(rawReply, {});
      if (parsed.extraIssues && Array.isArray(parsed.extraIssues)) {
        for (const issue of parsed.extraIssues) {
          // Avoid duplicate character death warnings
          if (!issues.some((i) => i.message.includes(issue.message))) {
            issues.push({
              severity: issue.severity || 'warning',
              type: issue.type || 'canon_conflict',
              message: issue.message,
              suggestedFix: issue.suggestedFix,
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('LLM consistency check failed, fallback to deterministic rules:', e);
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  const hasWarnings = issues.some((i) => i.severity === 'warning');

  let score = 100;
  if (hasErrors) score -= 50;
  if (hasWarnings) score -= 20;
  score = Math.max(0, score);

  let summary = 'Проверка канона успешно пройдена: противоречий не обнаружено.';
  if (hasErrors) {
    summary = 'ОБНАРУЖЕНЫ КРИТИЧЕСКИЕ КОНФЛИКТЫ КАНОНА: текст противоречит установленным фактам временной линии.';
  } else if (hasWarnings) {
    summary = 'Канон в целом соблюден, но есть нюансы состояния мира/локаций, требующие внимания.';
  }

  return {
    passed: !hasErrors,
    score,
    issues,
    summary,
  };
}
