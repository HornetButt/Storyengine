import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  Minus,
  Sparkles,
  Tv,
  Save,
  ZoomIn,
  ZoomOut,
  Palette,
  Type,
  ShieldAlert,
  ShieldCheck,
  BookOpen,
  FileText,
  RotateCcw,
  RotateCw,
  Eye,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export type CanvasTheme = 'word_white' | 'parchment' | 'dark' | 'soft_gray';
export type CanvasFont = 'serif' | 'sans' | 'mono';

interface CanvasToolbarProps {
  // Document actions
  onApplyFormat: (tag: string, placeholder?: string) => void;
  onInsertEmDash: () => void;
  onInsertSceneBreak: () => void;
  onInsertHeading: (level: 1 | 2 | 3) => void;
  onInsertEpigraph: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Visual settings
  canvasTheme: CanvasTheme;
  onChangeTheme: (theme: CanvasTheme) => void;
  canvasFont: CanvasFont;
  onChangeFont: (font: CanvasFont) => void;
  zoom: number;
  onChangeZoom: (newZoom: number) => void;
  isPaginated: boolean;
  onTogglePaginated: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;

  // Liveness & Integrity indicators
  conflictsCount: number;
  warningsCount: number;
  onOpenInspector: () => void;
  isInspectorOpen: boolean;

