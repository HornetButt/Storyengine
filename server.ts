import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { storage } from './src/server/storage';
import { buildStoryBible } from './src/server/storyBible';
import { generateStoryPipeline, iterateStory } from './src/server/generator';
import { checkStoryConsistency } from './src/server/consistency';
import { extractKnowledgeFromText } from './src/server/extractor';
import { getKnowledgeGraph } from './src/server/graph';
import { discussStoryPlan, generateAutoOutline } from './src/server/planner';
import { breakdownSceneToBeats, generateBeatProse, continueBeatProse } from './src/server/beatsGenerator';
import { testLLMConnection, fetchAvailableModels, DEFAULT_PROVIDER_CONFIGS } from './src/server/llm';
import { orchestrator } from './src/pipeline/orchestrator';
import { CanonManager } from './src/pipeline/canonManager';
import { StateManager } from './src/pipeline/stateManager';
import { CriticSystem } from './src/pipeline/criticSystem';
import { createDefaultStory } from './src/domain/adapters';

const criticSystem = new CriticSystem();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- REST API v1 ---
  const api = express.Router();

  // Health
  api.get('/health', (_req, res) => {
    res.json({ status: 'ok', engine: 'Story Engine v1.0', time: new Date().toISOString() });
  });

  // Stats
  api.get('/stats', (_req, res) => {
    res.json(storage.getStats());
  });

  // Universes
  api.get('/universes', (_req, res) => {
    res.json(storage.getUniverses());
  });

  api.get('/universes/:id', (req, res) => {
    const uni = storage.getUniverse(req.params.id);
    if (!uni) return res.status(404).json({ error: 'Вселенная не найдена' });
    res.json(uni);
  });

  api.post('/universes', (req, res) => {
    const newUni = storage.createUniverse(req.body);
    res.status(201).json(newUni);
  });

  api.put('/universes/:id', (req, res) => {
    const updated = storage.updateUniverse(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Вселенная не найдена' });
    res.json(updated);
  });

  api.patch('/universes/:id', (req, res) => {
    const updated = storage.updateUniverse(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Вселенная не найдена' });
    res.json(updated);
  });

  api.delete('/universes/:id', (req, res) => {
    const success = storage.deleteUniverse(req.params.id);
    res.json({ success });
  });

  // Characters
  api.get('/characters', (req, res) => {
    const universeId = req.query.universeId as string | undefined;
    res.json(storage.getCharacters(universeId));
  });

  api.get('/characters/:id', (req, res) => {
    const char = storage.getCharacter(req.params.id);
    if (!char) return res.status(404).json({ error: 'Персонаж не найден' });
    res.json(char);
  });

  api.post('/characters', (req, res) => {
    const newChar = storage.createCharacter(req.body);
    res.status(201).json(newChar);
  });

  api.put('/characters/:id', (req, res) => {
    const updated = storage.updateCharacter(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Персонаж не найден' });
    res.json(updated);
  });

  api.delete('/characters/:id', (req, res) => {
    const success = storage.deleteCharacter(req.params.id);
    res.json({ success });
  });

  // Locations
  api.get('/locations', (req, res) => {
    const universeId = req.query.universeId as string | undefined;
    res.json(storage.getLocations(universeId));
  });

  api.post('/locations', (req, res) => {
    const newLoc = storage.createLocation(req.body);
    res.status(201).json(newLoc);
  });

  api.put('/locations/:id', (req, res) => {
    const updated = storage.updateLocation(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Локация не найдена' });
    res.json(updated);
  });

  // Events
  api.get('/events', (req, res) => {
    const universeId = req.query.universeId as string | undefined;
    res.json(storage.getEvents(universeId));
  });

  api.post('/events', (req, res) => {
    const newEvt = storage.createEvent(req.body);
    res.status(201).json(newEvt);
  });

  // Objects
  api.get('/objects', (req, res) => {
    const universeId = req.query.universeId as string | undefined;
    res.json(storage.getObjects(universeId));
  });

  api.post('/objects', (req, res) => {
    const newObj = storage.createObject(req.body);
    res.status(201).json(newObj);
  });

  // Stories
  api.get('/stories', (req, res) => {
    const { universeId, canonStatus, status } = req.query;
    res.json(
      storage.getStories({
        universeId: universeId as string,
        canonStatus: canonStatus as string,
        status: status as string,
      })
    );
  });

  api.get('/stories/:id', (req, res) => {
    const story = storage.getStory(req.params.id);
    if (!story) return res.status(404).json({ error: 'История не найдена' });
    res.json(story);
  });

  api.post('/stories', (req, res) => {
    const newStory = storage.createStory(req.body);
    res.status(201).json(newStory);
  });

  api.put('/stories/:id', (req, res) => {
    const { changeSummary, ...updates } = req.body;
    const updated = storage.updateStory(req.params.id, updates, changeSummary);
    if (!updated) return res.status(404).json({ error: 'История не найдена' });
    res.json(updated);
  });

  api.delete('/stories/:id', (req, res) => {
    const success = storage.deleteStory(req.params.id);
    res.json({ success });
  });

  // Import story file
  api.post('/stories/import', async (req, res) => {
    try {
      const { title, text, universeId, year, format } = req.body;
      if (!text || !universeId) {
        return res.status(400).json({ error: 'Текст и universeId обязательны' });
      }

      const storyYear = year ? Number(year) : 2026;
      const consistency = await checkStoryConsistency(universeId, storyYear, text, title);

      const story = storage.createStory({
        universeId,
        title: title || `Импортированная история [${new Date().toLocaleDateString()}]`,
        synopsis: text.slice(0, 180) + '...',
        fullText: text,
        status: 'reviewed',
        canonStatus: 'draft',
        storyDate: `${storyYear}-01-01`,
        storyYear,
        consistencyStatus: consistency.passed ? 'passed' : 'has_conflicts',
        consistencyReport: consistency,
      });

      // Auto-extract knowledge proposals
      const extracted = await extractKnowledgeFromText(story.id, universeId, text, storyYear);
      for (const item of extracted) {
        storage.addProposedChange(item);
      }

      res.status(201).json({ story, extractedCount: extracted.length, consistency });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Consistency check on demand
  api.post('/stories/:id/validate', async (req, res) => {
    const story = storage.getStory(req.params.id);
    if (!story) return res.status(404).json({ error: 'История не найдена' });

    const report = await checkStoryConsistency(
      story.universeId,
      story.storyYear,
      req.body.text || story.fullText,
      story.title
    );

    storage.updateStory(story.id, {
      consistencyReport: report,
      consistencyStatus: report.passed ? 'passed' : 'has_conflicts',
    });

    res.json(report);
  });

  // Extract knowledge on demand
  api.post('/stories/:id/extract', async (req, res) => {
    const story = storage.getStory(req.params.id);
    if (!story) return res.status(404).json({ error: 'История не найдена' });

    const extracted = await extractKnowledgeFromText(
      story.id,
      story.universeId,
      story.fullText,
      story.storyYear
    );

    const saved = [];
    for (const item of extracted) {
      saved.push(storage.addProposedChange(item));
    }

    res.json(saved);
  });

  // Relationships
  api.get('/relationships', (_req, res) => {
    res.json(storage.getRelationships());
  });

  api.post('/relationships', (req, res) => {
    const rel = storage.createRelationship(req.body);
    res.status(201).json(rel);
  });

  api.delete('/relationships/:id', (req, res) => {
    const success = storage.deleteRelationship(req.params.id);
    res.json({ success });
  });

  // Proposed changes
  api.get('/proposed-changes', (req, res) => {
    const status = req.query.status as string | undefined;
    res.json(storage.getProposedChanges(status));
  });

  api.post('/proposed-changes/:id/accept', (req, res) => {
    const updated = storage.updateProposedChangeStatus(req.params.id, 'accepted');
    if (!updated) return res.status(404).json({ error: 'Запись не найдена' });
    res.json(updated);
  });

  api.post('/proposed-changes/:id/reject', (req, res) => {
    const updated = storage.updateProposedChangeStatus(req.params.id, 'rejected');
    if (!updated) return res.status(404).json({ error: 'Запись не найдена' });
    res.json(updated);
  });

  // Knowledge Graph
  api.get('/graph', (req, res) => {
    const universeId = req.query.universeId as string | undefined;
    const centerEntityId = req.query.centerId as string | undefined;
    const maxDepth = req.query.depth ? Number(req.query.depth) : 2;
    res.json(getKnowledgeGraph(universeId, centerEntityId, maxDepth));
  });

  // Timeline
  api.get('/timeline', (req, res) => {
    const universeId = req.query.universeId as string | undefined;
    const events = storage.getEvents(universeId);
    const stories = storage.getStories({ universeId });

    const timelineItems = [
      ...events.map((e) => ({
        id: e.id,
        type: 'event',
        year: e.year,
        date: e.dateStart || `${e.year}`,
        title: e.title,
        description: e.description,
        canonStatus: e.canonStatus,
        universeId: e.universeId,
      })),
      ...stories.map((s) => ({
        id: s.id,
        type: 'story',
        year: s.storyYear,
        date: s.storyDate,
        title: s.title,
        description: s.synopsis,
        canonStatus: s.canonStatus,
        universeId: s.universeId,
      })),
    ].sort((a, b) => a.year - b.year);

    res.json(timelineItems);
  });

  // Search
  api.get('/search', (req, res) => {
    const query = ((req.query.q as string) || '').toLowerCase().trim();
    if (!query) return res.json({ stories: [], characters: [], locations: [], objects: [], events: [] });

    const stories = storage.getStories().filter(
      (s) => s.title.toLowerCase().includes(query) || s.fullText.toLowerCase().includes(query)
    );
    const characters = storage.getCharacters().filter(
      (c) =>
        c.canonicalName.toLowerCase().includes(query) ||
        c.aliases.some((a: string) => a.toLowerCase().includes(query)) ||
        c.description.toLowerCase().includes(query)
    );
    const locations = storage.getLocations().filter(
      (l) => l.name.toLowerCase().includes(query) || l.description.toLowerCase().includes(query)
    );
    const objects = storage.getObjects().filter(
      (o) => o.name.toLowerCase().includes(query) || o.description.toLowerCase().includes(query)
    );
    const events = storage.getEvents().filter(
      (e) => e.title.toLowerCase().includes(query) || e.description.toLowerCase().includes(query)
    );

    res.json({ stories, characters, locations, objects, events });
  });

  // Generation endpoints
  api.post('/generation/bible', (req, res) => {
    const bible = buildStoryBible(req.body);
    res.json(bible);
  });

  api.post('/generation/generate', async (req, res) => {
    try {
      const result = await generateStoryPipeline(req.body);
      res.json(result);
    } catch (e: any) {
      console.error('Generation pipeline error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  api.post('/generation/iterate', async (req, res) => {
    try {
      const { storyId, instruction } = req.body;
      const result = await iterateStory(storyId, instruction);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Story Plans & Narrative Planner
  api.get('/story-plans', (req, res) => {
    const universeId = req.query.universeId as string | undefined;
    res.json(storage.getStoryPlans(universeId));
  });

  api.get('/story-plans/:id', (req, res) => {
    const plan = storage.getStoryPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: 'План истории не найден' });
    res.json(plan);
  });

  api.post('/story-plans', (req, res) => {
    const newPlan = storage.createStoryPlan(req.body);
    res.status(201).json(newPlan);
  });

  api.put('/story-plans/:id', (req, res) => {
    const updated = storage.updateStoryPlan(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'План истории не найден' });
    res.json(updated);
  });

  api.delete('/story-plans/:id', (req, res) => {
    const success = storage.deleteStoryPlan(req.params.id);
    res.json({ success });
  });

  api.post('/story-plans/:id/convert-to-story', (req, res) => {
    const plan = storage.getStoryPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: 'План истории не найден' });

    const scenesOutline = (plan.scenes || [])
      .map(
        (s, idx) =>
          `### Сцена ${idx + 1}: ${s.title}\n` +
          `* **Локация:** ${s.locationName || 'Не указана'}\n` +
          `* **Персонажи:** ${s.characterNames?.join(', ') || 'Не указаны'}\n` +
          `* **События:** ${s.description || 'События сцены...'}\n` +
          (s.plotTwist ? `* **Поворот:** ${s.plotTwist}\n` : '') +
          (s.emotionalBeat ? `* **Тон:** ${s.emotionalBeat}\n` : '')
      )
      .join('\n');

    const fullDraft =
      `# ${plan.title || 'Новая история'}\n\n` +
      `**Год событий:** ${plan.storyYear} | **Жанр:** ${plan.genre || 'Драма/Мистика'} | **Тон:** ${plan.tone || 'Напряжённый'}\n\n` +
      `**Замысел:**\n${plan.premise || 'Основная идея истории'}\n\n` +
      (plan.plotTwists?.length
        ? `**Ключевые сюжетные повороты:**\n${plan.plotTwists.map((t) => `- ${t}`).join('\n')}\n\n`
        : '') +
      `---\n\n` +
      `## Тезисный план сцен:\n\n${scenesOutline || '*Сцены не заданы*'}\n\n` +
      `---\n\n` +
      `## Текст истории:\n\n` +
      `*Начните писать канонический текст истории на основе плана...*\n`;

    const newStory = storage.createStory({
      universeId: plan.universeId,
      planId: plan.id,
      title: plan.title || 'Новая история из плана',
      synopsis:
        plan.premise ||
        (plan.scenes[0]?.description
          ? plan.scenes[0].description.slice(0, 180) + '...'
          : 'История создана на основе плана.'),
      fullText: fullDraft,
      status: 'draft',
      canonStatus: 'draft',
      storyDate: `${plan.storyYear}-06-01`,
      storyYear: plan.storyYear,
      characterIds: plan.selectedCharacterIds,
      locationIds: plan.selectedLocationIds,
      scenes: plan.scenes,
    });

    storage.updateStoryPlan(plan.id, { status: 'ready_to_write' });

    res.status(201).json(newStory);
  });

  api.post('/planner/discuss', async (req, res) => {
    try {
      const response = await discussStoryPlan(req.body);
      res.json(response);
    } catch (e: any) {
      console.error('Planner discussion error:', e);
      res.status(500).json({ error: e.message || 'Ошибка обсуждения плана' });
    }
  });

  api.post('/planner/outline', async (req, res) => {
    try {
      const scenes = await generateAutoOutline(req.body);
      res.json(scenes);
    } catch (e: any) {
      console.error('Planner outline generation error:', e);
      res.status(500).json({ error: e.message || 'Ошибка генерации тезисного плана' });
    }
  });

  // Story Beats Engine (Пошаговое написание сцен и битов)
  api.post('/beats/breakdown', async (req, res) => {
    try {
      const beats = await breakdownSceneToBeats(req.body);
      res.json({ beats });
    } catch (e: any) {
      console.error('Beats breakdown error:', e);
      res.status(500).json({ error: e.message || 'Ошибка разбивки сцены на биты' });
    }
  });

  api.post('/beats/generate-prose', async (req, res) => {
    try {
      const result = await generateBeatProse(req.body);
      res.json(result);
    } catch (e: any) {
      console.error('Beat prose generation error:', e);
      res.status(500).json({ error: e.message || 'Ошибка генерации прозы бита' });
    }
  });

  api.post('/beats/continue', async (req, res) => {
    try {
      const result = await continueBeatProse(req.body);
      res.json(result);
    } catch (e: any) {
      console.error('Beat continue prose error:', e);
      res.status(500).json({ error: e.message || 'Ошибка продолжения текста' });
    }
  });

  // LLM Providers & Model Settings
  api.get('/llm/config', (_req, res) => {
    const config = storage.getLLMConfig();
    res.json(config);
  });

  api.post('/llm/config', (req, res) => {
    const updated = storage.updateLLMConfig(req.body);
    res.json(updated);
  });

  api.post('/llm/test', async (req, res) => {
    try {
      const result = await testLLMConnection(req.body);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || 'Ошибка тестирования подключения к LLM' });
    }
  });

  api.post('/llm/models', async (req, res) => {
    try {
      const models = await fetchAvailableModels(req.body);
      res.json({ models });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Не удалось получить список моделей' });
    }
  });

  api.get('/llm/providers', (_req, res) => {
    res.json(DEFAULT_PROVIDER_CONFIGS);
  });

  // Tools schema for AI agents and external integrations
  api.get('/llm-tools/schema', (_req, res) => {
    res.json({
      tools: [
        {
          name: 'search_knowledge',
          description: 'Поиск по базе знаний (персонажи, локации, события, истории)',
          parameters: { query: 'string', universeId: 'string (optional)' },
        },
        {
          name: 'get_story_bible',
          description: 'Получить Story Bible для заданной вселенной и года с каноническими фактами',
          parameters: { universeId: 'string', year: 'number', prompt: 'string' },
        },
        {
          name: 'validate_story',
          description: 'Проверить текст на противоречия с каноном и темпоральными статусами персонажей',
          parameters: { universeId: 'string', year: 'number', text: 'string' },
        },
        {
          name: 'propose_knowledge_change',
          description: 'Предложить новый факт или персонажа для рассмотрения автором',
          parameters: { entityType: 'string', action: 'string', payload: 'object', confidence: 'number' },
        },
      ],
    });
  });

  // =========================================================================
  // --- STORY ENGINE v2: DOMAIN MODEL & ORCHESTRATOR API ---
  // =========================================================================

  // List all FullStories
  api.get('/engine/stories', (req, res) => {
    const universeId = req.query.universeId as string | undefined;
    res.json(storage.getFullStories(universeId));
  });

  // Get single FullStory
  api.get('/engine/stories/:id', (req, res) => {
    const story = storage.getFullStory(req.params.id);
    if (!story) return res.status(404).json({ error: 'История не найдена' });
    res.json(story);
  });

  // Create new FullStory
  api.post('/engine/stories', (req, res) => {
    const { title, universeId, storyYear, idea } = req.body;
    const uni = storage.getUniverse(universeId) || storage.getUniverses()[0];
    if (!uni) return res.status(400).json({ error: 'Вселенная не найдена' });

    const newStory = createDefaultStory(
      title || 'Новый проект сценария',
      uni,
      storyYear ? Number(storyYear) : 2026,
      idea || ''
    );
    storage.saveFullStory(newStory);
    res.status(201).json(newStory);
  });

  // Update FullStory directly
  api.put('/engine/stories/:id', (req, res) => {
    const existing = storage.getFullStory(req.params.id);
    if (!existing) return res.status(404).json({ error: 'История не найдена' });

    const updated = {
      ...existing,
      ...req.body,
      id: req.params.id,
      updatedAt: new Date().toISOString(),
    };
    storage.saveFullStory(updated);
    res.json(updated);
  });

  // Delete FullStory
  api.delete('/engine/stories/:id', (req, res) => {
    const success = storage.deleteFullStory(req.params.id);
    res.json({ success });
  });

  // Pipeline Step 1: Generate or refine Concept
  api.post('/engine/stories/:id/concept', async (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const updated = await orchestrator.generateConcept(story, req.body.idea);
      storage.saveFullStory(updated);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Ошибка генерации концепта' });
    }
  });

  // Pipeline Step 2: Generate or refine Story Bible
  api.post('/engine/stories/:id/bible', async (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const updated = await orchestrator.generateBible(story);
      storage.saveFullStory(updated);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Ошибка формирования Story Bible' });
    }
  });

  // Pipeline Step 3: Generate or refine Plot (Acts -> Sequences -> Scenes)
  api.post('/engine/stories/:id/plot', async (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const updated = await orchestrator.generatePlot(story);
      storage.saveFullStory(updated);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Ошибка генерации сюжета' });
    }
  });

  // Pipeline Step 4: Plan or re-plan a single Scene
  api.post('/engine/stories/:id/scenes/:sceneId/plan', async (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const result = await orchestrator.planScene(story, req.params.sceneId);
      storage.saveFullStory(result.story);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Ошибка планирования сцены' });
    }
  });

  // Pipeline Step 5: Decompose Scene into dramatic Beats
  api.post('/engine/stories/:id/scenes/:sceneId/beats', async (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const result = await orchestrator.planBeats(story, req.params.sceneId);
      storage.saveFullStory(result.story);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Ошибка разбивки сцены на биты' });
    }
  });

  // Pipeline Step 6: Write prose for a specific Beat
  api.post('/engine/stories/:id/scenes/:sceneId/beats/:beatId/write', async (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const result = await orchestrator.writeBeat(
        story,
        req.params.sceneId,
        req.params.beatId,
        req.body.styleDirectives
      );
      storage.saveFullStory(result.story);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Ошибка написания бита' });
    }
  });

  // Pipeline Step 7: Write all beats for a Scene
  api.post('/engine/stories/:id/scenes/:sceneId/write-all', async (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const updated = await orchestrator.writeSceneAllBeats(story, req.params.sceneId);
      storage.saveFullStory(updated);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Ошибка написания сцены' });
    }
  });

  // Pipeline Step 8: Critic review of a Scene draft
  api.post('/engine/stories/:id/scenes/:sceneId/review', async (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const { foundScene } = orchestrator.findScene(story.plot, req.params.sceneId);
      if (!foundScene) return res.status(404).json({ error: 'Сцена не найдена' });

      const text = req.body.draftText || foundScene.draft;
      const report = await criticSystem.evaluateScene(story, foundScene, text);
      foundScene.criticReport = report;
      storage.saveFullStory(story);

      res.json({ story, report });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Ошибка рецензирования сцены' });
    }
  });

  // Pipeline Step 9: Extract Canon proposals from Scene draft
  api.post('/engine/stories/:id/scenes/:sceneId/extract-canon', async (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const result = await orchestrator.extractCanonProposals(story, req.params.sceneId);
      storage.saveFullStory(result.story);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Ошибка извлечения канона' });
    }
  });

  // Pipeline Step 10: Revise Scene draft (creates a new version in `scene.drafts`)
  api.post('/engine/stories/:id/scenes/:sceneId/revise', async (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const result = await orchestrator.reviseScene(
        story,
        req.params.sceneId,
        req.body.userInstructions
      );
      storage.saveFullStory(result.story);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Ошибка ревизии черновика' });
    }
  });

  // Pipeline Step 11: Commit scene and update StoryState
  api.post('/engine/stories/:id/scenes/:sceneId/commit-state', async (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const updated = await orchestrator.updateStoryState(story, req.params.sceneId);
      storage.saveFullStory(updated);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Ошибка обновления состояния истории' });
    }
  });

  // Canon: Accept proposal
  api.post('/engine/stories/:id/canon/proposals/:propId/accept', (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const result = CanonManager.acceptProposal(story, req.params.propId, req.body.editedProposal);
      storage.saveFullStory(result.story);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Canon: Reject proposal
  api.post('/engine/stories/:id/canon/proposals/:propId/reject', (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const updated = CanonManager.rejectProposal(story, req.params.propId);
      storage.saveFullStory(updated);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Canon: Edit proposal
  api.post('/engine/stories/:id/canon/proposals/:propId/edit', (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const updatedProp = CanonManager.editProposal(story, req.params.propId, req.body);
      storage.saveFullStory(story);
      res.json(updatedProp);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Canon: Add direct fact
  api.post('/engine/stories/:id/canon/facts', (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const fact = CanonManager.addDirectFact(story, req.body);
      storage.saveFullStory(story);
      res.status(201).json(fact);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Canon: Retcon fact
  api.post('/engine/stories/:id/canon/facts/:factId/retcon', (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const updated = CanonManager.retconFact(story, req.params.factId);
      storage.saveFullStory(updated);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // State: Update character state manually
  api.post('/engine/stories/:id/state/character', (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const { name, location, emotion, newKnowledge } = req.body;
      if (location) StateManager.updateCharacterLocation(story, name, location);
      if (emotion) StateManager.updateCharacterEmotion(story, name, emotion);
      if (newKnowledge) StateManager.addCharacterKnowledge(story, name, newKnowledge);

      storage.saveFullStory(story);
      res.json(story.storyState);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // State: Set event flag
  api.post('/engine/stories/:id/state/flag', (req, res) => {
    try {
      const story = storage.getFullStory(req.params.id);
      if (!story) return res.status(404).json({ error: 'История не найдена' });

      const { flag, value } = req.body;
      StateManager.setEventFlag(story, flag, value !== false);
      storage.saveFullStory(story);
      res.json(story.storyState);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Mount API router
  app.use('/api/v1', api);

  // Catch-all for /api to prevent returning HTML on missing endpoints
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Маршрут API не найден' });
  });

  // Global error handler for API
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: err?.message || 'Внутренняя ошибка сервера' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Story Engine Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
