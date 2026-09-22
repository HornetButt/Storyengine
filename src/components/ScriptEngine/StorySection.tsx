import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Tag,
  CheckCircle2,
  Clock,
  Compass,
  Save,
  RefreshCw,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { FullStory, StoryConcept } from '../../domain/storyModel';
import { engineApi } from '../../services/engineApi';

interface StorySectionProps {
  story: FullStory;
  onUpdateStory: (updated: FullStory) => void;
  onNavigateTab: (tab: 'world' | 'plot' | 'writer' | 'review') => void;
}

const GENRE_PROFILES = [
  { id: 'detective', name: 'Детектив / Расследование', tone: 'Холодный, аналитичный, напряжённый' },
  { id: 'drama', name: 'Психологическая драма', tone: 'Глубокий, интимный, эмоциональный' },
  { id: 'scifi', name: 'Научная фантастика', tone: 'Интеллектуальный, масштабный, детализированный' },
  { id: 'cyberpunk', name: 'Киберпанк / Неонуар', tone: 'Мрачный, неоновый, циничный' },
  { id: 'thriller', name: 'Психологический триллер', tone: 'Клаустрофобный, тревожный, динамичный' },
  { id: 'horror', name: 'Мистика / Хоррор', tone: 'Жуткий, атмосферный, лавкрафтовский' },
  { id: 'historical', name: 'Историческая драма', tone: 'Эпический, строгий, аутентичный' },
  { id: 'fantasy', name: 'Тёмное фэнтези', tone: 'Таинственный, жестокий, мифологичный' },
];

