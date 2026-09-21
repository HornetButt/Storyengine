import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Story,
  Universe,
  Character,
  StoryLocation,
  StoryEvent,
  StoryObject,
} from '../types';
import { CanvasToolbar, CanvasTheme, CanvasFont } from '../components/StoryCanvas/CanvasToolbar';
import { LoreInspector } from '../components/StoryCanvas/LoreInspector';
import { Teleprompter } from '../components/Teleprompter';
import { inspectStoryCanon, CharacterMentionContext } from '../utils/canonDetector';
import { api } from '../services/api';
import {
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Tv,
  Save,
  Wand2,
  RefreshCw,
  Plus,
  Layers,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';

interface StoryCanvasPageProps {
  stories: Story[];
  universes: Universe[];
  characters: Character[];
  locations: StoryLocation[];
  events: StoryEvent[];
  objects: StoryObject[];
  initialStoryId: string | null;
  onSelectStory: (id: string) => void;
  onRefreshAll: () => Promise<void>;
  onBackToStories?: () => void;
}

export const StoryCanvasPage: React.FC<StoryCanvasPageProps> = ({
  stories,
  universes,
  characters,
  locations,
  events,
  objects,
  initialStoryId,
  onSelectStory,
  onRefreshAll,
  onBackToStories,
}) => {
  // Current Story state
  const [selectedStoryId, setSelectedStoryId] = useState<string>(initialStoryId || stories[0]?.id || '');
  const [story, setStory] = useState<Story | null>(null);
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [fullText, setFullText] = useState('');
  const [universeId, setUniverseId] = useState<string>(universes[0]?.id || 'uni-main');
  const [storyYear, setStoryYear] = useState<number>(2026);
  const [canonStatus, setCanonStatus] = useState<'canon' | 'apocrypha' | 'alternative_timeline' | 'draft'>('canon');

  // History for Undo/Redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  // UI & Canvas visual state
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>('word_white');
  const [canvasFont, setCanvasFont] = useState<CanvasFont>('serif');
  const [zoom, setZoom] = useState<number>(100);
  const [isPaginated, setIsPaginated] = useState<boolean>(true);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);
  const [showLiveHighlights, setShowLiveHighlights] = useState<boolean>(true);

  // Status & Teleprompter
  const [isSaving, setIsSaving] = useState(false);
  const [isPrompterOpen, setIsPrompterOpen] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Active conflict popover
  const [activeConflictPopover, setActiveConflictPopover] = useState<CharacterMentionContext | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Load story data when selectedStoryId changes
  useEffect(() => {
    if (selectedStoryId) {
      const found = stories.find((s) => s.id === selectedStoryId);
      if (found) {
        setStory(found);
        setTitle(found.title);
        setSynopsis(found.synopsis || '');
        setFullText(found.fullText || '');
        setUniverseId(found.universeId);
        setStoryYear(found.storyYear || 2026);
        setCanonStatus(found.canonStatus || 'canon');
        setHistory([found.fullText || '']);
        setHistoryIdx(0);
      }
    } else if (stories.length > 0) {
      setSelectedStoryId(stories[0].id);
    }
  }, [selectedStoryId, stories]);

  // Universe characters
  const currentUniverseCharacters = useMemo(() => {
    return characters.filter((c) => !c.universeId || c.universeId === universeId);
  }, [characters, universeId]);

  const currentUniverseLocations = useMemo(() => {
    return locations.filter((l) => !l.universeId || l.universeId === universeId);
  }, [locations, universeId]);

  const currentUniverseEvents = useMemo(() => {
    return events.filter((e) => !e.universeId || e.universeId === universeId);
  }, [events, universeId]);

  const currentUniverseObjects = useMemo(() => {
    return objects.filter((o) => !o.universeId || o.universeId === universeId);
  }, [objects, universeId]);

  const currentUniverse = useMemo(() => {
    return universes.find((u) => u.id === universeId);
  }, [universes, universeId]);

  // Real-time Canon & Temporal Status Inspection
  const canonSummary = useMemo(() => {
    return inspectStoryCanon(
      fullText,
      storyYear,
      currentUniverseCharacters,
      currentUniverseLocations,
      currentUniverseEvents,
      currentUniverseObjects
    );
  }, [fullText, storyYear, currentUniverseCharacters, currentUniverseLocations, currentUniverseEvents, currentUniverseObjects]);

  // Push to history on typing
  const handleTextChange = (newVal: string) => {
    setFullText(newVal);
    // Add to history debounced or on change
    if (history[historyIdx] !== newVal) {
      const newHist = history.slice(0, historyIdx + 1);
      newHist.push(newVal);
      if (newHist.length > 50) newHist.shift();
      setHistory(newHist);
      setHistoryIdx(newHist.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1];
      setHistoryIdx(historyIdx - 1);
      setFullText(prev);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const next = history[historyIdx + 1];
      setHistoryIdx(historyIdx + 1);
      setFullText(next);
    }
  };

  // Text insertion & formatting helpers
  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      handleTextChange(fullText + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = fullText.substring(0, start);
    const after = fullText.substring(end);
    const updated = before + textToInsert + after;

    handleTextChange(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 10);
  };

  const applyFormat = (tag: string, placeholder: string = 'текст') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = fullText.substring(start, end) || placeholder;

    let formatted = '';
    if (tag === '<u>') {
      formatted = `<u>${selected}</u>`;
    } else {
      formatted = `${tag}${selected}${tag}`;
    }

    const before = fullText.substring(0, start);
    const after = fullText.substring(end);
    const updated = before + formatted + after;

    handleTextChange(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length + selected.length);
    }, 10);
  };

  const handleInsertEmDash = () => {
    insertTextAtCursor('\n— ');
  };

  const handleInsertSceneBreak = () => {
    insertTextAtCursor('\n\n* * *\n\n');
  };

  const handleInsertHeading = (level: 1 | 2 | 3) => {
    const hashes = '#'.repeat(level);
    insertTextAtCursor(`\n\n${hashes} Глава `);
  };

  const handleInsertEpigraph = () => {
    insertTextAtCursor('\n\n> *«Цитата или эпиграф к главе...»*\n> — Автор\n\n');
  };

  // Fix canon conflict application
  const handleApplyFix = (
    fix: CharacterMentionContext['suggestedFixes'][0],
    mention: CharacterMentionContext
  ) => {
    if (fix.type === 'make_flashback' && fix.actionPayload) {
      // Replace original sentence with memorial phrasing
      const original = fix.actionPayload.originalSentence;
      const replacement = `В памяти всплыло воспоминание: когда-то ${mention.canonicalName} ${mention.activeSnippet || 'был рядом'}...`;
      if (fullText.includes(original)) {
        const updated = fullText.replace(original, replacement);
        handleTextChange(updated);
        setSaveNotification(`Фраза оформлена как воспоминание об умершем герое.`);
      }
    } else if (fix.type === 'change_year' && fix.actionPayload) {
      // Set year to before death
      setStoryYear(fix.actionPayload.newYear);
      setSaveNotification(`Год истории перенесён на ${fix.actionPayload.newYear} г. (когда герой был жив).`);
    } else if (fix.type === 'replace_character' && fix.actionPayload) {
      // Replace name
      const targetName = fix.actionPayload.targetName;
      const replacementName = fix.actionPayload.replacementName;
      const regex = new RegExp(`\\b${targetName}\\b`, 'g');
      const updated = fullText.replace(regex, replacementName);
      handleTextChange(updated);
      setSaveNotification(`Персонаж «${targetName}» заменён на живого спутника «${replacementName}».`);
    }

    setActiveConflictPopover(null);
    setTimeout(() => setSaveNotification(null), 4000);
  };

  // Save story to API
  const handleSave = async () => {
    if (!story) return;
    setIsSaving(true);
    setSaveNotification(null);
    try {
      await api.updateStory(
        story.id,
        {
          title,
          synopsis,
          fullText,
          universeId,
          storyYear: Number(storyYear),
          canonStatus,
        },
        'Правка на холсте Word с проверкой канона'
      );
      await onRefreshAll();
      setSaveNotification('История успешно сохранена! Новая версия создана.');
      setTimeout(() => setSaveNotification(null), 3500);
    } catch (e: any) {
      setSaveNotification(`Ошибка сохранения: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Create new blank story
  const handleCreateNewStory = async () => {
    try {
      const newStory = await api.createStory({
        title: 'Новая глава канона',
        universeId,
        storyYear,
        fullText: '— Здесь начинается новая история...\n\n',
        synopsis: 'Черновик новой главы.',
        canonStatus: 'canon',
      });
      await onRefreshAll();
      setSelectedStoryId(newStory.id);
      onSelectStory(newStory.id);
    } catch (e) {
      console.error(e);
    }
  };

  // Counts
  const wordCount = useMemo(() => {
    return fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
  }, [fullText]);

  // Theme styling classes for paper canvas
  const getPaperStyles = () => {
    switch (canvasTheme) {
      case 'word_white':
        return {
          paper: 'bg-white text-stone-900 border-stone-200 shadow-2xl shadow-stone-950/20',
          backdrop: 'bg-stone-950/95',
          fontFamily:
            canvasFont === 'serif'
              ? 'font-serif'
              : canvasFont === 'sans'
              ? 'font-sans'
              : 'font-mono',
          lineColor: 'border-stone-200',
        };
      case 'parchment':
        return {
          paper: 'bg-[#f8f4ea] text-stone-900 border-[#e8dfc8] shadow-2xl shadow-stone-950/30',
          backdrop: 'bg-[#1a1714]',
          fontFamily:
            canvasFont === 'serif'
              ? 'font-serif'
              : canvasFont === 'sans'
              ? 'font-sans'
              : 'font-mono',
          lineColor: 'border-[#dfd4b8]',
        };
      case 'dark':
        return {
          paper: 'bg-stone-900 text-stone-100 border-stone-800 shadow-2xl shadow-black/60',
          backdrop: 'bg-stone-950',
          fontFamily:
            canvasFont === 'serif'
              ? 'font-serif'
              : canvasFont === 'sans'
              ? 'font-sans'
              : 'font-mono',
          lineColor: 'border-stone-800',
        };
      case 'soft_gray':
      default:
        return {
          paper: 'bg-[#f4f4f5] text-stone-900 border-stone-300 shadow-2xl shadow-stone-950/20',
          backdrop: 'bg-stone-900',
          fontFamily:
            canvasFont === 'serif'
              ? 'font-serif'
              : canvasFont === 'sans'
              ? 'font-sans'
              : 'font-mono',
          lineColor: 'border-stone-300',
        };
    }
  };

  const paperStyles = getPaperStyles();

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-950 overflow-hidden relative">
      {/* Top Navigation & Story Switcher Bar */}
      <div className="bg-stone-900 border-b border-stone-800 px-4 py-2 flex items-center justify-between text-xs text-stone-300 shrink-0">
        <div className="flex items-center space-x-3">
          {onBackToStories && (
            <button
              type="button"
              onClick={onBackToStories}
              className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors flex items-center gap-1"
              title="Назад к библиотеке историй"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Истории</span>
            </button>
          )}

          <div className="h-4 w-px bg-stone-800" />

          {/* Story Selector Dropdown */}
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <select
              value={selectedStoryId}
              onChange={(e) => setSelectedStoryId(e.target.value)}
              className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-stone-100 font-semibold focus:outline-none focus:border-amber-500 max-w-[220px] sm:max-w-xs truncate"
            >
              {stories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.storyYear} г.)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleCreateNewStory}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
            title="Создать новый чистый лист"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Новый лист</span>
          </button>
        </div>

        {/* Story Title & Save notification */}
        <div className="flex items-center space-x-3">
          {saveNotification && (
            <span className="text-emerald-400 font-medium text-xs bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveNotification}</span>
            </span>
          )}

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-stone-500 hidden md:inline">Вселенная:</span>
            <select
              value={universeId}
              onChange={(e) => setUniverseId(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded px-2 py-0.5 text-[11px] text-stone-300 focus:outline-none"
            >
              {universes.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Word-like Ribbon Toolbar */}
      <CanvasToolbar
        onApplyFormat={applyFormat}
        onInsertEmDash={handleInsertEmDash}
        onInsertSceneBreak={handleInsertSceneBreak}
        onInsertHeading={handleInsertHeading}
        onInsertEpigraph={handleInsertEpigraph}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIdx > 0}
        canRedo={historyIdx < history.length - 1}
        canvasTheme={canvasTheme}
        onChangeTheme={setCanvasTheme}
        canvasFont={canvasFont}
        onChangeFont={setCanvasFont}
        zoom={zoom}
        onChangeZoom={setZoom}
        isPaginated={isPaginated}
        onTogglePaginated={() => setIsPaginated(!isPaginated)}
        isFocusMode={isFocusMode}
        onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
        conflictsCount={canonSummary.conflictsCount}
        warningsCount={canonSummary.warningsCount}
        isInspectorOpen={isInspectorOpen}
        onOpenInspector={() => setIsInspectorOpen(!isInspectorOpen)}
        isSaving={isSaving}
        onSave={handleSave}
        onOpenTeleprompter={() => setIsPrompterOpen(true)}
        wordCount={wordCount}
        charCount={fullText.length}
      />

      {/* Main Workspace Area: Document Canvas + Side Lore Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Document Canvas Scrollable Area */}
        <div className={`flex-1 overflow-y-auto p-4 md:p-8 flex justify-center ${paperStyles.backdrop} transition-colors duration-200`}>
          <div
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            className={`w-full transition-transform duration-150 ${
              isPaginated ? 'max-w-4xl' : 'max-w-5xl'
            }`}
          >
            {/* Critical Canon Conflict Floating Banner */}
            {canonSummary.conflictsCount > 0 && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-100 flex items-start justify-between shadow-lg backdrop-blur-sm">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-rose-300">
                      Внимание: в тексте обнаружено нарушение хронологии канона!
                    </h4>
                    <p className="text-xs text-rose-200 leading-relaxed">
                      Погибший персонаж ({canonSummary.charactersInText.find((c) => c.hasConflict)?.character.canonicalName})
                      действует как живой в {storyYear} году. Нажмите на подсказку в инспекторе справа для быстрого исправления.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 transition-colors shadow"
                >
                  Открыть исправление →
                </button>
              </div>
            )}

            {/* The Document Sheet (Лист бумаги А4) */}
            <div
              className={`rounded-xl border min-h-[1050px] p-8 md:p-14 flex flex-col transition-all duration-200 ${
                paperStyles.paper
              } ${paperStyles.fontFamily}`}
            >
              {/* Document Header (Заголовок листа, год, колонтитул) */}
              <div className="border-b pb-4 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs opacity-75">
                <div className="flex items-center space-x-2">
                  <span className="font-mono uppercase tracking-widest text-[11px] font-bold">
                    {currentUniverse?.name || 'Вселенная'}
                  </span>
                  <span>•</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                    {storyYear} г.
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-[11px]">
                  <span>Статус канона: <strong>{canonStatus.toUpperCase()}</strong></span>
                  <span>Лист 1</span>
                </div>
              </div>

              {/* Story Title Input on the Sheet */}
              <div className="mb-6">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Название истории или главы..."
                  className="w-full bg-transparent border-none text-2xl md:text-3xl font-bold tracking-tight focus:outline-none placeholder-stone-400"
                />
                <input
                  type="text"
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Краткий синопсис / аннотация..."
                  className="w-full bg-transparent border-none text-xs italic text-stone-500 mt-1 focus:outline-none placeholder-stone-400"
                />
              </div>

              {/* Real-time Cast Status Strip on Paper */}
              {canonSummary.charactersInText.length > 0 && (
                <div className="mb-6 py-2 px-3 rounded-lg bg-stone-500/10 border border-stone-500/20 text-xs flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold">
                    Герои в сцене ({storyYear} г.):
                  </span>
                  {canonSummary.charactersInText.map(({ character, statusInYear, deathYear, hasConflict }) => (
                    <span
                      key={character.id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        hasConflict
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/50 font-bold'
                          : statusInYear === 'deceased'
                          ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      <span>{character.canonicalName}</span>
                      <span className="text-[9px] opacity-80">
                        {statusInYear === 'deceased' ? `(погиб ${deathYear} г.)` : '(жив)'}
                      </span>
                      {hasConflict && <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                    </span>
                  ))}
                </div>
              )}

              {/* Primary Document Canvas Text Area */}
              <div className="flex-1 relative flex flex-col">
                <textarea
                  ref={textareaRef}
                  value={fullText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Начните писать историю здесь... При упоминании персонажей система автоматически сопоставит их статус (жив или погиб по канону) с выбранным годом."
                  className="w-full flex-1 bg-transparent border-none text-base md:text-lg leading-relaxed focus:outline-none resize-none placeholder-stone-400 font-normal min-h-[700px]"
                  style={{
                    lineHeight: '1.85',
                    letterSpacing: '0.01em',
                  }}
                />
              </div>

              {/* Document Footer (Word Document Style) */}
              <div className="border-t pt-4 mt-8 flex items-center justify-between text-[11px] text-stone-400">
                <span>Story Engine • Канонический документ</span>
                <span>{wordCount} слов • {fullText.length} знаков</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Collapsible Lore & Canon Inspector */}
        {isInspectorOpen && !isFocusMode && (
          <LoreInspector
            summary={canonSummary}
            storyYear={storyYear}
            onChangeStoryYear={setStoryYear}
            universe={currentUniverse}
            characters={currentUniverseCharacters}
            locations={currentUniverseLocations}
            events={currentUniverseEvents}
            objects={currentUniverseObjects}
            onInsertText={insertTextAtCursor}
            onApplyFix={handleApplyFix}
          />
        )}
      </div>

      {/* Teleprompter Overlay Modal */}
      {isPrompterOpen && (
        <Teleprompter
          initialStoryId={story?.id}
          initialTitle={title}
          initialText={fullText}
          isOverlay={true}
          onClose={() => setIsPrompterOpen(false)}
        />
      )}
    </div>
  );
};
