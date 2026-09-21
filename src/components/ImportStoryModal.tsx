import React, { useState } from 'react';
import { Universe } from '../types';
import { api } from '../services/api';
import { Upload, X, FileText, CheckCircle2 } from 'lucide-react';

interface ImportStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  universes: Universe[];
  onImportSuccess: (result: any) => void;
}

export const ImportStoryModal: React.FC<ImportStoryModalProps> = ({
  isOpen,
  onClose,
  universes,
  onImportSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [universeId, setUniverseId] = useState(universes[0]?.id || '');
  const [year, setYear] = useState(2026);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          setTitle(parsed.title || file.name);
          setText(parsed.text || parsed.fullText || content);
          if (parsed.year) setYear(parsed.year);
        } catch {
          setText(content);
        }
      } else {
        setText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !universeId) {
      setError('Пожалуйста, заполните текст истории и выберите вселенную.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.importStory({
        title: title || 'Импортированная история',
        text,
        universeId,
        year: Number(year),
      });

      onImportSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка при импорте истории');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-100">📥 Импортировать историю</h2>
              <p className="text-xs text-stone-400">
                Загрузка TXT, Markdown или JSON с автоматическим извлечением сущностей в канон
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* File input drop zone */}
          <div className="border-2 border-dashed border-stone-700 hover:border-amber-500/50 rounded-xl p-5 text-center transition-colors bg-stone-950/40 cursor-pointer relative">
            <input
              type="file"
              accept=".txt,.md,.markdown,.json"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <FileText className="w-8 h-8 mx-auto text-stone-400 mb-2" />
            <p className="text-xs font-medium text-stone-200">
              Нажмите для выбора файла или перетащите его сюда
            </p>
            <p className="text-[11px] text-stone-500 mt-1">Поддерживаются форматы TXT, MD, JSON</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Название истории
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="СТ-042: Забытый архив..."
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Целевая вселенная
              </label>
              <select
                value={universeId}
                onChange={(e) => setUniverseId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-xs focus:outline-none focus:border-amber-500"
              >
                {universes.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-1/2">
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Год действия по канону
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Текст истории
            </label>
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Вставьте или отредактируйте текст рассказа..."
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-xs font-mono focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-stone-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-stone-800 text-stone-300 text-xs font-medium hover:bg-stone-700 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-amber-500 text-stone-950 text-xs font-semibold hover:bg-amber-400 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  <span>Анализ и импорт...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Импортировать и проверить канон</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
