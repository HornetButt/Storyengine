import { StoryPlan, PlannedScene, PlannerChatMessage, CharacterState } from '../types';
import { storage } from './storage';
import { callLLM, safeParseJson } from './llm';

export interface PlanDiscussionRequest {
  universeId: string;
  storyYear: number;
  message: string;
  currentPlan?: Partial<StoryPlan>;
  conversationHistory?: { sender: 'user' | 'assistant'; text: string }[];
}

export interface PlanDiscussionResponse {
  reply: string;
  suggestedPlanDelta?: PlannerChatMessage['suggestedPlanDelta'];
  canonAlerts: string[];
}

export async function discussStoryPlan(req: PlanDiscussionRequest): Promise<PlanDiscussionResponse> {
  const universe = storage.getUniverse(req.universeId) || storage.getUniverses()[0];
  const allCharacters = storage.getCharacters(req.universeId);
  const allLocations = storage.getLocations(req.universeId);
  const allEvents = storage.getEvents(req.universeId);
  const allObjects = storage.getObjects(req.universeId);

  // Prepare context: Characters with temporal status at storyYear
  const charactersSummary = allCharacters.map((c) => {
    const states = c.states
      .filter((s: CharacterState) => s.year <= req.storyYear)
      .sort((a: CharacterState, b: CharacterState) => b.year - a.year);
    const currState = states[0];
    const isDeceased = currState ? currState.status === 'deceased' : c.status === 'deceased';
    return {
      id: c.id,
      name: c.canonicalName,
      statusAtYear: currState ? currState.status : c.status,
      desc: currState ? currState.description : c.description,
      isDeceased,
    };
  });

  const locationsSummary = allLocations.map((l) => ({
    id: l.id,
    name: l.name,
    status: l.status,
    desc: l.description,
  }));

  const eventsSummary = allEvents
    .filter((e) => e.year <= req.storyYear)
    .sort((a, b) => b.year - a.year)
    .slice(0, 5)
    .map((e) => `${e.year}: ${e.title} — ${e.description}`);

  // Canon alerts check (e.g. if user asks about deceased characters)
  const canonAlerts: string[] = [];
  const lowerMsg = req.message.toLowerCase();
  for (const c of charactersSummary) {
    if (c.isDeceased && (lowerMsg.includes(c.name.toLowerCase()) || lowerMsg.includes(c.name.split(' ')[0].toLowerCase()))) {
      canonAlerts.push(
        `Внимание: персонаж ${c.name} в ${req.storyYear} году числится погибшим/недоступным (${c.statusAtYear}: ${c.desc}). Если он участвует, это должен быть флешбэк, архивный документ или альтернативная ветка.`
      );
    }
  }

  try {
    const systemPrompt = `Ты — Story Engine Narrative Co-Writer & Story Planner (Архитектор сюжетов).
Твоя цель: помочь автору всесторонне спланировать будущую историю.
Обсуждай с автором:
1. Какие события произойдут (завязка, развитие, ключевые сцены, кульминация).
2. Каких персонажей привлечь и их роли/конфликты с учётом канонического статуса в ${req.storyYear} году.
3. Локации действия и их атмосферные особенности.
4. Неожиданные сюжетные повороты (твисты), тайны, улики или артефакты.
5. Соблюдение канона (предупреждай о парадоксах!).

КОНТЕКСТ ВСЕЛЕННОЙ:
- Название: ${universe ? universe.name : 'Канон'}
- Планируемый год событий: ${req.storyYear}
- Персонажи в базе:
${charactersSummary.map((c) => `  * [${c.id}] ${c.name} (статус в ${req.storyYear}: ${c.statusAtYear}${c.isDeceased ? ' - ПОГИБ' : ''})`).join('\n')}
- Локации в базе:
${locationsSummary.map((l) => `  * [${l.id}] ${l.name} (${l.status})`).join('\n')}
- Предшествующие события:
${eventsSummary.map((e) => `  * ${e}`).join('\n')}

ТЕКУЩЕЕ СОСТОЯНИЕ ПЛАНА (если есть):
${JSON.stringify(req.currentPlan || {}, null, 2)}

ИСТОРИЯ ДИАЛОГА:
${(req.conversationHistory || []).slice(-6).map((h) => `${h.sender === 'user' ? 'Автор' : 'Архитектор'}: ${h.text}`).join('\n')}

СООБЩЕНИЕ АВТОРА:
"${req.message}"

СФОРМУЛИРУЙ ОТВЕТ СТРОГО В JSON ФОРМАТЕ:
{
  "reply": "Дружелюбный, живой, творческий и экспертный ответ автора-советника на русском языке с конкретными предложениями по сценам, персонажам, локациям и твистам.",
  "suggestedPlanDelta": {
    "title": "Предлагаемое рабочее название истории или null",
    "premise": "Краткая суть/синопсис идеи или null",
    "plotTwists": ["список 1-3 ярких сюжетных поворотов"],
    "suggestedCharacters": [{"id": "char-id-если-известен", "name": "Имя персонажа", "statusHint": "роль/статус"}],
    "suggestedLocations": [{"id": "loc-id-если-известен", "name": "Название локации"}],
    "suggestedScenes": [
      {
        "title": "Название сцены/акта",
        "description": "Что происходит в сцене",
        "locationName": "Где происходит",
        "characterNames": ["Кто участвует"],
        "plotTwist": "Твист или откровение сцены",
        "emotionalBeat": "Эмоциональный тон"
      }
    ],
    "canonWarnings": ["Предупреждения по канону или временным парадоксам"]
  },
  "canonAlerts": ["Любые важные канонические предупреждения"]
}`;

    const rawReply = await callLLM({ prompt: systemPrompt });
    const parsed = safeParseJson<any>(rawReply, null);
    if (parsed && parsed.reply) {
      return {
        reply: parsed.reply,
        suggestedPlanDelta: parsed.suggestedPlanDelta,
        canonAlerts: Array.from(new Set([...canonAlerts, ...(parsed.canonAlerts || [])])),
      };
    }
  } catch (err) {
    console.warn('LLM plan discussion failed, falling back to local heuristic:', err);
  }

  // Fallback response if AI is unavailable or fails
  const matchedChars = charactersSummary.filter((c) =>
    req.message.toLowerCase().includes(c.name.toLowerCase()) ||
    req.message.toLowerCase().includes(c.name.split(' ')[0].toLowerCase())
  );
  const activeChars = matchedChars.length > 0 ? matchedChars : charactersSummary.filter((c) => !c.isDeceased).slice(0, 2);

  const fallbackTitle = `План: Расследование в ${req.storyYear} году`;
  const fallbackPremise = `Автор исследует события ${req.storyYear} года во вселенной "${universe?.name}". В центре внимания — загадка, затрагивающая ${activeChars.map((c) => c.name).join(' и ')}.`;

  const fallbackScenes: Partial<PlannedScene>[] = [
    {
      title: 'Сцена 1: Завязка и пролог',
      description: `Герои сталкиваются с необъяснимым происшествием в ${locationsSummary[0]?.name || 'окрестностях'}.`,
      characterNames: activeChars.map((c) => c.name),
      locationName: locationsSummary[0]?.name || 'Старый дом',
      emotionalBeat: 'Тайна и первое подозрение',
    },
    {
      title: 'Сцена 2: Развитие и обнаружение следов',
      description: 'Попытка сопоставить найденные улики с событиями прошлых лет.',
      characterNames: activeChars.map((c) => c.name),
      locationName: locationsSummary[1]?.name || 'Архив Сосновки',
      emotionalBeat: 'Напряжение и нарастающий конфликт',
      plotTwist: 'Обнаружен документ или вещь, принадлежавшая человеку, считавшемуся исчезнувшим.',
    },
    {
      title: 'Сцена 3: Кульминация и выбор',
      description: 'Открытое противостояние с угрозой или решающее открытие истины.',
      characterNames: activeChars.map((c) => c.name),
      locationName: locationsSummary[0]?.name || 'Старый дом',
      plotTwist: 'Аномалия не случайна — её вызвали намеренно.',
      emotionalBeat: 'Катарсис и неизбежность последствий',
    },
  ];

  return {
    reply: `Отличная идея для проработки! Давайте разберём эту историю по структуре:\n\n1. **Персонажи**: В ${req.storyYear} году логично задействовать ${activeChars.map((c) => c.name).join(' и ')}.\n2. **Локации**: Ключевыми точками могут стать ${locationsSummary.slice(0, 2).map((l) => l.name).join(' и ')}.\n3. **Сюжетные повороты**: Предлагаю добавить твист со скрытым механизмом или тайным мотивом одного из свидетелей.\n4. **Сцены**: Я сформировал базовый план из 3 сцен в правой панели. Что думаете? Добавим конкретный поворот событий или изменим состав участников?`,
    suggestedPlanDelta: {
      title: fallbackTitle,
      premise: fallbackPremise,
      plotTwists: [
        'Истинный источник угрозы находился внутри безопасной зоны с самого начала',
        'Один из очевидцев скрывал ключевую улику из страха',
      ],
      suggestedCharacters: activeChars.map((c) => ({ id: c.id, name: c.name, statusHint: c.statusAtYear })),
      suggestedLocations: locationsSummary.slice(0, 2).map((l) => ({ id: l.id, name: l.name })),
      suggestedScenes: fallbackScenes,
      canonWarnings: canonAlerts,
    },
    canonAlerts,
  };
}

