import { LLMProvider, LLMTaskType, LLMTaskMap } from './types';
import { callLLM, safeParseJson } from '../server/llm';
import { ContextBuilder } from './contextBuilder';
import { MockLLMProvider } from './mockProvider';
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

    const prompt = `Ты — Story Engine Beat Planner.
Разбей сцену «${input.scene.title}» на драматические биты (3-5 битов).
Каждый бит — это микрошаг: действие, обмен информацией и сдвиг эмоционального заряда.

${ContextBuilder.formatForPrompt(ctx)}

Сцена:
Цель: ${input.scene.purpose}
Конфликт: ${input.scene.conflict}
Эмоциональный сдвиг: ${input.scene.emotionalChange}

Ответь строго валидным JSON:
{
  "beats": [
    {
      "beatIndex": 1,
      "title": "Краткое название бита",
      "purpose": "Драматургическая цель",
      "action": "Физическое или речевое действие героя",
      "characters": ["Персонажи в кадре"],
      "information": "Какую крупицу информации передать",
      "emotionalChange": "Сдвиг состояния",
      "targetWordCount": 250
    }
  ]
}`;

    const reply = await callLLM({ prompt, temperature: 0.6 });
    if (reply) {
      const parsed = safeParseJson<{ beats: any[] }>(reply, null as any);
      if (parsed && parsed.beats && Array.isArray(parsed.beats)) {
        return parsed.beats.map((b, idx) => ({
          id: `beat-${input.scene.id}-${idx + 1}`,
          sceneId: input.scene.id,
          beatIndex: b.beatIndex || idx + 1,
          title: b.title || `Бит ${idx + 1}`,
          purpose: b.purpose || b.action,
          action: b.action || b.purpose,
          characters: b.characters || input.scene.characters,
          information: b.information || '',
          emotionalChange: b.emotionalChange || '',
          status: 'pending',
          targetWordCount: b.targetWordCount || 250,
        }));
      }
    }
    return this.fallbackMock.generate('BEAT_PLANNER', input);
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

    const prompt = `Ты — Story Engine Master Writer.
Напиши выразительный художественный текст для конкретного сценарного бита на русском языке.

${ContextBuilder.formatForPrompt(ctx)}

ТЕКУЩИЙ БИТ:
- Номер: #${input.beat.beatIndex} «${input.beat.title}»
- Действие: ${input.beat.action}
- Эмоциональный заряд: ${input.beat.emotionalChange}
- Целевой объём: ~${input.beat.targetWordCount || 250} слов
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
