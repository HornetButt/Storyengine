import { LLMProvider, LLMTaskType, LLMTaskMap } from './types';
import { callLLM, safeParseJson } from '../server/llm';
import { ContextBuilder } from './contextBuilder';
import { MockLLMProvider } from './mockProvider';
import { validateAndNormalizeBeats } from './beatPlannerUtils';
import {
  StoryConcept,
  Plot,
  Beat,
  CriticReport,
  CanonProposal,
  Scene,
} from '../domain/storyModel';

export class DefaultLLMProvider implements LLMProvider {
  name = 'DefaultLLMProvider';
  private fallbackMock = new MockLLMProvider();

  async generate<T extends LLMTaskType>(
    task: T,
    input: LLMTaskMap[T]['input']
  ): Promise<LLMTaskMap[T]['output']> {
    try {
      switch (task) {
        case 'CONCEPT_GENERATOR':
          return (await this.handleConceptGenerator(input as any)) as any;
        case 'BIBLE_GENERATOR':
          return (await this.handleBibleGenerator(input as any)) as any;
        case 'PLOT_PLANNER':
          return (await this.handlePlotPlanner(input as any)) as any;
        case 'SCENE_PLANNER':
          return (await this.handleScenePlanner(input as any)) as any;
        case 'BEAT_PLANNER':
          return (await this.handleBeatPlanner(input as any)) as any;
        case 'WRITER':
          return (await this.handleWriter(input as any)) as any;
        case 'CRITIC':
          return (await this.handleCritic(input as any)) as any;
        case 'CANON_EXTRACTOR':
          return (await this.handleCanonExtractor(input as any)) as any;
        case 'STATE_UPDATER':
          return (await this.handleStateUpdater(input as any)) as any;
        case 'REVISER':
          return (await this.handleReviser(input as any)) as any;
        default:
          return await this.fallbackMock.generate(task, input);
      }
    } catch (err) {
      console.warn(`[DefaultLLMProvider] Task ${task} failed or timed out. Using deterministic fallback:`, err);
      return await this.fallbackMock.generate(task, input);
    }
  }

  private async handleConceptGenerator(input: import('./types').ConceptGeneratorInput): Promise<StoryConcept> {
    const prompt = `Ты — Story Engine Concept Architect.
Сформируй целостный концепт сценария / художественной истории.

Идея автора: "${input.idea}"
Жанр: ${input.genre || 'Драматический триллер / Детектив'}
Тональность: ${input.tone || 'Кинематографичная, напряжённая'}
Вселенная: ${input.universeName || 'Канонический мир'}
${input.universeRules?.length ? `Правила мира:\n${input.universeRules.map((r) => `- ${r}`).join('\n')}` : ''}

Ответь строго валидным JSON без разметки markdown:
{
  "premise": "Развернутый логлайн и завязка (2-3 предложения)",
  "genre": "Жанр",
  "tone": "Тональность и атмосфера",
  "themes": ["Тема 1", "Тема 2", "Тема 3"],
  "centralConflict": "В чём суть главного конфликта",
  "stakes": "Что стоит на кону (личные и глобальные ставки)",
  "targetAudience": "Целевая аудитория",
  "endingDirection": "Вектор финала (катарсис, открытый финал, победа с потерями)",
  "estimatedScenesCount": 6
}`;

    const reply = await callLLM({ prompt, temperature: 0.7 });
    if (reply) {
      const parsed = safeParseJson<StoryConcept>(reply, null as any);
      if (parsed && parsed.premise) return parsed;
    }
    return this.fallbackMock.generate('CONCEPT_GENERATOR', input);
  }

