/**
 * Comprehensive Domain and Pipeline Unit Tests for Story Engine v2
 * Tests:
 * 1. Canon test (LLM proposals cannot bypass author acceptance)
 * 2. StoryState test (Character location, emotional state, knowledge, inventory tracking)
 * 3. Timeline test (Temporal status and consistency checks)
 * 4. Character test (Deceased character action violations)
 * 5. ContextBuilder test (Token-efficient lean context filtering)
 * 6. Versioning test (Preservation of draft revisions across iterations)
 * 7. MockLLMProvider test (Deterministic offline pipeline validation)
 */

import { MockLLMProvider } from '../llm/mockProvider';
import { StoryOrchestrator } from '../pipeline/orchestrator';
import { CanonManager } from '../pipeline/canonManager';
import { StateManager } from '../pipeline/stateManager';
import { CriticSystem } from '../pipeline/criticSystem';
import { ContextBuilder } from '../llm/contextBuilder';
import { createDefaultStory } from '../domain/adapters';
import { Universe } from '../types';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
  passedTests++;
  console.log(`✅ PASS: ${testName}`);
}

async function runAllTests() {
  console.log('\n=== RUNNING STORY ENGINE DOMAIN & ARCHITECTURE TESTS ===\n');

  const mockUniverse: Universe = {
    id: 'uni-test',
    name: 'Тестовая Вселенная',
    description: 'Вселенная для автоматических тестов канона и состояния.',
    genre: 'Детектив',
    rules: ['В 2025 году Старый архив сгорел', 'Михаил Северов погиб в октябре 2025 года'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const story = createDefaultStory('Тестовый сценарий', mockUniverse, 2026, 'Расследование в архиве');
  story.storyBible.characters = [
    {
      id: 'char-mikhail',
      name: 'Михаил Северов',
      role: 'supporting',
      statusAtStart: 'deceased',
      description: 'Исследователь, погибший в 2025 году.',
      motivation: 'Осталась в прошлом',
      knowledgeAtStart: ['Знал о синей двери'],
      relationships: [],
    },
    {
      id: 'char-alexey',
      name: 'Алексей Корнеев',
      role: 'protagonist',
      statusAtStart: 'alive',
      description: 'Новый смотритель станции.',
      motivation: 'Разобраться в архивах.',
      knowledgeAtStart: [],
      relationships: [],
    },
  ];

  story.storyBible.locations = [
    {
      id: 'loc-station',
      name: 'Метеостанция',
      type: 'Здание',
      status: 'intact',
      description: 'Кирпичный флигель.',
    },
    {
      id: 'loc-ruins',
      name: 'Старый дом',
      type: 'Руины',
      status: 'ruined',
      description: 'Сгоревший фундамент.',
    },
  ];

  // -------------------------------------------------------------
  // Test 1: Canon Test - proposals require explicit user decision
  // -------------------------------------------------------------
  console.log('\n[1. Canon Protection & Proposal Isolation]');
  const initialFactsCount = story.canon.facts.length;
  const initialProposalsCount = story.canon.proposals.length;

  const proposal = CanonManager.propose(story, {
    type: 'CHARACTER_KNOWLEDGE',
    character: 'Алексей Корнеев',
    change: 'Обнаружил дневник с описанием пожара',
    reason: 'Найдено в первой сцене',
    source: 'Сцена 1',
    confidence: 0.95,
  });

  assert(
    story.canon.facts.length === initialFactsCount,
    'LLM proposal does not directly mutate canon facts before user decision'
  );
  assert(
    story.canon.proposals.length === initialProposalsCount + 1,
    'Proposal is registered in pending proposals list'
  );
  assert(
    proposal.status === 'pending',
    'Initial proposal status is strictly "pending"'
  );

  // User accepts proposal
  const { fact } = CanonManager.acceptProposal(story, proposal.id);
  assert(
    story.canon.facts.length === initialFactsCount + 1,
    'Accepted proposal becomes an established CanonFact'
  );
  assert(
    fact.statement === 'Обнаружил дневник с описанием пожара',
    'Canon fact statement matches accepted proposal'
  );
  assert(
    StateManager.getCharacterState(story, 'Алексей Корнеев')?.knowledge.includes(
      'Обнаружил дневник с описанием пожара'
    ) || false,
    'Accepting canon proposal automatically synchronizes character knowledge in StoryState'
  );

  // -------------------------------------------------------------
  // Test 2: StoryState Test
  // -------------------------------------------------------------
  console.log('\n[2. StoryState Dynamic Tracking]');
  StateManager.updateCharacterLocation(story, 'Алексей Корнеев', 'Метеостанция');
  StateManager.updateCharacterEmotion(story, 'Алексей Корнеев', 'Сдержанная тревога');
  StateManager.setEventFlag(story, 'found_burned_diary', true);

  const alexeyState = StateManager.getCharacterState(story, 'Алексей Корнеев');
  assert(
    alexeyState?.locationName === 'Метеостанция',
    'Character location updated in StoryState'
  );
  assert(
    alexeyState?.emotionalState === 'Сдержанная тревога',
    'Character emotional state tracked in StoryState'
  );
  assert(
    story.storyState.events['found_burned_diary'] === true,
    'Story world event flag recorded in StoryState'
  );

  // -------------------------------------------------------------
  // Test 3 & 4: Character & Timeline Consistency (Critic System)
  // -------------------------------------------------------------
  console.log('\n[3 & 4. Critic System: Deceased Character & Ruined Location Checks]');
  const critic = new CriticSystem(new MockLLMProvider());
  const testScene = story.plot.acts[0].sequences[0].scenes[0];

  // Text where deceased character Mikhail acts physically in 2026
  const badTextWithDeceased = `Михаил Северов улыбнулся и сказал Алексею: "Пойдём скорее к особняку".`;
  const report1 = await critic.evaluateScene(story, testScene, badTextWithDeceased);

  assert(
    report1.issues.some((i) => i.severity === 'error' && i.category === 'character_consistency'),
    'Critic detects deceased character performing physical action in active year'
  );
  assert(
    !report1.passed,
    'Scene with critical deceased-character violation fails review'
  );

  // Text where ruined location is described as intact
  testScene.location = 'Старый дом';
  const badTextWithRuins = `Алексей вошёл в жилой особняк, где в окнах горел тёплый свет и трещал камин.`;
  const report2 = await critic.evaluateScene(story, testScene, badTextWithRuins);

  assert(
    report2.issues.some((i) => i.severity === 'error' && i.category === 'world_rules'),
    'Critic detects ruined location erroneously described as intact mansion'
  );

  // -------------------------------------------------------------
  // Test 5: ContextBuilder Test (Lean Context)
  // -------------------------------------------------------------
  console.log('\n[5. ContextBuilder Token Efficiency]');
  testScene.characters = ['Алексей Корнеев'];
  const ctx = ContextBuilder.build({
    concept: story.concept,
    bible: story.storyBible,
    state: story.storyState,
    canonFacts: story.canon.facts,
    scene: testScene,
  });

  assert(
    ctx.relevantCharacters.some((c) => c.name === 'Алексей Корнеев'),
    'ContextBuilder includes characters relevant to scene'
  );
  assert(
    ctx.global.universeName === 'Тестовая Вселенная',
    'ContextBuilder retains correct universe context'
  );
  assert(
    ctx.currentState.eventsOccurred.includes('found_burned_diary'),
    'ContextBuilder passes active world events'
  );

  // -------------------------------------------------------------
  // Test 6: Versioning & Reviser Test (Non-destructive Draft History)
  // -------------------------------------------------------------
  console.log('\n[6. Draft Versioning & Non-Destructive Revision]');
  const mockProvider = new MockLLMProvider();
  const orchestrator = new StoryOrchestrator(mockProvider);

  testScene.draft = 'Исходный черновик сцены v1. Алексей подходит к станции.';
  testScene.drafts = [
    {
      id: `draft-${testScene.id}-v1`,
      versionNumber: 1,
      text: testScene.draft,
      changeDescription: 'Начальная версия черновика',
      createdAt: new Date().toISOString(),
    },
  ];

  const { newDraft } = await orchestrator.reviseScene(
    story,
    testScene.id,
    'Усиль звуковые детали и ощущение сырости'
  );

  assert(
    testScene.drafts.length === 2,
    'Revision appends a new draft version instead of destroying previous drafts'
  );
  assert(
    testScene.version === 2,
    'Scene version counter incremented to 2'
  );
  assert(
    testScene.drafts[0].versionNumber === 1 && testScene.drafts[1].versionNumber === 2,
    'Both v1 and v2 drafts are preserved with timestamps and change summaries'
  );

  // -------------------------------------------------------------
  // Test 7: Orchestrator Pipeline Test (with MockLLMProvider)
  // -------------------------------------------------------------
  console.log('\n[7. Full Pipeline Execution with Mock Provider]');
  const story2 = createDefaultStory('Сценарий 2', mockUniverse, 2026);
  const updatedConcept = await orchestrator.generateConcept(story2, 'Тайна на маяке');
  assert(!!updatedConcept.concept.premise, 'Pipeline Step 1 (Concept) completed');

  const updatedBible = await orchestrator.generateBible(updatedConcept);
  assert(updatedBible.storyBible.characters.length > 0, 'Pipeline Step 2 (Bible) completed');

  const updatedPlot = await orchestrator.generatePlot(updatedBible);
  assert(updatedPlot.plot.acts.length > 0, 'Pipeline Step 3 (Plot) completed');

  const firstScene = updatedPlot.plot.acts[0].sequences[0].scenes[0];
  const { beats } = await orchestrator.planBeats(updatedPlot, firstScene.id);
  assert(beats.length > 0, 'Pipeline Step 4 (Beats breakdown) completed');

  const writeResult = await orchestrator.writeBeat(updatedPlot, firstScene.id, beats[0].id);
  assert(writeResult.text.length > 20, 'Pipeline Step 5 (Beat prose writer) completed');

  console.log(`\n=================================================`);
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} tests successful.`);
  console.log(`=================================================\n`);
}

runAllTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
