import React, { useState } from 'react';
import { Story, Universe } from '../types';
import { ConsistencyBadge } from '../components/ConsistencyBadge';
import { Plus, Upload, Search, Filter, BookOpen, Calendar, Layers, Tv, FileEdit, Sparkles } from 'lucide-react';

interface StoriesPageProps {
  stories: Story[];
  universes: Universe[];
  selectedUniverseId: string;
  onSelectStory: (id: string) => void;
  onNewStory: () => void;
  onOpenImport: () => void;
  onOpenCanvas?: (storyId?: string) => void;
  onOpenTeleprompter?: (storyId?: string) => void;
  onOpenBeatsStudio?: (storyId: string) => void;
}

export const StoriesPage: React.FC<StoriesPageProps> = ({
  stories,
  universes,
  selectedUniverseId,
  onSelectStory,
  onNewStory,
  onOpenImport,
  onOpenCanvas,
  onOpenTeleprompter,
  onOpenBeatsStudio,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [canonFilter, setCanonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredStories = stories.filter((s) => {
    if (selectedUniverseId && s.universeId !== selectedUniverseId) return false;
    if (canonFilter !== 'all' && s.canonStatus !== canonFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.synopsis.toLowerCase().includes(q) ||
        s.fullText.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            Библиотека историй
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Каталог рассказов, версий текста и проверка соответствия канону
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {onOpenTeleprompter && (
            <button
              onClick={() => onOpenTeleprompter()}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors shadow-sm"
              title="Открыть режим телесуфлера для озвучки и чтения"
            >
              <Tv className="w-4 h-4 text-amber-400" />
              <span>Телесуфлер</span>
            </button>
          )}
          <button
            onClick={onOpenImport}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors"
          >
            <Upload className="w-4 h-4 text-stone-400" />
            <span>Импорт</span>
          </button>
          <button
            onClick={onNewStory}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Создать историю</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Поиск по названию или тексту..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-stone-200 placeholder-stone-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs text-stone-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Канон:</span>
            <select
              value={canonFilter}
              onChange={(e) => setCanonFilter(e.target.value)}
              className="bg-stone-800 border border-stone-700 rounded-lg px-2.5 py-1 text-stone-200 text-xs focus:outline-none"
            >
              <option value="all">Все</option>
              <option value="canon">Canon</option>
              <option value="non_canon">Non-Canon</option>
              <option value="alternate">Alternate</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-stone-400">
            <span>Статус:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-stone-800 border border-stone-700 rounded-lg px-2.5 py-1 text-stone-200 text-xs focus:outline-none"
            >
              <option value="all">Все</option>
              <option value="published">Опубликовано</option>
              <option value="generated">Сгенерировано</option>
              <option value="reviewed">Проверено</option>
              <option value="draft">Черновик</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stories Grid */}
      {filteredStories.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-stone-800 rounded-2xl">
          <BookOpen className="w-10 h-10 mx-auto text-stone-600 mb-3" />
          <h3 className="text-sm font-semibold text-stone-300">Истории не найдены</h3>
          <p className="text-xs text-stone-500 mt-1">
            Попробуйте сбросить фильтры, импортировать файл или сгенерировать новую историю.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStories.map((story) => {
            const uni = universes.find((u) => u.id === story.universeId);
            return (
              <div
                key={story.id}
                onClick={() => onSelectStory(story.id)}
                className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/40 hover:bg-stone-900 transition-all cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-stone-800 text-[11px] font-mono text-stone-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-stone-500" />
                      {story.storyYear} г.
                    </span>
                    <ConsistencyBadge status={story.consistencyStatus || 'not_checked'} size="sm" />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-stone-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                      {story.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-stone-500 font-mono">
                        {uni?.name || 'Вселенная'}
                      </span>
                      <span className="text-stone-600">•</span>
                      <span className="text-[11px] text-amber-400/80 uppercase font-mono font-medium">
                        {story.canonStatus}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-400 line-clamp-3 leading-relaxed">
                    {story.synopsis}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-500">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-stone-400" />
                    v{story.versions?.length || 1} версий
                  </span>
                  <div className="flex items-center space-x-2">
                    {onOpenBeatsStudio && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenBeatsStudio(story.id);
                        }}
                        className="p-1 rounded-md text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors flex items-center gap-1 px-1.5"
                        title="Открыть в студии пошагового написания по сценам и битам"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline text-[10px]">Биты</span>
                      </button>
                    )}
                    {onOpenCanvas && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCanvas(story.id);
                        }}
                        className="p-1 rounded-md text-stone-400 hover:text-blue-300 hover:bg-stone-800 transition-colors flex items-center gap-1 px-1.5"
                        title="Открыть в холсте Word с базой знаний и каноном"
                      >
                        <FileEdit className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline text-[10px]">Холст</span>
                      </button>
                    )}
                    {onOpenTeleprompter && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTeleprompter(story.id);
                        }}
                        className="p-1 rounded-md text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors flex items-center gap-1 px-1.5"
                        title="Открыть в телесуфлере"
                      >
                        <Tv className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline text-[10px]">Суфлер</span>
                      </button>
                    )}
                    <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform font-medium">
                      Редактор →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
