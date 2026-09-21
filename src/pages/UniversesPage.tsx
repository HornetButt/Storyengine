import React, { useState } from 'react';
import { Universe, Character, Story, StoryLocation, StoryEvent } from '../types';
import { api } from '../services/api';
import {
  Globe2,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Tag,
  BookOpen,
  Users,
  MapPin,
  GitBranch,
  Check,
  ShieldAlert,
  Sparkles,
  Layers,
  Scroll,
  ArrowRight,
  Clock,
} from 'lucide-react';

interface UniversesPageProps {
  universes: Universe[];
  selectedUniverseId: string;
  onSelectUniverse: (id: string) => void;
  characters: Character[];
  stories: Story[];
  locations: StoryLocation[];
  events: StoryEvent[];
  onRefresh: () => void;
}

const PRESET_UNIVERSE_TAGS = [
  'канон',
  'мистика',
  'детектив',
  'научная-фантастика',
  'хоррор',
  'альтернатива',
  'технологии',
  'сосновка',
  'архив',
  'аномалия',
  'эхо',
];

const PRESET_GENRES = [
  'Мистический детектив / Реализм',
  'Хоррор / Тёмное фэнтези',
  'Научная фантастика (Sci-Fi)',
  'Городское фэнтези',
  'Психологический триллер',
  'Постапокалипсис',
  'Альтернативная история',
];