export const StorySection: React.FC<StorySectionProps> = ({
  story,
  onUpdateStory,
  onNavigateTab,
}) => {
  const [concept, setConcept] = useState<StoryConcept>(story.concept);
  const [ideaPrompt, setIdeaPrompt] = useState(story.concept.premise);
  const [storyYear, setStoryYear] = useState(story.storyYear);
  const [title, setTitle] = useState(story.title);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleGenerateConcept = async () => {
    setIsGenerating(true);
    setSaveMessage(null);
    try {
      const updated = await engineApi.generateConcept(story.id, ideaPrompt);
      setConcept(updated.concept);
      setTitle(updated.title);
      onUpdateStory(updated);
      setSaveMessage('Концепт успешно сгенерирован и структурирован.');
    } catch (err: any) {
      alert(`Ошибка генерации концепта: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveConcept = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const updated = await engineApi.updateStory(story.id, {
        title,
        storyYear,
        concept,
      });
      onUpdateStory(updated);
      setSaveMessage('Изменения концепта сохранены в каноне истории.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      alert(`Ошибка сохранения: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProgress = () => {
    let score = 0;
    if (story.concept.premise) score += 20;
    if (story.storyBible.characters.length > 0) score += 20;
    if (story.plot.acts.length > 0 && story.plot.acts[0].sequences.length > 0) score += 20;
    const allScenes = story.plot.acts.flatMap((a) => a.sequences.flatMap((s) => s.scenes));
    if (allScenes.some((s) => s.beats.length > 0)) score += 20;
    if (allScenes.some((s) => s.draft)) score += 20;
    return score;
  };

  const progress = calculateProgress();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner & Progress */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Шаг 1: Концепция & Замысел
              </span>
              <span className="text-xs text-stone-400">
                Вселенная: <strong className="text-stone-200">{story.storyBible.universeName}</strong>
              </span>
            </div>
            <h2 className="text-2xl font-bold text-stone-100">{title}</h2>
            <p className="text-sm text-stone-400 mt-1 max-w-3xl">
              Сценарий — это не просто текст, а точная архитектура смыслов. Задайте основу истории,
              её центральный конфликт, жанровый профиль и философские темы.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveConcept}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-sm font-medium transition-colors border border-stone-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-stone-400" />
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              onClick={() => onNavigateTab('world')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold rounded-lg text-sm transition-colors shadow-sm"
            >
              Далее: Мир (World)
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 pt-4 border-t border-stone-800/80">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Готовность разработки сценария
            </span>
            <span className="font-semibold text-stone-200">{progress}%</span>
          </div>
          <div className="w-full bg-stone-950 rounded-full h-2 overflow-hidden border border-stone-800">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="grid grid-cols-5 text-[11px] text-stone-500 mt-2 text-center">
            <span className={progress >= 20 ? 'text-amber-400 font-medium' : ''}>1. Концепт</span>
            <span className={progress >= 40 ? 'text-amber-400 font-medium' : ''}>2. Библия мира</span>
            <span className={progress >= 60 ? 'text-amber-400 font-medium' : ''}>3. Сюжетное древо</span>
            <span className={progress >= 80 ? 'text-amber-400 font-medium' : ''}>4. Биты & Сцены</span>
            <span className={progress >= 100 ? 'text-emerald-400 font-medium' : ''}>5. Финал</span>
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Main Grid: AI Architect vs Manual Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI Concept Generator */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-stone-100 font-semibold text-base">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3>AI Concept Architect</h3>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Введите исходную искру или сырую задумку. ИИ-архитектор развернет её в логлайн,
            сформулирует конфликт, ставки и драматическую траекторию.
          </p>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">
              Исходный замысел / Промпт
            </label>
            <textarea
              value={ideaPrompt}
              onChange={(e) => setIdeaPrompt(e.target.value)}
              rows={4}
              placeholder="Опишите исходную ситуацию, героя и загадку..."
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">
              Жанровый профиль
            </label>
            <select
              value={concept.genre}
              onChange={(e) => {
                const selected = GENRE_PROFILES.find((p) => p.name === e.target.value);
                setConcept({
                  ...concept,
                  genre: e.target.value,
                  tone: selected ? selected.tone : concept.tone,
                });
              }}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
            >
              {GENRE_PROFILES.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerateConcept}
            disabled={isGenerating || !ideaPrompt.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-semibold rounded-lg text-xs transition-all shadow-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Сборка концепта...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Сформировать концепт (LLM)
              </>
            )}
          </button>
        </div>

        {/* Right 2 Columns: Detailed Concept Fields */}
        <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <h3 className="text-base font-semibold text-stone-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-stone-400" />
              Паспорт сценария
            </h3>
            <span className="text-xs text-stone-500">Редактируемые параметры</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-stone-400 mb-1">
                Название истории
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500/60 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-400 mb-1">
                Год событий в каноне
              </label>
              <input
                type="number"
                value={storyYear}
                onChange={(e) => setStoryYear(Number(e.target.value))}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-400 mb-1">
              Логлайн & Премис (Premise)
            </label>
            <textarea
              value={concept.premise}
              onChange={(e) => setConcept({ ...concept, premise: e.target.value })}
              rows={3}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60 leading-relaxed resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-stone-400 mb-1">
                Центральный конфликт
              </label>
              <textarea
                value={concept.centralConflict}
                onChange={(e) => setConcept({ ...concept, centralConflict: e.target.value })}
                rows={2}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60 resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-400 mb-1">
                Ставки (Что стоит на кону)
              </label>
              <textarea
                value={concept.stakes}
                onChange={(e) => setConcept({ ...concept, stakes: e.target.value })}
                rows={2}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-stone-400 mb-1">
                Тональность & Атмосфера
              </label>
              <input
                type="text"
                value={concept.tone}
                onChange={(e) => setConcept({ ...concept, tone: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-400 mb-1">
                Вектор развязки / Финал
              </label>
              <input
                type="text"
                value={concept.endingDirection}
                onChange={(e) => setConcept({ ...concept, endingDirection: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-400 mb-1">
              Драматические темы (через запятую)
            </label>
            <input
              type="text"
              value={concept.themes.join(', ')}
              onChange={(e) =>
                setConcept({
                  ...concept,
                  themes: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                })
              }
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
