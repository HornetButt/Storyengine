import React, { useState } from 'react';
import {
  Character,
  StoryLocation,
  StoryEvent,
  StoryObject,
  Universe,
} from '../../types';
import {
  LoreInspectionSummary,
  CharacterMentionContext,
} from '../../utils/canonDetector';
import {
  Users,
  MapPin,
  GitBranch,
  Package,
  Search,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Plus,
  Info,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface LoreInspectorProps {
  summary: LoreInspectionSummary;
  storyYear: number;
  onChangeStoryYear: (newYear: number) => void;
  universe: Universe | undefined;
  characters: Character[];
  locations: StoryLocation[];
  events: StoryEvent[];
  objects: StoryObject[];
  onInsertText: (text: string) => void;
  onApplyFix: (fix: CharacterMentionContext['suggestedFixes'][0], mention: CharacterMentionContext) => void;
  onJumpToMention?: (mention: CharacterMentionContext) => void;
}

export const LoreInspector: React.FC<LoreInspectorProps> = ({
  summary,
  storyYear,
  onChangeStoryYear,
  universe,
  characters,
  locations,
  events,
  objects,
  onInsertText,
  onApplyFix,
  onJumpToMention,
}) => {
  const [activeTab, setActiveTab] = useState<'cast' | 'lore' | 'timeline'>('cast');
  const [searchTerm, setSearchTerm] = useState('');
  const [loreFilter, setLoreFilter] = useState<'all' | 'characters' | 'locations' | 'events' | 'objects'>('all');
  const [selectedCharacterModal, setSelectedCharacterModal] = useState<Character | null>(null);

  // Status badge styling helper
  const getStatusBadge = (status: string, deathYear?: number) => {
    switch (status) {
      case 'alive':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Жив ({storyYear} г.)</span>
          </span>
        );
      case 'deceased':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Погиб в {deathYear || 2025} г.</span>
          </span>
        );
      case 'unborn':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-500/15 text-stone-300 border border-stone-500/30">
            <span>Ещё не родился</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span>Статус неизвестен</span>
          </span>
        );
    }
  };

  // Filtered lore items
  const filteredCharacters = characters.filter((c) =>
    c.canonicalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredLocations = locations.filter((l) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredObjects = objects.filter((o) =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-80 md:w-96 bg-stone-900 border-l border-stone-800 flex flex-col shrink-0 text-stone-200 select-none overflow-hidden h-full shadow-xl">
      {/* Header: Story Year & Canon Status */}
      <div className="p-3.5 border-b border-stone-800 bg-stone-950/70 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            База знаний & Канон
          </span>
          <span className="text-[11px] text-stone-400 font-mono truncate max-w-[140px]" title={universe?.name}>
            {universe?.name || 'Вселенная'}
          </span>
        </div>

        {/* Year Selector with Temporal Step Controls */}
        <div className="p-2 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Хронологический год:
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => onChangeStoryYear(storyYear - 1)}
                className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[11px] font-mono transition-colors"
                title="Предыдущий год"
              >
                -1
              </button>
              <input
                type="number"
                value={storyYear}
                onChange={(e) => onChangeStoryYear(Number(e.target.value) || 2024)}
                className="w-16 px-1.5 py-0.5 text-center bg-stone-950 border border-stone-700 rounded text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => onChangeStoryYear(storyYear + 1)}
                className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[11px] font-mono transition-colors"
                title="Следующий год"
              >
                +1
              </button>
            </div>
          </div>
          <p className="text-[10px] text-stone-400 leading-tight">
            Статусы героев (жив/мёртв) и состояние мира вычисляются относительно {storyYear} года.
          </p>
        </div>

        {/* Conflict Quick Alert Box */}
        {summary.conflictsCount > 0 ? (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Обнаружен конфликт живых/погибших героев!</span>
            </div>
            <p className="text-[10px] text-rose-300 leading-relaxed">
              Погибшие герои упоминаются в настоящем времени с глаголами действия. См. раздел ниже.
            </p>
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Противоречий по статусам героев не обнаружено</span>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="grid grid-cols-2 p-1.5 bg-stone-950/90 border-b border-stone-800 gap-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('cast')}
          className={`py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-colors ${
            activeTab === 'cast'
              ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Герои в тексте</span>
          {summary.conflictsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lore')}
          className={`py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-colors ${
            activeTab === 'lore'
              ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>База знаний</span>
        </button>
      </div>

      {/* Tab 1: Cast in Document & Real-time Canon Integrity */}
      {activeTab === 'cast' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Summary stats */}
          <div className="flex items-center justify-between text-[11px] text-stone-400 pb-1 border-b border-stone-800/80">
            <span>Обнаружено действующих лиц: <strong>{summary.charactersInText.length}</strong></span>
            {summary.conflictsCount > 0 ? (
              <span className="text-rose-400 font-semibold">{summary.conflictsCount} нарушений канона</span>
            ) : (
              <span className="text-emerald-400 font-semibold">Все статусы каноничны</span>
            )}
          </div>

          {summary.charactersInText.length === 0 ? (
            <div className="p-6 text-center text-stone-500 space-y-2">
              <Users className="w-8 h-8 mx-auto text-stone-600 opacity-60" />
              <p className="text-xs">В тексте пока не упомянуто ни одного персонажа из канона вселенной.</p>
              <p className="text-[10px] text-stone-600">
                Начните писать имена (например, <em>Михаил</em>, <em>Елена</em>, <em>Алексей</em>) или используйте базу знаний справа.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.charactersInText.map(({ character, statusInYear, deathYear, deathDescription, mentionCount, hasConflict, conflicts }) => (
                <div
                  key={character.id}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    hasConflict
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-950/40'
                      : statusInYear === 'deceased'
                      ? 'bg-stone-800/50 border-amber-500/30'
                      : 'bg-stone-800/40 border-stone-700/80 hover:border-stone-600'
                  }`}
                >
                  {/* Character Header */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="font-bold text-stone-100 flex items-center gap-1.5">
                        <span>{character.canonicalName}</span>
                        {hasConflict && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {character.occupation || character.aliases.join(', ')} • {mentionCount} упом.
                      </div>
                    </div>
                    {getStatusBadge(statusInYear, deathYear)}
                  </div>

                  {/* Character biography excerpt */}
                  {character.biography && (
                    <p className="text-[11px] text-stone-400 mb-2 line-clamp-2 leading-relaxed">
                      {character.biography}
                    </p>
                  )}

                  {/* Conflict alerts for this character */}
                  {hasConflict && (
                    <div className="space-y-2 mt-2 pt-2 border-t border-rose-500/20">
                      {conflicts.map((conflict, cIdx) => (
                        <div key={cIdx} className="bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/30 space-y-1.5">
                          <div className="text-[11px] font-semibold text-rose-200">
                            {conflict.title}
                          </div>
                          <div className="text-[10px] text-stone-300 italic bg-stone-900/80 p-1.5 rounded border border-rose-500/20">
                            «...{conflict.sentence.slice(0, 140)}...»
                          </div>
                          <p className="text-[10px] text-rose-300/90 leading-tight">
                            {conflict.explanation}
                          </p>

                          {/* Quick Fix Buttons */}
                          <div className="pt-1.5 space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-amber-300/80 font-bold block">
                              Быстрое исправление:
                            </span>
                            {conflict.suggestedFixes.map((fix, fIdx) => (
                              <button
                                key={fIdx}
                                type="button"
                                onClick={() => onApplyFix(fix, conflict)}
                                className="w-full text-left px-2 py-1 rounded bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200 text-[10px] font-medium transition-colors flex items-center justify-between border border-stone-700"
                              >
                                <span className="truncate pr-1">{fix.label}</span>
                                <ArrowRight className="w-3 h-3 shrink-0 opacity-70" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* If deceased, but mentioned properly as memory */}
                  {!hasConflict && statusInYear === 'deceased' && (
                    <div className="mt-2 pt-1.5 border-t border-stone-700/60 text-[10px] text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Упомянут корректно в воспоминаниях или архиве</span>
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-stone-800/60 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedCharacterModal(character)}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    >
                      <Info className="w-3 h-3" />
                      <span>Досье персонажа</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onInsertText(character.canonicalName)}
                      className="text-stone-400 hover:text-stone-200 flex items-center gap-0.5 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Вставить имя</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All other universe characters not yet in text */}
          <div className="pt-3 border-t border-stone-800">
            <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
              Другие герои вселенной ({summary.allUniverseCharactersStatus.filter((c) => !c.isMentioned).length})
            </h4>
            <div className="space-y-1.5">
              {summary.allUniverseCharactersStatus
                .filter((c) => !c.isMentioned)
                .map(({ character, statusInYear, deathYear }) => (
                  <div
                    key={character.id}
                    className="p-2 rounded-lg bg-stone-950/60 border border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-medium text-stone-300">{character.canonicalName}</div>
                      <div className="text-[10px] text-stone-500">{character.occupation || 'Житель'}</div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {getStatusBadge(statusInYear, deathYear)}
                      <button
                        type="button"
                        onClick={() => onInsertText(character.canonicalName)}
                        className="p-1 text-stone-400 hover:text-amber-300 transition-colors"
                        title="Вставить в текст"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Full Universe Lore Explorer */}
      {activeTab === 'lore' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-500" />
            <input
              type="text"
              placeholder="Поиск по канону (герои, места, события)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Filter badges */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
            <button
              type="button"
              onClick={() => setLoreFilter('all')}
              className={`px-2 py-0.5 rounded-full border whitespace-nowrap ${
                loreFilter === 'all'
                  ? 'bg-amber-500 text-stone-950 font-bold border-amber-500'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              Все
            </button>
            <button
              type="button"
              onClick={() => setLoreFilter('characters')}
              className={`px-2 py-0.5 rounded-full border whitespace-nowrap ${
                loreFilter === 'characters'
                  ? 'bg-amber-500 text-stone-950 font-bold border-amber-500'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              Персонажи ({filteredCharacters.length})
            </button>
            <button
              type="button"
              onClick={() => setLoreFilter('locations')}
              className={`px-2 py-0.5 rounded-full border whitespace-nowrap ${
                loreFilter === 'locations'
                  ? 'bg-amber-500 text-stone-950 font-bold border-amber-500'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              Локации ({filteredLocations.length})
            </button>
            <button
              type="button"
              onClick={() => setLoreFilter('events')}
              className={`px-2 py-0.5 rounded-full border whitespace-nowrap ${
                loreFilter === 'events'
                  ? 'bg-amber-500 text-stone-950 font-bold border-amber-500'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              События ({filteredEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setLoreFilter('objects')}
              className={`px-2 py-0.5 rounded-full border whitespace-nowrap ${
                loreFilter === 'objects'
                  ? 'bg-amber-500 text-stone-950 font-bold border-amber-500'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              Предметы ({filteredObjects.length})
            </button>
          </div>

          {/* Lore Items List */}
          <div className="space-y-2">
            {/* Characters */}
            {(loreFilter === 'all' || loreFilter === 'characters') &&
              filteredCharacters.map((char) => {
                const statusInfo = summary.allUniverseCharactersStatus.find((s) => s.character.id === char.id);
                return (
                  <div
                    key={char.id}
                    className="p-2.5 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-stone-700 transition-all text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-200 flex items-center gap-1">
                        <Users className="w-3 h-3 text-amber-400" />
                        {char.canonicalName}
                      </span>
                      {statusInfo && getStatusBadge(statusInfo.statusInYear, statusInfo.deathYear)}
                    </div>
                    <p className="text-[11px] text-stone-400 line-clamp-2">{char.description}</p>
                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setSelectedCharacterModal(char)}
                        className="text-amber-400 hover:text-amber-300"
                      >
                        Подробнее
                      </button>
                      <button
                        type="button"
                        onClick={() => onInsertText(char.canonicalName)}
                        className="text-stone-400 hover:text-white flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        Вставить имя
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* Locations */}
            {(loreFilter === 'all' || loreFilter === 'locations') &&
              filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-2.5 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-stone-700 transition-all text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-200 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      {loc.name}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {loc.status === 'ruined' && storyYear >= 2025 ? 'Руины (сожжён)' : loc.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 line-clamp-2">{loc.description}</p>
                  <div className="flex items-center justify-end pt-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => onInsertText(loc.name)}
                      className="text-stone-400 hover:text-white flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      Вставить локацию
                    </button>
                  </div>
                </div>
              ))}

            {/* Events */}
            {(loreFilter === 'all' || loreFilter === 'events') &&
              filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-stone-700 transition-all text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-200 flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-cyan-400" />
                      {evt.title}
                    </span>
                    <span className="font-mono text-[10px] text-amber-400">{evt.year} г.</span>
                  </div>
                  <p className="text-[11px] text-stone-400 line-clamp-2">{evt.description}</p>
                  <div className="flex items-center justify-end pt-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => onInsertText(evt.title)}
                      className="text-stone-400 hover:text-white flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      Вставить событие
                    </button>
                  </div>
                </div>
              ))}

            {/* Objects */}
            {(loreFilter === 'all' || loreFilter === 'objects') &&
              filteredObjects.map((obj) => (
                <div
                  key={obj.id}
                  className="p-2.5 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-stone-700 transition-all text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-200 flex items-center gap-1">
                      <Package className="w-3 h-3 text-amber-400" />
                      {obj.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 line-clamp-2">{obj.description}</p>
                  <div className="flex items-center justify-end pt-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => onInsertText(obj.name)}
                      className="text-stone-400 hover:text-white flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      Вставить предмет
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Character Dossier Modal */}
      {selectedCharacterModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-stone-200">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                  <span>{selectedCharacterModal.canonicalName}</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Псевдонимы: {selectedCharacterModal.aliases.join(', ') || 'нет'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCharacterModal(null)}
                className="text-stone-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
              <div>
                <span className="text-stone-400 font-medium">Род занятий:</span>
                <p className="text-stone-200 mt-0.5">{selectedCharacterModal.occupation || 'Не указан'}</p>
              </div>

              <div>
                <span className="text-stone-400 font-medium">Биография:</span>
                <p className="text-stone-300 mt-0.5 leading-relaxed">{selectedCharacterModal.biography || selectedCharacterModal.description}</p>
              </div>

              {selectedCharacterModal.personality && (
                <div>
                  <span className="text-stone-400 font-medium">Характер:</span>
                  <p className="text-stone-300 mt-0.5">{selectedCharacterModal.personality}</p>
                </div>
              )}

              {selectedCharacterModal.appearance && (
                <div>
                  <span className="text-stone-400 font-medium">Внешность:</span>
                  <p className="text-stone-300 mt-0.5">{selectedCharacterModal.appearance}</p>
                </div>
              )}

              {/* Timeline states */}
              <div className="pt-2 border-t border-stone-800">
                <span className="text-stone-400 font-medium block mb-2">Хронологические состояния:</span>
                <div className="space-y-1.5">
                  {selectedCharacterModal.states?.map((st, i) => (
                    <div key={i} className="p-2 rounded bg-stone-950 border border-stone-800 text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-amber-400">{st.year} год</span>
                        <span className={st.status === 'deceased' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                          {st.status === 'deceased' ? 'ПОГИБ' : 'ЖИВ'}
                        </span>
                      </div>
                      <p className="text-stone-400">{st.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => {
                  onInsertText(selectedCharacterModal.canonicalName);
                  setSelectedCharacterModal(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors"
              >
                Вставить имя в текст
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
