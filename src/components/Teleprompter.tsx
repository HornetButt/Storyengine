import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  FlipHorizontal,
  FlipVertical,
  Type,
  Gauge,
  Sliders,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  ArrowLeft,
  X,
  Keyboard,
  Clock,
  FileText,
  AlignLeft,
  AlignCenter,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Story } from '../types';

interface TeleprompterProps {
  stories?: Story[];
  initialStoryId?: string | null;
  initialText?: string;
  initialTitle?: string;
  onClose?: () => void;
  isOverlay?: boolean;
}

export const Teleprompter: React.FC<TeleprompterProps> = ({
  stories = [],
  initialStoryId,
  initialText,
  initialTitle,
  onClose,
  isOverlay = false,
}) => {
  // Selected story or custom text
  const [selectedStoryId, setSelectedStoryId] = useState<string>(
    initialStoryId || (stories.length > 0 ? stories[0].id : 'custom')
  );
  const [title, setTitle] = useState<string>(
    initialTitle ||
      (initialStoryId ? stories.find((s) => s.id === initialStoryId)?.title || 'Телесуфлер' : 'Телесуфлер')
  );
  const [text, setText] = useState<string>(
    initialText ||
      (initialStoryId ? stories.find((s) => s.id === initialStoryId)?.fullText || '' : stories[0]?.fullText || '')
  );

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(15); // 1 to 100
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState<number>(3);
  const [countdownEnabled, setCountdownEnabled] = useState(true);

  // Display & formatting settings
  const [fontSize, setFontSize] = useState<number>(44); // px
  const [lineHeight, setLineHeight] = useState<number>(1.7);
  const [marginWidth, setMarginWidth] = useState<'narrow' | 'normal' | 'wide' | 'full'>('normal');
  const [textAlign, setTextAlign] = useState<'left' | 'center'>('left');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [theme, setTheme] = useState<'oled-dark' | 'soft-dark' | 'amber-night' | 'light'>('oled-dark');

  // Prompter hardware features
  const [mirrorH, setMirrorH] = useState(false);
  const [mirrorV, setMirrorV] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [guidePosition, setGuidePosition] = useState<number>(40); // % from top (30-60)
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Audio / TTS rehearsal
  const [isTtsSpeaking, setIsTtsSpeaking] = useState(false);

  // Progress & Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  // DOM References
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const animFrameId = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Update text when selected story changes
  useEffect(() => {
    if (selectedStoryId && selectedStoryId !== 'custom') {
      const found = stories.find((s) => s.id === selectedStoryId);
      if (found) {
        setTitle(found.title);
        setText(found.fullText);
        handleReset();
      }
    }
  }, [selectedStoryId, stories]);

  // Word count & estimated read time
  const stats = useMemo(() => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    // Average speech rate is ~130-150 words per minute
    const estimatedMinutes = Math.ceil(words / 130);
    return { words, chars, estimatedMinutes };
  }, [text]);

  // Elapsed timer
  useEffect(() => {
    if (isPlaying && !isCountingDown) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isPlaying, isCountingDown]);

  // Sound beep helper using Web Audio API
  const playBeep = (freq = 440, duration = 0.1) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // AudioContext might be blocked until user gesture, ignore safely
    }
  };

  // Play / Pause toggle with optional countdown
  const togglePlay = () => {
    if (isEditing) setIsEditing(false);

    if (isPlaying) {
      setIsPlaying(false);
      setIsCountingDown(false);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (isTtsSpeaking) stopTts();
    } else {
      if (countdownEnabled) {
        setIsCountingDown(true);
        setCountdown(3);
        playBeep(520, 0.12);

        let count = 3;
        countdownIntervalRef.current = setInterval(() => {
          count -= 1;
          if (count > 0) {
            setCountdown(count);
            playBeep(520, 0.12);
          } else {
            clearInterval(countdownIntervalRef.current);
            setIsCountingDown(false);
            playBeep(880, 0.25);
            setIsPlaying(true);
          }
        }, 1000);
      } else {
        setIsPlaying(true);
      }
    }
  };

  // Reset prompter to start
  const handleReset = () => {
    setIsPlaying(false);
    setIsCountingDown(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
    setElapsedSeconds(0);
    setScrollProgress(0);
    stopTts();
  };

  // Scroll loop via requestAnimationFrame
  useEffect(() => {
    let lastTime = performance.now();

    const step = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying && !isCountingDown && scrollAreaRef.current) {
        // Pixel velocity based on speed setting: speed 1 = ~25px/s, speed 10 = ~260px/s
        const pixelSpeed = speed * 26;
        scrollAreaRef.current.scrollTop += pixelSpeed * delta;

        const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll > 0) {
          const prog = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
          setScrollProgress(prog);
          if (scrollTop >= maxScroll - 5) {
            setIsPlaying(false);
          }
        }
      }

      if (isPlaying) {
        animFrameId.current = requestAnimationFrame(step);
      }
    };

    if (isPlaying && !isCountingDown) {
      animFrameId.current = requestAnimationFrame(step);
    }

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isPlaying, isCountingDown, speed]);

  // Monitor scroll for manual user scrubbing
  const handleScroll = () => {
    if (!scrollAreaRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 0) {
      setScrollProgress(Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)));
    }
  };

  // Jump to progress %
  const handleSeek = (percentage: number) => {
    if (!scrollAreaRef.current) return;
    const { scrollHeight, clientHeight } = scrollAreaRef.current;
    const maxScroll = scrollHeight - clientHeight;
    scrollAreaRef.current.scrollTop = (percentage / 100) * maxScroll;
    setScrollProgress(percentage);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Text-To-Speech audio preview
  const toggleTts = () => {
    if (!('speechSynthesis' in window)) {
      alert('Синтез речи не поддерживается вашим браузером');
      return;
    }
    if (isTtsSpeaking) {
      stopTts();
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      // Match rate roughly to speed: 0.8 to 2.2
      utterance.rate = Math.min(2.2, Math.max(0.7, 0.8 + (speed / 100) * 1.2));
      utterance.onend = () => setIsTtsSpeaking(false);
      utterance.onerror = () => setIsTtsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsTtsSpeaking(true);
      if (!isPlaying) {
        setIsPlaying(true);
      }
    }
  };

  const stopTts = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsTtsSpeaking(false);
  };

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return; // Don't intercept typing in editor

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSpeed((prev) => Math.min(100, e.shiftKey ? prev + 5 : prev + 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSpeed((prev) => Math.max(1, e.shiftKey ? prev - 5 : prev - 1));
          break;
        case 'KeyR':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleReset();
          }
          break;
        case 'KeyF':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'KeyM':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setMirrorH((m) => !m);
          }
          break;
        case 'KeyG':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setShowGuide((g) => !g);
          }
          break;
        case 'KeyE':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setIsEditing((ed) => !ed);
            setIsPlaying(false);
          }
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen?.();
          } else if (onClose) {
            onClose();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isEditing, isFullscreen, onClose, countdownEnabled]);

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Theme styling definitions
  const themeStyles = {
    'oled-dark': {
      bg: 'bg-black',
      text: 'text-stone-100',
      navBg: 'bg-stone-950/95 border-stone-800/80',
      guide: 'bg-amber-400/20 border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.15)]',
      guideMarker: 'text-amber-400',
      cueColor: 'text-amber-400 font-bold',
    },
    'soft-dark': {
      bg: 'bg-stone-950',
      text: 'text-stone-200',
      navBg: 'bg-stone-900/95 border-stone-800',
      guide: 'bg-stone-100/10 border-stone-300/40',
      guideMarker: 'text-stone-300',
      cueColor: 'text-amber-300 font-bold',
    },
    'amber-night': {
      bg: 'bg-[#18130e]',
      text: 'text-[#f5ecd8]',
      navBg: 'bg-[#241d16]/95 border-[#382d22]',
      guide: 'bg-[#d97706]/20 border-[#f59e0b]/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      guideMarker: 'text-[#f59e0b]',
      cueColor: 'text-[#f59e0b] font-bold',
    },
    light: {
      bg: 'bg-stone-100',
      text: 'text-stone-900',
      navBg: 'bg-white/95 border-stone-200 shadow-lg',
      guide: 'bg-amber-500/15 border-amber-500/50',
      guideMarker: 'text-amber-600',
      cueColor: 'text-amber-700 font-bold',
    },
  }[theme];

  // Width constraint
  const widthClass = {
    narrow: 'max-w-2xl',
    normal: 'max-w-4xl',
    wide: 'max-w-6xl',
    full: 'max-w-full px-12',
  }[marginWidth];

  // Font family
  const fontClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  }[fontFamily];

  // Render text with highlight cues (e.g. [ПАУЗА], [ВДОХ], [АКЦЕНТ], etc.)
  const renderPrompterContent = () => {
    if (!text) {
      return (
        <div className="text-center py-20 text-stone-600 font-sans text-xl">
          Текст для суфлера отсутствует. Выберите историю или включите режим редактирования.
        </div>
      );
    }

    const paragraphs = text.split('\n');

    return paragraphs.map((paragraph, pIdx) => {
      if (!paragraph.trim()) {
        return <div key={pIdx} className="h-8" />;
      }

      // Highlight bracketed stage directions like [Пауза], [Вдох], [Медленно]
      const parts = paragraph.split(/(\[[^\]]+\])/g);

      return (
        <p key={pIdx} className="mb-6 leading-relaxed">
          {parts.map((part, partIdx) => {
            if (part.startsWith('[') && part.endsWith(']')) {
              return (
                <span
                  key={partIdx}
                  className={`inline-block px-2 py-0.5 mx-1 rounded bg-amber-500/20 text-amber-400 font-mono text-sm tracking-wider font-semibold border border-amber-500/30 uppercase ${
                    mirrorH ? 'inline-block scale-x-[-1]' : ''
                  }`}
                >
                  {part}
                </span>
              );
            }
            return <React.Fragment key={partIdx}>{part}</React.Fragment>;
          })}
        </p>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      id="teleprompter-root"
      className={`relative w-full h-full min-h-screen flex flex-col select-none overflow-hidden ${
        themeStyles.bg
      } ${themeStyles.text} transition-colors duration-200 ${
        isOverlay ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* --- TOP CONTROL BAR --- */}
      <header
        className={`shrink-0 z-30 px-6 py-3 border-b flex items-center justify-between backdrop-blur-md ${themeStyles.navBg}`}
      >
        <div className="flex items-center space-x-4">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
              title="Закрыть телесуфлер (Esc)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Story Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
              Телесуфлер
            </span>

            {stories.length > 0 && (
              <select
                value={selectedStoryId}
                onChange={(e) => setSelectedStoryId(e.target.value)}
                className="bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 max-w-[220px] truncate"
              >
                {stories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
                <option value="custom">✏️ Свой текст</option>
              </select>
            )}

            <span className="text-sm font-semibold text-stone-200 hidden md:inline truncate max-w-xs">
              {title}
            </span>
          </div>
        </div>

        {/* Stats & Timers */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-stone-900/80 border border-stone-800 text-stone-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-stone-200 font-bold">{formatTime(elapsedSeconds)}</span>
            <span className="text-stone-600">/ ~{stats.estimatedMinutes} мин</span>
          </div>

          <div className="hidden lg:flex items-center space-x-2 text-stone-400">
            <span>{stats.words} слов</span>
            <span className="text-stone-600">•</span>
            <span>{Math.round(scrollProgress)}%</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-lg text-xs font-medium border transition-colors flex items-center space-x-1 ${
                isEditing
                  ? 'bg-amber-500 text-stone-950 border-amber-400'
                  : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
              }`}
              title="Редактировать текст (E)"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">{isEditing ? 'Просмотр' : 'Правка'}</span>
            </button>

            <button
              onClick={toggleTts}
              className={`p-2 rounded-lg text-xs font-medium border transition-colors ${
                isTtsSpeaking
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                  : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
              }`}
              title="Синтез речи / Диктор (TTS)"
            >
              {isTtsSpeaking ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg text-xs font-medium border transition-colors ${
                showSettings
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
              }`}
              title="Настройки отображения"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="p-2 rounded-lg bg-stone-800 text-stone-400 border border-stone-700 hover:text-stone-200 transition-colors"
              title="Горячие клавиши (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-stone-800 text-stone-400 border border-stone-700 hover:text-stone-200 transition-colors"
              title="Полноэкранный режим (F)"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* --- SETTINGS DRAWER OVERLAY --- */}
      {showSettings && (
        <div className="absolute top-16 right-6 z-40 w-80 bg-stone-900/95 border border-stone-800 p-5 rounded-2xl shadow-2xl backdrop-blur-xl space-y-4 text-xs font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="font-bold text-stone-100 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-400" />
              Параметры суфлера
            </span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-stone-400 hover:text-stone-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Font Size */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-stone-400">
              <span>Размер шрифта</span>
              <span className="font-mono text-amber-400 font-semibold">{fontSize}px</span>
            </div>
            <input
              type="range"
              min="24"
              max="76"
              step="2"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          {/* Speed */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-stone-400">
              <span>Скорость прокрутки</span>
              <span className="font-mono text-amber-400 font-semibold">{speed} / 100</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
            <div className="flex justify-between gap-1 pt-1 text-[10px]">
              {[5, 15, 30, 50, 75, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSpeed(preset)}
                  className={`px-1.5 py-0.5 rounded border transition-colors ${
                    speed === preset
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                      : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Guide position */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-stone-400">
              <span>Положение направляющей</span>
              <span className="font-mono text-amber-400 font-semibold">{guidePosition}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="65"
              step="5"
              value={guidePosition}
              onChange={(e) => setGuidePosition(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          {/* Width constraint */}
          <div className="space-y-1.5">
            <span className="text-stone-400">Ширина текстовой колонки</span>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {(['narrow', 'normal', 'wide', 'full'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setMarginWidth(w)}
                  className={`py-1 rounded text-[11px] font-medium border transition-colors ${
                    marginWidth === w
                      ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
                      : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                  }`}
                >
                  {w === 'narrow' ? 'Узкая' : w === 'normal' ? 'Средняя' : w === 'wide' ? 'Широкая' : 'Полная'}
                </button>
              ))}
            </div>
          </div>

          {/* Hardware Mirrors */}
          <div className="space-y-1.5 pt-1 border-t border-stone-800">
            <span className="text-stone-400">Отражение для стекла (Зеркало)</span>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setMirrorH(!mirrorH)}
                className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  mirrorH
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>Зеркало X</span>
              </button>

              <button
                onClick={() => setMirrorV(!mirrorV)}
                className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  mirrorV
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
                }`}
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span>Зеркало Y</span>
              </button>
            </div>
          </div>

          {/* Theme selection */}
          <div className="space-y-1.5 pt-1 border-t border-stone-800">
            <span className="text-stone-400">Цветовая схема</span>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {(
                [
                  { id: 'oled-dark', label: 'Черный OLED' },
                  { id: 'soft-dark', label: 'Тёмный гранит' },
                  { id: 'amber-night', label: 'Тёплый янтарь' },
                  { id: 'light', label: 'Светлый' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                    theme === t.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                      : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Countdown toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-800">
            <span className="text-stone-400">Обратный отсчёт (3 сек)</span>
            <input
              type="checkbox"
              checked={countdownEnabled}
              onChange={(e) => setCountdownEnabled(e.target.checked)}
              className="accent-amber-400 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* --- KEYBOARD SHORTCUTS MODAL --- */}
      {showShortcuts && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4 text-xs font-sans text-stone-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <span className="font-bold text-sm text-stone-100 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-amber-400" />
                Горячие клавиши телесуфлера
              </span>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-stone-400 hover:text-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Старт / Пауза</span>
                <kbd className="px-2 py-1 bg-stone-800 rounded border border-stone-700 font-mono text-[11px] text-amber-400">
                  Пробел (Space)
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Скорость (от 1 до 100)</span>
                <div className="flex gap-1 font-mono text-[11px] text-amber-400">
                  <kbd className="px-2 py-1 bg-stone-800 rounded border border-stone-700">↑ / ↓</kbd>
                  <kbd className="px-1.5 py-1 bg-stone-800 rounded border border-stone-700 text-stone-400 text-[10px]">+Shift (x5)</kbd>
                </div>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Сброс к началу</span>
                <kbd className="px-2 py-1 bg-stone-800 rounded border border-stone-700 font-mono text-[11px] text-amber-400">
                  R
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Полноэкранный режим</span>
                <kbd className="px-2 py-1 bg-stone-800 rounded border border-stone-700 font-mono text-[11px] text-amber-400">
                  F
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Зеркало по горизонтали (Flip X)</span>
                <kbd className="px-2 py-1 bg-stone-800 rounded border border-stone-700 font-mono text-[11px] text-amber-400">
                  M
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Показать / скрыть маркер чтения</span>
                <kbd className="px-2 py-1 bg-stone-800 rounded border border-stone-700 font-mono text-[11px] text-amber-400">
                  G
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Режим редактирования</span>
                <kbd className="px-2 py-1 bg-stone-800 rounded border border-stone-700 font-mono text-[11px] text-amber-400">
                  E
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-stone-400">Выход</span>
                <kbd className="px-2 py-1 bg-stone-800 rounded border border-stone-700 font-mono text-[11px] text-amber-400">
                  Esc
                </kbd>
              </div>
            </div>

            <div className="pt-2 text-stone-500 text-[11px] leading-relaxed">
              💡 Совет: метки в квадратных скобках, например <span className="text-amber-400 font-mono">[Пауза]</span> или <span className="text-amber-400 font-mono">[Шёпотом]</span>, автоматически подсвечиваются как подсказки диктору.
            </div>
          </div>
        </div>
      )}

      {/* --- COUNTDOWN OVERLAY --- */}
      {isCountingDown && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
          <div className="text-9xl font-black font-mono text-amber-400 animate-ping">
            {countdown}
          </div>
          <p className="mt-4 text-stone-300 font-semibold tracking-widest uppercase text-sm">
            Приготовьтесь к чтению
          </p>
        </div>
      )}

      {/* --- MAIN SCROLLING PROMPTER VIEW --- */}
      <main className="relative flex-1 overflow-hidden">
        {/* Eye Focus Reading Guide Marker */}
        {showGuide && !isEditing && (
          <div
            style={{ top: `${guidePosition}%` }}
            className={`absolute left-0 right-0 z-20 pointer-events-none h-16 border-y-2 flex items-center justify-between px-6 ${themeStyles.guide}`}
          >
            {/* Left eye tracker arrow */}
            <div className={`text-xl font-bold flex items-center ${themeStyles.guideMarker}`}>
              <span>▶</span>
            </div>
            {/* Right eye tracker arrow */}
            <div className={`text-xl font-bold flex items-center ${themeStyles.guideMarker}`}>
              <span>◀</span>
            </div>
          </div>
        )}

        {/* Text Container or Direct Editor */}
        {isEditing ? (
          <div className="w-full h-full p-8 max-w-4xl mx-auto flex flex-col">
            <div className="flex items-center justify-between mb-3 text-xs text-stone-400">
              <span className="font-semibold text-stone-200">
                Правка текста суфлера и реплик:
              </span>
              <span>Используйте [теги подсказок] для выделения пауз и интонаций</span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Введите или вставьте текст для суфлера..."
              className="flex-1 w-full bg-stone-900 border border-stone-700 rounded-2xl p-6 text-stone-100 font-mono text-base leading-relaxed focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
        ) : (
          <div
            ref={scrollAreaRef}
            onScroll={handleScroll}
            className={`w-full h-full overflow-y-auto px-6 py-40 scroll-smooth ${
              mirrorH ? 'scale-x-[-1]' : ''
            } ${mirrorV ? 'scale-y-[-1]' : ''}`}
            style={{
              // Hide scrollbar for immersive reading
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <div
              className={`mx-auto ${widthClass} ${fontClass}`}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                textAlign: textAlign,
              }}
            >
              {renderPrompterContent()}

              {/* Extra spacing at the bottom so the last paragraph scrolls past the reading guide */}
              <div className="h-[75vh]" />
            </div>
          </div>
        )}
      </main>

      {/* --- BOTTOM PLAYBACK DOCK --- */}
      <footer
        className={`shrink-0 z-30 px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md ${themeStyles.navBg}`}
      >
        {/* Progress scrub bar */}
        <div className="w-full sm:hidden">
          <input
            type="range"
            min="0"
            max="100"
            value={scrollProgress}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>

        {/* Left: Speed Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-stone-900/90 border border-stone-800 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] font-mono text-stone-400 font-semibold hidden md:inline">
              Скорость:
            </span>
            <button
              onClick={() => setSpeed((s) => Math.max(1, s - (s > 15 ? 5 : 1)))}
              className="p-1 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
              title="Замедлить (↓)"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-16 md:w-28 accent-amber-400 cursor-pointer h-1.5 bg-stone-800 rounded-lg"
              title="Скорость от 1 до 100"
            />
            <span className="font-mono text-xs font-bold text-amber-400 min-w-[2.2rem] text-center">
              {speed}
            </span>
            <button
              onClick={() => setSpeed((s) => Math.min(100, s + (s >= 15 ? 5 : 1)))}
              className="p-1 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
              title="Ускорить (↑)"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            title="Сброс в начало (R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Main Play / Pause Button */}
        <div className="flex items-center space-x-4">
          <button
            onClick={togglePlay}
            className={`px-8 py-3 rounded-2xl flex items-center space-x-2.5 font-bold text-sm shadow-xl transition-all active:scale-95 ${
              isPlaying
                ? 'bg-stone-800 hover:bg-stone-700 text-amber-400 border border-amber-500/40'
                : 'bg-amber-500 hover:bg-amber-400 text-stone-950 hover:shadow-amber-500/20'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>Пауза</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Запуск суфлера</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Formatting Quick Toggles & Seekbar */}
        <div className="hidden sm:flex items-center space-x-4">
          {/* Seek progress bar */}
          <div className="w-36 flex items-center space-x-2">
            <span className="text-[10px] font-mono text-stone-500">{Math.round(scrollProgress)}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={scrollProgress}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-stone-800 rounded-lg"
              title="Перемотка текста"
            />
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`p-2 rounded-xl border text-xs transition-colors ${
                showGuide
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'
              }`}
              title="Маркер строки чтения (G)"
            >
              {showGuide ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setMirrorH(!mirrorH)}
              className={`p-2 rounded-xl border text-xs transition-colors ${
                mirrorH
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'
              }`}
              title="Зеркало для стекла (M)"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
