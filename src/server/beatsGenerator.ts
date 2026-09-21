import {
  StoryBeat,
  PlannedScene,
  BreakdownSceneRequest,
  GenerateBeatProseRequest,
} from '../types';
import { storage } from './storage';
import { buildStoryBible } from './storyBible';
import { callLLM, safeParseJson } from './llm';

/**
 * Automatically decomposes a planned scene into 3-5 dramatic Story Beats.
 */
export async function breakdownSceneToBeats(
  req: BreakdownSceneRequest
): Promise<StoryBeat[]> {
  const { scene, universeId, storyYear, genre, tone, premise } = req;

  // Build universe context
  const bible = buildStoryBible({
    universeId,
    storyYear,
    prompt: scene.description,
    characterIds: scene.characterIds,
    locationIds: scene.locationId ? [scene.locationId] : [],
    referenceLevel: 'subtle',
    canonStatus: 'canon',
  });

  const prompt = `Ты — Story Engine Narrative Director (Режиссёр сюжетных битов).
Твоя задача — разбить отдельную сцену рассказа на 3–5 последовательных сюжетных битов (Story Beats).

КАНОНИЧЕСКИЙ КОНТЕКСТ:
- Вселенная: ${bible.universeName}
- Год событий: ${storyYear}
- Общий замысел: ${premise || 'Каноническая история'}
- Жанр: ${genre || 'Мистика / Детектив'} | Тон: ${tone || 'Напряжённый'}

СЦЕНА:
- Название: "${scene.title}"
- Описание сцены: "${scene.description}"
- Локация: ${scene.locationName || 'Не указана'}
- Участвующие персонажи: ${scene.characterNames?.join(', ') || 'Герои истории'}
${scene.emotionalBeat ? `- Эмоциональный тон: ${scene.emotionalBeat}` : ''}
${scene.plotTwist ? `- Поворот сюжета / Открытие: ${scene.plotTwist}` : ''}
${scene.keyClueOrObject ? `- Ключевой предмет / улика: ${scene.keyClueOrObject}` : ''}

КАНОНИЧЕСКИЕ СТАТУСЫ ПЕРСОНАЖЕЙ:
${bible.relevantCharacters.map((c: any) => `- ${c.name}: ${c.currentStatusAtYear} ${c.isDeceased ? '[ПОГИБ В ЭТОМ ГОДУ ИЛИ РАНЕЕ - НЕ ДЕЛАТЬ ДЕЙСТВУЮЩИМ ЛИЦОМ!]' : ''}`).join('\n')}

Требования к битам (Story Beats):
1. Каждый бит — это одно конкретное драматургическое действие или поворот (2-3 предложения директивы: что персонаж делает, чувствует, с чем сталкивается).
2. Последовательность битов:
   - Бит 1: Заход в сцену / Экспозиция и атмосфера места.
   - Бит 2: Первое действие / Находка или начало диалога.
   - Бит 3: Нарастание напряжения / Открытие или столкновение.
   - Бит 4 (или 5): Кульминация бита сцены / Мостик к дальнейшим событиям.

Ответь СТРОГО в JSON массиве:
[
  {
    "title": "Краткое броское название бита (например: Запах сырой хвои у входа)",
    "directive": "Подробная директива для ИИ-писателя: что именно происходит, какие чувства героя передать, какую деталь заметить.",
    "charactersPresent": ["Имя персонажа 1", "Имя персонажа 2"],
    "targetWordCount": 300
  }
]`;

  try {
    const reply = await callLLM({ prompt, temperature: 0.65 });
    if (reply) {
      const parsed = safeParseJson<any[]>(reply, []);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          id: `beat-${Date.now()}-${idx + 1}`,
          sceneId: scene.id,
          beatIndex: idx + 1,
          title: item.title || `Бит ${idx + 1}`,
          directive: item.directive || item.description || 'Действие бита',
          charactersPresent: item.charactersPresent || scene.characterNames || [],
          status: 'pending',
          targetWordCount: item.targetWordCount || 300,
        }));
      }
    }
  } catch (err) {
    console.warn('LLM breakdownSceneToBeats failed, falling back to heuristic:', err);
  }

  // Fallback heuristic beats if LLM is unavailable
  return [
    {
      id: `beat-${Date.now()}-1`,
      sceneId: scene.id,
      beatIndex: 1,
      title: 'Экспозиция и обстановка',
      directive: `Герой прибывает в локацию ${scene.locationName || 'действия'} в ${storyYear} году. Передать атмосферу места, запахи и звуки, ввести читателя в обстановку.`,
      charactersPresent: scene.characterNames?.slice(0, 1) || [],
      status: 'pending',
      targetWordCount: 250,
    },
    {
      id: `beat-${Date.now()}-2`,
      sceneId: scene.id,
      beatIndex: 2,
      title: 'Завязка взаимодействия',
      directive: `Происходит первое действие: обнаружение детали, включение прибора или диалог между ${scene.characterNames?.join(' и ') || 'персонажами'}.`,
      charactersPresent: scene.characterNames || [],
      status: 'pending',
      targetWordCount: 300,
    },
    {
      id: `beat-${Date.now()}-3`,
      sceneId: scene.id,
      beatIndex: 3,
      title: 'Эскалация и открытие',
      directive: scene.plotTwist
        ? `Вскрывается поворот: "${scene.plotTwist}". Персонажи реагируют на неожиданное препятствие.`
        : 'Напряжение нарастает. Герои понимают, что ситуация опаснее, чем казалось вначале.',
      charactersPresent: scene.characterNames || [],
      status: 'pending',
      targetWordCount: 350,
    },
    {
      id: `beat-${Date.now()}-4`,
      sceneId: scene.id,
      beatIndex: 4,
      title: 'Перелом и послесловие сцены',
      directive: `Кульминация сцены. Решение, которое принимают персонажи, и подготовка перехода к следующим событиям.`,
      charactersPresent: scene.characterNames || [],
      status: 'pending',
      targetWordCount: 250,
    },
  ];
}

