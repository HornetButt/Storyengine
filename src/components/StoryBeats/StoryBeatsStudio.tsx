import React, { useState, useEffect, useRef } from 'react';
import {
  Universe,
  Character,
  StoryLocation,
  Story,
  PlannedScene,
  StoryBeat,
} from '../../types';
import { api } from '../../services/api';
import {
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
  Play,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  BookOpen,
  ArrowRight,
  FileText,
  FileEdit,
  Sliders,
  Users,
  MapPin,
  Flame,
  AlertTriangle,
  Copy,
  Check,
  Save,
  Wand2,
} from 'lucide-react';

interface StoryBeatsStudioProps {
  universes: Universe[];
  characters: Character[];
  locations: StoryLocation[];
  stories: Story[];
  initialStoryId?: string | null;
  onSelectStory?: (id: string) => void;
  onRefreshAll?: () => void;
  onOpenCanvas?: (storyId: string) => void;
}

export const StoryBeatsStudio: React.FC<StoryBeatsStudioProps> = ({
  universes,
  characters,
  locations,
  stories,
  initialStoryId,
  onSelectStory,
  onRefreshAll,
  onOpenCanvas,
}) => {
  // Current active story
  const [selectedStoryId, setSelectedStoryId] = useState<string>(
    initialStoryId || stories[0]?.id || ''
  );
  const [activeStory, setActiveStory] = useState<Story | null>(null);

  // Scenes and beats
  const [scenes, setScenes] = useState<PlannedScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [activeBeatId, setActiveBeatId] = useState<string | null>(null);

  // Beat workshop state
  const [activeBeatProse, setActiveBeatProse] = useState<string>('');
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [isGeneratingProse, setIsGeneratingProse] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isSavingStory, setIsSavingStory] = useState(false);
  const [copied, setCopied] = useState(false);

  // Style and POV settings
  const [pov, setPov] = useState<'third_limited' | 'first_person' | 'omniscient'>('third_limited');
  const [tone, setTone] = useState('Напряжённый, кинематографичный');
  const [styleNotes, setStyleNotes] = useState('Больше тактильных деталей, запахов и живых реплик');

  // Full manuscript view tab
  const [viewMode, setViewMode] = useState<'beat_editor' | 'full_manuscript'>('beat_editor');

  // Notification / error
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];
  const activeBeat = activeScene?.beats?.find((b) => b.id === activeBeatId) || activeScene?.beats?.[0];

  // Load story on story change
  useEffect(() => {
    if (selectedStoryId) {
      loadStoryData(selectedStoryId);
    } else if (stories.length > 0) {
      setSelectedStoryId(stories[0].id);
    }
  }, [selectedStoryId, stories]);

  const loadStoryData = async (storyId: string) => {
    try {
      const s = await api.getStory(storyId);
      setActiveStory(s);

      // If story has scenes, use them; otherwise create initial default scene
      if (s.scenes && s.scenes.length > 0) {
        setScenes(s.scenes);
        setActiveSceneId(s.scenes[0].id);
        if (s.scenes[0].beats && s.scenes[0].beats.length > 0) {
          setActiveBeatId(s.scenes[0].beats[0].id);
          setActiveBeatProse(s.scenes[0].beats[0].generatedText || '');
        }
      } else {
        // Initialize default scenes from story or fallback
        const initialScenes: PlannedScene[] = [
          {
            id: `sc-${Date.now()}-1`,
            title: 'Акт I: Завязка и обстановка',
            description: s.synopsis || 'Введение героя и первое столкновение с загадкой.',
            characterIds: s.characterIds || [],
            characterNames: characters
              .filter((c) => s.characterIds?.includes(c.id))
              .map((c) => c.canonicalName),
            year: s.storyYear || 2026,
            emotionalBeat: 'Интрига',
            beats: [],
          },
          {
            id: `sc-${Date.now()}-2`,
            title: 'Акт II: Развитие и поворот',
            description: 'Расследование, неожиданная находка или конфликт.',
            characterIds: s.characterIds || [],
            characterNames: characters
              .filter((c) => s.characterIds?.includes(c.id))
              .map((c) => c.canonicalName),
            year: s.storyYear || 2026,
            emotionalBeat: 'Напряжение',
            beats: [],
          },
          {
            id: `sc-${Date.now()}-3`,
            title: 'Акт III: Развязка и последствия',
            description: 'Решение тайны и канонические последствия для вселенной.',
            characterIds: s.characterIds || [],
            characterNames: characters
              .filter((c) => s.characterIds?.includes(c.id))
              .map((c) => c.canonicalName),
            year: s.storyYear || 2026,
            emotionalBeat: 'Катарсис',
            beats: [],
          },
        ];
        setScenes(initialScenes);
        setActiveSceneId(initialScenes[0].id);
      }
    } catch (err) {
      console.error('Failed to load story for Beats Studio:', err);
    }
  };

  // Switch active beat
  const handleSelectBeat = (sceneId: string, beatId: string) => {
    setActiveSceneId(sceneId);
    setActiveBeatId(beatId);
    const targetScene = scenes.find((s) => s.id === sceneId);
    const targetBeat = targetScene?.beats?.find((b) => b.id === beatId);
    setActiveBeatProse(targetBeat?.generatedText || '');
  };

  // Breakdown scene to beats with AI
  const handleBreakdownScene = async (sceneToBreakdown: PlannedScene) => {
    if (!activeStory) return;
    setIsBreakingDown(true);
    setNotification(null);

    try {
      const res = await api.breakdownScene({
        universeId: activeStory.universeId,
        storyYear: activeStory.storyYear || 2026,
        scene: sceneToBreakdown,
        genre: 'Мистический детектив',
        tone: tone,
        premise: activeStory.synopsis,
      });

      if (res.beats && res.beats.length > 0) {
        const updatedScenes = scenes.map((sc) => {
          if (sc.id === sceneToBreakdown.id) {
            return {
              ...sc,
              beats: res.beats,
              status: 'in_progress' as const,
            };
          }
          return sc;
        });

        setScenes(updatedScenes);
        setActiveBeatId(res.beats[0].id);
        setActiveBeatProse('');
        setNotification({
          type: 'success',
          message: `Сцена разбита на ${res.beats.length} сюжетных бита. Готово к пошаговому написанию!`,
        });

        // Save updated scenes to story
        saveScenesToStory(updatedScenes);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Не удалось разбить сцену на биты.',
      });
    } finally {
      setIsBreakingDown(false);
    }
  };

  // Generate Prose for the active Beat
  const handleGenerateBeatProse = async () => {
    if (!activeStory || !activeScene || !activeBeat) return;
    setIsGeneratingProse(true);
    setNotification(null);

    try {
      // Find previous text from the story manuscript for seamless continuity
      const currentFullText = activeStory.fullText || '';

      const povDescription =
        pov === 'first_person'
          ? 'От первого лица ("Я")'
          : pov === 'omniscient'
          ? 'От третьего всеведущего лица'
          : 'От третьего ограниченного лица (фокус на мыслях главного героя)';

      const fullStyleNotes = `${povDescription}. Тон: ${tone}. ${styleNotes}`;

      const res = await api.generateBeatProse({
        universeId: activeStory.universeId,
        storyYear: activeStory.storyYear || 2026,
        beat: activeBeat,
        scene: activeScene,
        previousText: currentFullText,
        genre: 'Каноническая проза',
        tone,
        styleNotes: fullStyleNotes,
      });

      setActiveBeatProse(res.text);

      // Update beat in state
      const updatedScenes = scenes.map((sc) => {
        if (sc.id === activeScene.id) {
          return {
            ...sc,
            beats: (sc.beats || []).map((b) => {
              if (b.id === activeBeat.id) {
                return {
                  ...b,
                  generatedText: res.text,
                  status: 'generated' as const,
                };
              }
              return b;
            }),
          };
        }
        return sc;
      });

      setScenes(updatedScenes);
      saveScenesToStory(updatedScenes);

      setNotification({
        type: 'success',
        message: `Бит "${activeBeat.title}" написан (~${res.wordCount} слов). Проверьте текст и нажмите "Одобрить"!`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Ошибка генерации прозы бита.',
      });
    } finally {
      setIsGeneratingProse(false);
    }
  };

  // Continue / Co-write additional sentences
  const handleContinueProse = async () => {
    if (!activeStory || !activeBeatProse.trim()) return;
    setIsContinuing(true);

    try {
      const res = await api.continueBeatProse({
        universeId: activeStory.universeId,
        storyYear: activeStory.storyYear || 2026,
        currentText: activeBeatProse,
        instruction: 'Продолжить текущую сцену, добавить деталь или диалоговую реплику',
      });

      const updatedText = activeBeatProse.trim() + '\n\n' + res.addedText;
      setActiveBeatProse(updatedText);

      // Update state
      const updatedScenes = scenes.map((sc) => {
        if (sc.id === activeScene?.id) {
          return {
            ...sc,
            beats: (sc.beats || []).map((b) => {
              if (b.id === activeBeat?.id) {
                return { ...b, generatedText: updatedText };
              }
              return b;
            }),
          };
        }
        return sc;
      });

      setScenes(updatedScenes);
      saveScenesToStory(updatedScenes);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Ошибка дописывания текста.',
      });
    } finally {
      setIsContinuing(false);
    }
  };

  // Approve Beat and append to manuscript
  const handleApproveBeat = async () => {
    if (!activeStory || !activeScene || !activeBeat || !activeBeatProse.trim()) return;

    // Check if clean continuation needed
    const currentText = activeStory.fullText ? activeStory.fullText.trim() : '';
    const separator = currentText.length > 0 ? '\n\n' : '';
    const newFullText = currentText + separator + activeBeatProse.trim();

    // Mark beat as approved
    let nextBeatToSelect: StoryBeat | null = null;
    let nextSceneIdToSelect: string | null = null;

    const updatedScenes = scenes.map((sc) => {
      if (sc.id === activeScene.id) {
        const beats = (sc.beats || []).map((b, idx) => {
          if (b.id === activeBeat.id) {
            return {
              ...b,
              status: 'approved' as const,
              generatedText: activeBeatProse,
            };
          }
          return b;
        });

        // Find next pending beat in this scene
        const currentIdx = beats.findIndex((b) => b.id === activeBeat.id);
        if (currentIdx >= 0 && currentIdx < beats.length - 1) {
          nextBeatToSelect = beats[currentIdx + 1];
          nextSceneIdToSelect = sc.id;
        }

        return { ...sc, beats };
      }
      return sc;
    });

    // If no more beats in this scene, look for next scene's first beat
    if (!nextBeatToSelect) {
      const currentSceneIdx = updatedScenes.findIndex((s) => s.id === activeScene.id);
      if (currentSceneIdx >= 0 && currentSceneIdx < updatedScenes.length - 1) {
        const nextScene = updatedScenes[currentSceneIdx + 1];
        if (nextScene.beats && nextScene.beats.length > 0) {
          nextBeatToSelect = nextScene.beats[0];
          nextSceneIdToSelect = nextScene.id;
        }
      }
    }

    setScenes(updatedScenes);

    // Save to server
    setIsSavingStory(true);
    try {
      const updatedStory = await api.updateStory(
        activeStory.id,
        {
          fullText: newFullText,
          scenes: updatedScenes,
          activeBeatId: nextBeatToSelect ? nextBeatToSelect.id : activeBeat.id,
        },
        `Одобрен бит: ${activeBeat.title}`
      );

      setActiveStory(updatedStory);
      if (onRefreshAll) onRefreshAll();

      if (nextBeatToSelect && nextSceneIdToSelect) {
        setActiveSceneId(nextSceneIdToSelect);
        setActiveBeatId(nextBeatToSelect.id);
        setActiveBeatProse(nextBeatToSelect.generatedText || '');
        setNotification({
          type: 'success',
          message: `Бит добавлен в рукопись! Переход к следующему биту: "${nextBeatToSelect.title}".`,
        });
      } else {
        setNotification({
          type: 'success',
          message: 'Бит добавлен в рукопись! Все запланированные биты в этой сцене завершены.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Ошибка сохранения истории.',
      });
    } finally {
      setIsSavingStory(false);
    }
  };

  // Add custom beat manually
  const handleAddCustomBeat = (sceneId: string) => {
    const targetScene = scenes.find((s) => s.id === sceneId);
    if (!targetScene) return;

    const count = (targetScene.beats?.length || 0) + 1;
    const newBeat: StoryBeat = {
      id: `beat-${Date.now()}-${count}`,
      sceneId: sceneId,
      beatIndex: count,
      title: `Бит ${count}: Новое действие`,
      directive: 'Опишите, что должно произойти в этом фрагменте...',
      charactersPresent: targetScene.characterNames || [],
      status: 'pending',
      targetWordCount: 300,
    };

    const updatedScenes = scenes.map((s) => {
      if (s.id === sceneId) {
        return {
          ...s,
          beats: [...(s.beats || []), newBeat],
        };
      }
      return s;
    });

    setScenes(updatedScenes);
    setActiveSceneId(sceneId);
    setActiveBeatId(newBeat.id);
    setActiveBeatProse('');
    saveScenesToStory(updatedScenes);
  };

  // Save scenes structure to story silently
  const saveScenesToStory = async (scenesToSave: PlannedScene[]) => {
    if (!activeStory) return;
    try {
      await api.updateStory(activeStory.id, {
        scenes: scenesToSave,
      });
    } catch (err) {
      console.warn('Failed to auto-save scenes to story:', err);
    }
  };

  // Add new scene
  const handleAddScene = () => {
    const count = scenes.length + 1;
    const newScene: PlannedScene = {
      id: `sc-${Date.now()}-${count}`,
      title: `Сцена ${count}: Новое развитие`,
      description: 'Краткое описание событий сцены...',
      characterIds: activeStory?.characterIds || [],
      characterNames: characters
        .filter((c) => activeStory?.characterIds?.includes(c.id))
        .map((c) => c.canonicalName),
      year: activeStory?.storyYear || 2026,
      emotionalBeat: 'Развитие',
      beats: [],
    };

    const updated = [...scenes, newScene];
    setScenes(updated);
    setActiveSceneId(newScene.id);
    saveScenesToStory(updated);
  };

  const handleCopyManuscript = () => {
    if (!activeStory?.fullText) return;
    navigator.clipboard.writeText(activeStory.fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Total words written so far
  const totalWords = activeStory?.fullText
    ? activeStory.fullText.split(/\s+/).filter(Boolean).length
    : 0;

  // Count approved beats
  const allBeats = scenes.flatMap((s) => s.beats || []);
  const approvedBeats = allBeats.filter((b) => b.status === 'approved').length;
  const progressPercent = allBeats.length > 0 ? Math.round((approvedBeats / allBeats.length) * 100) : 0;

  return (
    <div className="flex h-full w-full flex-col bg-stone-950 text-stone-100 overflow-hidden">
      {/* Top Studio Control Bar */}
      <header className="border-b border-stone-800 bg-stone-900/80 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-stone-100 tracking-tight">
                Студия пошагового написания (Story Beats Studio)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PROSE ENGINE
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Пошаговая генерация и режиссура рассказа: от плана битов до живой литературной прозы
            </p>
          </div>
        </div>

        {/* Story Selector and Actions */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-stone-800/80 px-3 py-1.5 rounded-lg border border-stone-700">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <select
              value={selectedStoryId}
              onChange={(e) => setSelectedStoryId(e.target.value)}
              className="bg-transparent text-xs text-stone-200 focus:outline-none cursor-pointer max-w-[220px] truncate"
            >
              {stories.map((s) => (
                <option key={s.id} value={s.id} className="bg-stone-900 text-stone-200">
                  {s.title} ({s.storyYear} г.)
                </option>
              ))}
            </select>
          </div>

          {onOpenCanvas && activeStory && (
            <button
              onClick={() => onOpenCanvas(activeStory.id)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs transition-colors"
              title="Открыть в Word Холсте"
            >
              <FileEdit className="w-3.5 h-3.5 text-stone-400" />
              <span>В Word Холст</span>
            </button>
          )}

          <div className="h-6 w-px bg-stone-800" />

          {/* Progress badge */}
          <div className="text-right">
            <div className="text-[11px] font-mono text-stone-400">
              Прогресс: <strong className="text-amber-400">{approvedBeats}</strong> / {allBeats.length} битов
            </div>
            <div className="w-28 bg-stone-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`px-6 py-2 text-xs flex items-center justify-between border-b ${
            notification.type === 'success'
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
              : notification.type === 'error'
              ? 'bg-rose-950/70 text-rose-300 border-rose-800/60'
              : 'bg-stone-900 text-stone-300 border-stone-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-200 text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 3-Column Studio Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Scenes & Beats Navigator */}
        <div className="w-80 border-r border-stone-800 bg-stone-900/50 flex flex-col shrink-0">
          <div className="p-3 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                Сцены и биты
              </span>
            </div>
            <button
              onClick={handleAddScene}
              className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
              title="Добавить сцену"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Scenes Tree */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {scenes.map((scene, scIdx) => {
              const isActiveScene = scene.id === activeScene?.id;
              const sceneBeats = scene.beats || [];
              const sceneApprovedCount = sceneBeats.filter((b) => b.status === 'approved').length;

              return (
                <div
                  key={scene.id}
                  className={`rounded-xl border transition-all ${
                    isActiveScene
                      ? 'bg-stone-800/80 border-amber-500/50 ring-1 ring-amber-500/20 shadow-lg'
                      : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {/* Scene Header */}
                  <div
                    onClick={() => setActiveSceneId(scene.id)}
                    className="p-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-mono text-amber-400/90 font-bold uppercase">
                          Сцена {scIdx + 1} • {scene.emotionalBeat || 'Развитие'}
                        </div>
                        <h3 className="text-xs font-semibold text-stone-100 line-clamp-1 mt-0.5">
                          {scene.title}
                        </h3>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-stone-800 text-stone-400 shrink-0">
                        {sceneApprovedCount}/{sceneBeats.length}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-400 line-clamp-2 mt-1">
                      {scene.description}
                    </p>
                  </div>

                  {/* Beats in this Scene */}
                  <div className="px-3 pb-3 space-y-1.5">
                    {sceneBeats.length === 0 ? (
                      <div className="py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                        <p className="text-[11px] text-amber-300 mb-2">
                          Сцена ещё не разбита на драматургические биты
                        </p>
                        <button
                          onClick={() => handleBreakdownScene(scene)}
                          disabled={isBreakingDown}
                          className="w-full py-1.5 px-3 rounded-md bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
                        >
                          {isBreakingDown && isActiveScene ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>Разбить на биты (AI)</span>
                        </button>
                      </div>
                    ) : (
                      sceneBeats.map((beat) => {
                        const isSelectedBeat = beat.id === activeBeat?.id && isActiveScene;
                        const isApproved = beat.status === 'approved';
                        const isGenerated = beat.status === 'generated';

                        return (
                          <div
                            key={beat.id}
                            onClick={() => handleSelectBeat(scene.id, beat.id)}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-start space-x-2 transition-all ${
                              isSelectedBeat
                                ? 'bg-amber-500/15 border-amber-500/60 text-stone-100 font-medium'
                                : isApproved
                                ? 'bg-emerald-950/20 border-emerald-900/40 text-stone-300 hover:bg-stone-800/60'
                                : 'bg-stone-800/40 border-stone-800/80 text-stone-400 hover:bg-stone-800/60'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isApproved ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : isGenerated ? (
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-stone-600 flex items-center justify-center text-[9px] font-mono">
                                  {beat.beatIndex}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-semibold truncate">
                                {beat.title}
                              </div>
                              <div className="text-[10px] text-stone-400 line-clamp-1">
                                {beat.directive}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Add manual beat button */}
                    {sceneBeats.length > 0 && (
                      <button
                        onClick={() => handleAddCustomBeat(scene.id)}
                        className="w-full py-1 text-[11px] text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded flex items-center justify-center space-x-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Добавить бит вручную</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Beat Workshop (The Core Prose Generation Engine) */}
        <div className="flex-1 flex flex-col border-r border-stone-800 min-w-0 bg-stone-950">
          {activeBeat ? (
            <>
              {/* Beat Info & Directives Card */}
              <div className="p-4 border-b border-stone-800 bg-stone-900/40 shrink-0">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      БИТ {activeBeat.beatIndex} ИЗ {activeScene?.beats?.length || 1}
                    </span>
                    <h2 className="text-sm font-bold text-stone-100">
                      {activeBeat.title}
                    </h2>
                  </div>

                  {/* Character Cast Chips */}
                  <div className="flex items-center space-x-1 text-xs">
                    <Users className="w-3.5 h-3.5 text-stone-500" />
                    <div className="flex flex-wrap gap-1">
                      {(activeBeat.charactersPresent?.length
                        ? activeBeat.charactersPresent
                        : activeScene?.characterNames || ['Персонажи']
                      ).map((charName, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full text-[10px] bg-stone-800 text-stone-300 border border-stone-700"
                        >
                          {charName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Directive Box (Editable by author) */}
                <div className="bg-stone-900/90 rounded-lg p-2.5 border border-stone-800 text-xs">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-stone-400 mb-1">
                    <span>Директива для ИИ (Что происходит в этом бите):</span>
                    <span className="font-normal text-stone-500">Редактируемо</span>
                  </div>
                  <input
                    type="text"
                    value={activeBeat.directive}
                    onChange={(e) => {
                      const newDir = e.target.value;
                      setScenes((prev) =>
                        prev.map((sc) => {
                          if (sc.id === activeScene?.id) {
                            return {
                              ...sc,
                              beats: (sc.beats || []).map((b) =>
                                b.id === activeBeat.id ? { ...b, directive: newDir } : b
                              ),
                            };
                          }
                          return sc;
                        })
                      );
                    }}
                    className="w-full bg-transparent border-none text-stone-200 focus:outline-none text-xs"
                    placeholder="Опишите ключевое действие или диалог..."
                  />
                </div>

                {/* Style & POV Quick Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-xs">
                  <div>
                    <label className="text-[10px] text-stone-400 uppercase font-semibold block mb-0.5">
                      Точка зрения (POV):
                    </label>
                    <select
                      value={pov}
                      onChange={(e) => setPov(e.target.value as any)}
                      className="w-full bg-stone-900 border border-stone-800 rounded px-2 py-1 text-xs text-stone-300 focus:outline-none"
                    >
                      <option value="third_limited">3-е лицо (Ограниченное)</option>
                      <option value="first_person">1-е лицо ("Я")</option>
                      <option value="omniscient">3-е лицо (Всеведущий автор)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 uppercase font-semibold block mb-0.5">
                      Тон повествования:
                    </label>
                    <input
                      type="text"
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      placeholder="Напряжённый, нуар..."
                      className="w-full bg-stone-900 border border-stone-800 rounded px-2 py-1 text-xs text-stone-300 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 uppercase font-semibold block mb-0.5">
                      Заметка стилистики:
                    </label>
                    <input
                      type="text"
                      value={styleNotes}
                      onChange={(e) => setStyleNotes(e.target.value)}
                      placeholder="Короткие фразы, диалоги..."
                      className="w-full bg-stone-900 border border-stone-800 rounded px-2 py-1 text-xs text-stone-300 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Prose Writing Area */}
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Edit3 className="w-4 h-4 text-stone-400" />
                    <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                      Художественный текст бита
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-stone-400">
                    <span>
                      {activeBeatProse ? activeBeatProse.split(/\s+/).filter(Boolean).length : 0} слов
                    </span>
                  </div>
                </div>

                {/* Primary Prose Editor Textarea */}
                <div className="flex-1 rounded-xl border border-stone-800 bg-stone-900/30 p-4 flex flex-col overflow-hidden focus-within:border-amber-500/50">
                  <textarea
                    value={activeBeatProse}
                    onChange={(e) => setActiveBeatProse(e.target.value)}
                    placeholder="Нажмите 'Написать этот бит' для генерации нейросетью с учетом контекста предыдущих абзацев, либо начните писать отрывок самостоятельно..."
                    className="w-full flex-1 bg-transparent border-none text-stone-100 placeholder-stone-500 text-sm md:text-base leading-relaxed resize-none focus:outline-none font-serif"
                    style={{ lineHeight: '1.8' }}
                  />
                </div>

                {/* Generation and Control Buttons Bar */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleGenerateBeatProse}
                      disabled={isGeneratingProse}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow disabled:opacity-50"
                    >
                      {isGeneratingProse ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Пишем бит...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>{activeBeatProse ? 'Переписать бит (Roll Alt)' : 'Написать этот бит (Generate)'}</span>
                        </>
                      )}
                    </button>

                    {activeBeatProse && (
                      <button
                        onClick={handleContinueProse}
                        disabled={isContinuing}
                        className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                        title="Дописать следующий абзац к этому биту"
                      >
                        {isContinuing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>Дописать абзац (Continue)</span>
                      </button>
                    )}
                  </div>

                  {/* Primary Approval Button */}
                  <button
                    onClick={handleApproveBeat}
                    disabled={!activeBeatProse.trim() || isSavingStory}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors shadow disabled:opacity-50"
                  >
                    {isSavingStory ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Одобрить и добавить в рукопись →</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-500">
              <Sparkles className="w-10 h-10 text-stone-600 mb-3" />
              <h3 className="text-sm font-semibold text-stone-400">Сюжетный бит не выбран</h3>
              <p className="text-xs max-w-sm mt-1">
                Выберите сцену и бит в левой колонке или нажмите «Разбить на биты (AI)» для старта.
              </p>
            </div>
          )}
        </div>

        {/* Column 3: Live Manuscript / Full Document View */}
        <div className="w-96 flex flex-col shrink-0 bg-stone-900/30">
          <div className="p-3 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                Рукопись рассказа
              </span>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[11px] font-mono text-stone-400">
                {totalWords} слов
              </span>
              <button
                onClick={handleCopyManuscript}
                className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
                title="Скопировать рукопись"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Manuscript Live Content */}
          <div className="flex-1 overflow-y-auto p-4 font-serif text-xs md:text-sm leading-relaxed text-stone-200 space-y-4">
            {activeStory?.fullText ? (
              <div className="whitespace-pre-wrap selection:bg-amber-500/30">
                {activeStory.fullText}
              </div>
            ) : (
              <div className="text-center text-stone-500 py-12">
                <BookOpen className="w-8 h-8 text-stone-700 mx-auto mb-2" />
                <p className="text-xs">Рукопись пока пуста.</p>
                <p className="text-[11px] text-stone-600 mt-1">
                  Генерируйте и одобряйте биты слева — они будут автоматически собираться сюда в единую каноническую историю.
                </p>
              </div>
            )}
          </div>

          {/* Manuscript Footer Summary */}
          <div className="p-3 border-t border-stone-800 bg-stone-900/80 flex items-center justify-between text-[11px] text-stone-400">
            <span>{activeStory?.title || 'Без названия'}</span>
            <span className="text-amber-400 font-mono">{activeStory?.storyYear || 2026} г.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
