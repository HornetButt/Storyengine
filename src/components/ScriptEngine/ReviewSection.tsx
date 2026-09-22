import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit3,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  History,
  Layers,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Save,
} from 'lucide-react';
import {
  FullStory,
  Scene,
  CriticReport,
  CanonProposal,
  DraftVersion,
} from '../../domain/storyModel';
import { engineApi } from '../../services/engineApi';

interface ReviewSectionProps {
  story: FullStory;
  selectedSceneId?: string;
  onUpdateStory: (updated: FullStory) => void;
  onNavigateTab: (tab: 'story' | 'world' | 'plot' | 'writer') => void;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  story,
  selectedSceneId,
  onUpdateStory,
  onNavigateTab,
}) => {
  const allScenes = story.plot.acts.flatMap((a) =>
    a.sequences.flatMap((s) => s.scenes)
  );

  const [activeSceneId, setActiveSceneId] = useState<string>(
    selectedSceneId || allScenes[0]?.id || ''
  );
  const activeScene = allScenes.find((s) => s.id === activeSceneId) || allScenes[0];

  const [isReviewing, setIsReviewing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [revisionInstructions, setRevisionInstructions] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Proposal edit modal state
  const [editingPropId, setEditingPropId] = useState<string | null>(null);
  const [editedStatement, setEditedStatement] = useState('');

  if (!activeScene) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-stone-900 border border-stone-800 rounded-xl">
        <ShieldAlert className="w-12 h-12 text-stone-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-stone-200">Сцены для рецензирования отсутствуют</h3>
      </div>
    );
  }

  const handleRunReview = async () => {
    setIsReviewing(true);
    setNotification(null);
    try {
      const result = await engineApi.reviewScene(story.id, activeScene.id, activeScene.draft);
      onUpdateStory(result.story);
      setNotification(`Рецензия Critic завершена. Оценка: ${result.report.score}/100.`);
    } catch (err: any) {
      alert(`Ошибка рецензирования: ${err.message}`);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleExtractCanon = async () => {
    setIsExtracting(true);
    setNotification(null);
    try {
      const result = await engineApi.extractCanon(story.id, activeScene.id);
      onUpdateStory(result.story);
      setNotification(`Извлечено предложений в канон: ${result.proposals.length}.`);
    } catch (err: any) {
      alert(`Ошибка извлечения канона: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRevise = async () => {
    if (!revisionInstructions.trim()) {
      alert('Укажите авторские указания для ревизии.');
      return;
    }
    setIsRevising(true);
    setNotification(null);
    try {
      const result = await engineApi.reviseScene(
        story.id,
        activeScene.id,
        revisionInstructions
      );
      onUpdateStory(result.story);
      setRevisionInstructions('');
      setNotification(`Создан черновик версии v${result.newDraft.versionNumber}.`);
    } catch (err: any) {
      alert(`Ошибка ревизии: ${err.message}`);
    } finally {
      setIsRevising(false);
    }
  };

  const handleAcceptProposal = async (propId: string) => {
    try {
      const result = await engineApi.acceptCanonProposal(story.id, propId);
      onUpdateStory(result.story);
      setNotification('Предложение принято и внесено в канон истории.');
    } catch (err: any) {
      alert(`Ошибка принятия: ${err.message}`);
    }
  };

  const handleRejectProposal = async (propId: string) => {
    try {
      const updated = await engineApi.rejectCanonProposal(story.id, propId);
      onUpdateStory(updated);
      setNotification('Предложение отклонено.');
    } catch (err: any) {
      alert(`Ошибка отклонения: ${err.message}`);
    }
  };

  const handleSaveEditedProposal = async (propId: string) => {
    try {
      await engineApi.editCanonProposal(story.id, propId, { change: editedStatement });
      const result = await engineApi.acceptCanonProposal(story.id, propId, { change: editedStatement });
      onUpdateStory(result.story);
      setEditingPropId(null);
      setNotification('Отредактированное предложение утверждено в канон.');
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    }
  };

  const report = activeScene.criticReport;
  const pendingProposals = story.canon.proposals.filter((p) => p.status === 'pending');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Шаг 5: Рецензия, Канон и Ревизия (Review)
            </span>
            <span className="text-xs text-stone-400">
              Сцена: <strong className="text-stone-200">{activeScene.title}</strong>
            </span>
          </div>
          <h2 className="text-2xl font-bold text-stone-100">Critic & Canon Gateway</h2>
          <p className="text-sm text-stone-400 mt-1 max-w-2xl">
            Строгая проверка на непротиворечивость с каноном, проверка темпоральных статусов персонажей
            и безопасное принятие новых фактов под полным контролем автора.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={activeSceneId}
            onChange={(e) => setActiveSceneId(e.target.value)}
            className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-purple-500/60"
          >
            {allScenes.map((s, idx) => (
              <option key={s.id} value={s.id}>
                Сцена {idx + 1}: {s.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleRunReview}
            disabled={isReviewing || !activeScene.draft}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-stone-100 font-semibold rounded-lg text-xs transition-all shadow-sm disabled:opacity-50"
          >
            {isReviewing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {isReviewing ? 'Проверка...' : 'Запустить Critic'}
          </button>

          <button
            onClick={handleExtractCanon}
            disabled={isExtracting || !activeScene.draft}
            className="flex items-center gap-2 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium border border-stone-700 transition-colors disabled:opacity-50"
          >
            {isExtracting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5 text-amber-400" />}
            Извлечь предложения в канон
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Grid: Critic Report + Proposals & Revision */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (6 cols): Critic Evaluation & Issues */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-semibold text-stone-100 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                Заключение рецензента (Critic Report)
              </h3>

              {report && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">Оценка:</span>
                  <span
                    className={`text-sm font-bold px-2.5 py-0.5 rounded-full border ${
                      report.score >= 75
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                        : report.score >= 55
                        ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                        : 'bg-red-950/60 text-red-300 border-red-800/60'
                    }`}
                  >
                    {report.score}/100
                  </span>
                </div>
              )}
            </div>

            {!report ? (
              <div className="text-center py-8 text-stone-500 text-xs">
                Рецензия ещё не проводилась. Нажмите «Запустить Critic» для проверки текста сцены.
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-stone-300 leading-relaxed bg-stone-950/60 p-3 rounded-lg border border-stone-800">
                  {report.summary}
                </p>

                {report.positiveHighlights && report.positiveHighlights.length > 0 && (
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                      Удачные решения:
                    </h5>
                    <ul className="text-xs text-stone-400 space-y-1 pl-4 list-disc">
                      {report.positiveHighlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Issues List */}
                <div className="space-y-2 pt-2">
                  <h5 className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Замечания & Несоответствия ({report.issues.length})
                  </h5>

                  {report.issues.length === 0 ? (
                    <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Критических противоречий с каноном и правил мира не выявлено!
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                      {report.issues.map((issue) => {
                        const isError = issue.severity === 'error';
                        return (
                          <div
                            key={issue.id}
                            className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                              isError
                                ? 'bg-red-950/30 border-red-800/60 text-red-200'
                                : 'bg-amber-950/20 border-amber-800/50 text-amber-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-stone-100 flex items-center gap-1.5">
                                {isError ? (
                                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                )}
                                {issue.location}
                              </span>
                              <span
                                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                  isError ? 'bg-red-900/60 text-red-300' : 'bg-amber-900/60 text-amber-300'
                                }`}
                              >
                                {issue.category}
                              </span>
                            </div>

                            <p className="text-stone-300 leading-relaxed">{issue.explanation}</p>

                            {issue.suggestedFix && (
                              <div className="text-[11px] text-stone-400 bg-stone-950/60 p-2 rounded border border-stone-800/80">
                                <strong className="text-amber-400">Совет редактора:</strong>{' '}
                                {issue.suggestedFix}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (6 cols): Canon Proposals Inbox & Smart Reviser */}
        <div className="lg:col-span-6 space-y-6">
          {/* Canon Proposals Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-semibold text-stone-100 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                Предложения в канон (Canon Proposals Inbox)
              </h3>
              <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {pendingProposals.length} ожидают автора
              </span>
            </div>

            {pendingProposals.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-2">
                Нет предложений, ожидающих подтверждения. Нажмите «Извлечь предложения в канон» для анализа черновика.
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {pendingProposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-3 bg-stone-950 border border-stone-800 rounded-lg text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-semibold text-purple-400 uppercase">
                        {prop.type} {prop.character ? `— ${prop.character}` : ''}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        Точность: {Math.round(prop.confidence * 100)}%
                      </span>
                    </div>

                    {editingPropId === prop.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editedStatement}
                          onChange={(e) => setEditedStatement(e.target.value)}
                          rows={2}
                          className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-xs text-stone-200"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingPropId(null)}
                            className="px-2 py-1 text-[11px] text-stone-400"
                          >
                            Отмена
                          </button>
                          <button
                            onClick={() => handleSaveEditedProposal(prop.id)}
                            className="px-2.5 py-1 text-[11px] bg-emerald-600 text-stone-950 font-semibold rounded"
                          >
                            Утвердить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-stone-200 font-medium leading-relaxed">{prop.change}</p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-stone-800/80">
                      <span className="text-[10px] text-stone-500 italic">Источник: {prop.source}</span>

                      {editingPropId !== prop.id && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingPropId(prop.id);
                              setEditedStatement(prop.change);
                            }}
                            className="p-1 text-stone-400 hover:text-stone-200"
                            title="Редактировать перед принятием"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRejectProposal(prop.id)}
                            className="px-2 py-1 text-[11px] bg-stone-800 hover:bg-stone-700 text-stone-300 rounded"
                          >
                            Отклонить
                          </button>
                          <button
                            onClick={() => handleAcceptProposal(prop.id)}
                            className="px-2.5 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-semibold rounded flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            В канон
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Smart Reviser Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-semibold text-stone-100 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Умная ревизия сцены (Reviser)
              </h3>
              <span className="text-xs text-stone-400">
                История версий: {activeScene.drafts.length}
              </span>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Не перезаписывайте текст вслепую! Ревизор создаёт новую версию черновика (Draft v2, v3),
              исправляя найденные ошибки рецензента по вашим точным указаниям.
            </p>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Инструкция автору / Что исправить в сцене
              </label>
              <textarea
                value={revisionInstructions}
                onChange={(e) => setRevisionInstructions(e.target.value)}
                rows={3}
                placeholder="Например: Удали упоминание живого Михаила, замени на найденную записку. Сделай диалог острее..."
                className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60 resize-none leading-relaxed"
              />
            </div>

            <button
              onClick={handleRevise}
              disabled={isRevising || !revisionInstructions.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-semibold rounded-lg text-xs transition-all shadow-sm disabled:opacity-50"
            >
              {isRevising ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isRevising ? 'Создание новой редакции...' : 'Выполнить ревизию (Создать версию черновика)'}
            </button>

            {/* Version History List */}
            {activeScene.drafts.length > 0 && (
              <div className="pt-3 border-t border-stone-800">
                <h5 className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="w-3 h-3 text-stone-500" />
                  Сохранённые версии черновика:
                </h5>
                <div className="space-y-1.5">
                  {activeScene.drafts.map((d) => (
                    <div
                      key={d.id}
                      className="p-2 bg-stone-950 rounded border border-stone-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-stone-200 mr-2">
                          Версия {d.versionNumber}
                        </span>
                        <span className="text-stone-400 text-[11px]">
                          {d.changeDescription || 'Редакция'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500">
                        {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