/**
 * Generates a single prose segment for a specific Story Beat,
 * maintaining voice continuity with preceding text.
 */
export async function generateBeatProse(
  req: GenerateBeatProseRequest
): Promise<{ text: string; wordCount: number }> {
  const { beat, scene, universeId, storyYear, previousText = '', genre, tone, styleNotes } = req;

  const bible = buildStoryBible({
    universeId,
    storyYear,
    prompt: beat.directive,
    characterIds: scene.characterIds,
    locationIds: scene.locationId ? [scene.locationId] : [],
    referenceLevel: 'subtle',
    canonStatus: 'canon',
  });

  const lastPrecedingContext = previousText.trim()
    ? previousText.slice(-1200)
    : '';

  const prompt = `Ты — Story Engine Prose Co-Writer (Литературный соавтор).
Твоя задача — написать качественный художественный фрагмент прозы ИСКЛЮЧИТЕЛЬНО для одного конкретного сюжетного бита (Story Beat).

ВАЖНЫЕ ПРАВИЛА:
1. Пиши ТОЛЬКО художественный текст этого бита. Никаких заголовков, нумераций, мета-комментариев и приветствий.
2. Бесшовное продолжение: если дан предшествующий контекст, продолжай историю с той же точки, в том же темпе и стиле, НЕ ПОВТОРЯЙ заново то, что уже было сказано в предыдущем тексте.
3. Соблюдай канон: персонажи не могут воскресать или нарушать законы вселенной ${bible.universeName} в ${storyYear} году.
4. Фокусируйся на сенсорных деталях (звуки, тени, тактильные ощущения), живых диалогах и естественном ритме прозы.

КОНТЕКСТ СЦЕНЫ:
- Сцена: "${scene.title}"
- Локация: ${scene.locationName || 'По сюжету'}
- Год: ${storyYear}
- Жанр / Тон: ${genre || 'Детектив/Мистика'} | ${tone || 'Напряжённый'}
${styleNotes ? `- Стилистические указания автора: ${styleNotes}` : ''}

ТЕКУЩИЙ БИТ ДЛЯ НАПИСАНИЯ:
- Название бита: "${beat.title}"
- ДИРЕКТИВА БИТА (ЧТО ДОЛЖНО ПРОИЗОЙТИ): "${beat.directive}"
- Персонажи в бите: ${beat.charactersPresent?.join(', ') || scene.characterNames?.join(', ') || 'Действующие лица'}
- Желаемый объём: ~${beat.targetWordCount || 300} слов.

ПРЕДШЕСТВУЮЩИЙ ТЕКСТ ИСТОРИИ (для бесшовной стыковки):
${lastPrecedingContext ? `"""\n${lastPrecedingContext}\n"""` : '*(Это начало сцены, начни повествование с погружения в атмосферу)*'}

Напиши выразительный, атмосферный отрывок прозы на русском языке:`;

  try {
    const reply = await callLLM({ prompt, temperature: 0.72 });
    if (reply && reply.trim().length > 30) {
      const cleanText = reply
        .replace(/^```[a-z]*\n?/gi, '')
        .replace(/```$/g, '')
        .trim();

      const words = cleanText.split(/\s+/).filter(Boolean).length;
      return { text: cleanText, wordCount: words };
    }
  } catch (err) {
    console.warn('LLM generateBeatProse failed, falling back to local heuristic:', err);
  }

  // Fallback prose generation
  const activeChar = beat.charactersPresent?.[0] || 'Исследователь';
  const fallbackText = `Шаги ${activeChar} гулко отдавались в тишине. ${
    scene.locationName ? `В районе ${scene.locationName}` : 'Вокруг'
  } всё казалось застывшим во времени, будто с ${storyYear} года здесь ничего не менялось.

${beat.directive.replace(/^[^а-яa-z0-9]+/i, '')}.

Каждая мелочь привлекала внимание: пыль на старых переплётах, лёгкая вибрация деревянных половиц под ногами и странное ощущение чужого взгляда из глубины комнаты. ${activeChar} помедлил секунду, переводя дыхание и проверяя, всё ли готово к следующему шагу.`;

  return {
    text: fallbackText,
    wordCount: fallbackText.split(/\s+/).filter(Boolean).length,
  };
}