  private async handleBibleGenerator(input: import('./types').BibleGeneratorInput): Promise<any> {
    const prompt = `Ты — Story Engine World & Bible Architect.
Создай структурированную Story Bible для истории на основе утвержденного концепта.

Концепт:
Премис: ${input.concept.premise}
Жанр: ${input.concept.genre} | Тон: ${input.concept.tone}
Конфликт: ${input.concept.centralConflict}
Вселенная: ${input.universeName} (${input.storyYear} год)

Ответь строго валидным JSON:
{
  "universeName": "${input.universeName}",
  "storyYear": ${input.storyYear},
  "characters": [
    {
      "id": "char-1",
      "name": "Имя персонажа",
      "role": "protagonist" | "antagonist" | "supporting",
      "statusAtStart": "alive",
      "description": "Краткая характеристика и внешность",
      "motivation": "Главная цель в истории",
      "flaw": "Уязвимость или слабость",
      "knowledgeAtStart": ["Что уже знает на старте"],
      "relationships": []
    }
  ],
  "locations": [
    {
      "id": "loc-1",
      "name": "Название локации",
      "type": "Тип",
      "status": "intact" | "abandoned" | "ruined",
      "description": "Атмосферное описание",
      "atmosphere": "Запахи, звуки, свет"
    }
  ],
  "rules": ["Непреложное правило 1", "Правило 2"],
  "lore": ["Ключевая предыстория"],
  "mysteries": [
    {
      "id": "myst-1",
      "question": "Главная загадка",
      "truth": "Истинная разгадка (только для автора)",
      "cluesPlanned": ["Улика 1", "Улика 2"],
      "status": "unresolved"
    }
  ],
  "importantFacts": ["Канонический факт 1"],
  "forbiddenElements": ["Запрещённый штамп или действие"]
}`;

    const reply = await callLLM({ prompt, temperature: 0.6 });
    if (reply) {
      const parsed = safeParseJson<any>(reply, null as any);
      if (parsed && parsed.characters && parsed.locations) return parsed;
    }
    return this.fallbackMock.generate('BIBLE_GENERATOR', input);
  }

  private async handlePlotPlanner(input: import('./types').PlotPlannerInput): Promise<Plot> {
    const prompt = `Ты — Story Engine Plot Planner.
Разработай иерархический сюжет (Акты -> Сцены) строго на основе Story Bible и концепта.

Концепт:
Премис: ${input.concept.premise}
Конфликт: ${input.concept.centralConflict}
Жанр: ${input.concept.genre} | Тон: ${input.concept.tone}

Персонажи: ${input.bible.characters.map((c) => c.name).join(', ')}
Локации: ${input.bible.locations.map((l) => l.name).join(', ')}

Сформируй 3 Акта, в каждом 1-2 последовательности и 1-3 ключевые сцены.
Ответь строго валидным JSON:
{
  "acts": [
    {
      "id": "act-1",
      "actIndex": 1,
      "title": "Акт 1: Название",
      "goal": "Драматическая цель акта",
      "sequences": [
        {
          "id": "seq-1",
          "actId": "act-1",
          "title": "Название эпизода",
          "objective": "Цель эпизода",
          "scenes": [
            {
              "id": "sc-1",
              "actId": "act-1",
              "sequenceId": "seq-1",
              "sceneIndex": 1,
              "title": "Название сцены",
              "purpose": "Зачем сцена нужна для сюжета",
              "location": "Имя локации из библии",
              "time": "Время суток и погода",
              "characters": ["Имена действующих лиц"],
              "conflict": "Локальный конфликт сцены",
              "informationRevealed": ["Что новое узнает зритель/герой"],
              "emotionalChange": "Сдвиг эмоции (например, От надежды к тревоге)",
              "requiredEvents": ["Событие которое должно произойти"],
              "forbiddenEvents": ["Чего нельзя допустить"],
              "beats": [],
              "draft": "",
              "drafts": [],
              "status": "planned",
              "version": 1
            }
          ]
        }
      ]
    }
  ]
}`;

    const reply = await callLLM({ prompt, temperature: 0.6 });
    if (reply) {
      const parsed = safeParseJson<Plot>(reply, null as any);
      if (parsed && parsed.acts && parsed.acts.length > 0) return parsed;
    }
    return this.fallbackMock.generate('PLOT_PLANNER', input);
  }

