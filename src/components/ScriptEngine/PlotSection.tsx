import React, { useState } from 'react';
import {
  GitBranch,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Plus,
  Play,
  FileEdit,
  Trash2,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  FullStory,
  Plot,
  Act,
  Sequence,
  Scene,
  Beat,
} from '../../domain/storyModel';
import { engineApi } from '../../services/engineApi';

interface PlotSectionProps {
  story: FullStory;
  onUpdateStory: (updated: FullStory) => void;
  onSelectSceneForWriting: (sceneId: string) => void;
  onNavigateTab: (tab: 'story' | 'world' | 'writer' | 'review') => void;
}

export const PlotSection: React.FC<PlotSectionProps> = ({
  story,
  onUpdateStory,
  onSelectSceneForWriting,
  onNavigateTab,
}) => {
  const [plot, setPlot] = useState<Plot>(story.plot);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planningSceneId, setPlanningSceneId] = useState<string | null>(null);
  const [expandedActs, setExpandedActs] = useState<Record<string, boolean>>({
    [story.plot.acts[0]?.id || 'act-1']: true,
  });
  const [expandedSequences, setExpandedSequences] = useState<Record<string, boolean>>({
    [story.plot.acts[0]?.sequences[0]?.id || 'seq-1']: true,
  });

  const toggleAct = (actId: string) => {
    setExpandedActs((prev) => ({ ...prev, [actId]: !prev[actId] }));
  };

  const toggleSequence = (seqId: string) => {
    setExpandedSequences((prev) => ({ ...prev, [seqId]: !prev[seqId] }));
  };

  const handleGeneratePlot = async () => {
    setIsGenerating(true);
    try {
      const updated = await engineApi.generatePlot(story.id);
      setPlot(updated.plot);
      onUpdateStory(updated);
      // Auto expand all acts
      const actsMap: Record<string, boolean> = {};
      const seqMap: Record<string, boolean> = {};
      updated.plot.acts.forEach((a) => {
        actsMap[a.id] = true;
        a.sequences.forEach((s) => {
          seqMap[s.id] = true;
        });
      });
      setExpandedActs(actsMap);
      setExpandedSequences(seqMap);
    } catch (err: any) {
      alert(`Ошибка генерации сюжета: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlanBeats = async (sceneId: string) => {
    setPlanningSceneId(sceneId);
    try {
      const result = await engineApi.planBeats(story.id, sceneId);
      setPlot(result.story.plot);
      onUpdateStory(result.story);
    } catch (err: any) {
      alert(`Ошибка разбивки сцены на биты: ${err.message}`);
    } finally {
      setPlanningSceneId(null);
    }
  };

  const countScenes = () => {
    return plot.acts.reduce(
      (sum, act) => sum + act.sequences.reduce((s2, seq) => s2 + seq.scenes.length, 0),
      0
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Шаг 3: Сюжетное древо (Plot Tree)
            </span>
            <span className="text-xs text-stone-400">
              Структура: <strong>3 акта / {countScenes()} сцен</strong>
            </span>
          </div>
          <h2 className="text-2xl font-bold text-stone-100">Древо сюжета: Акты → Секвенции → Сцены → Биты</h2>
          <p className="text-sm text-stone-400 mt-1 max-w-2xl">
            Сценарий разворачивается как иерархическое дерево. Каждая сцена преследует цель и разбивается
            на драматические биты перед написанием прозы.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGeneratePlot}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-semibold rounded-lg text-xs transition-all shadow-sm disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {isGenerating ? 'Построение сюжета...' : 'Сгенерировать структуру (LLM)'}
          </button>
          <button
            onClick={() => onNavigateTab('writer')}
            className="flex items-center gap-2 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold border border-stone-700 transition-colors"
          >
            В мастерскую (Writer)
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Acts & Hierarchy Accordion */}
      <div className="space-y-4">
        {plot.acts.map((act) => {
          const isActOpen = expandedActs[act.id] ?? true;

          return (
            <div
              key={act.id}
              className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden transition-all"
            >
              {/* Act Header */}
              <div
                onClick={() => toggleAct(act.id)}
                className="p-4 bg-stone-900/90 hover:bg-stone-800/40 cursor-pointer flex items-center justify-between border-b border-stone-800/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button className="text-stone-400 hover:text-stone-200 p-0.5">
                    {isActOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Акт {act.actIndex + 1}
                      </span>
                      <h3 className="font-semibold text-stone-100 text-sm">{act.title}</h3>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">{act.goal}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-stone-400">
                  <span>{act.sequences.length} секвенций</span>
                </div>
              </div>

              {/* Sequences & Scenes */}
              {isActOpen && (
                <div className="p-4 space-y-4 bg-stone-950/30">
                  {act.sequences.map((seq, seqIdx) => {
                    const isSeqOpen = expandedSequences[seq.id] ?? true;

                    return (
                      <div
                        key={seq.id}
                        className="bg-stone-900/70 border border-stone-800/80 rounded-lg overflow-hidden"
                      >
                        {/* Sequence Bar */}
                        <div
                          onClick={() => toggleSequence(seq.id)}
                          className="px-4 py-2.5 bg-stone-800/40 hover:bg-stone-800/70 cursor-pointer flex items-center justify-between border-b border-stone-800/60 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <button className="text-stone-400 p-0.5">
                              {isSeqOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                            <span className="text-xs font-medium text-stone-200">
                              Секвенция {seqIdx + 1}: {seq.title}
                            </span>
                            {seq.objective && (
                              <span className="text-[11px] text-stone-400 italic hidden md:inline">
                                — «{seq.objective}»
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-400">
                            {seq.scenes.length} сцен
                          </span>
                        </div>

                        {/* Scenes List */}
                        {isSeqOpen && (
                          <div className="p-3 space-y-2.5">
                            {seq.scenes.map((scene) => {
                              const hasDraft = !!scene.draft;
                              const hasBeats = scene.beats.length > 0;
                              const isPlanningThis = planningSceneId === scene.id;

                              return (
                                <div
                                  key={scene.id}
                                  className="bg-stone-950 border border-stone-800/80 rounded-lg p-3.5 hover:border-stone-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-semibold text-stone-100">
                                        {scene.title}
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 flex items-center gap-1">
                                        <MapPin className="w-2.5 h-2.5 text-amber-400" />
                                        {scene.location}
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 flex items-center gap-1">
                                        <Users className="w-2.5 h-2.5 text-blue-400" />
                                        {scene.characters.join(', ')}
                                      </span>
                                      {hasDraft && (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                                          <CheckCircle2 className="w-2.5 h-2.5" />
                                          Черновик v{scene.version || 1}
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-xs text-stone-400 grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                      <div>
                                        <strong className="text-stone-300">Цель сцены:</strong>{' '}
                                        {scene.purpose}
                                      </div>
                                      <div>
                                        <strong className="text-stone-300">Конфликт:</strong>{' '}
                                        {scene.conflict}
                                      </div>
                                    </div>

                                    {scene.beats.length > 0 && (
                                      <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] text-stone-500 uppercase font-semibold">
                                          Биты ({scene.beats.length}):
                                        </span>
                                        {scene.beats.map((b) => (
                                          <span
                                            key={b.id}
                                            className={`text-[10px] px-2 py-0.5 rounded border ${
                                              b.status === 'generated' || b.status === 'approved'
                                                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                                                : 'bg-stone-900 text-stone-400 border-stone-800'
                                            }`}
                                          >
                                            {b.beatIndex + 1}. {b.purpose || b.title}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => handlePlanBeats(scene.id)}
                                      disabled={isPlanningThis}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium border border-stone-700 transition-colors disabled:opacity-50"
                                      title="Разбить сцену на драматические биты"
                                    >
                                      {isPlanningThis ? (
                                        <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                                      ) : (
                                        <Zap className="w-3 h-3 text-amber-400" />
                                      )}
                                      {hasBeats ? 'Переразбить биты' : 'Спланировать биты'}
                                    </button>

                                    <button
                                      onClick={() => onSelectSceneForWriting(scene.id)}
                                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold rounded-lg text-xs transition-colors shadow-sm"
                                    >
                                      <FileEdit className="w-3.5 h-3.5" />
                                      Писать сцену
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