/**
 * Continues prose seamlessly from cursor or end of text.
 */
export async function continueBeatProse(params: {
  universeId: string;
  storyYear: number;
  currentText: string;
  instruction?: string;
}): Promise<{ addedText: string }> {
  const { universeId, storyYear, currentText, instruction } = params;

  const tail = currentText.slice(-1000);

  const prompt = `Ты — Story Engine Narrative Co-Writer.
Твоя задача — органично ДОПИСАТЬ следующий абзац (100–200 слов) к текущему художественному тексту, подхватывая мысль и ритм.

КОНТЕКСТ:
- Год: ${storyYear}
- Вселенная: ${universeId}
${instruction ? `- Указание автора к продолжению: "${instruction}"` : ''}

ПОСЛЕДНИЙ ФРАГМЕНТ ТЕКСТА:
"""
${tail}
"""

Продолжи повествование прямо со следующей фразы (без повторений, без мета-слов):`;

  try {
    const reply = await callLLM({ prompt, temperature: 0.75 });
    if (reply && reply.trim()) {
      const clean = reply
        .replace(/^```[a-z]*\n?/gi, '')
        .replace(/```$/g, '')
        .trim();
      return { addedText: clean };
    }
  } catch (err) {
    console.warn('continueBeatProse failed:', err);
  }

  return {
    addedText: `В наступившей паузе послышался негромкий щелчок. Тень за спиной дрогнула, заставляя замереть и вслушаться в темноту.`,
  };
}
