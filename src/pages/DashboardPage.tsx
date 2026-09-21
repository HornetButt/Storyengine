import React from 'react';
import { Story, ProposedKnowledgeChange } from '../types';
import { ConsistencyBadge } from '../components/ConsistencyBadge';
import { ProposedChangesWidget } from '../components/ProposedChangesWidget';
import {
  BookOpen,
  Users,
  GitBranch,
  Globe2,
  Sparkles,
  Upload,
  AlertTriangle,
  Clock,
  ArrowRight,
  FileEdit,
  Compass,
} from 'lucide-react';

interface DashboardPageProps {
  stats: {
    storiesCount: number;
    charactersCount: number;
    eventsCount: number;
    universesCount: number;
    locationsCount: number;
    objectsCount: number;
    relationshipsCount: number;
    pendingChangesCount: number;
  };
  recentStories: Story[];
  proposedChanges: ProposedKnowledgeChange[];
  onOpenGenerate: () => void;
  onOpenImport: () => void;
  onSelectStory: (id: string) => void;
  onNavigateTab: (tab: any) => void;
  onAcceptChange: (id: string) => void;
  onRejectChange: (id: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  recentStories,
  proposedChanges,
  onOpenGenerate,
  onOpenImport,
  onSelectStory,
  onNavigateTab,
  onAcceptChange,
  onRejectChange,
}) => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900 to-stone-800/80 border border-stone-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-semibold">
              KNOWLEDGE-FIRST NARRATIVE PLATFORM
            </span>
          </div>
          <h2 className="text-xl font-bold text-stone-100">Добро пожаловать в Story Engine</h2>
          <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
            LLM отвечает за творчество, а Story Engine обеспечивает долговременную память, канон, темпоральную непротиворечивость и граф отношений персонажей.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            id="dash-planner-btn"
            onClick={() => onNavigateTab('planner')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors shadow-sm"
            title="Обсудить будущую историю с ИИ, проработать героев, локации и тезисный сюжет"
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Планировщик сюжета</span>
          </button>
          <button
            id="dash-canvas-btn"
            onClick={() => onNavigateTab('canvas')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors shadow-sm"
            title="Открыть Word-холст с авто-проверкой канона и статусов героев"
          >
            <FileEdit className="w-4 h-4 text-amber-400" />
            <span>Холст истории (Word)</span>
          </button>
          <button
            id="dash-import-btn"
            onClick={onOpenImport}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors"
          >
            <Upload className="w-4 h-4 text-stone-400" />
            <span>Импорт истории</span>
          </button>
          <button
            id="dash-generate-btn"
            onClick={onOpenGenerate}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-md hover:shadow-amber-500/10"
          >
            <Sparkles className="w-4 h-4" />
            <span>✨ Сгенерировать историю</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div
          onClick={() => onNavigateTab('universes')}
          className="p-5 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-stone-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-medium">Вселенные</span>
            <Globe2 className="w-4 h-4 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-stone-100">{stats.universesCount}</div>
          <div className="text-[11px] text-stone-500 mt-1">Миры и каноны</div>
        </div>

        <div
          onClick={() => onNavigateTab('stories')}
          className="p-5 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-stone-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-medium">Истории в каноне</span>
            <BookOpen className="w-4 h-4 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-stone-100">{stats.storiesCount}</div>
          <div className="text-[11px] text-stone-500 mt-1">Опубликовано и черновики</div>
        </div>

        <div
          onClick={() => onNavigateTab('characters')}
          className="p-5 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-stone-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-medium">Персонажи</span>
            <Users className="w-4 h-4 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-stone-100">{stats.charactersCount}</div>
          <div className="text-[11px] text-stone-500 mt-1">С тегами и состояниями</div>
        </div>

        <div
          onClick={() => onNavigateTab('timeline')}
          className="p-5 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-stone-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-medium">Ключевые события</span>
            <GitBranch className="w-4 h-4 group-hover:text-purple-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-stone-100">{stats.eventsCount}</div>
          <div className="text-[11px] text-stone-500 mt-1">На временной шкале</div>
        </div>

        <div
          onClick={() => onNavigateTab('graph')}
          className="p-5 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-stone-700 transition-all cursor-pointer group col-span-2 md:col-span-1"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-medium">Связи графа</span>
            <Globe2 className="w-4 h-4 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-stone-100">{stats.relationshipsCount}</div>
          <div className="text-[11px] text-stone-500 mt-1">В 22 типах отношений</div>
        </div>
      </div>

      {/* Main Grid: Recent Stories & Knowledge Proposals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Stories & Canon Status */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Последние истории и черновики
            </h3>
            <button
              onClick={() => onNavigateTab('stories')}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
            >
              Все истории <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentStories.map((story) => (
              <div
                key={story.id}
                onClick={() => onSelectStory(story.id)}
                className="p-4 rounded-xl bg-stone-900/70 border border-stone-800 hover:border-stone-700 hover:bg-stone-900 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-stone-100 text-sm group-hover:text-amber-300 transition-colors">
                      {story.title}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-stone-800 text-[10px] text-stone-400 font-mono">
                      {story.storyYear} г.
                    </span>
                    <span className="px-2 py-0.5 rounded bg-stone-800/80 text-[10px] text-amber-400/90 font-mono uppercase">
                      {story.canonStatus}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                    {story.synopsis}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <ConsistencyBadge status={story.consistencyStatus || 'not_checked'} size="sm" />
                  <span className="text-[11px] text-stone-500 font-mono">
                    v{story.versions?.length || 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Proposed Knowledge Changes widget */}
        <div className="space-y-4">
          <ProposedChangesWidget
            changes={proposedChanges}
            onAccept={onAcceptChange}
            onReject={onRejectChange}
          />

          {/* Quick Guidance Box */}
          <div className="p-4 rounded-xl border border-stone-800 bg-stone-900/40 space-y-2 text-xs text-stone-400">
            <h4 className="font-semibold text-stone-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Принцип работы с каноном
            </h4>
            <p className="text-[11px] leading-relaxed">
              Все извлеченные или сгенерированные факты появляются как предложения. Только после нажатия кнопки «Принять» они становятся канонической истиной для будущих генераций.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
