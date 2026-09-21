import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Universe } from '../types';
import { Calendar, GitBranch, BookOpen, Clock, Tag } from 'lucide-react';

interface TimelinePageProps {
  universes: Universe[];
  selectedUniverseId: string;
  onSelectStory: (id: string) => void;
}

export const TimelinePage: React.FC<TimelinePageProps> = ({
  universes,
  selectedUniverseId,
  onSelectStory,
}) => {
  const [timelineItems, setTimelineItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [selectedUniverseId]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const data = await api.getTimeline(selectedUniverseId || undefined);
      setTimelineItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Group items by year
  const groupedByYear: { [year: number]: any[] } = {};
  timelineItems.forEach((item) => {
    const yr = item.year || 2025;
    if (!groupedByYear[yr]) groupedByYear[yr] = [];
    groupedByYear[yr].push(item);
  });

  const sortedYears = Object.keys(groupedByYear)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-400" />
          Временная линия канона
        </h2>
        <p className="text-xs text-stone-400 mt-1">
          Хронология ключевых событий, экспедиций и рассказов вселенной
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-stone-400">
          Загрузка хронологии...
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-stone-800 space-y-10 my-8">
          {sortedYears.map((year) => (
            <div key={year} className="relative space-y-4">
              {/* Year Marker Badge */}
              <div className="absolute -left-[35px] top-0 flex items-center justify-center">
                <span className="w-8 h-8 rounded-full bg-stone-900 border-2 border-amber-500 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shadow-md">
                  {year.toString().slice(-2)}
                </span>
              </div>

              <div className="pl-4">
                <h3 className="text-sm font-bold text-amber-400 font-mono tracking-wider mb-3">
                  {year} ГОД
                </h3>

                <div className="space-y-3">
                  {groupedByYear[year].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => item.type === 'story' && onSelectStory(item.id)}
                      className={`p-4 rounded-xl border transition-all ${
                        item.type === 'story'
                          ? 'bg-stone-900/80 border-stone-800 hover:border-amber-500/40 cursor-pointer'
                          : 'bg-stone-900/40 border-stone-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`p-1 rounded text-[10px] uppercase font-mono font-medium ${
                              item.type === 'story'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-purple-500/20 text-purple-300'
                            }`}
                          >
                            {item.type === 'story' ? 'Рассказ' : 'Историческое событие'}
                          </span>
                          <span className="text-xs text-stone-400 font-mono">
                            {item.date}
                          </span>
                        </div>

                        <span className="text-[10px] text-stone-500 uppercase font-mono">
                          {item.canonStatus}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-stone-100 mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-stone-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
