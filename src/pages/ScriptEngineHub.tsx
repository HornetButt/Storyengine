import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Globe2,
  GitBranch,
  FileEdit,
  ShieldCheck,
  Plus,
  RefreshCw,
  FolderOpen,
  ChevronDown,
} from 'lucide-react';
import { FullStory } from '../domain/storyModel';
import { engineApi } from '../services/engineApi';
import { StorySection } from '../components/ScriptEngine/StorySection';
import { WorldSection } from '../components/ScriptEngine/WorldSection';
import { PlotSection } from '../components/ScriptEngine/PlotSection';
import { WriterSection } from '../components/ScriptEngine/WriterSection';
import { ReviewSection } from '../components/ScriptEngine/ReviewSection';

export type EngineTab = 'story' | 'world' | 'plot' | 'writer' | 'review';

interface ScriptEngineHubProps {
  initialTab?: EngineTab;
}

export const ScriptEngineHub: React.FC<ScriptEngineHubProps> = ({ initialTab = 'story' }) => {
  const [activeTab, setActiveTab] = useState<EngineTab>(initialTab);
  const [stories, setStories] = useState<FullStory[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [selectedSceneId, setSelectedSceneId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newIdea, setNewIdea] = useState<string>('');
  const [newYear, setNewYear] = useState<number>(2026);

  // Load all stories on mount
  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    setIsLoading(true);
    try {
      const data = await engineApi.listStories();
      setStories(data);
      if (data.length > 0 && !selectedStoryId) {
        setSelectedStoryId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load stories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentStory = stories.find((s) => s.id === selectedStoryId) || stories[0];

  const handleUpdateStory = (updated: FullStory) => {
    setStories((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  const handleCreateNewStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const universeId = currentStory?.universeId || 'uni-main';
      const created = await engineApi.createStory({
        title: newTitle.trim(),
        universeId,
        storyYear: newYear,
        idea: newIdea.trim(),
      });
      setStories((prev) => [created, ...prev]);
      setSelectedStoryId(created.id);
      setIsCreatingNew(false);
      setNewTitle('');
      setNewIdea('');
      setActiveTab('story');
    } catch (err: any) {
      alert(`Ошибка создания сценария: ${err.message}`);
    }
  };

  const handleSelectSceneForWriting = (sceneId: string) => {
    setSelectedSceneId(sceneId);
    setActiveTab('writer');
  };

  if (isLoading && stories.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stone-950 text-stone-300">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
          <span>Загрузка архитектуры сценариев...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-stone-950 text-stone-100 overflow-y-auto">
      {/* Top Header & Sub-navigation */}
      <header className="bg-stone-900 border-b border-stone-800 sticky top-0 z-30 px-6 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Story Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-stone-400">Проект сценария:</span>
            </div>

            <div className="relative">
              <select
                value={selectedStoryId}
                onChange={(e) => setSelectedStoryId(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-100 focus:outline-none focus:border-amber-500/60 max-w-xs cursor-pointer"
              >
                {stories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.storyYear} г.)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsCreatingNew(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs transition-colors border border-stone-700"
              title="Создать новый проект сценария"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Новый сценарий</span>
            </button>
          </div>

          {/* 5 Core Tabs as requested in specification */}
          <nav className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('story')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'story'
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              1. Story (Концепт)
            </button>

            <button
              onClick={() => setActiveTab('world')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'world'
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              2. World (Библия мира)
            </button>

            <button
              onClick={() => setActiveTab('plot')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'plot'
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              3. Plot (Сюжетное древо)
            </button>

            <button
              onClick={() => setActiveTab('writer')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'writer'
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              4. Writer (Мастерская сцен)
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'review'
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              5. Review (Рецензия & Канон)
            </button>
          </nav>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="flex-1 p-6">
        {currentStory ? (
          <>
            {activeTab === 'story' && (
              <StorySection
                story={currentStory}
                onUpdateStory={handleUpdateStory}
                onNavigateTab={setActiveTab}
              />
            )}
            {activeTab === 'world' && (
              <WorldSection
                story={currentStory}
                onUpdateStory={handleUpdateStory}
                onNavigateTab={setActiveTab}
              />
            )}
            {activeTab === 'plot' && (
              <PlotSection
                story={currentStory}
                onUpdateStory={handleUpdateStory}
                onSelectSceneForWriting={handleSelectSceneForWriting}
                onNavigateTab={setActiveTab}
              />
            )}
            {activeTab === 'writer' && (
              <WriterSection
                story={currentStory}
                selectedSceneId={selectedSceneId}
                onUpdateStory={handleUpdateStory}
                onNavigateTab={setActiveTab}
              />
            )}
            {activeTab === 'review' && (
              <ReviewSection
                story={currentStory}
                selectedSceneId={selectedSceneId}
                onUpdateStory={handleUpdateStory}
                onNavigateTab={setActiveTab}
              />
            )}
          </>
        ) : (
          <div className="text-center py-20 text-stone-500">
            Нет доступных сценариев. Нажмите «Новый сценарий», чтобы начать.
          </div>
        )}
      </main>

      {/* Modal: Create New Story */}
      {isCreatingNew && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-stone-100">
              Создать новый проект сценария
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Story Engine инициализирует изолированную модель истории со своей Библией мира, сюжетным древом и каноном.
            </p>

            <form onSubmit={handleCreateNewStory} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Рабочее название
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Ночной архивариус"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Канонический год действия
                </label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Исходная идея / Премис (опционально)
                </label>
                <textarea
                  rows={3}
                  placeholder="Опишите кратко завязку, главного героя или ключевую тайну..."
                  value={newIdea}
                  onChange={(e) => setNewIdea(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3.5 py-1.5 text-xs text-stone-400 hover:text-stone-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold rounded-lg text-xs transition-colors"
                >
                  Создать сценарий
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
