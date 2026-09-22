import React, { useState } from 'react';
import {
  Users,
  MapPin,
  Package,
  Scroll,
  HelpCircle,
  Sparkles,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Shield,
} from 'lucide-react';
import {
  FullStory,
  BibleCharacter,
  BibleLocation,
  BibleObject,
  StoryBible,
} from '../../domain/storyModel';
import { engineApi } from '../../services/engineApi';

interface WorldSectionProps {
  story: FullStory;
  onUpdateStory: (updated: FullStory) => void;
  onNavigateTab: (tab: 'story' | 'plot' | 'writer' | 'review') => void;
}

type WorldTab = 'characters' | 'locations' | 'objects' | 'rules' | 'mysteries';

export const WorldSection: React.FC<WorldSectionProps> = ({
  story,
  onUpdateStory,
  onNavigateTab,
}) => {
  const [activeTab, setActiveTab] = useState<WorldTab>('characters');
  const [bible, setBible] = useState<StoryBible>(story.storyBible);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New character form
  const [newCharName, setNewCharName] = useState('');
  const [newCharRole, setNewCharRole] = useState<'protagonist' | 'antagonist' | 'supporting' | 'minor'>('supporting');
  const [newCharStatus, setNewCharStatus] = useState<'alive' | 'deceased' | 'unknown'>('alive');
  const [newCharDesc, setNewCharDesc] = useState('');

  // New location form
  const [newLocName, setNewLocName] = useState('');
  const [newLocType, setNewLocType] = useState('Здание');
  const [newLocStatus, setNewLocStatus] = useState<'intact' | 'ruined' | 'abandoned'>('intact');
  const [newLocDesc, setNewLocDesc] = useState('');

  // New rule form
  const [newRule, setNewRule] = useState('');

  // New mystery form
  const [newMysteryQ, setNewMysteryQ] = useState('');
  const [newMysteryAns, setNewMysteryAns] = useState('');

  const handleGenerateBible = async () => {
    setIsGenerating(true);
    setNotification(null);
    try {
      const updated = await engineApi.generateBible(story.id);
      setBible(updated.storyBible);
      onUpdateStory(updated);
      setNotification('Story Bible успешно сформирована с учётом канона.');
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert(`Ошибка генерации Story Bible: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveBible = async () => {
    setIsSaving(true);
    try {
      const updated = await engineApi.updateStory(story.id, { storyBible: bible });
      onUpdateStory(updated);
      setNotification('Данные мира успешно сохранены.');
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      alert(`Ошибка сохранения: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCharacter = () => {
    if (!newCharName.trim()) return;
    const newChar: BibleCharacter = {
      id: `char-${Date.now()}`,
      name: newCharName.trim(),
      role: newCharRole,
      statusAtStart: newCharStatus,
      description: newCharDesc.trim() || 'Описание персонажа',
      motivation: 'Выяснить истину',
      knowledgeAtStart: [],
      relationships: [],
    };
    const updatedBible = {
      ...bible,
      characters: [...bible.characters, newChar],
    };
    setBible(updatedBible);
    setNewCharName('');
    setNewCharDesc('');
  };

  const handleDeleteCharacter = (id: string) => {
    setBible({
      ...bible,
      characters: bible.characters.filter((c) => c.id !== id),
    });
  };

  const handleAddLocation = () => {
    if (!newLocName.trim()) return;
    const newLoc: BibleLocation = {
      id: `loc-${Date.now()}`,
      name: newLocName.trim(),
      type: newLocType,
      status: newLocStatus,
      description: newLocDesc.trim() || 'Описание локации',
    };
    setBible({
      ...bible,
      locations: [...bible.locations, newLoc],
    });
    setNewLocName('');
    setNewLocDesc('');
  };

  const handleDeleteLocation = (id: string) => {
    setBible({
      ...bible,
      locations: bible.locations.filter((l) => l.id !== id),
    });
  };

  const handleAddRule = () => {
    if (!newRule.trim()) return;
    setBible({
      ...bible,
      rules: [...bible.rules, newRule.trim()],
    });
    setNewRule('');
  };

  const handleDeleteRule = (index: number) => {
    setBible({
      ...bible,
      rules: bible.rules.filter((_, i) => i !== index),
    });
  };

  const handleAddMystery = () => {
    if (!newMysteryQ.trim()) return;
    setBible({
      ...bible,
      mysteries: [
        ...bible.mysteries,
        {
          id: `myst-${Date.now()}`,
          question: newMysteryQ.trim(),
          truth: newMysteryAns.trim() || 'Истина будет раскрыта в кульминации',
          cluesPlanned: [],
          status: 'unresolved',
        },
      ],
    });
    setNewMysteryQ('');
    setNewMysteryAns('');
  };

  const handleDeleteMystery = (id: string) => {
    setBible({
      ...bible,
      mysteries: bible.mysteries.filter((m) => m.id !== id),
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Шаг 2: Библия мира & Канонический контекст
            </span>
            <span className="text-xs text-stone-400">
              Канонический год истории: <strong className="text-amber-400">{story.storyYear}</strong>
            </span>
          </div>
          <h2 className="text-2xl font-bold text-stone-100">Библия Мира (World Bible)</h2>
          <p className="text-sm text-stone-400 mt-1 max-w-2xl">
            Единый источник правды для генерации сцен. Ни один персонаж не может появиться из ниоткуда,
            а разрушенная локация не может быть описана как целая без явного указания.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateBible}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-semibold rounded-lg text-xs transition-all shadow-sm disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {isGenerating ? 'Генерация...' : 'Сгенерировать Библию (LLM)'}
          </button>
          <button
            onClick={handleSaveBible}
            disabled={isSaving}
            className="flex items-center gap-2 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium border border-stone-700 transition-colors"
          >
            <Save className="w-3.5 h-3.5 text-stone-400" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button
            onClick={() => onNavigateTab('plot')}
            className="flex items-center gap-2 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold border border-stone-700 transition-colors"
          >
            Далее: Сюжет
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
        <button
          onClick={() => setActiveTab('characters')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'characters'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Персонажи ({bible.characters.length})
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'locations'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Локации ({bible.locations.length})
        </button>
        <button
          onClick={() => setActiveTab('objects')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'objects'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          Предметы / Артефакты ({bible.objects.length})
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'rules'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <Scroll className="w-3.5 h-3.5" />
          Правила вселенной ({bible.rules.length})
        </button>
        <button
          onClick={() => setActiveTab('mysteries')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'mysteries'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Загадки сюжета ({bible.mysteries.length})
        </button>
      </div>

      {/* Tab 1: Characters */}
      {activeTab === 'characters' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bible.characters.map((char) => {
              const isDeceased = char.statusAtStart === 'deceased';
              return (
                <div
                  key={char.id}
                  className={`bg-stone-900 border rounded-xl p-4 flex flex-col justify-between transition-all ${
                    isDeceased ? 'border-red-900/40 bg-stone-900/60' : 'border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-semibold text-stone-100 text-sm">{char.name}</h4>
                        <span className="text-[11px] text-stone-400 capitalize">{char.role}</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isDeceased
                            ? 'bg-red-950/60 text-red-400 border-red-800/60'
                            : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                        }`}
                      >
                        {isDeceased ? 'Погиб до событий' : 'Жив'}
                      </span>
                    </div>

                    <p className="text-xs text-stone-400 line-clamp-3 mb-3 leading-relaxed">
                      {char.description}
                    </p>

                    <div className="text-[11px] space-y-1 text-stone-500 border-t border-stone-800/80 pt-2">
                      <div>
                        <strong className="text-stone-400">Мотивация:</strong> {char.motivation}
                      </div>
                      {char.knowledgeAtStart.length > 0 && (
                        <div>
                          <strong className="text-stone-400">Знания:</strong>{' '}
                          {char.knowledgeAtStart.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-800/80 flex items-center justify-end">
                    <button
                      onClick={() => handleDeleteCharacter(char.id)}
                      className="text-stone-500 hover:text-red-400 p-1 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Character Quick Box */}
          <div className="bg-stone-900/70 border border-dashed border-stone-800 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-stone-200 mb-3 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              Добавить персонажа в канон
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <input
                type="text"
                placeholder="Имя персонажа"
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
              />
              <select
                value={newCharRole}
                onChange={(e) => setNewCharRole(e.target.value as any)}
                className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
              >
                <option value="protagonist">Главный герой (Protagonist)</option>
                <option value="antagonist">Антагонист</option>
                <option value="supporting">Второстепенный</option>
                <option value="minor">Эпизодический</option>
              </select>
              <select
                value={newCharStatus}
                onChange={(e) => setNewCharStatus(e.target.value as any)}
                className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
              >
                <option value="alive">Жив в начале истории</option>
                <option value="deceased">Погиб до событий истории</option>
                <option value="unknown">Статус неизвестен / Пропал</option>
              </select>
              <button
                onClick={handleAddCharacter}
                className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
              >
                Добавить
              </button>
            </div>
            <textarea
              placeholder="Краткое описание внешности, профессии и роли в истории..."
              value={newCharDesc}
              onChange={(e) => setNewCharDesc(e.target.value)}
              rows={2}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60 resize-none"
            />
          </div>
        </div>
      )}

      {/* Tab 2: Locations */}
      {activeTab === 'locations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bible.locations.map((loc) => {
              const isRuined = loc.status === 'ruined';
              return (
                <div
                  key={loc.id}
                  className={`bg-stone-900 border rounded-xl p-4 flex flex-col justify-between transition-all ${
                    isRuined ? 'border-amber-900/40 bg-stone-900/60' : 'border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-semibold text-stone-100 text-sm">{loc.name}</h4>
                        <span className="text-[11px] text-stone-400">{loc.type}</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isRuined
                            ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                            : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                        }`}
                      >
                        {isRuined ? 'Разрушена / Руины' : 'Целая'}
                      </span>
                    </div>

                    <p className="text-xs text-stone-400 line-clamp-3 mb-3 leading-relaxed">
                      {loc.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-800/80 flex items-center justify-end">
                    <button
                      onClick={() => handleDeleteLocation(loc.id)}
                      className="text-stone-500 hover:text-red-400 p-1 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Location Quick Box */}
          <div className="bg-stone-900/70 border border-dashed border-stone-800 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-stone-200 mb-3 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              Добавить локацию в канон
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <input
                type="text"
                placeholder="Название локации"
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
              />
              <input
                type="text"
                placeholder="Тип (Здание, Лес, Шахта...)"
                value={newLocType}
                onChange={(e) => setNewLocType(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
              />
              <select
                value={newLocStatus}
                onChange={(e) => setNewLocStatus(e.target.value as any)}
                className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
              >
                <option value="intact">Целая / Жилая</option>
                <option value="ruined">Разрушена / Пепелище</option>
                <option value="abandoned">Заброшена</option>
              </select>
              <button
                onClick={handleAddLocation}
                className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
              >
                Добавить
              </button>
            </div>
            <textarea
              placeholder="Описание локации, атмосферы, запахов и ключевых комнат..."
              value={newLocDesc}
              onChange={(e) => setNewLocDesc(e.target.value)}
              rows={2}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60 resize-none"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Objects */}
      {activeTab === 'objects' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bible.objects.map((obj) => (
              <div key={obj.id} className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-stone-100 text-sm">{obj.name}</h4>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {obj.significance}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-2 leading-relaxed">{obj.description}</p>
                {obj.ownerCharacterId && (
                  <p className="text-[11px] text-stone-500 mt-2">
                    Владелец: <strong className="text-stone-400">{obj.ownerCharacterId}</strong>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Universe Rules */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="space-y-2">
            {bible.rules.map((rule, idx) => (
              <div
                key={idx}
                className="bg-stone-900 border border-stone-800 rounded-lg p-3 flex items-center justify-between gap-3 text-xs text-stone-200"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{rule}</span>
                </div>
                <button
                  onClick={() => handleDeleteRule(idx)}
                  className="text-stone-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Добавьте правило мира (например: «В 2025 году особняк сгорел до фундамента»)..."
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
              className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
            />
            <button
              onClick={handleAddRule}
              className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
            >
              Добавить правило
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Mysteries */}
      {activeTab === 'mysteries' && (
        <div className="space-y-4">
          <div className="space-y-3">
            {bible.mysteries.map((m) => (
              <div key={m.id} className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-stone-100 text-sm flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      {m.question}
                    </h4>
                    <p className="text-xs text-stone-400">
                      <strong className="text-stone-300">Канонический ответ:</strong> {m.truth}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteMystery(m.id)}
                    className="text-stone-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-stone-900/70 border border-dashed border-stone-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              Добавить загадку сюжета
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Вопрос тайны (например: Что находится за синей дверью?)"
                value={newMysteryQ}
                onChange={(e) => setNewMysteryQ(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
              />
              <input
                type="text"
                placeholder="Скрытая истина (известна автору)"
                value={newMysteryAns}
                onChange={(e) => setNewMysteryAns(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/60"
              />
            </div>
            <button
              onClick={handleAddMystery}
              className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
            >
              Добавить загадку
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
