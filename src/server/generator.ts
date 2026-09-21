import { GenerateStoryRequest, Story, ConsistencyReport, ProposedKnowledgeChange, ConsistencyIssue } from '../types';
import { storage } from './storage';
import { buildStoryBible } from './storyBible';
import { checkStoryConsistency } from './consistency';
import { extractKnowledgeFromText } from './extractor';
import { callLLM, safeParseJson } from './llm';

export interface GenerationResult {
  story: Story;
  bible: any;
  outline: string;
  consistencyReport: ConsistencyReport;
  proposedChanges: ProposedKnowledgeChange[];
}

export async function generateStoryPipeline(req: GenerateStoryRequest): Promise<GenerationResult> {
  // Step 1 & 2: Build Story Bible & Retrieve Knowledge
  const bible = buildStoryBible(req);

  // Step 3: Generate Outline & Scene Plan
  let outline = `1. Вводная сцена: знакомство с обстановкой ${req.storyYear} года в ${bible.universeName}.
2. Развитие: исследование ключевых улик и контактов персонажей.
3. Кульминация: драматическое столкновение с тайной прошлого.
4. Развязка: сохранение канонического баланса и намёк на скрытую связь.`;

  let title = `СТ-${Math.floor(Math.random() * 900 + 100)}: Наследие тумана`;
  let synopsis = `История ${req.storyYear} года, исследующая тайны вселенной ${bible.universeName}.`;
  let fullText = '';

  try {
    const prompt = `Ты — Story Engine Narrative AI. Напиши связанную художественную историю на русском языке строго по Story Bible.

STORY BIBLE:
- Вселенная: ${bible.universeName}
- Год событий: ${bible.storyYear}
- Запрос автора: "${req.prompt}"
- Стиль: ${req.style}
- Объём: ${req.length}
- Уровень отсылок: ${req.referenceLevel}

АКТУАЛЬНЫЕ ПЕРСОНАЖИ:
${bible.relevantCharacters.map((c: any) => `- ${c.name} (статус в ${bible.storyYear}: ${c.currentStatusAtYear})`).join('\n')}

АКТУАЛЬНЫЕ ЛОКАЦИИ:
${bible.relevantLocations.map((l: any) => `- ${l.name} (${l.status}): ${l.description}`).join('\n')}

КАНОНИЧЕСКИЕ ОГРАНИЧЕНИЯ (КРИТИЧЕСКИ ВАЖНО):
${bible.canonConstraints.map((c: string) => `* ${c}`).join('\n')}

СТРОГО ЗАПРЕЩЕНО:
${bible.forbiddenElements.map((f: string) => `! ${f}`).join('\n')}

РЕКОМЕНДОВАННЫЕ ОТСЫЛКИ:
${bible.potentialReferences.map((r: any) => `~ ${r.suggestion}`).join('\n')}

Сгенерируй ответ строго в JSON:
{
  "title": "Название рассказа (например СТ-024: ...)",
  "synopsis": "Краткий синопсис 2-3 предложения",
  "outline": "Краткий план сцен 3-4 пункта",
  "fullText": "Полный связный художественный текст истории с атмосферными деталями, диалогами и аккуратной передачей канона."
}`;

    const reply = await callLLM({ prompt });
    if (reply) {
      const parsed = safeParseJson<any>(reply, {});
      if (parsed.title) title = parsed.title;
      if (parsed.synopsis) synopsis = parsed.synopsis;
      if (parsed.outline) outline = parsed.outline;
      if (parsed.fullText) fullText = parsed.fullText;
    }
  } catch (e) {
    console.warn('LLM generation error, using fallback narrative generator:', e);
  }

  // Fallback if AI not configured or errored
  if (!fullText) {
    const isMikhailForbidden = bible.forbiddenElements.some((f: string) => f.includes('Михаил'));
    const protagonist = isMikhailForbidden ? 'Алексей Корнеев' : 'Михаил Северов';

    fullText = `Ветер над холмами Сосновки в ${req.storyYear} году приносил запах сырой хвои и речной тины.

${protagonist} шёл по узкой тропе, ведущей от заброшенного сектора. В кармане куртки глухо звенела связка тяжёлых ключей. ${
      isMikhailForbidden
        ? 'Пепелище на месте Старого дома давно заросло бурьяном, но местные жители до сих пор вспоминали октябрь двадцать пятого года и исследователя Михаила, сгинувшего в огне.'
        : 'Впереди виднелся деревянный мезонин дома с заколоченными ставнями.'
    }

${
  req.referenceLevel !== 'none'
    ? 'У края старого фундамента лежал обугленный фрагмент синей дубовой доски. Ни трещин от огня, ни копоти — краска оставалась странно холодной на ощупь.'
    : 'Тишина оврага казалась неестественной, словно даже птицы облетали это место стороной.'
}

${protagonist} остановился, прислушиваясь к монотонному, едва уловимому звуку из-под земли. Это не было похоже на ветер — скорее на глубокий, ровный гул, доносящийся из заваленного кирпичом подвала.`;
  }

  // Step 4: Consistency Checking
  const consistencyReport = await checkStoryConsistency(req.universeId, req.storyYear, fullText, title);

  // Step 5: Save Story to Knowledge Store
  const story = storage.createStory({
    universeId: req.universeId,
    title,
    synopsis,
    fullText,
    status: 'generated',
    canonStatus: req.canonStatus,
    storyDate: `${req.storyYear}-09-15`,
    storyYear: req.storyYear,
    consistencyStatus: consistencyReport.passed
      ? 'passed'
      : consistencyReport.issues.some((i: ConsistencyIssue) => i.severity === 'error')
      ? 'has_conflicts'
      : 'has_warnings',
    consistencyReport,
  });

  // Step 6: Knowledge Extraction for Proposed Changes
  const extracted = await extractKnowledgeFromText(story.id, req.universeId, fullText, req.storyYear);
  const proposedChanges: ProposedKnowledgeChange[] = [];
  for (const item of extracted) {
    const savedProp = storage.addProposedChange(item);
    proposedChanges.push(savedProp);
  }

  return {
    story,
    bible,
    outline,
    consistencyReport,
    proposedChanges,
  };
}

