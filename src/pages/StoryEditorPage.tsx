import React, { useState, useEffect } from 'react';
import { Story, Universe, ConsistencyReport } from '../types';
import { ConsistencyBadge } from '../components/ConsistencyBadge';
import { Teleprompter } from '../components/Teleprompter';
import { api } from '../services/api';
import {
  Save,
  CheckCircle,
  Sparkles,
  Search,
  Layers,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Wand2,
  Trash2,
  FileText,
  Tv,
  FileEdit,
} from 'lucide-react';

interface StoryEditorPageProps {
  storyId: string;
  universes: Universe[];
  onBack: () => void;
  onOpenCanvas?: (storyId: string) => void;
  onStoryUpdated: () => void;
}

export const StoryEditorPage: React.FC<StoryEditorPageProps> = ({
  storyId,
  universes,
  onBack,
  onOpenCanvas,
  onStoryUpdated,
}) => {
  const [story, setStory] = useState<Story | null>(null);
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [fullText, setFullText] = useState('');
  const [universeId, setUniverseId] = useState('');
  const [storyYear, setStoryYear] = useState(2026);
  const [canonStatus, setCanonStatus] = useState<any>('canon');
  const [status, setStatus] = useState<any>('draft');
  const [changeSummary, setChangeSummary] = useState('');

  const [iterativePrompt, setIterativePrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isIterating, setIsIterating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'versions'>('text');
  const [isPrompterOpen, setIsPrompterOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStory();
  }, [storyId]);

  const loadStory = async () => {
    try {
      const data = await api.getStory(storyId);
      setStory(data);
      setTitle(data.title);
      setSynopsis(data.synopsis);
      setFullText(data.fullText);
      setUniverseId(data.universeId);
      setStoryYear(data.storyYear);
      setCanonStatus(data.canonStatus);
      setStatus(data.status);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateStory(
        storyId,
        {
          title,
          synopsis,
          fullText,
          universeId,
          storyYear: Number(storyYear),
          canonStatus,
          status,
        },
        changeSummary || 'Редактирование автором'
      );
      setStory(updated);
      setChangeSummary('');
      setMessage({ type: 'success', text: 'История успешно сохранена! Создана новая версия.' });
      onStoryUpdated();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Ошибка сохранения' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setMessage(null);
    try {
      const report: ConsistencyReport = await api.validateStory(storyId, fullText);
      if (story) {
        setStory({
          ...story,
          consistencyReport: report,
          consistencyStatus: report.passed ? 'passed' : 'has_conflicts',
        });
      }
      setMessage({
        type: report.passed ? 'success' : 'error',
        text: report.summary,
      });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsValidating(false);
    }
  };

  const handleExtractKnowledge = async () => {
    setIsExtracting(true);
    setMessage(null);
    try {
      const changes = await api.extractKnowledge(storyId);
      setMessage({
        type: 'success',
        text: `Извлечено ${changes.length} предложений новых фактов в очередь канона!`,
      });
      onStoryUpdated();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleIterativeEdit = async () => {
    if (!iterativePrompt.trim()) return;
    setIsIterating(true);
    setMessage(null);
    try {
      const res = await api.iterateStory(storyId, iterativePrompt);
      setStory(res.story);
      setTitle(res.story.title);
      setSynopsis(res.story.synopsis);
      setFullText(res.story.fullText);
      setIterativePrompt('');
      setMessage({
        type: 'success',
        text: 'Правка успешно применена и проверена на непротиворечивость!',
      });
      onStoryUpdated();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsIterating(false);
    }
  };

  if (!story) {
    return (
      <div className="p-8 text-center text-stone-400">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Загрузка истории...
      </div>
    );
  }

  const wordCount = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-stone-950">
      {/* Top action toolbar */}
      <div className="h-14 border-b border-stone-800 px-6 flex items-center justify-between bg-stone-900 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            title="Назад к библиотеке"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-stone-100 text-sm max-w-sm truncate">{title}</span>
          <ConsistencyBadge status={story.consistencyStatus || 'not_checked'} size="sm" />
        </div>

        <div className="flex items-center space-x-2">
          {message && (
            <span
              className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                message.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              {message.text}
            </span>
          )}

          <button
            onClick={handleExtractKnowledge}
            disabled={isExtracting}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            title="Извлечь факты и сущности в базу знаний"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isExtracting ? 'Извлечение...' : 'Извлечь знания'}</span>
          </button>

          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isValidating ? 'Проверка...' : 'Проверить канон'}</span>
          </button>

          <button
            onClick={() => setIsPrompterOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-medium border border-amber-500/40 flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Открыть текст в режиме телесуфлера для озвучки или декламации"
          >
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span>Телесуфлер</span>
          </button>

          {onOpenCanvas && (
            <button
              onClick={() => onOpenCanvas(storyId)}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 flex items-center space-x-1.5 transition-colors"
              title="Открыть в режиме Word-холста с проверкой живых/мертвых героев и интеграцией с базой знаний"
            >
              <FileEdit className="w-3.5 h-3.5 text-amber-400" />
              <span>Холст (Word)</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
          </button>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Column: Metadata & Version History (3 cols) */}
        <div className="col-span-3 border-r border-stone-800 p-5 overflow-y-auto space-y-5 bg-stone-900/40 text-xs">
          <div>
            <h3 className="font-semibold text-stone-200 uppercase tracking-wider text-[11px] mb-3">
              Параметры канона
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-stone-400 mb-1">Название истории</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Вселенная</label>
                <select
                  value={universeId}
                  onChange={(e) => setUniverseId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-xs focus:outline-none"
                >
                  {universes.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-400 mb-1">Год действия</label>
                  <input
                    type="number"
                    value={storyYear}
                    onChange={(e) => setStoryYear(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Канон</label>
                  <select
                    value={canonStatus}
                    onChange={(e) => setCanonStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-xs focus:outline-none"
                  >
                    <option value="canon">Canon</option>
                    <option value="non_canon">Non-Canon</option>
                    <option value="alternate">Alternate</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Статус публикации</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-xs focus:outline-none"
                >
                  <option value="published">Опубликовано</option>
                  <option value="reviewed">Проверено</option>
                  <option value="generated">Сгенерировано</option>
                  <option value="draft">Черновик</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Краткий синопсис</label>
                <textarea
                  rows={3}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-xs focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Заметка к версии (при сохранении)</label>
                <input
                  type="text"
                  placeholder="Что изменилось в этой версии..."
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-xs focus:outline-none placeholder-stone-500"
                />
              </div>
            </div>
          </div>

          {/* Versions List */}
          <div className="pt-4 border-t border-stone-800">
            <h3 className="font-semibold text-stone-200 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              История версий ({story.versions?.length || 1})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {story.versions?.map((ver: any) => (
                <div
                  key={ver.id}
                  onClick={() => {
                    setFullText(ver.fullText);
                    setTitle(ver.title);
                    setMessage({
                      type: 'success',
                      text: `Загружен текст версии v${ver.versionNumber}`,
                    });
                  }}
                  className="p-2.5 rounded-lg bg-stone-800/80 hover:bg-stone-800 border border-stone-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between font-mono font-medium text-[11px] text-amber-300">
                    <span>v{ver.versionNumber}</span>
                    <span className="text-stone-500 text-[10px]">
                      {new Date(ver.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-1">
                    {ver.changeSummary || 'Версия рассказа'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Text Editor & Iterative Bar (6 cols) */}
        <div className="col-span-6 flex flex-col border-r border-stone-800 bg-stone-950 overflow-hidden">
          {/* Editor Header / Stats */}
          <div className="px-6 py-2.5 border-b border-stone-800/80 bg-stone-900/50 flex items-center justify-between text-xs text-stone-400">
            <span className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              Текст истории (Markdown/Plain Text)
            </span>
            <span>{wordCount} слов • {fullText.length} символов</span>
          </div>

          {/* Textarea */}
          <div className="flex-1 p-6 overflow-y-auto">
            <textarea
              value={fullText}
              onChange={(e) => setFullText(e.target.value)}
              placeholder="Начните писать историю или используйте генератор..."
              className="w-full h-full bg-transparent text-stone-100 text-sm font-serif leading-relaxed focus:outline-none resize-none placeholder-stone-600"
            />
          </div>

          {/* Iterative Prompt Bar */}
          <div className="p-4 border-t border-stone-800 bg-stone-900/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                Итеративная доработка истории через LLM
              </label>
              <span className="text-[11px] text-stone-500">Сохраняет контекст и факты</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={iterativePrompt}
                onChange={(e) => setIterativePrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleIterativeEdit()}
                placeholder="«Сделай начало более медленным», «Замени имя героя», «Добавь отсылку к старой синей двери»..."
                className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500"
              />
              <button
                onClick={handleIterativeEdit}
                disabled={isIterating || !iterativePrompt.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 shrink-0"
              >
                {isIterating ? 'Правка...' : 'Применить'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Entities, References & Consistency Report (3 cols) */}
        <div className="col-span-3 p-5 overflow-y-auto space-y-6 bg-stone-900/40 text-xs">
          {/* Consistency Report Block */}
          <div className="space-y-3">
            <h3 className="font-semibold text-stone-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Отчёт консистентности канона
            </h3>

            {story.consistencyReport ? (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-stone-400">Индекс доверия:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {story.consistencyReport.score}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    {story.consistencyReport.summary}
                  </p>
                </div>

                {story.consistencyReport.issues.map((issue: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-[11px] space-y-1.5 ${
                      issue.severity === 'error'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                        : issue.severity === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      {issue.severity === 'error' && <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
                      {issue.message}
                    </div>
                    {issue.suggestedFix && (
                      <div className="text-[10px] text-stone-300 pl-2 border-l-2 border-amber-500/40 whitespace-pre-line">
                        {issue.suggestedFix}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-stone-800 bg-stone-900 text-center text-stone-500">
                Нажмите «Проверить канон» для автоматического аудита временной линии и персонажей.
              </div>
            )}
          </div>

          {/* Canonical Guidance for this story year */}
          <div className="p-4 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2">
            <h4 className="font-semibold text-stone-200 text-[11px]">Факты таймлайна ({storyYear} г.)</h4>
            <ul className="text-[11px] text-stone-400 space-y-1 list-disc pl-4 leading-relaxed">
              {storyYear >= 2025 && (
                <li className="text-rose-400 font-medium">
                  Михаил Северов погиб в октябре 2025 г. (только в воспоминаниях)
                </li>
              )}
              {storyYear >= 2025 && <li>Старый дом сожжён до фундамента</li>}
              {storyYear >= 2026 && <li>Алексей Корнеев работает сторожем на метеостанции</li>}
            </ul>
          </div>
        </div>
      </div>

      {isPrompterOpen && story && (
        <Teleprompter
          initialStoryId={story.id}
          initialTitle={title}
          initialText={fullText}
          isOverlay={true}
          onClose={() => setIsPrompterOpen(false)}
        />
      )}
    </div>
  );
};