  private async handleScenePlanner(input: import('./types').ScenePlannerInput): Promise<Partial<Scene>> {
    const ctx = ContextBuilder.build({
      concept: input.concept,
      bible: input.bible,
      state: input.state,
      canonFacts: input.canonFacts,
    });
    const prompt = `Ты — Story Engine Scene Architect.
Спланируй отдельную сцену #${input.sceneIndex} в рамках акта («${input.actGoal}») и эпизода («${input.sequenceObjective}»).

${ContextBuilder.formatForPrompt(ctx)}

Ответь строго валидным JSON:
{
  "title": "${input.sceneTitle || 'Название сцены'}",
  "purpose": "Конкретная сюжетная функция сцены",
  "location": "Локация из доступных",
  "conflict": "В чём драматическое столкновение",
  "informationRevealed": ["Ключевая новая улика или открытие"],
  "emotionalChange": "От какого состояния к какому меняется герой",
  "requiredEvents": ["Обязательное микрособытие"],
  "forbiddenEvents": ["Запрещённое действие"]
}`;

    const reply = await callLLM({ prompt, temperature: 0.6 });
    if (reply) {
      const parsed = safeParseJson<Partial<Scene>>(reply, null as any);
      if (parsed && parsed.purpose) return parsed;
    }
    return this.fallbackMock.generate('SCENE_PLANNER', input);
  }

  private async handleBeatPlanner(input: import('./types').BeatPlannerInput): Promise<Beat[]> {
    const ctx = ContextBuilder.build({
      concept: input.concept,
      bible: input.bible,
      state: input.state,
      canonFacts: input.canonFacts,
      scene: input.scene,
    });

    const activeChars = (input.scene.characters && input.scene.characters.length > 0)
      ? input.scene.characters
      : input.bible.characters.map((c) => c.name);

    const prompt = `Ты — Story Engine Beat Planner.
Твоя задача — разбить сцену «${input.scene.title}» на последовательную драматическую цепочку битов.

=== ПРИНЦИП ПОСТРОЕНИЯ БИТОВ ===
Beat — это НЕ маленькая сцена и НЕ отрывок художественного текста.
Beat — это минимальный неделимый драматический шаг, после которого ситуация в сцене становится немного другой:
[Состояние 0] → Бит 1 → [Состояние 1] → Бит 2 → [Состояние 2] → Бит 3 → [Состояние 3]...

Каждый последующий бит должен быть логическим следствием предыдущего:
- Бит 1 создает начальный импульс или микрособытие.
- Бит 2 реагирует на результат Бита 1 или преодолевает возникшее препятствие.
- Бит 3 развивает конфликт, раскрывает новую информацию или меняет эмоциональный вектор.
- Последующие биты подводят сцену к завершению ее сюжетной цели.

=== ВОПРОСЫ, НА КОТОРЫЕ ОТВЕЧАЕТ КАЖДЫЙ БИТ ===
1. Что происходит и кто действует? (action, characters)
2. Чего персонаж хочет непосредственно в этом бите и что ему мешает? (purpose)
3. Какая драматическая информация раскрывается зрителю или сцене? (information)
4. Как меняется эмоциональное состояние действующего лица? (emotionalChange)
5. Что меняется в состоянии истории и персонажей? (stateChanges: newKnowledge, newEmotion, flag)
6. Почему после этого бита становится возможен следующий бит? (причинно-следственная связь)

=== ТРЕБОВАНИЯ К КОЛИЧЕСТВУ И ОБЪЕМУ ===
- Количество битов определяется сложностью сцены:
  * Короткая простая сцена: 3-4 бита
  * Стандартная сцена: 4-6 битов
  * Сложная насыщенная сцена: 5-8 битов
- Объем (targetWordCount) должен соответствовать драматическому весу бита:
  * Короткий переход или микрореакция: 100-150 слов
  * Стандартный содержательный бит: 150-300 слов
  * Ключевое столкновение или кульминация сцены: 300-450 слов

=== СТРУКТУРА STATE CHANGES ===
В поле "stateChanges" укажи предполагаемые микроизменения состояния (если они есть):
"stateChanges": [
  {
    "character": "Имя персонажа",
    "newKnowledge": "Что именно осознал или узнал конкретный персонаж",
    "newEmotion": "Новое эмоциональное состояние персонажа",
    "flag": "machine_readable_event_flag"
  }
]
- Поле "information" описывает общую драматическую информацию бита для читателя/сцены.
- Поле "newKnowledge" описывает личное знание конкретного персонажа. Не дублируй их слепо.
- Если в бите нет сдвига состояния, передай пустой массив: "stateChanges": []. Не выдумывай искусственные флаги там, где их нет.
- "stateChanges" — это рабочее предложение для сцены, оно НЕ меняет глобальный Канон автоматически.

=== СТРОГИЕ ЗАПРЕТЫ ===
1. ЗАПРЕЩЕНО писать художественный текст, диалоги репликами или прозу — нужен только драматургический план.
2. ЗАПРЕЩЕНО придумывать самостоятельные сцены вместо минимальных шагов (битов).
3. ЗАПРЕЩЕНО перескакивать через причинно-следственные связи: Бит 2 обязан развивать ситуацию после Бита 1.
4. ЗАПРЕЩЕНО вводить новых персонажей! Используй ТОЛЬКО доступных персонажей сцены: ${activeChars.join(', ')}.
5. ЗАПРЕЩЕНО нарушать канонические правила и установленные факты библии.
6. ЗАПРЕЩЕНО раскрывать центральные тайны без сюжетного обоснования.
7. ЗАПРЕЩЕНО создавать дублирующие биты, описывающие одно и то же действие.
8. ЗАПРЕЩЕНО использовать абстрактные клише («происходит нечто важное», «герой думает о жизни»).
9. Каждый бит должен быть предельно конкретным и исполнимым для последующего написания.

${ContextBuilder.formatForPrompt(ctx)}

Ответь СТРОГО валидным JSON без постороннего текста:
{
  "beats": [
    {
      "beatIndex": 1,
      "title": "Краткое название бита",
      "purpose": "Драматургическая цель (чего хочет герой и что мешает)",
      "action": "Конкретное физическое или речевое действие персонажа",
      "characters": ["${activeChars[0] || 'Имя персонажа'}"],
      "information": "Какая новая информация проявляется в этом шаге",
      "emotionalChange": "Сдвиг эмоции (например, От спокойствия к настороженности)",
      "stateChanges": [
        {
          "character": "${activeChars[0] || 'Имя персонажа'}",
          "newKnowledge": "Осознание конкретного факта",
          "newEmotion": "настороженность",
          "flag": "first_clue_observed"
        }
      ],
      "targetWordCount": 200
    }
  ]
}`;

    const reply = await callLLM({ prompt, temperature: 0.5 });
    if (reply) {
      const parsed = safeParseJson<any>(reply, null);
      if (parsed) {
        const normalized = validateAndNormalizeBeats(parsed, input.scene, input.bible);
        if (normalized.length > 0) {
          return normalized;
        }
      }
    }

    const fallbackBeats = await this.fallbackMock.generate('BEAT_PLANNER', input);
    return validateAndNormalizeBeats(fallbackBeats, input.scene, input.bible);
  }

