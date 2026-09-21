import React from 'react';
import { Universe } from '../types';
import { Sparkles, Globe2, Search, Plus } from 'lucide-react';

interface HeaderProps {
  universes: Universe[];
  selectedUniverseId: string;
  onSelectUniverse: (id: string) => void;
  onOpenGenerate: () => void;
  onQuickSearch: () => void;
  onNewStory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  universes,
  selectedUniverseId,
  onSelectUniverse,
  onOpenGenerate,
  onQuickSearch,
  onNewStory,
}) => {
  return (
    <header className="h-16 border-b border-stone-800 bg-stone-900/90 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
      {/* Left: Universe selector */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center text-xs text-stone-400 font-medium">
          <Globe2 className="w-4 h-4 mr-1.5 text-amber-400" />
          <span>Вселенная:</span>
        </div>
        <select
          id="universe-selector"
          value={selectedUniverseId}
          onChange={(e) => onSelectUniverse(e.target.value)}
          aria-label="Выбор вселенной"
          className="bg-stone-800 border border-stone-700 text-stone-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 font-medium"
        >
          <option value="">Все вселенные</option>
          {universes.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {/* Center / Right actions */}
      <div className="flex items-center space-x-3">
        {/* Search button */}
        <button
          id="header-search-btn"
          onClick={onQuickSearch}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-stone-800/80 border border-stone-700/80 text-stone-300 text-xs hover:bg-stone-800 hover:text-stone-100 transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-stone-400" />
          <span>Поиск по канону...</span>
          <kbd className="text-[10px] bg-stone-900 px-1.5 py-0.5 rounded text-stone-500 border border-stone-700">
            Ctrl+K
          </kbd>
        </button>

        {/* Create Manual Story */}
        <button
          id="header-new-story-btn"
          onClick={onNewStory}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-xs font-medium hover:bg-stone-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Новая история</span>
        </button>

        {/* Generate Story Button */}
        <button
          id="header-generate-story-btn"
          onClick={onOpenGenerate}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-colors shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>✨ Сгенерировать историю</span>
        </button>
      </div>
    </header>
  );
};