  // Story & Actions
  isSaving: boolean;
  onSave: () => void;
  onOpenTeleprompter: () => void;
  wordCount: number;
  charCount: number;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onApplyFormat,
  onInsertEmDash,
  onInsertSceneBreak,
  onInsertHeading,
  onInsertEpigraph,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  canvasTheme,
  onChangeTheme,
  canvasFont,
  onChangeFont,
  zoom,
  onChangeZoom,
  isPaginated,
  onTogglePaginated,
  isFocusMode,
  onToggleFocusMode,
  conflictsCount,
  warningsCount,
  onOpenInspector,
  isInspectorOpen,
  isSaving,
  onSave,
  onOpenTeleprompter,
  wordCount,
  charCount,
}) => {
  return (
    <div className="bg-stone-900 border-b border-stone-800 text-stone-200 select-none shrink-0 shadow-md">
      {/* Top Ribbon Row */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-stone-800/80">
        {/* Left: Quick Formats & History */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Отменить (Ctrl+Z)"
            className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-100 disabled:opacity-30 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Повторить (Ctrl+Y)"
            className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-100 disabled:opacity-30 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-stone-800 mx-1" />

          {/* Heading Presets */}
          <div className="flex items-center space-x-0.5 bg-stone-950/70 p-0.5 rounded-lg border border-stone-800 text-xs">
            <button
              type="button"
              onClick={() => onInsertHeading(1)}
              className="px-2 py-1 rounded hover:bg-stone-800 text-stone-300 font-semibold text-[11px] transition-colors"
              title="Заголовок 1 (Глава)"
            >
              H1 Глава
            </button>
            <button
              type="button"
              onClick={() => onInsertHeading(2)}
              className="px-2 py-1 rounded hover:bg-stone-800 text-stone-300 font-medium text-[11px] transition-colors"
              title="Заголовок 2 (Сцена)"
            >
              H2 Сцена
            </button>
            <button
              type="button"
              onClick={onInsertEpigraph}
              className="px-2 py-1 rounded hover:bg-stone-800 text-stone-400 italic text-[11px] transition-colors"
              title="Эпиграф / Цитата"
            >
              Эпиграф
            </button>
          </div>

          <div className="h-4 w-px bg-stone-800 mx-1" />

          {/* Formatting buttons */}
          <div className="flex items-center space-x-0.5">
            <button
              type="button"
              onClick={() => onApplyFormat('**', 'Жирный текст')}
              className="p-1.5 rounded hover:bg-stone-800 text-stone-300 hover:text-stone-100 transition-colors"
              title="Полужирный (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onApplyFormat('*', 'Курсивный текст')}
              className="p-1.5 rounded hover:bg-stone-800 text-stone-300 hover:text-stone-100 transition-colors"
              title="Курсив (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onApplyFormat('~~', 'Зачёркнутый текст')}
              className="p-1.5 rounded hover:bg-stone-800 text-stone-300 hover:text-stone-100 transition-colors"
              title="Зачёркнутый"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onApplyFormat('<u>', 'Подчёркнутый текст')}
              className="p-1.5 rounded hover:bg-stone-800 text-stone-300 hover:text-stone-100 transition-colors"
              title="Подчёркнутый (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-stone-800 mx-1" />

          {/* Dialogue em-dash & scene break */}
          <button
            type="button"
            onClick={onInsertEmDash}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-mono transition-colors"
            title="Вставить длинное тире прямой речи (— )"
          >
            <span>—</span>
            <span className="text-[10px] text-stone-400 font-sans">Реплика</span>
          </button>
          <button
            type="button"
            onClick={onInsertSceneBreak}
            className="px-2 py-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs font-serif transition-colors"
            title="Вставить разделитель сцены (* * *)"
          >
            * * *
          </button>
        </div>

        {/* Center: Live Canon Status Detector Warning Pill */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onOpenInspector}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              conflictsCount > 0
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25 animate-pulse'
                : warningsCount > 0
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            }`}
            title="Открыть инспектор статуса героев и базы знаний"
          >
            {conflictsCount > 0 ? (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
            <span>
              {conflictsCount > 0
                ? `Конфликт героев: ${conflictsCount} погибших действуют как живые!`
                : warningsCount > 0
                ? `Предупреждений по канону: ${warningsCount}`
                : 'Канон героев соблюдён (статусы живых/мёртвых проверены)'}
            </span>
            <span className="text-[10px] bg-stone-900/60 px-1.5 py-0.5 rounded-full text-stone-300 font-mono">
              {isInspectorOpen ? 'Скрыть панель' : 'Инспектор'}
            </span>
          </button>
        </div>

        {/* Right: Teleprompter & Save */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onOpenTeleprompter}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
            title="Открыть в телесуфлере для озвучки"
          >
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span>Суфлер</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Sub-Ribbon: Word Document View & Font Options */}
      <div className="px-4 py-1.5 flex flex-wrap items-center justify-between text-xs text-stone-400 bg-stone-950/60">
        {/* Left: Document Font & Appearance */}
        <div className="flex items-center space-x-4">
          {/* Font Selector */}
          <div className="flex items-center space-x-1.5">
            <Type className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-[11px] text-stone-500">Шрифт:</span>
            <div className="flex bg-stone-900 rounded p-0.5 border border-stone-800 text-[11px]">
              <button
                type="button"
                onClick={() => onChangeFont('serif')}
                className={`px-2 py-0.5 rounded font-serif ${
                  canvasFont === 'serif' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
                }`}
              >
                Литературный (Serif)
              </button>
              <button
                type="button"
                onClick={() => onChangeFont('sans')}
                className={`px-2 py-0.5 rounded font-sans ${
                  canvasFont === 'sans' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
                }`}
              >
                Современный (Sans)
              </button>
              <button
                type="button"
                onClick={() => onChangeFont('mono')}
                className={`px-2 py-0.5 rounded font-mono ${
                  canvasFont === 'mono' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
                }`}
              >
                Машинопись (Mono)
              </button>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center space-x-1.5">
            <Palette className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-[11px] text-stone-500">Лист:</span>
            <div className="flex bg-stone-900 rounded p-0.5 border border-stone-800 text-[11px]">
              <button
                type="button"
                onClick={() => onChangeTheme('word_white')}
                className={`px-2 py-0.5 rounded ${
                  canvasTheme === 'word_white' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
                }`}
                title="Белый лист (как в Microsoft Word)"
              >
                Белый (Word)
              </button>
              <button
                type="button"
                onClick={() => onChangeTheme('parchment')}
                className={`px-2 py-0.5 rounded ${
                  canvasTheme === 'parchment' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
                }`}
                title="Пергамент / Слоновая кость"
              >
                Пергамент
              </button>
              <button
                type="button"
                onClick={() => onChangeTheme('dark')}
                className={`px-2 py-0.5 rounded ${
                  canvasTheme === 'dark' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
                }`}
                title="Тёмный графит"
              >
                Тёмный
              </button>
            </div>
          </div>

          {/* Page view vs Continuous */}
          <button
            type="button"
            onClick={onTogglePaginated}
            className={`px-2 py-0.5 rounded text-[11px] border transition-colors flex items-center gap-1 ${
              isPaginated
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title="Переключить страничный вид A4 / Непрерывный холст"
          >
            <BookOpen className="w-3 h-3" />
            <span>{isPaginated ? 'Вид листа A4' : 'Сплошной свиток'}</span>
          </button>
        </div>

        {/* Right: Stats, Zoom & Focus Mode */}
        <div className="flex items-center space-x-4">
          <div className="text-[11px] text-stone-400 flex items-center space-x-3">
            <span>
              Слов: <strong className="text-stone-200 font-mono">{wordCount}</strong>
            </span>
            <span>
              Символов: <strong className="text-stone-200 font-mono">{charCount}</strong>
            </span>
            <span>
              Время чтения: ~<strong className="text-amber-400 font-mono">{Math.max(1, Math.ceil(wordCount / 130))}</strong> мин
            </span>
          </div>

          <div className="flex items-center space-x-1 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
            <button
              type="button"
              onClick={() => onChangeZoom(Math.max(75, zoom - 10))}
              className="p-1 hover:text-white transition-colors"
              title="Уменьшить масштаб"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="font-mono text-[11px] text-stone-300 min-w-8 text-center">{zoom}%</span>
            <button
              type="button"
              onClick={() => onChangeZoom(Math.min(140, zoom + 10))}
              className="p-1 hover:text-white transition-colors"
              title="Увеличить масштаб"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleFocusMode}
            className={`p-1.5 rounded transition-colors ${
              isFocusMode ? 'bg-amber-500 text-stone-950 font-bold' : 'hover:bg-stone-800 text-stone-400 hover:text-white'
            }`}
            title={isFocusMode ? 'Выйти из режима фокуса' : 'Режим фокуса (скрыть панели)'}
          >
            {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