export async function iterateStory(
  storyId: string,
  instruction: string
): Promise<{ story: Story; consistencyReport: ConsistencyReport }> {
  const currentStory = storage.getStory(storyId);
  if (!currentStory) {
    throw new Error('История не найдена');
  }

  let updatedTitle = currentStory.title;
  let updatedSynopsis = currentStory.synopsis;
  let updatedText = currentStory.fullText;

  try {
    const prompt = `Ты — Story Engine Iterative Editor.
Твоя задача — изменить существующую историю согласно указанию автора, СОХРАНЯЯ каноническую непротиворечивость.

Указание автора: "${instruction}"
Текущая история:
Название: ${currentStory.title}
Год: ${currentStory.storyYear}
Текст:
"""
${currentStory.fullText}
"""

Сделай правки и верни строго в JSON:
{
  "title": "Обновленное название (или прежнее)",
  "synopsis": "Обновленный синопсис",
  "fullText": "Полный обновленный художественный текст истории с учтёнными правками автора"
}`;

    const rawReply = await callLLM({ prompt });
    if (rawReply) {
      const parsed = safeParseJson<any>(rawReply, {});
      if (parsed.title) updatedTitle = parsed.title;
      if (parsed.synopsis) updatedSynopsis = parsed.synopsis;
      if (parsed.fullText) updatedText = parsed.fullText;
    }
  } catch (e) {
    console.warn('LLM iteration failed, applying manual transform:', e);
    updatedText = `${currentStory.fullText}\n\n[Редактура автора: ${instruction}]`;
  }

  const consistencyReport = await checkStoryConsistency(
    currentStory.universeId,
    currentStory.storyYear,
    updatedText,
    updatedTitle
  );

  const updatedStory = storage.updateStory(
    storyId,
    {
      title: updatedTitle,
      synopsis: updatedSynopsis,
      fullText: updatedText,
      consistencyStatus: consistencyReport.passed ? 'passed' : 'has_conflicts',
      consistencyReport,
    },
    `Правка: ${instruction.slice(0, 60)}`
  );

  return {
    story: updatedStory || currentStory,
    consistencyReport,
  };
}
