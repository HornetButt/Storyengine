import React, { useState } from 'react';
import { Universe, StoryLocation, StoryEvent, StoryObject } from '../types';
import { api } from '../services/api';
import {
  MapPin,
  GitBranch,
  Package,
  Globe2,
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

interface EntitiesPageProps {
  entityType: 'locations' | 'events' | 'objects' | 'universes';
  universes: Universe[];
  locations: StoryLocation[];
  events: StoryEvent[];
  objects: StoryObject[];
  onRefresh: () => void;
}

export const EntitiesPage: React.FC<EntitiesPageProps> = ({
  entityType,
  universes,
  locations,
  events,
  objects,
  onRefresh,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [universeId, setUniverseId] = useState(universes[0]?.id || '');
  const [year, setYear] = useState(2025);
  const [status, setStatus] = useState<any>('active');

  const getTitle = () => {
    switch (entityType) {
      case 'locations':
        return { title: 'Локации мира', icon: MapPin, desc: 'География, статус сохранности (руины/действует)' };
      case 'events':
        return { title: 'Канонические события', icon: GitBranch, desc: 'Исторические происшествия с точными датами' };
      case 'objects':
        return { title: 'Предметы и артефакты', icon: Package, desc: 'Значимые улики, дневники, аномалии и ключи' };
      case 'universes':
        return { title: 'Вселенные', icon: Globe2, desc: 'Изолированные миры и правила' };
    }
  };

  const info = getTitle();
  const Icon = info.icon;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (entityType === 'locations') {
      await api.createLocation({ universeId, name, description, status });
    } else if (entityType === 'events') {
      await api.createEvent({
        universeId,
        title: name,
        description,
        year: Number(year),
        dateStart: `${year}-10-12`,
        canonStatus: 'canon',
      });
    } else if (entityType === 'objects') {
      await api.createObject({ universeId, name, description, properties: {} });
    } else if (entityType === 'universes') {
      await api.createUniverse({ name, description, rules: [] });
    }

    setName('');
    setDescription('');
    setShowModal(false);
    onRefresh();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <Icon className="w-5 h-5 text-amber-400" />
            {info.title}
          </h2>
          <p className="text-xs text-stone-400 mt-1">{info.desc}</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить запись</span>
        </button>
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {entityType === 'locations' &&
          locations.map((loc) => (
            <div
              key={loc.id}
              className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-stone-100 text-sm">{loc.name}</h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-medium ${
                    loc.status === 'ruined'
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {loc.status === 'ruined' ? 'Разрушено / Сожжено' : 'Действует'}
                </span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">{loc.description}</p>
            </div>
          ))}

        {entityType === 'events' &&
          events.map((evt) => (
            <div
              key={evt.id}
              className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-stone-100 text-sm">{evt.title}</h3>
                <span className="px-2 py-0.5 rounded bg-stone-800 text-[11px] font-mono text-amber-400">
                  {evt.year} г.
                </span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">{evt.description}</p>
            </div>
          ))}

        {entityType === 'objects' &&
          objects.map((obj) => (
            <div
              key={obj.id}
              className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3"
            >
              <h3 className="font-semibold text-stone-100 text-sm">{obj.name}</h3>
              <p className="text-xs text-stone-400 leading-relaxed">{obj.description}</p>
            </div>
          ))}

        {entityType === 'universes' &&
          universes.map((uni) => (
            <div
              key={uni.id}
              className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-stone-100 text-sm">{uni.name}</h3>
                <span className="text-[10px] font-mono text-emerald-400 uppercase">АКТИВНА</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">{uni.description}</p>
            </div>
          ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-semibold text-stone-100 text-sm">Добавить в канон</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 mb-1">Название / Заголовок</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 focus:outline-none"
                />
              </div>

              {entityType === 'events' && (
                <div>
                  <label className="block text-stone-400 mb-1">Год события</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 focus:outline-none"
                  />
                </div>
              )}

              {entityType === 'locations' && (
                <div>
                  <label className="block text-stone-400 mb-1">Статус локации</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 focus:outline-none"
                  >
                    <option value="intact">Действует / Сохранна</option>
                    <option value="ruined">Разрушена / Сожжена</option>
                    <option value="abandoned">Заброшена</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-stone-400 mb-1">Описание / Канонические свойства</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-stone-800 text-stone-300 rounded-lg hover:bg-stone-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-lg hover:bg-amber-400"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
