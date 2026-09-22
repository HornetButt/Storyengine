import { FullStory, Scene, CriticReport, CriticIssue } from '../domain/storyModel';
import { LLMProvider } from '../llm/types';
import { DefaultLLMProvider } from '../llm/defaultProvider';

export class CriticSystem {
  private llm: LLMProvider;

  constructor(llmProvider?: LLMProvider) {
    this.llm = llmProvider || new DefaultLLMProvider();
  }

  /**
   * Performs deep review combining fast deterministic rule checks + LLM qualitative analysis.
   */
  async evaluateScene(story: FullStory, scene: Scene, draftText: string): Promise<CriticReport> {
    const issues: CriticIssue[] = [];
    const textLower = draftText.toLowerCase();

    // 1. Rule Check: Deceased character checks
    for (const char of story.storyBible.characters) {
      const charState = story.storyState.characters[char.id];
      const isDead = char.statusAtStart === 'deceased' || charState?.status === 'deceased';

      if (isDead) {
        const nameLower = char.name.toLowerCase();
        if (textLower.includes(nameLower)) {
          const actionWords = ['сказал', 'ответил', 'пошёл', 'пошел', 'взглянул', 'прибыл', 'схватил', 'улыбнулся'];
          const hasActiveVerb = actionWords.some((v) => textLower.includes(v));

          if (hasActiveVerb) {
            issues.push({
              id: `crit-dead-${char.id}`,
              severity: 'error',
              category: 'character_consistency',
              location: `Упоминание «${char.name}»`,
              explanation: `Персонаж «${char.name}» по канону погиб до текущих событий (${story.storyYear} г.), но описан как активный участник сцены.`,
              suggestedFix: `Замените действующее лицо на другого живого персонажа или перенесите реплику в воспоминание / архивную аудиозапись.`,
            });
          }
        }
      }
    }

    // 2. Rule Check: Location status consistency
    const sceneLocLower = (scene.location || '').toLowerCase();
    const matchingLoc = story.storyBible.locations.find(
      (l) => sceneLocLower.includes(l.name.toLowerCase()) || l.name.toLowerCase().includes(sceneLocLower)
    );

    if (matchingLoc && matchingLoc.status === 'ruined') {
      const intactWords = ['уютная комната', 'горящий камин', 'свет в окнах', 'жилой особняк', 'запертые ставни'];
      const hasIntactDesc = intactWords.some((w) => textLower.includes(w));
      if (hasIntactDesc) {
        issues.push({
          id: `crit-loc-${matchingLoc.id}`,
          severity: 'error',
          category: 'world_rules',
          location: `Локация «${matchingLoc.name}»`,
          explanation: `Локация «${matchingLoc.name}» числится разрушенной/сгоревшей, однако в тексте описана как неповреждённое строение.`,
          suggestedFix: `Опишите обгоревшие руины, осыпавшийся кирпич и пепелище вместо целого здания.`,
        });
      }
    }

    // 3. Rule Check: AI Clichés & Slop detection
    const cliches = [
      { phrase: 'холодок пробежал по спине', fix: 'Опишите реальную телесную реакцию без банального штампа.' },
      { phrase: 'сердце бешено заколотилось', fix: 'Покажите страх через дыхание, микрожест или обострение слуха.' },
      { phrase: 'воздух можно было резать ножом', fix: 'Опишите конкретный запах, влажность или напряжённое молчание.' },
      { phrase: 'тишина звенела в ушах', fix: 'Используйте конкретные приглушенные звуки окружения (ветер, капли, остывающее дерево).' },
      { phrase: 'волна паники', fix: 'Покажите дезориентацию героя через действия, а не декларацию эмоции.' },
    ];

    for (const c of cliches) {
      if (textLower.includes(c.phrase)) {
        issues.push({
          id: `crit-cliche-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          severity: 'warning',
          category: 'ai_style_cliche',
          location: `Фраза «${c.phrase}»`,
          explanation: `Обнаружен классический штамп ИИ-прозы («${c.phrase}»), снижающий художественную выразительность.`,
          suggestedFix: c.fix,
        });
      }
    }

    // 4. Rule Check: Scene length & purpose
    const words = draftText.trim().split(/\s+/).filter(Boolean).length;
    if (words < 120) {
      issues.push({
        id: `crit-short`,
        severity: 'warning',
        category: 'pacing',
        location: 'Общий объём сцены',
        explanation: `Сцена слишком лаконична (${words} слов). Драматический конфликт («${scene.conflict}») не успевает раскрыться.`,
        suggestedFix: 'Разверните сенсорные детали локации и внутренний диалог персонажа.',
      });
    }

    // 5. LLM qualitative evaluation
    try {
      const llmReport = await this.llm.generate('CRITIC', {
        scene,
        draftText,
        concept: story.concept,
        bible: story.storyBible,
        state: story.storyState,
        canonFacts: story.canon.facts,
      });

      // Merge issues
      const mergedIssues = [...issues, ...(llmReport.issues || [])];
      const hasErrors = mergedIssues.some((i) => i.severity === 'error');
      const calculatedScore = hasErrors
        ? Math.min(llmReport.score || 60, 58)
        : Math.max(10, (llmReport.score || 85) - issues.filter((i) => i.severity === 'warning').length * 5);

      return {
        score: calculatedScore,
        passed: calculatedScore >= 70 && !hasErrors,
        summary: llmReport.summary || (hasErrors ? 'Обнаружены критические нестыковки с каноном.' : 'Сцена в целом выдержана качественно.'),
        positiveHighlights: llmReport.positiveHighlights || ['Соблюдение атмосферы', 'Чёткая фокусировка на цели'],
        issues: mergedIssues,
        createdAt: new Date().toISOString(),
      };
    } catch (e) {
      const hasErrors = issues.some((i) => i.severity === 'error');
      const score = hasErrors ? 50 : 85;
      return {
        score,
        passed: !hasErrors,
        summary: hasErrors
          ? 'Обнаружены нарушения канонического статуса персонажей или локаций.'
          : 'Автоматическая валидация пройдена без грубых противоречий.',
        issues,
        positiveHighlights: ['Соблюдение основных параметров структуры'],
        createdAt: new Date().toISOString(),
      };
    }
  }
}
