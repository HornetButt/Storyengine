import React, { useState } from 'react';
import { Character, Universe, CharacterState } from '../types';
import { api } from '../services/api';
import {
  Users,
  Plus,
  Search,
  Calendar,
  Heart,
  Skull,
  Clock,
  Edit2,
  Trash2,
  X,
  Check,
  Tag,
  ShieldAlert,
  Info,
  ChevronRight,
  Filter,
  Sparkles,
  UserCheck,
  FileText,
} from 'lucide-react';

interface CharactersPageProps {
  characters: Character[];
  universes: Universe[];
  selectedUniverseId: string;
  onRefresh: () => void;
}

const PRESET_TAGS = [
  'протагонист',
  'антагонист',
  'исследователь',
  'архивист',
  'медик',
  'сторож',
  'мистика',
  'канон',
  'погибший',
  'скептик',
  'свидетель',
  'хранитель',
];

const ROLES: { id: string; label: string; color: string }[] = [
  { id: 'protagonist', label: 'Протагонист', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 'antagonist', label: 'Антагонист', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { id: 'supporting', label: 'Второстепенный', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { id: 'mentor', label: 'Ментор / Наставник', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { id: 'witness', label: 'Свидетель / Эпизод', color: 'bg-stone-800 text-stone-300 border-stone-700' },
];

export const CharactersPage: React.FC<CharactersPageProps> = ({
  characters,
  universes,
  selectedUniverseId,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Selected character for viewing dossier
  const [viewingChar, setViewingChar] = useState<Character | null>(null);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);

  const [formName, setFormName] = useState('');
  const [formAliases, setFormAliases] = useState('');
  const [formOccupation, setFormOccupation] = useState('');
  const [formRole, setFormRole] = useState('supporting');
  const [formGender, setFormGender] = useState('Мужской');
  const [formAge, setFormAge] = useState('');
  const [formStatus, setFormStatus] = useState<'alive' | 'deceased' | 'missing' | 'unknown'>('alive');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBiography, setFormBiography] = useState('');
  const [formPersonality, setFormPersonality] = useState('');
  const [formAppearance, setFormAppearance] = useState('');
  const [formUniverseId, setFormUniverseId] = useState(selectedUniverseId || universes[0]?.id || '');
  const [formStates, setFormStates] = useState<CharacterState[]>([]);

  // New temporal state inputs
  const [newStateYear, setNewStateYear] = useState(2026);
  const [newStateStatus, setNewStateStatus] = useState<any>('alive');
  const [newStateDesc, setNewStateDesc] = useState('');

  // Collect all unique tags across characters for filtering
  const allUniqueTags = Array.from(
    new Set(characters.flatMap((c) => c.tags || []))
  ).filter(Boolean);

  const filteredCharacters = characters.filter((c) => {
    if (selectedUniverseId && c.universeId !== selectedUniverseId) return false;

    if (selectedStatusFilter !== 'all' && c.status !== selectedStatusFilter) {
      return false;
    }

    if (selectedRoleFilter !== 'all') {
      if (selectedRoleFilter === 'other' && c.role && ['protagonist', 'antagonist', 'supporting'].includes(c.role)) {
        return false;
      } else if (selectedRoleFilter !== 'other' && c.role !== selectedRoleFilter) {
        return false;
      }
    }

    if (selectedTagFilter && !(c.tags || []).includes(selectedTagFilter)) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const inName = c.canonicalName.toLowerCase().includes(q);
      const inAliases = (c.aliases || []).some((a: string) => a.toLowerCase().includes(q));
      const inDesc = (c.description || '').toLowerCase().includes(q);
      const inBio = (c.biography || '').toLowerCase().includes(q);
      const inOccupation = (c.occupation || '').toLowerCase().includes(q);
      const inTags = (c.tags || []).some((t) => t.toLowerCase().includes(q));
      return inName || inAliases || inDesc || inBio || inOccupation || inTags;
    }

    return true;
  });

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedChar(null);
    setFormName('');
    setFormAliases('');
    setFormOccupation('');
    setFormRole('supporting');
    setFormGender('Мужской');
    setFormAge('30');
    setFormStatus('alive');
    setFormTags(['канон']);
    setTagInput('');
    setFormDescription('');
    setFormBiography('');
    setFormPersonality('');
    setFormAppearance('');
    setFormUniverseId(selectedUniverseId || universes[0]?.id || '');
    setFormStates([
      {
        year: 2024,
        status: 'alive',
        description: 'Появление в каноне вселенной',
      },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (char: Character) => {
    setIsEditing(true);
    setSelectedChar(char);
    setFormName(char.canonicalName);
    setFormAliases((char.aliases || []).join(', '));
    setFormOccupation(char.occupation || '');
    setFormRole(char.role || 'supporting');
    setFormGender(char.gender || 'Мужской');
    setFormAge(char.age ? String(char.age) : '');
    setFormStatus(char.status);
    setFormTags(char.tags ? [...char.tags] : []);
    setTagInput('');
    setFormDescription(char.description || '');
    setFormBiography(char.biography || '');
    setFormPersonality(char.personality || '');
    setFormAppearance(char.appearance || '');
    setFormUniverseId(char.universeId);
    setFormStates(char.states ? [...char.states] : []);
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

  const handleAddTemporalState = () => {
    if (!newStateDesc.trim()) return;
    setFormStates(
      [
        ...formStates,
        {
          year: Number(newStateYear),
          status: newStateStatus,
          description: newStateDesc.trim(),
        },
      ].sort((a, b) => a.year - b.year)
    );
    setNewStateDesc('');
  };

  const handleRemoveTemporalState = (index: number) => {
    setFormStates(formStates.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUniverseId) return;

    const payload = {
      universeId: formUniverseId,
      canonicalName: formName.trim(),
      aliases: formAliases
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      occupation: formOccupation.trim(),
      role: formRole,
      gender: formGender,
      age: formAge.trim(),
      status: formStatus,
      tags: formTags,
      description: formDescription.trim(),
      biography: formBiography.trim(),
      personality: formPersonality.trim(),
      appearance: formAppearance.trim(),
      states: formStates,
    };

    try {
      if (isEditing && selectedChar) {
        await api.updateCharacter(selectedChar.id, payload);
      } else {
        await api.createCharacter(payload);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert('Ошибка сохранения персонажа: ' + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Вы уверены, что хотите удалить персонажа «${name}» из канона?`)) {
      await api.deleteCharacter(id);
      if (viewingChar?.id === id) setViewingChar(null);
      onRefresh();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              База знаний
            </span>
            <span className="text-xs text-stone-500">•</span>
            <span className="text-xs text-stone-400">
              {universes.find((u) => u.id === selectedUniverseId)?.name || 'Все вселенные'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-stone-100 flex items-center gap-2.5 mt-1">
            <Users className="w-6 h-6 text-amber-400" />
            <span>Управление персонажами</span>
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Канонические досье, роли, теги и темпоральные состояния («2024 жив → 2025 погиб»)
          </p>
        </div>

        <button
          id="btn-add-character"
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-md hover:shadow-amber-500/15 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить персонажа</span>
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
              placeholder="Поиск по имени, псевдонимам, профессии, биографии или тегам..."
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
              <option value="alive">Живы</option>
              <option value="deceased">Погибли</option>
              <option value="missing">Пропали без вести</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center space-x-2 shrink-0 text-xs">
            <span className="text-stone-400 font-medium">Роль:</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Все роли</option>
              <option value="protagonist">Протагонисты</option>
              <option value="antagonist">Антагонисты</option>
              <option value="supporting">Второстепенные</option>
              <option value="mentor">Менторы</option>
              <option value="witness">Свидетели</option>
            </select>
          </div>
        </div>

        {/* Tag Filter Chips Bar */}
        {allUniqueTags.length > 0 && (
          <div className="flex items-center space-x-1.5 pt-2 border-t border-stone-800/80 overflow-x-auto text-xs">
            <span className="text-stone-500 text-[11px] font-medium flex items-center gap-1 shrink-0 mr-1">
              <Tag className="w-3 h-3 text-amber-400" />
              Теги:
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

      {/* Empty State */}
      {filteredCharacters.length === 0 ? (
        <div className="p-12 border border-dashed border-stone-800 rounded-2xl text-center bg-stone-900/40">
          <Users className="w-10 h-10 text-stone-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-200">Персонажи не найдены</h3>
          <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
            Попробуйте сбросить поисковый фильтр или добавьте нового канонического персонажа.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-colors"
          >
            + Создать персонажа
          </button>
        </div>
      ) : (
        /* Characters Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCharacters.map((char) => {
            const roleObj = ROLES.find((r) => r.id === char.role);
            return (
              <div
                key={char.id}
                className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 hover:border-stone-700 transition-all flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3">
                  {/* Top Row: Name, Role & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-stone-100 text-base">
                          {char.canonicalName}
                        </h3>
                        {char.age && (
                          <span className="text-xs text-stone-500">({char.age} л.)</span>
                        )}
                      </div>
                      {char.occupation && (
                        <p className="text-xs text-amber-400/90 font-medium mt-0.5">
                          {char.occupation}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {/* Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 border ${
                          char.status === 'alive'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : char.status === 'deceased'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {char.status === 'deceased' ? (
                          <Skull className="w-3 h-3" />
                        ) : (
                          <Heart className="w-3 h-3" />
                        )}
                        {char.status === 'alive'
                          ? 'Жив'
                          : char.status === 'deceased'
                          ? 'Погиб'
                          : 'Пропал без вести'}
                      </span>

                      {/* Role Badge */}
                      {roleObj && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border ${roleObj.color}`}
                        >
                          {roleObj.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Aliases */}
                  {char.aliases && char.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {char.aliases.map((alias: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-stone-950 text-[10px] text-stone-400 font-mono border border-stone-800"
                        >
                          aka {alias}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-xs text-stone-300 leading-relaxed line-clamp-3">
                    {char.description}
                  </p>

                  {/* Tags Chips */}
                  {char.tags && char.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {char.tags.map((tag) => (
                        <span
                          key={tag}
                          onClick={() => setSelectedTagFilter(tag)}
                          className="px-2 py-0.5 rounded-full bg-stone-950 text-[10px] text-amber-400/80 border border-stone-800 cursor-pointer hover:border-amber-500/50 transition-colors"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Temporal States Progression Box */}
                  <div className="pt-3 border-t border-stone-800/80 space-y-1.5">
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Временные состояния
                    </span>
                    <div className="space-y-1">
                      {(char.states || []).map((state: CharacterState, sIdx: number) => (
                        <div
                          key={sIdx}
                          className="p-1.5 rounded bg-stone-950/70 border border-stone-800/60 text-[11px] flex items-center justify-between"
                        >
                          <span className="font-mono text-amber-300 font-semibold shrink-0 mr-2">
                            {state.year} г.
                          </span>
                          <span className="text-stone-400 truncate flex-1">{state.description}</span>
                          <span
                            className={`text-[9px] uppercase font-mono px-1 rounded ml-2 shrink-0 ${
                              state.status === 'deceased'
                                ? 'text-rose-400'
                                : state.status === 'alive'
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {state.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setViewingChar(char)}
                    className="text-stone-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Полное досье</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(char)}
                      className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
                      title="Редактировать персонажа"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(char.id, char.canonicalName)}
                      className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition-colors"
                      title="Удалить персонажа"
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

      {/* CREATE / EDIT CHARACTER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-semibold text-stone-100 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>{isEditing ? 'Редактировать персонажа' : 'Добавить персонажа в канон'}</span>
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
              {/* Row 1: Name, Occupation, Role */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-stone-300 font-medium mb-1">
                    Каноническое имя *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Михаил Северов"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-stone-300 font-medium mb-1">Профессия / Занятие</label>
                  <input
                    type="text"
                    value={formOccupation}
                    onChange={(e) => setFormOccupation(e.target.value)}
                    placeholder="Исследователь-архивист"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-stone-300 font-medium mb-1">Роль в сюжете</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Aliases, Age, Gender, Universe */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-stone-300 font-medium mb-1">
                    Псевдонимы (через запятую)
                  </label>
                  <input
                    type="text"
                    value={formAliases}
                    onChange={(e) => setFormAliases(e.target.value)}
                    placeholder="Михаил, Странник, Северов"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Возраст</label>
                  <input
                    type="text"
                    value={formAge}
                    onChange={(e) => setFormAge(e.target.value)}
                    placeholder="36"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Вселенная</label>
                  <select
                    value={formUniverseId}
                    onChange={(e) => setFormUniverseId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    {universes.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Status & Interactive Tags Management */}
              <div className="p-3.5 bg-stone-950/60 rounded-xl border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-stone-300 font-medium flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    Теги персонажа
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-stone-400">Статус:</span>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-200 focus:outline-none"
                    >
                      <option value="alive">Жив</option>
                      <option value="deceased">Погиб</option>
                      <option value="missing">Пропал без вести</option>
                      <option value="unknown">Неизвестно</option>
                    </select>
                  </div>
                </div>

                {/* Current tags pills */}
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

                {/* Add new tag */}
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

                {/* Preset suggestions */}
                <div className="flex flex-wrap gap-1 pt-1 text-[11px] text-stone-500 items-center">
                  <span>Рекомендованные:</span>
                  {PRESET_TAGS.map((pt) => (
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

              {/* Descriptions & Dossier fields */}
              <div>
                <label className="block text-stone-300 font-medium mb-1">
                  Краткое описание (для списков и подсказок)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Бывший исследователь аномальных явлений..."
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-medium mb-1">
                    Внешность и приметы
                  </label>
                  <textarea
                    rows={2}
                    value={formAppearance}
                    onChange={(e) => setFormAppearance(e.target.value)}
                    placeholder="Высокий, темное пальто, старый блокнот..."
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-medium mb-1">
                    Характер и психология
                  </label>
                  <textarea
                    rows={2}
                    value={formPersonality}
                    onChange={(e) => setFormPersonality(e.target.value)}
                    placeholder="Осторожный, наблюдательный, предан поиску..."
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">
                  Подробная биография и лор
                </label>
                <textarea
                  rows={3}
                  value={formBiography}
                  onChange={(e) => setFormBiography(e.target.value)}
                  placeholder="Родился в Петербурге... В 2024 году прибыл в деревню Сосновка..."
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Temporal States Management */}
              <div className="p-3.5 bg-stone-950/60 rounded-xl border border-stone-800 space-y-2.5">
                <label className="block text-stone-300 font-semibold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Темпоральная шкала состояний (История жизни и статусов)
                </label>

                {/* State list */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {formStates.map((st, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-stone-900 border border-stone-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="font-mono text-amber-400 font-semibold">{st.year} г.</span>
                        <span
                          className={`uppercase font-mono text-[10px] px-1 rounded ${
                            st.status === 'deceased' ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          [{st.status}]
                        </span>
                        <span className="text-stone-300">{st.description}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTemporalState(i)}
                        className="text-stone-500 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new state */}
                <div className="grid grid-cols-12 gap-2 pt-1">
                  <input
                    type="number"
                    value={newStateYear}
                    onChange={(e) => setNewStateYear(Number(e.target.value))}
                    className="col-span-2 px-2 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-200"
                    placeholder="Год"
                  />
                  <select
                    value={newStateStatus}
                    onChange={(e) => setNewStateStatus(e.target.value)}
                    className="col-span-3 px-2 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-200"
                  >
                    <option value="alive">Жив</option>
                    <option value="deceased">Погиб</option>
                    <option value="missing">Пропал</option>
                    <option value="unknown">Неизвестно</option>
                  </select>
                  <input
                    type="text"
                    value={newStateDesc}
                    onChange={(e) => setNewStateDesc(e.target.value)}
                    placeholder="Событие или статус в этот год..."
                    className="col-span-5 px-2 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddTemporalState}
                    className="col-span-2 px-2 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-medium border border-stone-700"
                  >
                    + Точка
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
                  {isEditing ? 'Сохранить изменения' : 'Создать персонажа'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL DOSSIER VIEW MODAL */}
      {viewingChar && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-stone-100 text-lg">
                    {viewingChar.canonicalName}
                  </h3>
                  {viewingChar.age && (
                    <span className="text-sm text-stone-400">({viewingChar.age} лет)</span>
                  )}
                </div>
                <p className="text-xs text-amber-400 font-medium">
                  {viewingChar.occupation || 'Роль не указана'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const c = viewingChar;
                    setViewingChar(null);
                    openEditModal(c);
                  }}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg border border-stone-700 transition-colors"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => setViewingChar(null)}
                  className="text-stone-400 hover:text-stone-200 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dossier Content */}
            <div className="space-y-4 text-xs text-stone-300">
              {/* Tags */}
              {viewingChar.tags && viewingChar.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {viewingChar.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Biography */}
              {viewingChar.biography && (
                <div>
                  <h4 className="font-semibold text-stone-200 mb-1">Биография & Лор</h4>
                  <p className="p-3 bg-stone-950 rounded-xl border border-stone-800 leading-relaxed">
                    {viewingChar.biography}
                  </p>
                </div>
              )}

              {/* Appearance & Personality */}
              <div className="grid grid-cols-2 gap-3">
                {viewingChar.appearance && (
                  <div>
                    <h4 className="font-semibold text-stone-200 mb-1">Внешность</h4>
                    <p className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 leading-relaxed">
                      {viewingChar.appearance}
                    </p>
                  </div>
                )}
                {viewingChar.personality && (
                  <div>
                    <h4 className="font-semibold text-stone-200 mb-1">Характер</h4>
                    <p className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 leading-relaxed">
                      {viewingChar.personality}
                    </p>
                  </div>
                )}
              </div>

              {/* Temporal States Progression */}
              <div>
                <h4 className="font-semibold text-stone-200 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Хронология состояний персонажа
                </h4>
                <div className="space-y-1.5">
                  {(viewingChar.states || []).map((st, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-amber-400 font-bold">{st.year} г.</span>
                        <span className="text-stone-300">{st.description}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                          st.status === 'deceased'
                            ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {st.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