  private async handleWriter(input: import('./types').WriterInput): Promise<{ text: string; wordCount: number }> {
    const ctx = ContextBuilder.build({
      concept: input.concept,
      bible: input.bible,
      state: input.state,
      canonFacts: input.canonFacts,
      scene: input.scene,
      beat: input.beat,
    });

    const stateChangesStr = (input.beat.stateChanges && input.beat.stateChanges.length > 0)
      ? `\n- Ожидаемый сдвиг состояния: ${input.beat.stateChanges
          .map((sc) => [sc.character, sc.newKnowledge, sc.newEmotion, sc.flag ? `[flag: ${sc.flag}]` : ''].filter(Boolean).join(' | '))
          .join('; ')}`
      : '';

    const prompt = `Ты — Story Engine Master Writer.
Напиши выразительный художественный текст для конкретного сценарного бита на русском языке.

${ContextBuilder.formatForPrompt(ctx)}

ТЕКУЩИЙ БИТ:
- Номер: #${input.beat.beatIndex} «${input.beat.title}»
- Действие: ${input.beat.action}
- Эмоциональный заряд: ${input.beat.emotionalChange}
- Целевой объём: ~${input.beat.targetWordCount || 250} слов${stateChangesStr}
${input.styleDirectives ? `- Особые указания стиля: ${input.styleDirectives}` : ''}
${input.previousText ? `\nПРЕДШЕСТВУЮЩИЙ ТЕКСТ СЦЕНЫ (продолжай органично):\n"""\n${input.previousText.slice(-800)}\n"""` : ''}

ТРЕБОВАНИЯ:
1. Пиши богатым, кинематографичным языком, с сенсорными якорями (звуки, запахи, фактуры).
2. Соблюдай канон и текущее эмоциональное состояние персонажа.
3. Не повторяй слово в слово предшествующий фрагмент.
4. Ответь исключительно готовым художественным текстом бита. Без кавычек в начале/конце и без вступительных реплик.`;

    const reply = await callLLM({ prompt, temperature: 0.75 });
    if (reply && reply.trim().length > 20) {
      const text = reply.trim();
      return { text, wordCount: text.split(/\s+/).length };
    }
    return this.fallbackMock.generate('WRITER', input);
  }

