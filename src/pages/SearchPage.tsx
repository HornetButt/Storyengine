import React, { useState } from 'react';
import { api } from '../services/api';
import { Search, BookOpen, Users, MapPin, Package, GitBranch } from 'lucide-react';

interface SearchPageProps {
  onSelectStory: (id: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ onSelectStory }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>({
    stories: [],
    characters: [],
    locations: [],
    objects: [],
    events: [],
  });
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults({ stories: [], characters: [], locations: [], objects: [], events: [] });
      return;
    }
    setIsSearching(true);
    try {
      const data = await api.search(val);
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const totalResults =
    results.stories.length +
    results.characters.length +
    results.locations.length +
    results.objects.length +
    results.events.length;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
          <Search className="w-5 h-5 text-amber-400" />
          Сквозной поиск по канону
        </h2>
        <p className="text-xs text-stone-400 mt-1">
          Мгновенный поиск по текстам историй, биографиям персонажей, артефактам и хроникам
        </p>
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Введите имя (Михаил), предмет (синяя дверь), локацию или ключевое слово..."
          className="w-full pl-12 pr-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-amber-500 shadow-md"
        />
        <Search className="w-5 h-5 text-stone-400 absolute left-4 top-3.5" />
      </div>

      {query && (
        <div className="text-xs text-stone-400 font-mono">
          Найдено совпадений: {totalResults}
        </div>
      )}

      {/* Results */}
      <div className="space-y-6">
        {results.characters.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Персонажи ({results.characters.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.characters.map((c: any) => (
                <div key={c.id} className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-xs">
                  <div className="flex items-center justify-between font-semibold text-stone-200">
                    <span>{c.canonicalName}</span>
                    <span className="text-[10px] text-amber-400 uppercase font-mono">{c.status}</span>
                  </div>
                  <p className="text-stone-400 text-[11px] mt-1 line-clamp-2">{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.stories.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Истории ({results.stories.length})
            </h3>
            <div className="space-y-2">
              {results.stories.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => onSelectStory(s.id)}
                  className="p-4 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500/40 cursor-pointer transition-all text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-stone-200">
                    <span className="text-amber-300">{s.title}</span>
                    <span className="text-stone-500 font-mono">{s.storyYear} г.</span>
                  </div>
                  <p className="text-stone-400 text-[11px] mt-1 line-clamp-2">{s.synopsis}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.locations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Локации ({results.locations.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.locations.map((l: any) => (
                <div key={l.id} className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-xs">
                  <div className="flex items-center justify-between font-semibold text-stone-200">
                    <span>{l.name}</span>
                    <span className="text-[10px] text-stone-500 uppercase font-mono">{l.status}</span>
                  </div>
                  <p className="text-stone-400 text-[11px] mt-1">{l.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.objects.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              Предметы и артефакты ({results.objects.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.objects.map((o: any) => (
                <div key={o.id} className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-xs">
                  <span className="font-semibold text-stone-200 block">{o.name}</span>
                  <p className="text-stone-400 text-[11px] mt-1">{o.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
