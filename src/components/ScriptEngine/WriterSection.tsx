import React, { useState } from 'react';
import {
  FileEdit,
  Sparkles,
  Save,
  CheckCircle2,
  RefreshCw,
  Play,
  Zap,
  ShieldCheck,
  Clock,
  Layers,
  MapPin,
  Users,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { FullStory, Scene, Beat } from '../../domain/storyModel';
import { engineApi } from '../../services/engineApi';

interface WriterSectionProps {
  story: FullStory;
  selectedSceneId?: string;
  onUpdateStory: (updated: FullStory) => void;
  onNavigateTab: (tab: 'story' | 'world' | 'plot' | 'review') => void;
}

export const WriterSection: React.FC<WriterSectionProps> = ({
  story,
  selectedSceneId,
  onUpdateStory,
  onNavigateTab,
}) => {
  // Find all scenes
  const allScenes = story.plot.acts.flatMap((a) =>
    a.sequences.flatMap((s) => s.scenes)
  );

  const [activeSceneId, setActiveSceneId] = useState<string>(
    selectedSceneId || allScenes[0]?.id || ''
  );
  const activeScene = allScenes.find((s) => s.id === activeSceneId) || allScenes[0];

  const [draftText, setDraftText] = useState(activeScene?.draft || '');
  const [styleDirectives, setStyleDirectives] = useState(
    'Фокус на сенсорных деталях, скрытом подтексте и реалистичных диалогах без клише.'
  );
  const [isWritingBeat, setIsWritingBeat] = useState(false);
  const [isWritingAll, setIsWritingAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Sync draft when scene switches
  React.useEffect(() => {
    if (activeScene) {
      setDraftText(activeScene.draft || '');
    }
  }, [activeScene?.id, activeScene?.draft]);

  if (!activeScene) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-stone-900 border border-stone-800 rounded-xl">
        <Layers className="w-12 h-12 text-stone-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-stone-200">Сцены ещё не сформированы</h3>
        <p className="text-sm text-stone-400 mt-1 mb-4">
          Сначала перейдите в раздел «Сюжетное древо (Plot)» и сгенерируйте структуру сценария.
        </p>
        <button
          onClick={() => onNavigateTab('plot')}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold rounded-lg text-xs"
        >
          Перейти к Сюжету
        </button>
      </div>
    );
  }

  const handleWriteBeat = async (beatId: string) => {
    setIsWritingBeat(true);
    setMessage(null);
    try {
      const result = await engineApi.writeBeat(
        story.id,
        activeScene.id,
        beatId,
        styleDirectives
      );
      const updatedScene = result.story.plot.acts
        .flatMap((a) => a.sequences.flatMap((s) => s.scenes))
        .find((s) => s.id === activeScene.id);
      if (updatedScene) {
        setDraftText(updatedScene.draft);
      } else {
        setDraftText((prev) => (prev ? prev + '\n\n' + result.text : result.text));
      }
      onUpdateStory(result.story);
      setMessage(`Бит успешно написан и вставлен в черновик.`);
    } catch (err: any) {
      alert(`Ошибка написания бита: ${err.message}`);
    } finally {
      setIsWritingBeat(false);
    }
  };

  const handleWriteAllBeats = async () => {
    setIsWritingAll(true);
    setMessage(null);
    try {
      const updated = await engineApi.writeSceneAll(story.id, activeScene.id);
      const updatedScene = updated.plot.acts
        .flatMap((a) => a.sequences.flatMap((s) => s.scenes))
        .find((s) => s.id === activeScene.id);
      if (updatedScene) {
        setDraftText(updatedScene.draft);
      }
      onUpdateStory(updated);
      setMessage(`Все биты сцены написаны и объединены в черновик.`);
    } catch (err: any) {
      alert(`Ошибка генерации сцены: ${err.message}`);
    } finally {
      setIsWritingAll(false);
    }
  };

  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      activeScene.draft = draftText;
      const updated = await engineApi.updateStory(story.id, { plot: story.plot });
      onUpdateStory(updated);
      setMessage('Черновик сохранён.');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(`Ошибка сохранения: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCommitState = async () => {
    setIsCommitting(true);
    try {
      const updated = await engineApi.commitSceneState(story.id, activeScene.id);
      onUpdateStory(updated);
      setMessage('Сцена зафиксирована в состоянии мира (StoryState)!');
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(`Ошибка фиксации состояния: ${err.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  const wordCount = draftText.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 180));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Bar with Scene Selector */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Шаг 4: Мастерская сцены (Writer)
            </span>
            <span className="text-xs text-stone-400">
              Текущая сцена: <strong className="text-stone-200">{activeScene.title}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <select
              value={activeSceneId}
              onChange={(e) => setActiveSceneId(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60 max-w-md"
            >
              {allScenes.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  Сцена {idx + 1}: {s.title} ({s.location})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium border border-stone-700 transition-colors"
          >
            <Save className="w-3.5 h-3.5 text-stone-400" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>

          <button
            onClick={() => onNavigateTab('review')}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 rounded-lg text-xs font-semibold border border-purple-800/60 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            Рецензия (Critic)
          </button>

          <button
            onClick={handleCommitState}
            disabled={isCommitting || !draftText.trim()}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 rounded-lg text-xs font-semibold border border-emerald-800/60 transition-colors disabled:opacity-50"
            title="Зафиксировать завершение сцены в динамическом состоянии мира"
          >
            {isCommitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            Зафиксировать в StoryState
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Main Grid: Left = Beat Plan & Scene Context; Right = Prose Draft */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Scene Context & Beats */}
        <div className="lg:col-span-5 space-y-4">
          {/* Scene Passport Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider">
              Параметры сцены
            </h4>

            <div className="space-y-2 text-xs text-stone-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-400">Локация:</strong> {activeScene.location}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-400">Персонажи:</strong>{' '}
                  {activeScene.characters.join(', ')}
                </div>
              </div>

              <div className="pt-1 border-t border-stone-800/80">
                <strong className="text-stone-400">Драматический конфликт:</strong>
                <p className="text-stone-300 mt-0.5">{activeScene.conflict}</p>
              </div>

              <div>
                <strong className="text-stone-400">Цель сцены:</strong>
                <p className="text-stone-300 mt-0.5">{activeScene.purpose}</p>
              </div>

              <div>
                <strong className="text-stone-400">Эмоциональный сдвиг:</strong>
                <p className="text-amber-400/90 mt-0.5">{activeScene.emotionalChange}</p>
              </div>
            </div>
          </div>

          {/* Style Directives */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-2">
            <label className="block text-xs font-semibold text-stone-200 uppercase tracking-wider">
              Директивы стиля для LLM
            </label>
            <textarea
              value={styleDirectives}
              onChange={(e) => setStyleDirectives(e.target.value)}
              rows={2}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500/60 resize-none leading-relaxed"
            />
          </div>

          {/* Beats Plan Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                План битов ({activeScene.beats.length})
              </h4>
              <button
                onClick={handleWriteAllBeats}
                disabled={isWritingAll || activeScene.beats.length === 0}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 disabled:opacity-50"
              >
                {isWritingAll ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                Написать все биты
              </button>
            </div>

            {activeScene.beats.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-2">
                Биты ещё не спланированы. Нажмите «Спланировать биты» в древе сюжета.
              </p>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {activeScene.beats.map((beat) => (
                  <div
                    key={beat.id}
                    className={`p-3 rounded-lg border text-xs transition-all ${
                      beat.status === 'generated' || beat.status === 'approved'
                        ? 'bg-stone-950/70 border-stone-800'
                        : 'bg-stone-900 border-amber-900/30 hover:border-amber-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold text-stone-200">
                        Бит {beat.beatIndex || 1}: {beat.purpose || beat.title}
                      </span>
                      <button
                        onClick={() => handleWriteBeat(beat.id)}
                        disabled={isWritingBeat}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1 shrink-0"
                      >
                        <Play className="w-2.5 h-2.5" />
                        Написать бит
                      </button>
                    </div>

                    <p className="text-stone-400 leading-relaxed mb-1">{beat.action}</p>

                    {beat.stateChanges && beat.stateChanges.length > 0 && (
                      <div className="flex flex-wrap gap-1 my-1">
                        {beat.stateChanges.map((sc, scIdx) => (
                          <span
                            key={scIdx}
                            className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-stone-950 text-amber-300/80 border border-stone-800"
                            title={sc.newKnowledge || sc.newEmotion || sc.flag || ''}
                          >
                            {sc.flag ? `⚑ ${sc.flag}` : sc.newKnowledge ? `💡 ${sc.newKnowledge.slice(0, 24)}...` : sc.newEmotion ? `♥ ${sc.newEmotion}` : (sc.character || 'сдвиг')}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-[10px] text-stone-500 flex items-center justify-between border-t border-stone-800/60 pt-1 mt-1">
                      <span>Эмоция: {beat.emotionalChange}</span>
                      {beat.targetWordCount && <span>~{beat.targetWordCount} слов</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Prose Draft Editor */}
        <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-stone-100 text-sm">
                  Художественный текст сцены
                </h3>
                <span className="text-[10px] text-stone-500 bg-stone-800 px-2 py-0.5 rounded">
                  Версия {activeScene.version || 1}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-stone-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  {wordCount} слов (~{readingTime} мин чтения)
                </span>
              </div>
            </div>

            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Здесь формируется художественный текст сцены на основе канонических битов..."
              rows={22}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-4 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60 font-serif leading-relaxed resize-none"
            />
          </div>

          <div className="flex items-center justify-between border-t border-stone-800 pt-3">
            <span className="text-xs text-stone-500">
              Черновик сцены изолирован от канона до завершения авторской проверки.
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleManualSave}
                disabled={isSaving}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium border border-stone-700 transition-colors"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить черновик'}
              </button>
              <button
                onClick={() => onNavigateTab('review')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5"
              >
                Перейти к рецензии
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