export const UniversesPage: React.FC<UniversesPageProps> = ({
  universes,
  selectedUniverseId,
  onSelectUniverse,
  characters,
  stories,
  locations,
  events,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUni, setSelectedUni] = useState<Universe | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formGenre, setFormGenre] = useState('');
  const [formEra, setFormEra] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [formRules, setFormRules] = useState<string[]>([]);
  const [ruleInput, setRuleInput] = useState('');

  // Collect all unique tags across universes
  const allUniqueTags = Array.from(
    new Set(universes.flatMap((u) => u.tags || []))
  ).filter(Boolean);

  const filteredUniverses = universes.filter((u) => {
    if (selectedStatusFilter !== 'all') {
      const uStatus = u.status || 'active';
      if (uStatus !== selectedStatusFilter) return false;
    }

    if (selectedTagFilter && !(u.tags || []).includes(selectedTagFilter)) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const inName = u.name.toLowerCase().includes(q);
      const inDesc = (u.description || '').toLowerCase().includes(q);
      const inGenre = (u.genre || '').toLowerCase().includes(q);
      const inEra = (u.era || '').toLowerCase().includes(q);
      const inTags = (u.tags || []).some((t) => t.toLowerCase().includes(q));
      const inRules = (u.rules || []).some((r) => r.toLowerCase().includes(q));
      return inName || inDesc || inGenre || inEra || inTags || inRules;
    }

    return true;
  });

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedUni(null);
    setFormName('');
    setFormGenre('Мистический детектив / Реализм');
    setFormEra('2024–2030 гг.');
    setFormStatus('active');
    setFormDescription('');
    setFormTags(['канон']);
    setTagInput('');
    setFormRules([
      'Временные линии строго однонаправлены',
      'Законы физики действуют до границы аномальной зоны',
    ]);
    setRuleInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (uni: Universe) => {
    setIsEditing(true);
    setSelectedUni(uni);
    setFormName(uni.name);
    setFormGenre(uni.genre || 'Мистический детектив / Реализм');
    setFormEra(uni.era || '2024–2030 гг.');
    setFormStatus(uni.status || 'active');
    setFormDescription(uni.description || '');
    setFormTags(uni.tags ? [...uni.tags] : []);
    setTagInput('');
    setFormRules(uni.rules ? [...uni.rules] : []);
    setRuleInput('');
    setIsModalOpen(true);
  };

  const handleAddTag = (tagToAdd?: string) => {
    const tag = (tagToAdd || tagInput).trim().toLowerCase().replace(/^#/, '');
    if (!tag) return;
    if (!formTags.includes(tag)) {
      setFormTags([...formTags, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormTags(formTags.filter((t) => t !== tagToRemove));
  };

  const handleAddRule = () => {
    const rule = ruleInput.trim();
    if (!rule) return;
    if (!formRules.includes(rule)) {
      setFormRules([...formRules, rule]);
    }
    setRuleInput('');
  };

  const handleRemoveRule = (index: number) => {
    setFormRules(formRules.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const payload = {
      name: formName.trim(),
      genre: formGenre.trim(),
      era: formEra.trim(),
      status: formStatus,
      description: formDescription.trim(),
      tags: formTags,
      rules: formRules,
    };

    try {
      if (isEditing && selectedUni) {
        await api.updateUniverse(selectedUni.id, payload);
      } else {
        const created = await api.createUniverse(payload);
        if (universes.length === 0) {
          onSelectUniverse(created.id);
        }
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert('Ошибка при сохранении вселенной: ' + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (universes.length <= 1) {
      alert('Нельзя удалить единственную вселенную в проекте.');
      return;
    }
    if (confirm(`Вы уверены, что хотите удалить вселенную «${name}»? Это может повлиять на привязанных к ней персонажей и истории.`)) {
      try {
        await api.deleteUniverse(id);
        if (selectedUniverseId === id) {
          const fallback = universes.find((u) => u.id !== id);
          if (fallback) onSelectUniverse(fallback.id);
        }
        onRefresh();
      } catch (err: any) {
        alert('Ошибка удаления: ' + err.message);
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Архитектура миров
            </span>
            <span className="text-xs text-stone-500">•</span>
            <span className="text-xs text-stone-400">
              Всего вселенных: {universes.length}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-stone-100 flex items-center gap-2.5 mt-1">
            <Globe2 className="w-6 h-6 text-amber-400" />
            <span>Управление вселенными</span>
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Создание, редактирование, тегирование миров, управление законами канона и временными рамками
          </p>
        </div>

        <button
          id="btn-add-universe"
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-md hover:shadow-amber-500/15 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Создать вселенную</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 flex items-center space-x-2.5">
            <Search className="w-4 h-4 text-stone-500 shrink-0" />
            <input
              type="text"
              placeholder="Поиск по названию, жанру, временной эпохе, лору, тегам или правилам..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs text-stone-200 placeholder-stone-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-stone-500 hover:text-stone-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2 shrink-0 text-xs">
            <span className="text-stone-400 font-medium">Статус:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="draft">Черновики</option>
              <option value="archived">Архивные</option>
            </select>
          </div>
        </div>

        {/* Tag Filter Chips Bar */}
        {allUniqueTags.length > 0 && (
          <div className="flex items-center space-x-1.5 pt-2 border-t border-stone-800/80 overflow-x-auto text-xs">
            <span className="text-stone-500 text-[11px] font-medium flex items-center gap-1 shrink-0 mr-1">
              <Tag className="w-3 h-3 text-amber-400" />
              Теги миров:
            </span>
            <button
              onClick={() => setSelectedTagFilter(null)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors shrink-0 ${
                selectedTagFilter === null
                  ? 'bg-amber-500 text-stone-950 font-semibold'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              Все
            </button>
            {allUniqueTags.map((tag) => {
              const isSelected = selectedTagFilter === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTagFilter(isSelected ? null : tag)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors shrink-0 border ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-medium'
                      : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700 hover:text-stone-200'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Universes Grid */}
      {filteredUniverses.length === 0 ? (
        <div className="p-12 border border-dashed border-stone-800 rounded-2xl text-center bg-stone-900/40">
          <Globe2 className="w-10 h-10 text-stone-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-200">Вселенные не найдены</h3>
          <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
            Попробуйте сбросить поисковый фильтр или создайте новую вселенную.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-colors"
          >
            + Создать вселенную
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredUniverses.map((uni) => {
            const isCurrent = selectedUniverseId === uni.id;
            const uniChars = characters.filter((c) => c.universeId === uni.id);
            const uniStories = stories.filter((s) => s.universeId === uni.id);
            const uniLocations = locations.filter((l) => l.universeId === uni.id);
            const uniEvents = events.filter((e) => e.universeId === uni.id);

            return (
              <div
                key={uni.id}
                className={`p-6 rounded-2xl bg-stone-900/90 border transition-all flex flex-col justify-between space-y-5 shadow-sm relative overflow-hidden ${
                  isCurrent
                    ? 'border-amber-500/60 ring-1 ring-amber-500/30'
                    : 'border-stone-800 hover:border-stone-700'
                }`}
              >
                {/* Active universe banner glow */}
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl border-l border-b border-amber-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Текущая вселенная
                  </div>
                )}

                <div className="space-y-4">
                  {/* Top: Title & Genre */}
                  <div>
                    <div className="flex items-start justify-between pr-24">
                      <div>
                        <h3 className="font-bold text-stone-100 text-lg flex items-center gap-2">
                          <span>{uni.name}</span>
                        </h3>
                        {uni.genre && (
                          <p className="text-xs text-amber-400 font-medium mt-0.5">
                            {uni.genre}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Timeline Era */}
                    {uni.era && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-400 mt-2 font-mono">
                        <Clock className="w-3.5 h-3.5 text-stone-500" />
                        <span>Хронология: <strong className="text-stone-300">{uni.era}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {uni.description || 'Описание вселенной пока не заполнено.'}
                  </p>

                  {/* Tags */}
                  {uni.tags && uni.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {uni.tags.map((tag) => (
                        <span
                          key={tag}
                          onClick={() => setSelectedTagFilter(tag)}
                          className="px-2.5 py-0.5 rounded-full bg-stone-950 text-[11px] text-amber-400/90 border border-stone-800 cursor-pointer hover:border-amber-500/40 transition-colors"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Rules of the world */}
                  {uni.rules && uni.rules.length > 0 && (
                    <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Scroll className="w-3.5 h-3.5 text-amber-400" />
                          Законы и правила канона ({uni.rules.length})
                        </span>
                      </div>
                      <ul className="space-y-1 text-xs text-stone-300">
                        {uni.rules.slice(0, 3).map((rule, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold">•</span>
                            <span className="line-clamp-1">{rule}</span>
                          </li>
                        ))}
                        {uni.rules.length > 3 && (
                          <li className="text-[11px] text-stone-500 italic pl-3">
                            ...и ещё {uni.rules.length - 3} канонических правил
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Entity Metrics Grid */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-stone-800/60 text-center">
                    <div className="p-2 rounded-xl bg-stone-950/60 border border-stone-800/50">
                      <Users className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                      <div className="font-mono text-sm font-bold text-stone-100">{uniChars.length}</div>
                      <div className="text-[10px] text-stone-500">Персонажей</div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-950/60 border border-stone-800/50">
                      <BookOpen className="w-3.5 h-3.5 text-sky-400 mx-auto mb-1" />
                      <div className="font-mono text-sm font-bold text-stone-100">{uniStories.length}</div>
                      <div className="text-[10px] text-stone-500">Историй</div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-950/60 border border-stone-800/50">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                      <div className="font-mono text-sm font-bold text-stone-100">{uniLocations.length}</div>
                      <div className="text-[10px] text-stone-500">Локаций</div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-950/60 border border-stone-800/50">
                      <GitBranch className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
                      <div className="font-mono text-sm font-bold text-stone-100">{uniEvents.length}</div>
                      <div className="text-[10px] text-stone-500">Событий</div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-stone-800 flex items-center justify-between text-xs">
                  {isCurrent ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs">
                      <Check className="w-4 h-4" />
                      <span>Активна для работы</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => onSelectUniverse(uni.id)}
                      className="flex items-center space-x-1.5 text-stone-300 hover:text-amber-400 font-medium transition-colors"
                    >
                      <span>Сделать активной</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => openEditModal(uni)}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-stone-700"
                      title="Редактировать параметры вселенной"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Редактировать</span>
                    </button>
                    <button
                      onClick={() => handleDelete(uni.id, uni.name)}
                      className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition-colors"
                      title="Удалить вселенную"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT UNIVERSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-semibold text-stone-100 text-base flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-amber-400" />
                <span>{isEditing ? 'Редактирование вселенной' : 'Создание новой вселенной'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Universe Name */}
              <div>
                <label className="block text-stone-300 font-medium mb-1">
                  Название вселенной *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Основная вселенная (Main Canon) или Тёмная линия времени..."
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Genre / Setting & Era */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-medium mb-1">
                    Жанр / Сеттинг
                  </label>
                  <input
                    type="text"
                    value={formGenre}
                    onChange={(e) => setFormGenre(e.target.value)}
                    placeholder="Мистический детектив / Реализм"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1 text-[10px]">
                    {PRESET_GENRES.slice(0, 3).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormGenre(g)}
                        className="px-1.5 py-0.5 bg-stone-950 hover:bg-stone-800 text-stone-400 rounded border border-stone-800"
                      >
                        {g.split('/')[0].trim()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-stone-300 font-medium mb-1">
                    Временная эпоха / Шкала
                  </label>
                  <input
                    type="text"
                    value={formEra}
                    onChange={(e) => setFormEra(e.target.value)}
                    placeholder="2020–2030 гг. или 2140 г."
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center space-x-2 mt-1 text-[10px] text-stone-400">
                    <span>Статус:</span>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="bg-stone-950 border border-stone-800 rounded px-2 py-0.5 text-stone-300"
                    >
                      <option value="active">Активна</option>
                      <option value="draft">Черновик</option>
                      <option value="archived">В архиве</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Description / Lore */}
              <div>
                <label className="block text-stone-300 font-medium mb-1">
                  Описание мира, атмосфера и лор
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Центральный канонический таймлайн города N и окрестных деревень..."
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Tags Management */}
              <div className="p-3.5 bg-stone-950/60 rounded-xl border border-stone-800 space-y-2">
                <label className="text-stone-300 font-medium flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  Теги вселенной
                </label>

                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {formTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-rose-400 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Введите тег и нажмите Enter..."
                    className="flex-1 px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag()}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border border-stone-700"
                  >
                    + Добавить тег
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 pt-1 text-[11px] text-stone-500 items-center">
                  <span>Рекомендованные:</span>
                  {PRESET_UNIVERSE_TAGS.map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => handleAddTag(pt)}
                      className="px-1.5 py-0.5 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded border border-stone-800"
                    >
                      +{pt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rules & World Canon Laws */}
              <div className="p-3.5 bg-stone-950/60 rounded-xl border border-stone-800 space-y-2.5">
                <label className="text-stone-300 font-semibold flex items-center gap-1.5">
                  <Scroll className="w-4 h-4 text-amber-400" />
                  Законы канона и физики мира (нерушимые правила)
                </label>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {formRules.map((r, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-stone-900 border border-stone-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2 text-stone-200">
                        <span className="text-amber-400 font-bold">{idx + 1}.</span>
                        <span>{r}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(idx)}
                        className="text-stone-500 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    value={ruleInput}
                    onChange={(e) => setRuleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRule();
                      }
                    }}
                    placeholder="Например: Погибшие герои не воскресают ни при каких обстоятельствах..."
                    className="flex-1 px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border border-stone-700 font-medium"
                  >
                    + Правило
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-stone-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 text-stone-300 rounded-xl hover:bg-stone-700 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl hover:bg-amber-400 transition-colors shadow-sm"
                >
                  {isEditing ? 'Сохранить изменения' : 'Создать вселенную'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