export async function generateAutoOutline(plan: StoryPlan): Promise<PlannedScene[]> {
  const fallbackScenes: PlannedScene[] = plan.scenes.length > 0 ? plan.scenes : [
    {
      id: `sc-${Date.now()}-1`,
      title: 'Акт I: Завязка',
      description: 'Введение ключевых персонажей и появление первичного конфликта/загадки.',
      characterIds: plan.selectedCharacterIds,
      characterNames: [],
      year: plan.storyYear,
      emotionalBeat: 'Интрига',
    },
    {
      id: `sc-${Date.now()}-2`,
      title: 'Акт II: Развитие и поворот',
      description: 'Герои сталкиваются с неожиданным препятствием и раскрывают тайну.',
      characterIds: plan.selectedCharacterIds,
      characterNames: [],
      year: plan.storyYear,
      plotTwist: plan.plotTwists[0] || 'Неожиданный свидетель',
      emotionalBeat: 'Напряжение',
    },
    {
      id: `sc-${Date.now()}-3`,
      title: 'Акт III: Кульминация и финал',
      description: 'Решающее действие и последствия для канона вселенной.',
      characterIds: plan.selectedCharacterIds,
      characterNames: [],
      year: plan.storyYear,
      emotionalBeat: 'Разрешение',
    },
  ];

  try {
    const prompt = `Сгенерируй детальный список из 4-5 ключевых сцен для планируемой истории по следующим параметрам:
Название: ${plan.title}
Год: ${plan.storyYear}
Замысел: ${plan.premise}
Жанр/Тон: ${plan.genre} / ${plan.tone}
Сюжетные повороты: ${plan.plotTwists.join('; ')}

Ответь строго JSON-массивом объектов:
[
  {
    "title": "Название сцены",
    "description": "Подробное описание происходящего",
    "locationName": "Локация",
    "characterNames": ["Персонажи"],
    "plotTwist": "Сюжетный поворот если есть",
    "emotionalBeat": "Эмоциональный тон",
    "keyClueOrObject": "Улика или важный предмет"
  }
]`;

    const rawReply = await callLLM({ prompt });
    const parsed = safeParseJson<any[]>(rawReply, []);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, idx) => ({
        id: `sc-${Date.now()}-${idx + 1}`,
        title: item.title || `Сцена ${idx + 1}`,
        description: item.description || '',
        locationName: item.locationName,
        characterIds: [],
        characterNames: Array.isArray(item.characterNames) ? item.characterNames : [],
        year: plan.storyYear,
        plotTwist: item.plotTwist,
        emotionalBeat: item.emotionalBeat,
        keyClueOrObject: item.keyClueOrObject,
      }));
    }
  } catch (e) {
    console.warn('Auto outline generation failed:', e);
  }

  return fallbackScenes;
}
