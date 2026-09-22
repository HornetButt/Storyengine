/**
 * Comprehensive Test Suite for Story Engine BEAT_PLANNER:
 * 1. Standard Beat Generation & Sequence (count, ids, pending status, word count, stateChanges)
 * 2. Normalization of invalid beatIndex sequences (e.g., 1, 1, 4, 9 -> 1, 2, 3, 4)
 * 3. Safe fallback when stateChanges is missing or null -> []
 * 4. Character Whitelisting: Unknown characters are stripped from beat.characters
 * 5. StateChanges Character Safety: Unknown character in stateChanges is stripped without creating phantom characters
 * 6. Fallback when model provides no characters -> scene.characters fallback
 * 7. TargetWordCount validation (negative, zero, NaN -> valid positive fallback)
 * 8. Resilience against malformed/corrupted LLM input
 * 9. Deduplication of identical consecutive beats
 * 10. validateBeatSequence utility verification
 * 11. Canon Isolation: verify stateChanges are NOT automatically promoted to Canon
 * 12. MockLLMProvider & Orchestrator end-to-end integration test
 */

import { validateAndNormalizeBeats, validateBeatSequence } from '../llm/beatPlannerUtils';
import { Scene, StoryBibleData, Beat } from '../domain/storyModel';
import { MockLLMProvider } from '../llm/mockProvider';
import { StoryOrchestrator } from '../pipeline/orchestrator';
import { createDefaultStory } from '../domain/adapters';
import { Universe } from '../types';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    throw new Error(`Test failed: ${testName} - ${detail || ''}`);
  }
  passedTests++;
  console.log(`✅ PASS: ${testName}`);
}

