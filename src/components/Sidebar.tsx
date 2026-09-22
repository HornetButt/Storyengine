import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CalendarDays,
  MapPin,
  Package,
  Globe2,
  GitBranch,
  Share2,
  Search,
  Sparkles,
  Settings,
  ShieldCheck,
  Tv,
  FileEdit,
  Compass,
  Layers,
} from 'lucide-react';

export type NavItem =
  | 'engine_story'
  | 'engine_world'
  | 'engine_plot'
  | 'engine_writer'
  | 'engine_review'
  | 'dashboard'
  | 'planner'
  | 'beats'
  | 'canvas'
  | 'generation'
  | 'stories'
  | 'teleprompter'
  | 'characters'
  | 'events'
  | 'locations'
  | 'objects'
  | 'universes'
  | 'timeline'
  | 'graph'
  | 'search'
  | 'settings';

interface SidebarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  pendingCount: number;
}

interface NavSection {
  title: string;
  items: {
    id: NavItem;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    highlight?: boolean;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, pendingCount }) => {
  const sections: NavSection[] = [
    {
      title: 'Движок сценариев',
      items: [
        { id: 'engine_story', label: '1. Story (Концепт)', icon: BookOpen, highlight: true },
        { id: 'engine_world', label: '2. World (Библия мира)', icon: Globe2, highlight: true },
        { id: 'engine_plot', label: '3. Plot (Сюжетное древо)', icon: GitBranch, highlight: true },
        { id: 'engine_writer', label: '4. Writer (Мастерская)', icon: FileEdit, highlight: true },
        { id: 'engine_review', label: '5. Review (Канон & Critic)', icon: ShieldCheck, highlight: true },
      ],
    },
    {
      title: 'Студия и холст',
      items: [
        { id: 'dashboard', label: 'Обзор (Dashboard)', icon: LayoutDashboard },
        { id: 'canvas', label: 'Холст истории (Canvas)', icon: FileEdit },
        { id: 'beats', label: 'Студия битов (Beats)', icon: Layers },
        { id: 'planner', label: 'Планировщик сюжета', icon: Compass },
        { id: 'stories', label: 'Истории (Stories)', icon: BookOpen },
        { id: 'generation', label: 'Быстрый генератор', icon: Sparkles },
        { id: 'teleprompter', label: 'Телесуфлер', icon: Tv },
      ],
    },
    {
      title: 'База знаний & Канон',
      items: [
        { id: 'characters', label: 'Персонажи', icon: Users },
        { id: 'timeline', label: 'Временная линия', icon: CalendarDays },
        { id: 'graph', label: 'Граф знаний', icon: Share2 },
        { id: 'locations', label: 'Локации', icon: MapPin },
        { id: 'events', label: 'События', icon: GitBranch },
        { id: 'objects', label: 'Предметы', icon: Package },
        { id: 'universes', label: 'Вселенные', icon: Globe2 },
        { id: 'search', label: 'Поиск по канону', icon: Search },
        { id: 'settings', label: 'API & Интеграции', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-stone-900 text-stone-200 flex flex-col border-r border-stone-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-stone-100 tracking-tight text-base">Story Engine</h1>
            <p className="text-xs text-stone-400">Script & Canon Architecture</p>
          </div>
        </div>
      </div>

      {/* Quick Status Pill */}
      <div className="px-4 py-2.5 bg-stone-950/40 border-b border-stone-800/80 flex items-center justify-between text-xs text-stone-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Канон защищён
        </span>
        {pendingCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium text-[11px] border border-amber-500/30">
            {pendingCount} на проверке
          </span>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {sections.map((sec, secIdx) => (
          <div key={secIdx} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">
              {sec.title}
            </div>
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : item.highlight
                      ? 'text-stone-200 hover:bg-stone-800/80 hover:text-amber-200'
                      : 'text-stone-400 hover:bg-stone-800/70 hover:text-stone-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive
                          ? 'text-amber-400'
                          : item.highlight
                          ? 'text-amber-400/80'
                          : 'text-stone-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'dashboard' && pendingCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 font-bold text-[9px] flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User / Engine Footer */}
      <div className="p-3 border-t border-stone-800 bg-stone-950/30 text-xs text-stone-400 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Story Engine v2 Core</span>
        </div>
        <span className="text-[11px] font-mono text-stone-500">Active</span>
      </div>
    </aside>
  );
};