  private async handleCritic(input: import('./types').CriticInput): Promise<CriticReport> {
    const ctx = ContextBuilder.build({
      concept: input.concept,
      bible: input.bible,
      state: input.state,
      canonFacts: input.canonFacts,
      scene: input.scene,
    });

    const prompt = `Ты — Story Engine Strict Literary Critic & Canon Inspector.
Проанализируй черновик сцены на:
1. Непротиворечивость канону и правилам вселенной (КРИТИЧНО).
2. Соответствие характерам персонажей и их статусу в текущем году.
3. Логику таймлайна и пространственную географию.
4. Выполнение цели сцены и темпоритм.
5. Отсутствие банальных штампов и клише ("холодок пробежал по спине", "сердце бешено колотилось").

${ContextBuilder.formatForPrompt(ctx)}

ЧЕРНОВИК СЦЕНЫ «${input.scene.title}»:
"""
${input.draftText.slice(0, 4000)}
"""

Ответь строго валидным JSON:
{
  "score": 88,
  "passed": true,
  "summary": "Общий вывод рецензии (2-3 предложения)",
  "positiveHighlights": ["Удачный момент 1", "Сильная деталь 2"],
  "issues": [
    {
      "id": "iss-1",
      "severity": "error" | "warning" | "info",
      "category": "canon_consistency" | "character_consistency" | "timeline_consistency" | "world_rules" | "plot_logic" | "pacing" | "ai_style_cliche",
      "location": "Где конкретно в тексте",
      "explanation": "В чём суть проблемы",
      "suggestedFix": "Как исправить"
    }
  ]
}`;

    const reply = await callLLM({ prompt, temperature: 0.3 });
    if (reply) {
      const parsed = safeParseJson<CriticReport>(reply, null as any);
      if (parsed && typeof parsed.score === 'number' && Array.isArray(parsed.issues)) {
        return {
          ...parsed,
          createdAt: new Date().toISOString(),
        };
      }
    }
    return this.fallbackMock.generate('CRITIC', input);
  }

  private async handleCanonExtractor(input: import('./types').CanonExtractorInput): Promise<CanonProposal[]> {
    const prompt = `Ты — Story Engine Canon Knowledge Extractor.
Проанализируй текст сцены и выдели новые установленные факты, которые дополняют канон:
- Новые знания персонажей (что они теперь доподлинно знают)
- Изменения статуса или отношений
- Физические изменения локаций или предметов
- Ключевые свершившиеся события

Сцена: ${input.scene.title}
Текст:
"""
${input.draftText.slice(0, 3500)}
"""

Ответь строго валидным JSON:
{
  "proposals": [
    {
      "type": "CHARACTER_KNOWLEDGE" | "RELATIONSHIP_CHANGE" | "WORLD_RULE" | "EVENT_OCCURRED" | "OBJECT_STATE",
      "character": "Имя персонажа (если применимо)",
      "change": "Четкая формулировка установленного факта",
      "reason": "Почему этот факт важен для сохранения преемственности",
      "confidence": 0.95
    }
  ]
}`;

    const reply = await callLLM({ prompt, temperature: 0.3 });
    if (reply) {
      const parsed = safeParseJson<{ proposals: any[] }>(reply, null as any);
      if (parsed && Array.isArray(parsed.proposals)) {
        return parsed.proposals.map((p, idx) => ({
          id: `prop-${Date.now()}-${idx + 1}`,
          type: p.type || 'EVENT_OCCURRED',
          character: p.character,
          change: p.change,
          reason: p.reason || 'Автоматически выявлено из текста сцены',
          source: input.scene.title,
          sourceSceneId: input.scene.id,
          confidence: Number(p.confidence) || 0.9,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }));
      }
    }
    return this.fallbackMock.generate('CANON_EXTRACTOR', input);
  }

