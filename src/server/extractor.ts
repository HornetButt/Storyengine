import { ProposedKnowledgeChange } from '../types';
import { callLLM, safeParseJson } from './llm';

export async function extractKnowledgeFromText(
  storyId: string,
  universeId: string,
  text: string,
  year: number
): Promise<Omit<ProposedKnowledgeChange, 'id' | 'createdAt' | 'status'>[]> {
  const proposedChanges: Omit<ProposedKnowledgeChange, 'id' | 'createdAt' | 'status'>[] = [];

  try {
    const prompt = `Ты — Story Engine Knowledge Extractor.
Проанализируй текст художественной истории и извлеки новые сущности и факты, которые дополняют базу знаний вселенной.
Вселенная ID: ${universeId}
Год: ${year}

Текст истории:
"""
${text.slice(0, 4000)}
"""

Извлеки:
1. Персонажей (имя, краткое описание, роль)
2. Локации (название, тип, описание)
3. Предметы / артефакты (название, свойства)
4. Ключевые события
5. Отношения между ними (knows, lives_in, owns, participated_in, found, references и т.д.)

Присвой каждому факту уверенность (confidence от 0.0 до 1.0).
Ответь строго валидным JSON:
{
  "extracted": [
    {
      "entityType": "character" | "location" | "object" | "event" | "relationship",
      "action": "create" | "update",
      "confidence": 0.92,
      "reasoning": "пояснение почему факт важен",
      "payload": {
        "universeId": "${universeId}",
        "name": "Имя или название",
        "description": "Описание",
        "details": {}
      }
    }
  ]
}`;

    const rawReply = await callLLM({ prompt });
    if (rawReply) {
      const data = safeParseJson<any>(rawReply, {});
      if (data.extracted && Array.isArray(data.extracted)) {
        for (const item of data.extracted) {
          proposedChanges.push({
            storyId,
            entityType: item.entityType || 'character',
            action: item.action || 'create',
            payload: item.payload || {},
            confidence: Number(item.confidence) || 0.85,
            reasoning: item.reasoning || 'Автоматически извлечено из текста истории.',
          });
        }
        return proposedChanges;
      }
    }
  } catch (e) {
    console.warn('LLM Extraction failed, falling back to rule-based extraction:', e);
  }

  // Rule-based fallback extraction
  // 1. Detect capitalized proper nouns & phrases
  const charMatches = text.match(/([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/g) || [];
  const uniqueNames = Array.from(new Set(charMatches)).filter(
    (n) => n.length > 3 && !['Михаил', 'Елена', 'Алексей', 'Сосновка', 'Старый', 'Октябрь'].includes(n)
  );

  if (uniqueNames.length > 0) {
    proposedChanges.push({
      storyId,
      entityType: 'character',
      action: 'create',
      payload: {
        universeId,
        canonicalName: uniqueNames[0],
        description: `Упомянут в истории как новое действующее лицо или свидетель.`,
        status: 'alive',
      },
      confidence: 0.82,
      reasoning: `Автоматически обнаружен новый персонаж «${uniqueNames[0]}».`,
    });
  }

  if (text.includes('фонарь') || text.includes('ключ') || text.includes('письмо') || text.includes('карта')) {
    const itemWord = text.includes('фонарь') ? 'Старый фонарь' : text.includes('ключ') ? 'Ржавый ключ' : 'Архивная карта';
    proposedChanges.push({
      storyId,
      entityType: 'object',
      action: 'create',
      payload: {
        universeId,
        name: itemWord,
        description: 'Предмет, имеющий сюжетное значение в повествовании.',
        properties: { discoveredInYear: year },
      },
      confidence: 0.89,
      reasoning: `Выявлен значимый предмет «${itemWord}».`,
    });
  }

  return proposedChanges;
}
