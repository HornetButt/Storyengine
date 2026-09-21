import React, { useState } from 'react';
import {
  Universe,
  Character,
  StoryLocation,
  GenerateStoryRequest,
  StoryBible,
} from '../types';
import { api } from '../services/api';
import { ConsistencyBadge } from '../components/ConsistencyBadge';
import { ProposedChangesWidget } from '../components/ProposedChangesWidget';
import {
  Sparkles,
  BookOpen,
  Calendar,
  Users,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Eye,
  CheckCircle2,
  Sliders,
  AlertOctagon,
  FileText,
} from 'lucide-react';

interface GenerationPageProps {
  universes: Universe[];
  characters: Character[];
  locations: StoryLocation[];
  selectedUniverseId: string;
  onSelectStory: (id: string) => void;
  onRefreshAll: () => void;
  onOpenBeatsStudio?: (storyId?: string) => void;
}

export const GenerationPage: React.FC<GenerationPageProps> = ({
  universes,
  characters,
  locations,
  selectedUniverseId,
  onSelectStory,
  onRefreshAll,
  onOpenBeatsStudio,
}) => {
  const [universeId, setUniverseId] = useState(selectedUniverseId || universes[0]?.id || '');
  const [storyYear, setStoryYear] = useState(2026);
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>(['char-1', 'char-2']);
  const [selectedLocIds, setSelectedLocIds] = useState<string[]>(['loc-1']);
  const [canonStatus, setCanonStatus] = useState<any>('canon');
  const [style, setStyle] = useState('Атмосферный мистический триллер с психологизмом');
  const [length, setLength] = useState<any>('medium');
  const [referenceLevel, setReferenceLevel] = useState<any>('subtle');
  const [prompt, setPrompt] = useState(
    'Исследователь находит старую радиостанцию в овраге Сосновки и пытается расшифровать сигнал из подвала'
  );
  const [forbiddenText, setForbiddenText] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [storyBible, setStoryBible] = useState<StoryBible | null>(null);
  const [previewBible, setPreviewBible] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    'Формирование Story Bible и проверка фактов',
    'Построение плана сцен и канонического контура',
    'Генерация связного художественного текста',
    'Автоматический аудит непротиворечивости канона',
    'Извлечение новых фактов в очередь согласования',
  ];

  const handlePreviewBible = async () => {
    try {
      const bible = await api.getStoryBible({
        universeId,
        storyYear,
        characterIds: selectedCharIds,
        locationIds: selectedLocIds,
        canonStatus,
        style,
        length,
        referenceLevel,
        prompt,
        forbiddenElements: forbiddenText ? [forbiddenText] : [],
      });
      setStoryBible(bible);
      setPreviewBible(true);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setError(null);
    setCurrentStep(1);

    try {
      // Simulate step increments for transparent UX
      setTimeout(() => setCurrentStep(2), 700);
      setTimeout(() => setCurrentStep(3), 1600);

      const res = await api.generateStory({
        universeId,
        storyYear,
        characterIds: selectedCharIds,
        locationIds: selectedLocIds,
        canonStatus,
        style,
        length,
        referenceLevel,
        prompt,
        forbiddenElements: forbiddenText ? [forbiddenText] : [],
      });

      setCurrentStep(4);
      setTimeout(() => {
        setCurrentStep(5);
        setGeneratedResult(res);
        setIsGenerating(false);
        onRefreshAll();
      }, 800);
    } catch (e: any) {
      setError(e.message || 'Ошибка генерации');
      setIsGenerating(false);
      setCurrentStep(0);
    }
  };

  const handleAcceptChange = async (id: string) => {
    await api.acceptProposedChange(id);
    if (generatedResult) {
      setGeneratedResult({
        ...generatedResult,
        proposedChanges: generatedResult.proposedChanges.filter((c: any) => c.id !== id),
      });
    }
    onRefreshAll();
  };

  const handleRejectChange = async (id: string) => {
    await api.rejectProposedChange(id);
    if (generatedResult) {
      setGeneratedResult({
        ...generatedResult,
        proposedChanges: generatedResult.proposedChanges.filter((c: any) => c.id !== id),
      });
    }
    onRefreshAll();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-semibold">
            CANON-AWARE GENERATOR
          </span>
        </div>
        <h2 className="text-xl font-bold text-stone-100 mt-1 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Генератор связанных историй
        </h2>
        <p className="text-xs text-stone-400 mt-1">
          Генерация с обязательным соблюдением темпорального статуса персонажей, правил мира и управляемым уровнем отсылок.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Main Grid: Parameters on Left, Real-time Pipeline / Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: 5 cols */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-5 text-xs">
          <h3 className="font-semibold text-stone-100 text-sm flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            Параметры генерации
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-400 mb-1">Вселенная</label>
              <select
                value={universeId}
                onChange={(e) => setUniverseId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 focus:outline-none"
              >
                {universes.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-stone-400 mb-1">Год событий</label>
              <input
                type="number"
                value={storyYear}
                onChange={(e) => setStoryYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Temporal Warning hint */}
          {storyYear >= 2025 && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-[11px] flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Внимание: в {storyYear} г. Михаил погиб, Старый дом разрушен. Генератор автоматически учтёт эти ограничения!
              </span>
            </div>
          )}

          <div>
            <label className="block text-stone-400 mb-1 font-medium">
              Идея рассказа / Запрос автора
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите ключевой конфликт, персонажей или тайну..."
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-400 mb-1">Статус канона</label>
              <select
                value={canonStatus}
                onChange={(e) => setCanonStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 focus:outline-none"
              >
                <option value="canon">Canon (Основной)</option>
                <option value="alternate">Alternate (Альтернатива)</option>
                <option value="draft">Draft (Черновик)</option>
                <option value="non_canon">Non-Canon (Свободный)</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-400 mb-1">Уровень отсылок к другим историям</label>
              <select
                value={referenceLevel}
                onChange={(e) => setReferenceLevel(e.target.value as any)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 focus:outline-none"
              >
                <option value="subtle">Тонкие (пасхалки, намёки)</option>
                <option value="obvious">Явные (прямые связи)</option>
                <option value="none">Без отсылок (изолированно)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-400 mb-1">Объём текста</label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as any)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 focus:outline-none"
              >
                <option value="short">Короткий (~300-500 слов)</option>
                <option value="medium">Средний (~800-1200 слов)</option>
                <option value="long">Развёрнутый (~2000+ слов)</option>
              </select>
            </div>
            <div>
              <label className="block text-stone-400 mb-1">Стиль повествования</label>
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-400 mb-1">
              Запрещенные элементы (Ограничения автора)
            </label>
            <input
              type="text"
              value={forbiddenText}
              onChange={(e) => setForbiddenText(e.target.value)}
              placeholder="Например: Не использовать хеппи-энд, не упоминать полицию..."
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={handlePreviewBible}
              className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold transition-colors flex items-center justify-center space-x-2 border border-stone-700"
            >
              <Eye className="w-4 h-4 text-stone-400" />
              <span>Посмотреть Story Bible</span>
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleStartGeneration}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'Генерация...' : 'Сгенерировать'}</span>
            </button>
          </div>

          {onOpenBeatsStudio && (
            <button
              type="button"
              onClick={() => onOpenBeatsStudio()}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/25 to-amber-600/15 hover:from-amber-500/25 hover:to-amber-600/25 text-amber-300 font-semibold transition-all flex items-center justify-center space-x-2 border border-amber-500/40 text-xs shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Пошаговое написание по сценам и битам (Story Beats Studio) →</span>
            </button>
          )}
        </div>

        {/* Right Output: 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Generation Progress Pipeline */}
          {isGenerating && (
            <div className="p-6 rounded-2xl bg-stone-900 border border-amber-500/30 space-y-4 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <h4 className="font-semibold text-stone-100 text-sm">
                  Story Engine Generation Pipeline в процессе...
                </h4>
              </div>

              <div className="space-y-2">
                {steps.map((st, idx) => {
                  const stepNum = idx + 1;
                  const isDone = currentStep > stepNum;
                  const isCurrent = currentStep === stepNum;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center space-x-3 text-xs p-2 rounded-lg transition-colors ${
                        isCurrent
                          ? 'bg-amber-500/10 text-amber-300 font-medium'
                          : isDone
                          ? 'text-emerald-400'
                          : 'text-stone-500'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full border border-amber-400 flex items-center justify-center text-[10px] font-bold text-amber-400">
                          {stepNum}
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-stone-700 flex items-center justify-center text-[10px] text-stone-600">
                          {stepNum}
                        </div>
                      )}
                      <span>{st}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Story Bible Preview Modal/Box */}
          {previewBible && storyBible && (
            <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-stone-100 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  Сформированная Story Bible (Контекст для LLM)
                </h4>
                <button
                  onClick={() => setPreviewBible(false)}
                  className="text-stone-400 hover:text-stone-200 text-xs"
                >
                  Скрыть
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-stone-950 border border-stone-800">
                  <span className="font-semibold text-stone-300 block mb-1">
                    Канонические ограничения года ({storyBible.storyYear} г.):
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-stone-400">
                    {storyBible.canonConstraints.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-stone-950 border border-stone-800">
                  <span className="font-semibold text-rose-400 block mb-1">
                    Строго запрещенные элементы:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-stone-400">
                    {storyBible.forbiddenElements.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                {storyBible.potentialReferences.length > 0 && (
                  <div className="p-3 rounded-lg bg-stone-950 border border-stone-800">
                    <span className="font-semibold text-amber-400 block mb-1">
                      Рекомендованные отсылки к предыдущим историям:
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-stone-400">
                      {storyBible.potentialReferences.map((r: any, i: number) => (
                        <li key={i}>
                          <strong className="text-stone-300">{r.itemOrPhrase}:</strong> {r.suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Generated Result Card */}
          {generatedResult && (
            <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px] font-semibold">
                      СГЕНЕРИРОВАНО
                    </span>
                    <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-400 font-mono text-[11px]">
                      {generatedResult.story.storyYear} г.
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-stone-100 mt-1">
                    {generatedResult.story.title}
                  </h3>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <ConsistencyBadge status={generatedResult.consistencyReport.passed ? 'passed' : 'has_conflicts'} />
                  <button
                    onClick={() => onSelectStory(generatedResult.story.id)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-md"
                  >
                    <span>Открыть в редакторе</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Consistency Summary */}
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300">
                <span className="font-semibold text-amber-400 block mb-1">
                  Аудит непротиворечивости ({generatedResult.consistencyReport.score}/100):
                </span>
                <p>{generatedResult.consistencyReport.summary}</p>
              </div>

              {/* Story Text Excerpt */}
              <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 max-h-72 overflow-y-auto">
                <p className="text-xs text-stone-200 font-serif leading-relaxed whitespace-pre-line">
                  {generatedResult.story.fullText}
                </p>
              </div>

              {/* Proposed Knowledge Changes Section */}
              {generatedResult.proposedChanges.length > 0 && (
                <div className="pt-2 border-t border-stone-800">
                  <ProposedChangesWidget
                    changes={generatedResult.proposedChanges}
                    onAccept={handleAcceptChange}
                    onReject={handleRejectChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