  private async handleStateUpdater(input: import('./types').StateUpdaterInput): Promise<Partial<import('../domain/storyModel').StoryState>> {
    const prompt = `Ты — Story Engine State Tracker.
На основе сцены «${input.scene.title}» и её текста обнови состояние персонажей:
- Где они теперь находятся?
- Какое их актуальное эмоциональное состояние?
- Что новое они узнали?
- Сделай краткое резюме сцены для передачи в контекст следующих сцен (2 предложения).

Текст:
"""
${input.draftText.slice(0, 3000)}
"""

Ответь строго валидным JSON:
{
  "characters": {
    "ИмяПерсонажа": {
      "location": "Локация",
      "emotionalState": "Эмоциональное состояние",
      "newKnowledge": ["Новый факт"]
    }
  },
  "lastSceneSummary": "Краткое резюме сцены для следующего шага"
}`;

    const reply = await callLLM({ prompt, temperature: 0.3 });
    if (reply) {
      const parsed = safeParseJson<any>(reply, null as any);
      if (parsed && parsed.lastSceneSummary) {
        const updatedChars = { ...input.currentState.characters };
        if (parsed.characters && typeof parsed.characters === 'object') {
          for (const [name, val] of Object.entries(parsed.characters) as any) {
            const existing = updatedChars[name] || {
              characterId: name,
              name,
              status: 'alive',
              emotionalState: 'Спокойствие',
              knowledge: [],
              inventory: [],
            };
            updatedChars[name] = {
              ...existing,
              locationName: val.location || existing.locationName,
              emotionalState: val.emotionalState || existing.emotionalState,
              knowledge: [...existing.knowledge, ...(val.newKnowledge || [])],
            };
          }
        }
        return {
          completedSceneIds: Array.from(new Set([...input.currentState.completedSceneIds, input.scene.id])),
          characters: updatedChars,
          events: {
            ...input.currentState.events,
            [`scene_completed_${input.scene.id}`]: true,
          },
          lastSceneSummary: parsed.lastSceneSummary,
        };
      }
    }
    return this.fallbackMock.generate('STATE_UPDATER', input);
  }

  private async handleReviser(input: import('./types').ReviserInput): Promise<{ revisedText: string; changeSummary: string }> {
    const prompt = `Ты — Story Engine Expert Reviser & Editor.
Перепиши и улучши черновик сцены «${input.scene.title}», устраняя замечания критика и следуя указаниям автора.

ЗАМЕЧАНИЯ КРИТИКА:
${input.criticReport.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.location}: ${i.explanation} -> Решение: ${i.suggestedFix}`).join('\n')}

${input.userInstructions ? `ДОПОЛНИТЕЛЬНЫЕ УКАЗАНИЯ АВТОРА:\n${input.userInstructions}\n` : ''}

ОРИГИНАЛЬНЫЙ ТЕКСТ:
"""
${input.currentDraft}
"""

Ответь строго валидным JSON:
{
  "changeSummary": "Краткое описание внесённых изменений (1-2 предложения)",
  "revisedText": "Полный исправленный и доработанный художественный текст сцены"
}`;

    const reply = await callLLM({ prompt, temperature: 0.65 });
    if (reply) {
      const parsed = safeParseJson<{ changeSummary: string; revisedText: string }>(reply, null as any);
      if (parsed && parsed.revisedText) return parsed;
    }
    return this.fallbackMock.generate('REVISER', input);
  }
}
