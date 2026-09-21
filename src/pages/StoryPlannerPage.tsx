import React, { useState, useEffect, useRef } from 'react';
import {
  Universe,
  Character,
  StoryLocation,
  StoryEvent,
  StoryObject,
  StoryPlan,
  PlannedScene,
  PlannerChatMessage,
} from '../types';
import { api } from '../services/api';
import {
  Compass,
  Sparkles,
  MessageSquare,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  Users,
  MapPin,
  Lightbulb,
  FileText,
  Copy,
  Send,
  Layers,
  Edit3,
  Flame,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface StoryPlannerPageProps {
  universes: Universe[];
  characters: Character[];
  locations: StoryLocation[];
  events: StoryEvent[];
  objects: StoryObject[];
  selectedUniverseId: string;
  onSelectStory: (id: string) => void;
  onRefreshAll: () => void;
}

export const StoryPlannerPage: React.FC<StoryPlannerPageProps> = ({
  universes,
  characters,
  locations,
  events,
  objects,
  selectedUniverseId,
  onSelectStory,
  onRefreshAll,
}) => {
  const [universeId, setUniverseId] = useState<string>(
    selectedUniverseId || universes[0]?.id || 'uni-main'
  );

  // Plans state
  const [plans, setPlans] = useState<StoryPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Active Plan draft state
  const [currentPlan, setCurrentPlan] = useState<StoryPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'scenes' | 'characters' | 'locations' | 'premise'>('scenes');

  // Chat state
  const [messages, setMessages] = useState<PlannerChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Scene editing modal state
  const [editingScene, setEditingScene] = useState<PlannedScene | null>(null);
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [newTwistInput, setNewTwistInput] = useState('');

  // Load plans on mount or universe change
  useEffect(() => {
    loadPlans();
  }, [universeId]);

  // Keep universeId synced if parent changes
  useEffect(() => {
    if (selectedUniverseId && selectedUniverseId !== universeId) {
      setUniverseId(selectedUniverseId);
    }
  }, [selectedUniverseId]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const list = await api.getStoryPlans(universeId);
      setPlans(list);
      if (list.length > 0) {
        const selected = list.find((p) => p.id === activePlanId) || list[0];
        setActivePlanId(selected.id);
        setCurrentPlan(JSON.parse(JSON.stringify(selected)));
        initChatForPlan(selected);
      } else {
        // Create an initial empty plan if none exist
        handleCreateNewPlan();
      }
    } catch (err) {
      console.error('Failed to load story plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const initChatForPlan = (plan: StoryPlan) => {
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: `Приветствую! Я ваш архитектор историй (Story Engine). Мы планируем историю «${plan.title}» в сеттинге «${
          universes.find((u) => u.id === plan.universeId)?.name || 'Канон'
        }» на ${plan.storyYear} год.\n\nДавайте обсудим замысел: какие события должны произойти, кого из героев привлечём, какие локации и сюжетные повороты сделают историю захватывающей?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSelectPlan = (planId: string) => {
    setActivePlanId(planId);
    const target = plans.find((p) => p.id === planId);
    if (target) {
      setCurrentPlan(JSON.parse(JSON.stringify(target)));
      initChatForPlan(target);
    }
  };

  const handleCreateNewPlan = async () => {
    const defaultPlan: Omit<StoryPlan, 'id' | 'createdAt' | 'updatedAt'> = {
      universeId: universeId || universes[0]?.id || 'uni-main',
      storyYear: 2026,
      title: 'Новый замысел истории',
      premise: 'Кратко опишите завязку сюжета или центральную загадку...',
      genre: 'Мистика / Триллер',
      tone: 'Мрачный, напряжённый',
      selectedCharacterIds: characters.slice(0, 2).map((c) => c.id),
      selectedLocationIds: locations.slice(0, 1).map((l) => l.id),
      selectedObjectIds: objects.slice(0, 1).map((o) => o.id),
      scenes: [
        {
          id: `sc-${Date.now()}-1`,
          title: 'Акт I: Завязка и тревожная находка',
          description: 'Главные герои сталкиваются с аномальным событием или находят запечатанный архив.',
          characterIds: characters.slice(0, 2).map((c) => c.id),
          characterNames: characters.slice(0, 2).map((c) => c.canonicalName),
          locationName: locations[0]?.name || 'Старый дом',
          year: 2026,
          emotionalBeat: 'Интрига и скрытое предчувствие опасности',
        },
      ],
      plotTwists: ['Истинный мотив скрывался в событиях прошлого года'],
      canonNotes: ['Учитывать темпоральное состояние ключевых фигур'],
      status: 'brainstorming',
    };

    try {
      const created = await api.createStoryPlan(defaultPlan);
      setPlans([created, ...plans]);
      setActivePlanId(created.id);
      setCurrentPlan(JSON.parse(JSON.stringify(created)));
      initChatForPlan(created);
    } catch (e) {
      console.error('Failed to create new plan:', e);
    }
  };

  const handleSavePlan = async (updated?: StoryPlan) => {
    const planToSave = updated || currentPlan;
    if (!planToSave || !planToSave.id) return;
    setIsSaving(true);
    try {
      const saved = await api.updateStoryPlan(planToSave.id, planToSave);
      setPlans((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      setCurrentPlan(JSON.parse(JSON.stringify(saved)));
    } catch (e) {
      console.error('Failed to save plan:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот план истории?')) return;
    try {
      await api.deleteStoryPlan(id);
      const remaining = plans.filter((p) => p.id !== id);
      setPlans(remaining);
      if (remaining.length > 0) {
        handleSelectPlan(remaining[0].id);
      } else {
        handleCreateNewPlan();
      }
    } catch (e) {
      console.error('Failed to delete plan:', e);
    }
  };

  const handleConvertToStory = async () => {
    if (!currentPlan) return;
    try {
      await handleSavePlan();
      const newStory = await api.convertPlanToStory(currentPlan.id);
      onRefreshAll();
      onSelectStory(newStory.id);
    } catch (e: any) {
      alert('Ошибка преобразования плана в рассказ: ' + e.message);
    }
  };

  // Chat message submission
  const handleSendMessage = async (textToSend?: string) => {
    const msg = textToSend || inputMessage;
    if (!msg.trim() || isChatSending || !currentPlan) return;

    const userMsg: PlannerChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: msg.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsChatSending(true);

    // Scroll chat down
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const history = messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text }));
      const response = await api.discussStoryPlan({
        universeId: currentPlan.universeId,
        storyYear: currentPlan.storyYear,
        message: userMsg.text,
        currentPlan,
        conversationHistory: history,
      });

      const assistantMsg: PlannerChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedPlanDelta: response.suggestedPlanDelta,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If there are canon alerts, add them to canon notes if not already there
      if (response.canonAlerts && response.canonAlerts.length > 0) {
        setCurrentPlan((prev) => {
          if (!prev) return prev;
          const mergedNotes = Array.from(new Set([...(prev.canonNotes || []), ...response.canonAlerts]));
          const updated = { ...prev, canonNotes: mergedNotes };
          handleSavePlan(updated);
          return updated;
        });
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          sender: 'assistant',
          text: `Не удалось связаться с моделью: ${err.message || 'Ошибка сети'}. Попробуйте ещё раз.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsChatSending(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Applying suggestions from AI response
  const handleApplyDelta = (delta: PlannerChatMessage['suggestedPlanDelta']) => {
    if (!delta || !currentPlan) return;

    const updated: StoryPlan = { ...currentPlan };

    if (delta.title && (!updated.title || updated.title === 'Новый замысел истории')) {
      updated.title = delta.title;
    }
    if (delta.premise && (!updated.premise || updated.premise.includes('Кратко опишите'))) {
      updated.premise = delta.premise;
    }
    if (delta.plotTwists && delta.plotTwists.length > 0) {
      updated.plotTwists = Array.from(new Set([...(updated.plotTwists || []), ...delta.plotTwists]));
    }
    if (delta.suggestedCharacters && delta.suggestedCharacters.length > 0) {
      const addedIds: string[] = [];
      delta.suggestedCharacters.forEach((sc) => {
        if (sc.id) {
          addedIds.push(sc.id);
        } else {
          // Find matching char in universe
          const match = characters.find(
            (c) => c.canonicalName.toLowerCase() === sc.name.toLowerCase()
          );
          if (match) addedIds.push(match.id);
        }
      });
      updated.selectedCharacterIds = Array.from(
        new Set([...(updated.selectedCharacterIds || []), ...addedIds])
      );
    }
    if (delta.suggestedLocations && delta.suggestedLocations.length > 0) {
      const addedLocIds: string[] = [];
      delta.suggestedLocations.forEach((sl) => {
        if (sl.id) {
          addedLocIds.push(sl.id);
        } else {
          const match = locations.find((l) => l.name.toLowerCase() === sl.name.toLowerCase());
          if (match) addedLocIds.push(match.id);
        }
      });
      updated.selectedLocationIds = Array.from(
        new Set([...(updated.selectedLocationIds || []), ...addedLocIds])
      );
    }
    if (delta.suggestedScenes && delta.suggestedScenes.length > 0) {
      const newScenes: PlannedScene[] = delta.suggestedScenes.map((s, idx) => ({
        id: `sc-${Date.now()}-${idx + 1}`,
        title: s.title || `Сцена ${idx + 1}`,
        description: s.description || '',
        locationName: s.locationName || 'Не указана',
        characterIds: [],
        characterNames: s.characterNames || [],
        year: updated.storyYear,
        plotTwist: s.plotTwist,
        emotionalBeat: s.emotionalBeat,
      }));
      updated.scenes = [...(updated.scenes || []), ...newScenes];
    }
    if (delta.canonWarnings && delta.canonWarnings.length > 0) {
      updated.canonNotes = Array.from(new Set([...(updated.canonNotes || []), ...delta.canonWarnings]));
    }

    setCurrentPlan(updated);
    handleSavePlan(updated);
  };

  const handleAutoGenerateOutline = async () => {
    if (!currentPlan) return;
    setIsGeneratingOutline(true);
    try {
      const scenes = await api.generatePlanOutline(currentPlan);
      const updated = { ...currentPlan, scenes };
      setCurrentPlan(updated);
      await handleSavePlan(updated);
      setActiveTab('scenes');
    } catch (e: any) {
      alert('Ошибка при генерации плана: ' + e.message);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleAddPlotTwist = () => {
    if (!newTwistInput.trim() || !currentPlan) return;
    const updated = {
      ...currentPlan,
      plotTwists: [...(currentPlan.plotTwists || []), newTwistInput.trim()],
    };
    setCurrentPlan(updated);
    setNewTwistInput('');
    handleSavePlan(updated);
  };

  const handleRemovePlotTwist = (index: number) => {
    if (!currentPlan) return;
    const twists = [...(currentPlan.plotTwists || [])];
    twists.splice(index, 1);
    const updated = { ...currentPlan, plotTwists: twists };
    setCurrentPlan(updated);
    handleSavePlan(updated);
  };

  const handleToggleCharacter = (charId: string) => {
    if (!currentPlan) return;
    const currentList = currentPlan.selectedCharacterIds || [];
    const exists = currentList.includes(charId);
    const updatedList = exists
      ? currentList.filter((id) => id !== charId)
      : [...currentList, charId];
    const updated = { ...currentPlan, selectedCharacterIds: updatedList };
    setCurrentPlan(updated);
    handleSavePlan(updated);
  };

  const handleToggleLocation = (locId: string) => {
    if (!currentPlan) return;
    const currentList = currentPlan.selectedLocationIds || [];
    const exists = currentList.includes(locId);
    const updatedList = exists
      ? currentList.filter((id) => id !== locId)
      : [...currentList, locId];
    const updated = { ...currentPlan, selectedLocationIds: updatedList };
    setCurrentPlan(updated);
    handleSavePlan(updated);
  };

  const handleCopyPlanMarkdown = () => {
    if (!currentPlan) return;
    const md = [
      `# План истории: ${currentPlan.title}`,
      `**Вселенная:** ${universes.find((u) => u.id === currentPlan.universeId)?.name || 'Канон'}`,
      `**Год событий:** ${currentPlan.storyYear}`,
      `**Жанр:** ${currentPlan.genre} | **Тон:** ${currentPlan.tone}`,
      `\n## Замысел\n${currentPlan.premise}`,
      `\n## Участвующие персонажи\n${
        currentPlan.selectedCharacterIds
          .map((id) => characters.find((c) => c.id === id)?.canonicalName)
          .filter(Boolean)
          .join(', ') || 'Не выбраны'
      }`,
      `\n## Локации\n${
        currentPlan.selectedLocationIds
          .map((id) => locations.find((l) => l.id === id)?.name)
          .filter(Boolean)
          .join(', ') || 'Не выбраны'
      }`,
      `\n## Сюжетные повороты (Twists)\n${currentPlan.plotTwists.map((t) => `- ${t}`).join('\n')}`,
      `\n## Тезисный план сцен\n${currentPlan.scenes
        .map(
          (s, idx) =>
            `### Сцена ${idx + 1}: ${s.title}\n` +
            `- **Локация:** ${s.locationName || 'Не указана'}\n` +
            `- **Участники:** ${s.characterNames?.join(', ') || 'Герои'}\n` +
            `- **События:** ${s.description}\n` +
            (s.plotTwist ? `- **Твист:** ${s.plotTwist}\n` : '') +
            (s.emotionalBeat ? `- **Эмоциональный тон:** ${s.emotionalBeat}\n` : '')
        )
        .join('\n')}`,
    ].join('\n');

    navigator.clipboard.writeText(md);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Helper to check character status at currentPlan.storyYear
  const getCharStatusAtYear = (char: Character, year: number) => {
    const states = (char.states || [])
      .filter((s) => s.year <= year)
      .sort((a, b) => b.year - a.year);
    const state = states[0];
    const isDeceased = state ? state.status === 'deceased' : char.status === 'deceased';
    return {
      statusText: state ? state.status : char.status,
      description: state ? state.description : char.description,
      isDeceased,
    };
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-stone-400">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mr-3" />
        <span>Загрузка планировщика историй...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-stone-950 text-stone-100 overflow-hidden">
      {/* Top Header Bar */}
      <header className="border-b border-stone-800 bg-stone-900/90 backdrop-blur px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Story Planner & Discussion
              </span>
              <span className="text-xs text-stone-500">•</span>
              <span className="text-xs text-stone-400">
                {universes.find((u) => u.id === universeId)?.name || 'Основная вселенная'}
              </span>
            </div>
            {/* Plan Selector */}
            <div className="flex items-center space-x-3 mt-1">
              <select
                id="select-story-plan"
                value={activePlanId || ''}
                onChange={(e) => handleSelectPlan(e.target.value)}
                className="bg-stone-950 border border-stone-700 rounded-md px-2.5 py-1 text-sm font-semibold text-stone-100 focus:outline-none focus:border-amber-500"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title || 'Безымянный замысел'} ({p.storyYear} г.)
                  </option>
                ))}
              </select>
              <button
                id="btn-new-story-plan"
                onClick={handleCreateNewPlan}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded border border-stone-700 transition-colors"
                title="Создать новый план истории"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Новый замысел</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {copiedNotification && (
            <span className="text-xs text-emerald-400 flex items-center bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              План скопирован в Markdown!
            </span>
          )}

          <button
            id="btn-copy-plan-markdown"
            onClick={handleCopyPlanMarkdown}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-700 transition-colors"
            title="Скопировать весь план в формате Markdown"
          >
            <Copy className="w-3.5 h-3.5 text-stone-400" />
            <span>Экспорт</span>
          </button>

          <button
            id="btn-save-plan"
            onClick={() => handleSavePlan()}
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg border border-stone-700 transition-colors"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{isSaving ? 'Сохранение...' : 'Сохранено'}</span>
          </button>

          <button
            id="btn-convert-plan-to-story"
            onClick={handleConvertToStory}
            className="flex items-center space-x-2 px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg shadow-sm transition-all hover:shadow-amber-500/20"
            title="Сформировать черновик истории со структурой сцен и перейти в редактор"
          >
            <BookOpen className="w-4 h-4" />
            <span>Превратить в рассказ</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>

          {plans.length > 1 && activePlanId && (
            <button
              id="btn-delete-plan"
              onClick={() => handleDeletePlan(activePlanId)}
              className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-stone-800/80 rounded transition-colors"
              title="Удалить этот план"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main 2-Column Split Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Column: AI Discussion & Brainstorming Chat */}
        <div className="w-1/2 border-r border-stone-800 flex flex-col bg-stone-950/70 min-w-0">
          {/* Discussion Header */}
          <div className="px-4 py-3 bg-stone-900/60 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-stone-200">
                Обсуждение будущей истории с ИИ-архитектором
              </span>
            </div>
            <span className="text-[11px] text-stone-500">Модель: Gemini 3.8 Flash • Контекст канона</span>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              const isAssistant = m.sender === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-xl p-4 text-sm leading-relaxed border shadow-sm ${
                      isAssistant
                        ? 'bg-stone-900/90 border-stone-800 text-stone-200'
                        : 'bg-amber-600/20 border-amber-500/30 text-amber-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 text-[11px] text-stone-400">
                      <span className="font-semibold flex items-center gap-1.5">
                        {isAssistant ? (
                          <>
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>ИИ Архитектор сюжетов</span>
                          </>
                        ) : (
                          <span>Автор</span>
                        )}
                      </span>
                      <span>{m.timestamp}</span>
                    </div>

                    <div className="whitespace-pre-wrap">{m.text}</div>

                    {/* AI Suggestions Action Card */}
                    {isAssistant && m.suggestedPlanDelta && (
                      <div className="mt-3.5 pt-3 border-t border-stone-800/80 bg-stone-950/40 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                            Предложенные элементы сюжета
                          </span>
                          <button
                            onClick={() => handleApplyDelta(m.suggestedPlanDelta)}
                            className="px-2 py-1 text-xs bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium rounded transition-colors"
                          >
                            Применить всё в план
                          </button>
                        </div>

                        {m.suggestedPlanDelta.title && (
                          <div className="text-xs text-stone-300 mb-1">
                            <span className="text-stone-500">Название:</span>{' '}
                            <strong>«{m.suggestedPlanDelta.title}»</strong>
                          </div>
                        )}

                        {m.suggestedPlanDelta.plotTwists && m.suggestedPlanDelta.plotTwists.length > 0 && (
                          <div className="mt-2 text-xs text-stone-300">
                            <span className="text-stone-400 font-medium">Сюжетные повороты:</span>
                            <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-200/90">
                              {m.suggestedPlanDelta.plotTwists.map((twist, i) => (
                                <li key={i}>{twist}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {m.suggestedPlanDelta.suggestedScenes && m.suggestedPlanDelta.suggestedScenes.length > 0 && (
                          <div className="mt-2 text-xs text-stone-300">
                            <span className="text-stone-400 font-medium">
                              Предложено сцен: {m.suggestedPlanDelta.suggestedScenes.length}
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {m.suggestedPlanDelta.suggestedScenes.map((sc, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-stone-800 text-stone-300 rounded text-[11px] border border-stone-700"
                                >
                                  {sc.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {m.suggestedPlanDelta.canonWarnings && m.suggestedPlanDelta.canonWarnings.length > 0 && (
                          <div className="mt-2 p-2 bg-amber-950/40 border border-amber-800/60 rounded text-xs text-amber-300">
                            <div className="font-semibold flex items-center gap-1 text-amber-400 mb-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              Каноническое замечание:
                            </div>
                            {m.suggestedPlanDelta.canonWarnings.map((w, i) => (
                              <p key={i}>{w}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="px-4 py-2 border-t border-stone-800 bg-stone-900/30 flex items-center space-x-2 overflow-x-auto text-xs shrink-0">
            <span className="text-stone-500 shrink-0">Темы:</span>
            <button
              onClick={() =>
                handleSendMessage(
                  'Предложи 3 неожиданных и острых сюжетных поворота (твиста), которые перевернут представление читателя о происходящем.'
                )
              }
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-full border border-stone-700 whitespace-nowrap transition-colors"
            >
              ⚡ 3 сюжетных твиста
            </button>
            <button
              onClick={() =>
                handleSendMessage(
                  `Каких персонажей вселенной лучше всего столкнуть в конфликте в ${currentPlan?.storyYear} году, чтобы это не нарушило их текущий статус?`
                )
              }
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-full border border-stone-700 whitespace-nowrap transition-colors"
            >
              👥 Конфликт героев
            </button>
            <button
              onClick={() =>
                handleSendMessage(
                  'Разбей наш замысел на последовательный тезисный план из 4 сцен: от завязки до кульминации.'
                )
              }
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-full border border-stone-700 whitespace-nowrap transition-colors"
            >
              📜 Тезисный план сцен
            </button>
            <button
              onClick={() =>
                handleSendMessage(
                  'Какие локации из канона лучше всего передадут гнетущую и таинственную атмосферу этой истории?'
                )
              }
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-full border border-stone-700 whitespace-nowrap transition-colors"
            >
              📍 Локации и атмосфера
            </button>
          </div>

          {/* Message Input Box */}
          <div className="p-3 border-t border-stone-800 bg-stone-900/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                id="input-planner-chat"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Обсудите с ИИ сюжет, сцены, роли героев или повороты..."
                disabled={isChatSending}
                className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                id="btn-send-planner-chat"
                disabled={!inputMessage.trim() || isChatSending}
                className="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 rounded-lg transition-colors font-medium flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Structured Plan Dossier */}
        {currentPlan && (
          <div className="w-1/2 flex flex-col bg-stone-900/30 overflow-hidden min-w-0">
            {/* Plan Dossier Tabs */}
            <div className="px-6 pt-4 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between shrink-0">
              <div className="flex space-x-4">
                <button
                  id="tab-planner-scenes"
                  onClick={() => setActiveTab('scenes')}
                  className={`pb-3 text-sm font-medium border-b-2 flex items-center space-x-2 transition-colors ${
                    activeTab === 'scenes'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Тезисный сюжет ({currentPlan.scenes?.length || 0})</span>
                </button>
                <button
                  id="tab-planner-characters"
                  onClick={() => setActiveTab('characters')}
                  className={`pb-3 text-sm font-medium border-b-2 flex items-center space-x-2 transition-colors ${
                    activeTab === 'characters'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Герои ({currentPlan.selectedCharacterIds?.length || 0})</span>
                </button>
                <button
                  id="tab-planner-locations"
                  onClick={() => setActiveTab('locations')}
                  className={`pb-3 text-sm font-medium border-b-2 flex items-center space-x-2 transition-colors ${
                    activeTab === 'locations'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>Локации & Вещи</span>
                </button>
                <button
                  id="tab-planner-premise"
                  onClick={() => setActiveTab('premise')}
                  className={`pb-3 text-sm font-medium border-b-2 flex items-center space-x-2 transition-colors ${
                    activeTab === 'premise'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span>Замысел & Твисты</span>
                </button>
              </div>

              {/* Year Selector in Plan Dossier */}
              <div className="flex items-center space-x-2 pb-3 text-xs">
                <span className="text-stone-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Год:
                </span>
                <input
                  type="number"
                  value={currentPlan.storyYear}
                  onChange={(e) => {
                    const year = Number(e.target.value) || 2026;
                    const updated = { ...currentPlan, storyYear: year };
                    setCurrentPlan(updated);
                    handleSavePlan(updated);
                  }}
                  className="w-20 bg-stone-950 border border-stone-700 rounded px-2 py-0.5 text-xs text-amber-300 font-mono font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: SCENES & THESIS OUTLINE */}
              {activeTab === 'scenes' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-stone-100 flex items-center gap-2">
                        <span>Тезисный сюжет по сценам</span>
                        <span className="text-xs font-normal text-stone-400">
                          (хронологическая структура ключевых событий)
                        </span>
                      </h3>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Каждая сцена содержит локацию, участников, кульминационный поворот и эмоциональный ритм.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        id="btn-auto-outline"
                        onClick={handleAutoGenerateOutline}
                        disabled={isGeneratingOutline}
                        className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 transition-colors"
                        title="Сгенерировать тезисный сюжет на основе замысла"
                      >
                        {isGeneratingOutline ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>{isGeneratingOutline ? 'Генерация...' : 'Автогенерация тезисов'}</span>
                      </button>

                      <button
                        id="btn-add-scene"
                        onClick={() => {
                          const newScene: PlannedScene = {
                            id: `sc-${Date.now()}`,
                            title: `Сцена ${(currentPlan.scenes?.length || 0) + 1}`,
                            description: '',
                            characterIds: currentPlan.selectedCharacterIds || [],
                            characterNames: currentPlan.selectedCharacterIds.map(
                              (id) => characters.find((c) => c.id === id)?.canonicalName || ''
                            ),
                            locationName: locations[0]?.name || '',
                            year: currentPlan.storyYear,
                            emotionalBeat: 'Напряжение',
                          };
                          const updated = {
                            ...currentPlan,
                            scenes: [...(currentPlan.scenes || []), newScene],
                          };
                          setCurrentPlan(updated);
                          handleSavePlan(updated);
                          setEditingScene(newScene);
                        }}
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border border-stone-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Добавить сцену</span>
                      </button>
                    </div>
                  </div>

                  {/* Scenes List */}
                  {(!currentPlan.scenes || currentPlan.scenes.length === 0) ? (
                    <div className="p-8 border border-dashed border-stone-800 rounded-xl text-center bg-stone-950/40">
                      <Layers className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                      <p className="text-sm text-stone-400 font-medium">Сцены ещё не запланированы</p>
                      <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                        Нажмите кнопку «Автогенерация тезисов» или обсудите сценарий в чате слева, чтобы ИИ помог собрать цепочку событий.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentPlan.scenes.map((scene, idx) => (
                        <div
                          key={scene.id}
                          className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 transition-all hover:border-stone-700 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2.5">
                              <span className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={scene.title}
                                onChange={(e) => {
                                  const updatedScenes = [...currentPlan.scenes];
                                  updatedScenes[idx].title = e.target.value;
                                  const updated = { ...currentPlan, scenes: updatedScenes };
                                  setCurrentPlan(updated);
                                  handleSavePlan(updated);
                                }}
                                className="bg-transparent text-sm font-semibold text-stone-100 focus:outline-none focus:border-b focus:border-amber-500 pb-0.5"
                                placeholder="Название сцены..."
                              />
                            </div>

                            <button
                              onClick={() => {
                                const updatedScenes = currentPlan.scenes.filter((_, i) => i !== idx);
                                const updated = { ...currentPlan, scenes: updatedScenes };
                                setCurrentPlan(updated);
                                handleSavePlan(updated);
                              }}
                              className="p-1 text-stone-500 hover:text-rose-400 rounded transition-colors"
                              title="Удалить сцену"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Scene Metadata Bar */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <div className="flex items-center space-x-1.5 bg-stone-950/80 px-2.5 py-1 rounded border border-stone-800 text-stone-300">
                              <MapPin className="w-3 h-3 text-amber-400" />
                              <input
                                type="text"
                                value={scene.locationName || ''}
                                onChange={(e) => {
                                  const updatedScenes = [...currentPlan.scenes];
                                  updatedScenes[idx].locationName = e.target.value;
                                  const updated = { ...currentPlan, scenes: updatedScenes };
                                  setCurrentPlan(updated);
                                  handleSavePlan(updated);
                                }}
                                placeholder="Локация сцены..."
                                className="bg-transparent focus:outline-none text-xs text-stone-200 w-36"
                              />
                            </div>

                            <div className="flex items-center space-x-1.5 bg-stone-950/80 px-2.5 py-1 rounded border border-stone-800 text-stone-300">
                              <Users className="w-3 h-3 text-sky-400" />
                              <input
                                type="text"
                                value={(scene.characterNames || []).join(', ')}
                                onChange={(e) => {
                                  const names = e.target.value
                                    .split(',')
                                    .map((n) => n.trim())
                                    .filter(Boolean);
                                  const updatedScenes = [...currentPlan.scenes];
                                  updatedScenes[idx].characterNames = names;
                                  const updated = { ...currentPlan, scenes: updatedScenes };
                                  setCurrentPlan(updated);
                                  handleSavePlan(updated);
                                }}
                                placeholder="Герои через запятую..."
                                className="bg-transparent focus:outline-none text-xs text-stone-200 w-44"
                              />
                            </div>

                            <div className="flex items-center space-x-1.5 bg-stone-950/80 px-2.5 py-1 rounded border border-stone-800 text-stone-400">
                              <Clock className="w-3 h-3 text-stone-500" />
                              <span>{scene.year || currentPlan.storyYear} г.</span>
                            </div>
                          </div>

                          {/* Scene Description / Events */}
                          <div>
                            <textarea
                              value={scene.description}
                              onChange={(e) => {
                                const updatedScenes = [...currentPlan.scenes];
                                updatedScenes[idx].description = e.target.value;
                                const updated = { ...currentPlan, scenes: updatedScenes };
                                setCurrentPlan(updated);
                                handleSavePlan(updated);
                              }}
                              placeholder="Что происходит в этой сцене? Ключевые действия, открытия, диалоги..."
                              rows={2}
                              className="w-full bg-stone-950/70 border border-stone-800/80 rounded-lg p-2.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 leading-relaxed resize-none"
                            />
                          </div>

                          {/* Twist / Clue / Emotional Beat Grid */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-stone-950/40 p-2 rounded border border-stone-800/60">
                              <span className="text-[11px] font-medium text-amber-400 flex items-center gap-1 mb-1">
                                <Flame className="w-3 h-3" />
                                Поворот сцены (Твист):
                              </span>
                              <input
                                type="text"
                                value={scene.plotTwist || ''}
                                onChange={(e) => {
                                  const updatedScenes = [...currentPlan.scenes];
                                  updatedScenes[idx].plotTwist = e.target.value;
                                  const updated = { ...currentPlan, scenes: updatedScenes };
                                  setCurrentPlan(updated);
                                  handleSavePlan(updated);
                                }}
                                placeholder="Неожиданный факт, улика..."
                                className="w-full bg-transparent text-xs text-stone-200 focus:outline-none"
                              />
                            </div>

                            <div className="bg-stone-950/40 p-2 rounded border border-stone-800/60">
                              <span className="text-[11px] font-medium text-sky-400 flex items-center gap-1 mb-1">
                                <Sparkles className="w-3 h-3" />
                                Эмоциональный тон:
                              </span>
                              <input
                                type="text"
                                value={scene.emotionalBeat || ''}
                                onChange={(e) => {
                                  const updatedScenes = [...currentPlan.scenes];
                                  updatedScenes[idx].emotionalBeat = e.target.value;
                                  const updated = { ...currentPlan, scenes: updatedScenes };
                                  setCurrentPlan(updated);
                                  handleSavePlan(updated);
                                }}
                                placeholder="Тревога, облегчение, шок..."
                                className="w-full bg-transparent text-xs text-stone-200 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CHARACTERS & TEMPORAL STATUS */}
              {activeTab === 'characters' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-base font-semibold text-stone-100 flex items-center gap-2">
                      <span>Герои и персонажи истории</span>
                      <span className="text-xs font-normal text-stone-400">
                        (состояние в {currentPlan.storyYear} году)
                      </span>
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Отметьте персонажей, которые участвуют в этой истории. Канон автоматически отслеживает их статус в выбранном году.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {characters
                      .filter((c) => c.universeId === currentPlan.universeId)
                      .map((char) => {
                        const isSelected = (currentPlan.selectedCharacterIds || []).includes(char.id);
                        const statusInfo = getCharStatusAtYear(char, currentPlan.storyYear);

                        return (
                          <div
                            key={char.id}
                            onClick={() => handleToggleCharacter(char.id)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                                : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded text-amber-500 bg-stone-950 border-stone-700 focus:ring-0 focus:ring-offset-0"
                                />
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-sm text-stone-100">
                                      {char.canonicalName}
                                    </span>
                                    {char.aliases?.length > 0 && (
                                      <span className="text-xs text-stone-400">
                                        ({char.aliases.join(', ')})
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">
                                    {char.occupation || char.description}
                                  </p>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="flex items-center space-x-1.5">
                                {statusInfo.isDeceased ? (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-950/60 text-rose-300 border border-rose-800">
                                    Погиб в {currentPlan.storyYear} г.
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                                    Жив ({statusInfo.statusText})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Temporal State details */}
                            {isSelected && statusInfo.isDeceased && (
                              <div className="mt-2.5 p-2 bg-rose-950/40 border border-rose-900/60 rounded text-xs text-rose-300 flex items-start space-x-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                                <div>
                                  <span className="font-semibold">Внимание канона:</span> в {currentPlan.storyYear} году {char.canonicalName} числится погибшим ({statusInfo.description}).
                                  Участие допустимо только в виде флешбэков, аудиозаписей или дневников.
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 3: LOCATIONS & ARTIFACTS */}
              {activeTab === 'locations' && (
                <div className="space-y-6">
                  {/* Locations Section */}
                  <div>
                    <h3 className="text-base font-semibold text-stone-100 flex items-center gap-2">
                      <span>Локации для истории</span>
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Ключевые места действия из канона вселенной.
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {locations
                        .filter((l) => l.universeId === currentPlan.universeId)
                        .map((loc) => {
                          const isSelected = (currentPlan.selectedLocationIds || []).includes(loc.id);
                          return (
                            <div
                              key={loc.id}
                              onClick={() => handleToggleLocation(loc.id)}
                              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-amber-500/10 border-amber-500/40'
                                  : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm text-stone-200 flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                                  {loc.name}
                                </span>
                                <span className="text-[11px] text-stone-500">{loc.status}</span>
                              </div>
                              <p className="text-xs text-stone-400 line-clamp-2">{loc.description}</p>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Objects / Artifacts Section */}
                  <div className="pt-4 border-t border-stone-800">
                    <h3 className="text-base font-semibold text-stone-100 flex items-center gap-2">
                      <span>Ключевые предметы & Улики</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {objects
                        .filter((o) => o.universeId === currentPlan.universeId)
                        .map((obj) => (
                          <div
                            key={obj.id}
                            className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-300"
                          >
                            <span className="font-semibold text-stone-100 block mb-1">
                              {obj.name}
                            </span>
                            <p className="text-stone-400">{obj.description}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PREMISE & PLOT TWISTS */}
              {activeTab === 'premise' && (
                <div className="space-y-6">
                  {/* Basic Metadata */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-stone-300 block mb-1">
                        Рабочее название истории
                      </label>
                      <input
                        id="input-plan-title"
                        type="text"
                        value={currentPlan.title}
                        onChange={(e) => {
                          const updated = { ...currentPlan, title: e.target.value };
                          setCurrentPlan(updated);
                          handleSavePlan(updated);
                        }}
                        className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 font-semibold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-stone-300 block mb-1">Жанр</label>
                        <input
                          type="text"
                          value={currentPlan.genre}
                          onChange={(e) => {
                            const updated = { ...currentPlan, genre: e.target.value };
                            setCurrentPlan(updated);
                            handleSavePlan(updated);
                          }}
                          className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-300 block mb-1">
                          Эмоциональный тон
                        </label>
                        <input
                          type="text"
                          value={currentPlan.tone}
                          onChange={(e) => {
                            const updated = { ...currentPlan, tone: e.target.value };
                            setCurrentPlan(updated);
                            handleSavePlan(updated);
                          }}
                          className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-300 block mb-1">
                        Замысел / Логлайн истории (Premise)
                      </label>
                      <textarea
                        rows={3}
                        value={currentPlan.premise}
                        onChange={(e) => {
                          const updated = { ...currentPlan, premise: e.target.value };
                          setCurrentPlan(updated);
                          handleSavePlan(updated);
                        }}
                        className="w-full bg-stone-950 border border-stone-700 rounded-lg p-3 text-xs text-stone-200 leading-relaxed focus:outline-none focus:border-amber-500"
                        placeholder="В чём суть конфликта? Какую тайну раскрывают персонажи?"
                      />
                    </div>
                  </div>

                  {/* Plot Twists Management */}
                  <div className="pt-4 border-t border-stone-800">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-amber-300 flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-amber-400" />
                          Сюжетные повороты и тайны (Plot Twists)
                        </h4>
                        <p className="text-xs text-stone-400">
                          Неожиданные откровения, которые меняют понимание событий.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      {(currentPlan.plotTwists || []).map((twist, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span>{twist}</span>
                          </span>
                          <button
                            onClick={() => handleRemovePlotTwist(idx)}
                            className="text-stone-500 hover:text-rose-400 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newTwistInput}
                        onChange={(e) => setNewTwistInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPlotTwist();
                          }
                        }}
                        placeholder="Добавить новый сюжетный твист..."
                        className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={handleAddPlotTwist}
                        disabled={!newTwistInput.trim()}
                        className="px-3 py-2 text-xs bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-semibold rounded-lg transition-colors"
                      >
                        Добавить
                      </button>
                    </div>
                  </div>

                  {/* Canon Notes */}
                  {currentPlan.canonNotes && currentPlan.canonNotes.length > 0 && (
                    <div className="pt-4 border-t border-stone-800">
                      <h4 className="text-xs font-semibold text-stone-300 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Заметки каноничности
                      </h4>
                      <div className="space-y-1.5">
                        {currentPlan.canonNotes.map((note, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-amber-950/30 border border-amber-900/50 rounded text-xs text-amber-300/90"
                          >
                            {note}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