async function runBeatPlannerTests() {
  console.log('\n=== RUNNING BEAT PLANNER SPECIFICATION & VALIDATION TESTS ===\n');

  const testScene: Scene = {
    id: 'scene-lighthouse-1',
    sequenceId: 'seq-1',
    sceneIndex: 1,
    title: 'Осмотр старого маяка',
    purpose: 'Выяснить, кто зажигал свет в заброшенном маяке',
    conflict: 'Дверь заклинило изнутри, а внутри слышны странные щелчки',
    emotionalChange: 'От исследовательской уверенности к скрытой тревоге',
    location: 'Старый маяк',
    time: 'Сумерки',
    characters: ['Анна Морозова', 'Виктор Сомов'],
    requiredEvents: ['Обнаружить след сажи'],
    forbiddenEvents: ['Прямое нападение'],
    informationRevealed: ['Маяк функционирует не на керосине'],
    beats: [],
    status: 'planned',
    draft: '',
    version: 1,
    drafts: [],
  };

  const testBible: StoryBibleData = {
    universeId: 'uni-lighthouse',
    universeName: 'Северные Тайны',
    storyYear: 2026,
    characters: [
      {
        id: 'char-anna',
        name: 'Анна Морозова',
        role: 'protagonist',
        statusAtStart: 'alive',
        description: 'Журналист-расследователь',
        motivation: 'Раскрыть правду',
        knowledgeAtStart: ['Знает о закрытии маяка'],
        relationships: [],
      },
      {
        id: 'char-viktor',
        name: 'Виктор Сомов',
        role: 'supporting',
        statusAtStart: 'alive',
        description: 'Смотритель архива',
        motivation: 'Помочь Анне',
        knowledgeAtStart: [],
        relationships: [],
      },
      {
        id: 'char-elena',
        name: 'Елена Громова',
        role: 'antagonist',
        statusAtStart: 'alive',
        description: 'Директор станции',
        motivation: 'Скрыть происшествие',
        knowledgeAtStart: [],
        relationships: [],
      },
    ],
    locations: [
      {
        id: 'loc-lighthouse',
        name: 'Старый маяк',
        type: 'building',
        description: 'Заброшенный маяк на скале',
        status: 'abandoned',
        atmosphere: 'Холод, ветер и запах морской соли',
      },
    ],
    objects: [],
    rules: [],
    lore: [],
    mysteries: [],
    importantFacts: [],
    timeline: [],
    forbiddenElements: [],
  };

  // -------------------------------------------------------------
  // Test 1: Standard Beat Generation & Normalization
  // -------------------------------------------------------------
  console.log('\n[1. Standard Beat Normalization]');
  const rawStandardBeats = [
    {
      beatIndex: 1,
      title: 'Подход к маяку',
      purpose: 'Показать прибытие героев и первое препятствие у входа',
      action: 'Анна Морозова толкает железную дверь, но та заперта на щеколду изнутри.',
      characters: ['Анна Морозова', 'Виктор Сомов'],
      information: 'Дверь заперта изнутри, хотя маяк считается пустым.',
      emotionalChange: 'От спокойствия к настороженности.',
      stateChanges: [
        {
          character: 'Анна Морозова',
          newEmotion: 'настороженность',
          flag: 'lighthouse_reached',
        },
      ],
      targetWordCount: 180,
    },
    {
      beatIndex: 2,
      title: 'Поиск обходного пути',
      purpose: 'Преодолеть заклинившую дверь',
      action: 'Виктор Сомов находит разбитое слуховое окно в подвальном цоколе.',
      characters: ['Виктор Сомов'],
      information: 'Через подвал протянут свежий толстый силовой кабель.',
      emotionalChange: 'Удивление и растущее подозрение.',
      stateChanges: [
        {
          character: 'Виктор Сомов',
          newKnowledge: 'В маяк недавно провели нелегальное силовое питание',
          flag: 'cable_discovered',
        },
      ],
      targetWordCount: 220,
    },
    {
      beatIndex: 3,
      title: 'Проникновение и ключевая улика',
      purpose: 'Кульминация сцены осмотра',
      action: 'Анна пролезает в окно и обнаруживает следы странной сажи возле генератора.',
      characters: ['Анна Морозова'],
      information: 'Маяк функционирует не на керосине, а на необычном топливе.',
      emotionalChange: 'Шок и подтверждение гипотезы об аномалии.',
      stateChanges: [
        {
          character: 'Анна Морозова',
          newKnowledge: 'Генератор работает на неизвестном синтетическом составе',
          newEmotion: 'потрясение',
          flag: 'anomalous_fuel_found',
        },
      ],
      targetWordCount: 280,
    },
  ];

  const normalized1 = validateAndNormalizeBeats(rawStandardBeats, testScene, testBible);
  assert(normalized1.length === 3, 'Normalized 3 beats');
  assert(normalized1[0].id === 'beat-scene-lighthouse-1-1', 'Beat 1 ID formatted deterministically');
  assert(normalized1[1].id === 'beat-scene-lighthouse-1-2', 'Beat 2 ID formatted deterministically');
  assert(normalized1[2].id === 'beat-scene-lighthouse-1-3', 'Beat 3 ID formatted deterministically');
  assert(normalized1[0].beatIndex === 1 && normalized1[1].beatIndex === 2 && normalized1[2].beatIndex === 3, 'beatIndex sequence 1..3');
  assert(normalized1[0].status === 'pending', 'Status initialized to pending');
  assert(normalized1[0].targetWordCount === 180, 'Target word count preserved');
  assert(normalized1[0].stateChanges?.length === 1, 'stateChanges preserved');
  assert(normalized1[0].stateChanges?.[0]?.flag === 'lighthouse_reached', 'flag formatted cleanly');

  const seqCheck1 = validateBeatSequence(normalized1);
  assert(seqCheck1.valid, 'Sequence validation passed for standard generation');

  // -------------------------------------------------------------
  // Test 2: Crooked/Invalid beatIndex from Model (e.g., 1, 1, 4, 9)
  // -------------------------------------------------------------
  console.log('\n[2. Normalization of Crooked beatIndex]');
  const rawCrookedBeats = [
    { beatIndex: 1, title: 'Бит A', action: 'Действие A', characters: ['Анна Морозова'] },
    { beatIndex: 1, title: 'Бит B', action: 'Действие B', characters: ['Анна Морозова'] },
    { beatIndex: 4, title: 'Бит C', action: 'Действие C', characters: ['Анна Морозова'] },
    { beatIndex: 9, title: 'Бит D', action: 'Действие D', characters: ['Анна Морозова'] },
  ];

  const normalized2 = validateAndNormalizeBeats(rawCrookedBeats, testScene, testBible);
  assert(normalized2.length === 4, 'All 4 distinct beats processed');
  assert(
    normalized2[0].beatIndex === 1 &&
    normalized2[1].beatIndex === 2 &&
    normalized2[2].beatIndex === 3 &&
    normalized2[3].beatIndex === 4,
    'Crooked beatIndex [1, 1, 4, 9] normalized to [1, 2, 3, 4]'
  );
  assert(normalized2[3].id === 'beat-scene-lighthouse-1-4', 'Last beat ID matches normalized index 4');

  // -------------------------------------------------------------
  // Test 3: Missing or Null stateChanges
  // -------------------------------------------------------------
  console.log('\n[3. Handling Missing/Null stateChanges]');
  const rawMissingStateBeats = [
    { title: 'Бит без stateChanges', action: 'Действие без состояния', characters: ['Анна Морозова'] },
    { title: 'Бит с null stateChanges', action: 'Действие с null', characters: ['Анна Морозова'], stateChanges: null },
    { title: 'Бит с мусорным stateChanges', action: 'Действие со строкой', characters: ['Анна Морозова'], stateChanges: 'not-an-array' },
  ];

  const normalized3 = validateAndNormalizeBeats(rawMissingStateBeats, testScene, testBible);
  assert(Array.isArray(normalized3[0].stateChanges) && normalized3[0].stateChanges.length === 0, 'Missing stateChanges becomes empty array []');
  assert(Array.isArray(normalized3[1].stateChanges) && normalized3[1].stateChanges.length === 0, 'Null stateChanges becomes empty array []');
  assert(Array.isArray(normalized3[2].stateChanges) && normalized3[2].stateChanges.length === 0, 'Invalid string stateChanges becomes empty array []');

  // -------------------------------------------------------------
  // Test 4: Unknown Character in beat.characters Filtered Out
  // -------------------------------------------------------------
  console.log('\n[4. Character Whitelisting]');
  const rawUnknownCharBeats = [
    {
      title: 'Посторонний',
      action: 'Неизвестный призрак и Анна',
      characters: ['Анна Морозова', 'Пришелец Икс', 'Виктор Сомов', 'Фантом'],
    },
  ];

  const normalized4 = validateAndNormalizeBeats(rawUnknownCharBeats, testScene, testBible);
  assert(
    normalized4[0].characters.length === 2 &&
    normalized4[0].characters.includes('Анна Морозова') &&
    normalized4[0].characters.includes('Виктор Сомов') &&
    !normalized4[0].characters.includes('Пришелец Икс') &&
    !normalized4[0].characters.includes('Фантом'),
    'Unknown characters ("Пришелец Икс", "Фантом") were strictly stripped out'
  );

  // -------------------------------------------------------------
  // Test 5: Unknown Character in stateChanges Handled Safely
  // -------------------------------------------------------------
  console.log('\n[5. Unknown Character in stateChanges]');
  const rawUnknownStateCharBeats = [
    {
      title: 'Сдвиг у фантома',
      action: 'Анна находит записку',
      characters: ['Анна Морозова'],
      stateChanges: [
        {
          character: 'Лорд Воландеморт', // Unknown character
          newKnowledge: 'Тайный план',
        },
        {
          character: 'Анна Морозова', // Valid character
          newKnowledge: 'Записка подлинная',
        },
      ],
    },
  ];

  const normalized5 = validateAndNormalizeBeats(rawUnknownStateCharBeats, testScene, testBible);
  assert(normalized5[0].stateChanges?.length === 2, 'Two state changes kept');
  assert(normalized5[0].stateChanges?.[0].character === undefined, 'Unknown character is stripped from state change (character: undefined)');
  assert(normalized5[0].stateChanges?.[1].character === 'Анна Морозова', 'Known character is preserved');
  assert(testBible.characters.length === 3, 'Story Bible characters count unchanged (no phantom characters created)');

  // -------------------------------------------------------------
  // Test 6: Fallback when Model Returns No Characters
  // -------------------------------------------------------------
  console.log('\n[6. Fallback for Empty Characters Array]');
  const rawNoCharBeats = [
    {
      title: 'Бит без персонажей',
      action: 'Какое-то действие',
      characters: [],
    },
    {
      title: 'Бит только с неизвестными персонажами',
      action: 'Еще действие',
      characters: ['Некто Неизвестный'],
    },
  ];

  const normalized6 = validateAndNormalizeBeats(rawNoCharBeats, testScene, testBible);
  assert(
    normalized6[0].characters.length === testScene.characters.length &&
    normalized6[0].characters[0] === testScene.characters[0],
    'Empty characters fell back to scene.characters'
  );
  assert(
    normalized6[1].characters.length === testScene.characters.length,
    'Filtered-out unknown characters fell back to scene.characters'
  );

  // -------------------------------------------------------------
  // Test 7: TargetWordCount Fallbacks
  // -------------------------------------------------------------
  console.log('\n[7. TargetWordCount Validation]');
  const rawInvalidWordCounts = [
    { title: 'Отрицательный объем', action: 'Действие с отрицательным объемом', targetWordCount: -500 },
    { title: 'Ноль слов', action: 'Действие с нулевым объемом', targetWordCount: 0 },
    { title: 'NaN слов', action: 'Действие с NaN объемом', targetWordCount: NaN },
    { title: 'Гигантский объем', action: 'Действие с гигантским объемом', targetWordCount: 99999 },
  ];

  const normalized7 = validateAndNormalizeBeats(rawInvalidWordCounts, testScene, testBible);
  assert(normalized7[0].targetWordCount === 200, 'Negative count fell back to default 200');
  assert(normalized7[1].targetWordCount === 200, 'Zero count fell back to default 200');
  assert(normalized7[2].targetWordCount === 200, 'NaN fell back to default 200');
  assert(normalized7[3].targetWordCount === 1000, 'Excessive word count capped at safe maximum 1000');

  // -------------------------------------------------------------
  // Test 8: Resilience against completely corrupted / empty input
  // -------------------------------------------------------------
  console.log('\n[8. Corrupted Input Resilience]');
  const normalizedFromNull = validateAndNormalizeBeats(null, testScene, testBible);
  assert(normalizedFromNull.length === 1, 'Null input produces 1 safe default beat');
  assert(normalizedFromNull[0].id === 'beat-scene-lighthouse-1-1', 'Safe fallback beat has correct ID');
  assert(normalizedFromNull[0].status === 'pending', 'Safe fallback beat is pending');

  const normalizedFromObjectWrapper = validateAndNormalizeBeats(
    { beats: [{ title: 'Обернутый бит', action: 'В объекте' }] },
    testScene,
    testBible
  );
  assert(normalizedFromObjectWrapper.length === 1, 'Extracted beats from { beats: [...] } object');

  // -------------------------------------------------------------
  // Test 9: Deduplication of Identical Consecutive Beats
  // -------------------------------------------------------------
  console.log('\n[9. Deduplication of Consecutive Duplicate Beats]');
  const rawDuplicates = [
    { beatIndex: 1, purpose: 'Цель 1', action: 'То же самое действие' },
    { beatIndex: 2, purpose: 'Цель 1', action: 'То же самое действие' }, // Duplicate
    { beatIndex: 3, purpose: 'Цель 2', action: 'Новое действие' },
  ];

  const normalized9 = validateAndNormalizeBeats(rawDuplicates, testScene, testBible);
  assert(normalized9.length === 2, 'Duplicate consecutive beat was removed');
  assert(normalized9[0].beatIndex === 1 && normalized9[1].beatIndex === 2, 'Re-indexed to 1, 2');

  // -------------------------------------------------------------
  // Test 10: validateBeatSequence Utility
  // -------------------------------------------------------------
  console.log('\n[10. validateBeatSequence checks]');
  const brokenSequence: Beat[] = [
    {
      id: 'beat-1',
      sceneId: 'scene-1',
      beatIndex: 1,
      title: 'T1',
      purpose: 'P1',
      action: 'A1',
      characters: ['Анна'],
      information: '',
      emotionalChange: '',
      status: 'pending',
    },
    {
      id: 'beat-1', // Duplicate ID & mismatched beatIndex
      sceneId: 'scene-1',
      beatIndex: 5,
      title: 'T2',
      purpose: 'P2',
      action: 'A2',
      characters: ['Анна'],
      information: '',
      emotionalChange: '',
      status: 'pending',
    },
  ];

  const brokenCheck = validateBeatSequence(brokenSequence);
  assert(!brokenCheck.valid, 'validateBeatSequence detected invalid sequence');
  assert(brokenCheck.issues.length >= 2, 'Reported multiple issues (duplicate ID and bad index)');

  // -------------------------------------------------------------
  // Test 11: Canon Isolation
  // -------------------------------------------------------------
  console.log('\n[11. Canon Isolation]');
  const mockUniverse: Universe = {
    id: 'uni-lighthouse',
    name: 'Вселенная Маяка',
    description: 'Тест изоляции канона',
    genre: 'Детектив',
    rules: ['Каноническое правило №1'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const story = createDefaultStory('Сценарий Маяка', mockUniverse, 2026);
  story.plot.acts[0].sequences[0].scenes[0] = testScene;
  const initialCanonFactsCount = story.canon.facts.length;

  const orchestrator = new StoryOrchestrator(new MockLLMProvider());
  const planResult = await orchestrator.planBeats(story, testScene.id);

  assert(planResult.beats.length > 0, 'Orchestrator planned beats successfully');
  assert(
    story.canon.facts.length === initialCanonFactsCount,
    'Canon facts count remained completely unchanged after planBeats (Canon is protected)'
  );

  // -------------------------------------------------------------
  // Test 12: End-to-End Orchestrator Mock Pipeline Integration
  // -------------------------------------------------------------
  console.log('\n[12. End-to-End Mock Pipeline Integration]');
  assert(planResult.beats.every((b) => b.sceneId === testScene.id), 'All beats belong strictly to the planned scene');
  assert(planResult.beats.every((b) => b.status === 'pending'), 'All planned beats have status pending');
  assert(
    planResult.beats.every((b) => Array.isArray(b.stateChanges)),
    'All planned beats have normalized stateChanges array'
  );

  // Test writer compatibility with stateChanges
  const writeResult = await orchestrator.writeBeat(story, testScene.id, planResult.beats[0].id);
  assert(writeResult.beat.status === 'generated', 'Beat status transitioned to generated after writing');
  assert(!!writeResult.text, 'Prose generated for beat with stateChanges without errors');

  console.log(`\n=================================================`);
  console.log(`ALL BEAT PLANNER TESTS PASSED: ${passedTests}/${totalTests} tests successful.`);
  console.log(`=================================================\n`);
}

runBeatPlannerTests().catch((err) => {
  console.error('\n❌ BEAT PLANNER TEST SUITE FAILED:', err);
  process.exit(1);
});
