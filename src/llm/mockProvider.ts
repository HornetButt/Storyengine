import { LLMProvider, LLMTaskType, LLMTaskMap } from './types';
import { Plot, Beat, CriticReport, CanonProposal, StoryConcept } from '../domain/storyModel';

/**
 * Mock LLM Provider for automated unit testing and offline execution.
 * Guarantees zero external network dependencies and deterministic output.
 */
export class MockLLMProvider implements LLMProvider {
  name = 'MockLLMProvider';

  async generate<T extends LLMTaskType>(
    task: T,
    input: LLMTaskMap[T]['input']
  ): Promise<LLMTaskMap[T]['output']> {
    switch (task) {
      case 'CONCEPT_GENERATOR': {
        const inp = input as import('./types').ConceptGeneratorInput;
        const concept: StoryConcept = {
          premise: inp.idea || 'Таинственное расследование в закрытом секторе.',
          genre: inp.genre || 'Детектив / Драма',
          tone: inp.tone || 'Напряжённый, реалистичный',
          themes: ['Правда и иллюзия', 'Выбор', 'Ответственность'],
          centralConflict: 'Герой раскрывает правду, которая разрушает его привычную картину мира.',
          stakes: 'Безопасность близких и сохранение рассудка.',
          targetAudience: 'Читатели психологической прозы и детективов.',
          endingDirection: 'Горькое признание истины с возможностью нового выбора.',
          estimatedScenesCount: 6,
        };
        return concept as LLMTaskMap[T]['output'];
      }

      case 'BIBLE_GENERATOR': {
        const inp = input as import('./types').BibleGeneratorInput;
        return {
          universeName: inp.universeName,
          storyYear: inp.storyYear,
          characters: [
            {
              id: 'char-mock-1',
              name: 'Алексей Корнеев',
              role: 'protagonist',
              statusAtStart: 'alive',
              description: 'Сдержанный исследователь, внимательный к деталям.',
              motivation: 'Докопаться до истины и защитить архив.',
              knowledgeAtStart: ['Знает о закрытом секторе'],
              relationships: [],
            },
          ],
          locations: [
            {
              id: 'loc-mock-1',
              name: 'Архивный флигель',
              type: 'Здание',
              status: 'intact',
              description: 'Старое кирпичное строение с железными ставнями.',
            },
          ],
          rules: ['Правила вселенной остаются неизменными во времени'],
          lore: ['Основано на канонических хрониках'],
          mysteries: [
            {
              id: 'myst-mock-1',
              question: 'Кто оставил запись на третьей полке архива?',
              truth: 'Предыдущий исследователь перед своим исчезновением.',
              cluesPlanned: ['Почерк в тетради', 'Номер допуска'],
              status: 'unresolved',
            },
          ],
          importantFacts: [`События происходят в ${inp.storyYear} году.`],
          forbiddenElements: ['Воскрешение погибших героев'],
        } as LLMTaskMap[T]['output'];
      }

      case 'PLOT_PLANNER': {
        const inp = input as import('./types').PlotPlannerInput;
        const plot: Plot = {
          acts: [
            {
              id: 'act-mock-1',
              actIndex: 1,
              title: 'Акт 1: Завязка и открытие аномалии',
              goal: 'Погружение героя в тайну архива.',
              sequences: [
                {
                  id: 'seq-mock-1',
                  actId: 'act-mock-1',
                  title: 'Последовательность 1: Первый шаг',
                  objective: 'Прибытие и обнаружение первой нестыковки.',
                  scenes: [
                    {
                      id: 'sc-mock-1',
                      actId: 'act-mock-1',
                      sequenceId: 'seq-mock-1',
                      sceneIndex: 1,
                      title: 'Порог архива',
                      purpose: 'Показать прибытие исследователя и обнаружение вскрытого замка.',
                      location: inp.bible.locations[0]?.name || 'Архив',
                      time: `${inp.bible.storyYear} год, утро`,
                      characters: [inp.bible.characters[0]?.name || 'Алексей Корнеев'],
                      conflict: 'Замок поврежден изнутри, а не снаружи.',
                      informationRevealed: ['Кто-то находился внутри после закрытия.'],
                      emotionalChange: 'От рутины к напряженной бдительности.',
                      requiredEvents: ['Герой осматривает дверь.'],
                      forbiddenEvents: ['Прямое нападение'],
                      beats: [],
                      draft: '',
                      drafts: [],
                      status: 'planned',
                      version: 1,
                    },
                  ],
                },
              ],
            },
          ],
        };
        return plot as LLMTaskMap[T]['output'];
      }

      case 'SCENE_PLANNER': {
        const inp = input as import('./types').ScenePlannerInput;
        return {
          title: inp.sceneTitle || `Сцена ${inp.sceneIndex}: Поворотный момент`,
          purpose: 'Продвинуть расследование и усилить конфликт.',
          location: inp.bible.locations[0]?.name || 'Главный зал',
          conflict: 'Вскрывается деталь, противоречащая предыдущим отчетам.',
          informationRevealed: ['Обнаружена спрятанная схема'],
          emotionalChange: 'Удивление сменяется сосредоточенной тревогой.',
          requiredEvents: ['Обнаружение улики'],
          forbiddenEvents: [],
        } as LLMTaskMap[T]['output'];
      }

      case 'BEAT_PLANNER': {
        const inp = input as import('./types').BeatPlannerInput;
        const beats: Beat[] = [
          {
            id: `beat-mock-${inp.scene.id}-1`,
            sceneId: inp.scene.id,
            beatIndex: 1,
            title: 'Осмотр помещения',
            purpose: 'Показать вход героя и восприятие пространства.',
            action: 'Герой входит в комнату и проверяет освещение.',
            characters: inp.scene.characters,
            information: 'Пыль на столе потревожена.',
            emotionalChange: 'От настороженности к внимательности.',
            status: 'pending',
            targetWordCount: 200,
          },
          {
            id: `beat-mock-${inp.scene.id}-2`,
            sceneId: inp.scene.id,
            beatIndex: 2,
            title: 'Ключевая находка',
            purpose: 'Раскрыть новую деталь.',
            action: 'Герой открывает ящик стола и достает документ.',
            characters: inp.scene.characters,
            information: 'Документ датирован недавним числом.',
            emotionalChange: 'Холодное осознание слежки.',
            status: 'pending',
            targetWordCount: 250,
          },
        ];
        return beats as LLMTaskMap[T]['output'];
      }

      case 'WRITER': {
        const inp = input as import('./types').WriterInput;
        const char = inp.beat.characters[0] || 'Герой';
        const text = `${char} неторопливо подошёл к деревянной конторке. Сквозь пыльное стекло падала полоса косого утреннего света. ${inp.beat.action}. Каждая деталь вокруг словно замерла в ожидании: тихий шорох за стеной, запах остывшего дерева и металлическая прохлада дверной ручки заставили его затаить дыхание.`;
        return {
          text,
          wordCount: text.split(/\s+/).length,
        } as LLMTaskMap[T]['output'];
      }

      case 'CRITIC': {
        const inp = input as import('./types').CriticInput;
        const report: CriticReport = {
          score: 92,
          passed: true,
          summary: 'Текст сцены логичен, канонические правила соблюдены, атмосфера выдержана.',
          issues: [
            {
              id: 'issue-mock-1',
              severity: 'info',
              category: 'pacing',
              location: inp.scene.title,
              explanation: 'Темп повествования умеренный, хорошо передаёт сенсорные детали.',
              suggestedFix: 'Можно добавить чуть больше диалоговой реакции во второй половине.',
            },
          ],
          positiveHighlights: ['Точное соблюдение эмоциональной траектории', 'Живые сенсорные якоря'],
          createdAt: new Date().toISOString(),
        };
        return report as LLMTaskMap[T]['output'];
      }

      case 'CANON_EXTRACTOR': {
        const inp = input as import('./types').CanonExtractorInput;
        const proposals: CanonProposal[] = [
          {
            id: `prop-mock-${Date.now()}`,
            type: 'CHARACTER_KNOWLEDGE',
            character: inp.scene.characters[0] || 'Главный герой',
            change: 'Узнал о существовании архивного реестра с записями о вскрытии замка.',
            reason: `Сведения получены в ходе сцены «${inp.scene.title}».`,
            source: `${inp.scene.title} / Beat 2`,
            sourceSceneId: inp.scene.id,
            confidence: 0.95,
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
        ];
        return proposals as LLMTaskMap[T]['output'];
      }

      case 'STATE_UPDATER': {
        const inp = input as import('./types').StateUpdaterInput;
        const charName = inp.scene.characters[0];
        const updatedChars = { ...inp.currentState.characters };
        if (charName) {
          const existing = updatedChars[charName] || {
            characterId: charName,
            name: charName,
            status: 'alive',
            emotionalState: 'Спокойствие',
            knowledge: [],
            inventory: [],
          };
          updatedChars[charName] = {
            ...existing,
            locationName: inp.scene.location,
            emotionalState: inp.scene.emotionalChange || 'Сосредоточенность',
            knowledge: [
              ...existing.knowledge,
              ...(inp.scene.informationRevealed || []),
            ],
          };
        }

        return {
          completedSceneIds: [...inp.currentState.completedSceneIds, inp.scene.id],
          characters: updatedChars,
          events: {
            ...inp.currentState.events,
            [`scene_completed_${inp.scene.id}`]: true,
          },
          lastSceneSummary: `${inp.scene.title}: ${inp.scene.purpose}. Раскрыто: ${inp.scene.informationRevealed.join(', ') || 'нет'}`,
        } as LLMTaskMap[T]['output'];
      }

      case 'REVISER': {
        const inp = input as import('./types').ReviserInput;
        const revisedText = `${inp.currentDraft}\n\n[Редакторская правка: учтены замечания критика и усилена детализация сцены «${inp.scene.title}»]`;
        return {
          revisedText,
          changeSummary: 'Исправлены стилистические замечания и уточнены мотивы персонажей.',
        } as LLMTaskMap[T]['output'];
      }

      default:
        throw new Error(`Unsupported mock task: ${task}`);
    }
  }
}
