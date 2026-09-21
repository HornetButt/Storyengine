import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { LLMConfig, LLMProviderType, LLMTestResult } from '../types';
import {
  Settings,
  Terminal,
  Cpu,
  Check,
  Copy,
  Server,
  Key,
  Globe,
  Sliders,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  Layers,
} from 'lucide-react';

interface ProviderMeta {
  id: LLMProviderType;
  name: string;
  category: 'local' | 'cloud';
  description: string;
  defaultBaseUrl: string;
  defaultModel: string;
  suggestedModels: string[];
  requiresApiKey: boolean;
  docUrl?: string;
}

const PROVIDER_METAS: ProviderMeta[] = [
  // Local Providers
  {
    id: 'ollama',
    name: 'Ollama (Локально)',
    category: 'local',
    description: 'Быстрый запуск моделей на локальном ПК или сервере. Не требует внешнего API ключа.',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1:8b',
    suggestedModels: ['llama3.1:8b', 'qwen2.5:7b', 'deepseek-r1:8b', 'mistral:7b', 'phi-3:mini'],
    requiresApiKey: false,
    docUrl: 'https://ollama.com',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (Локально)',
    category: 'local',
    description: 'Локальный сервер с GUI для квантованных моделей GGUF. Включите Local Server в LM Studio.',
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    suggestedModels: ['local-model', 'meta-llama-3.1-8b-instruct', 'qwen2.5-7b-instruct'],
    requiresApiKey: false,
    docUrl: 'https://lmstudio.ai',
  },
  {
    id: 'vllm',
    name: 'vLLM / LocalAI (Локально)',
    category: 'local',
    description: 'Высокопроизводительный сервер инференса для Linux/GPU серверов.',
    defaultBaseUrl: 'http://localhost:8000/v1',
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
    suggestedModels: ['Qwen/Qwen2.5-7B-Instruct', 'meta-llama/Llama-3.1-8B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3'],
    requiresApiKey: false,
  },
  {
    id: 'custom',
    name: 'Custom (OpenAI-совместимый)',
    category: 'local',
    description: 'Любой собственный сервер или прокси (TGI, Ollama remote, FastAPI, LiteLLM и др.).',
    defaultBaseUrl: 'http://localhost:8000/v1',
    defaultModel: 'default',
    suggestedModels: [],
    requiresApiKey: false,
  },

  // Cloud Providers
  {
    id: 'gemini',
    name: 'Google Gemini',
    category: 'cloud',
    description: 'Google AI Studio & Gemini 2.5/3.0. По умолчанию использует серверный ключ или собственный.',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.5-flash',
    suggestedModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.8-flash'],
    requiresApiKey: true,
    docUrl: 'https://aistudio.google.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'cloud',
    description: 'GPT-4o, GPT-4o-mini, o3-mini и другие модели от OpenAI.',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'o3-mini'],
    requiresApiKey: true,
    docUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    category: 'cloud',
    description: 'Модели DeepSeek-V3 и DeepSeek-R1 через официальный OpenAI-совместимый API.',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
    requiresApiKey: true,
    docUrl: 'https://platform.deepseek.com',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    category: 'cloud',
    description: 'Claude 3.5 Sonnet и Claude 3.5 Haiku для литературных задач.',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    suggestedModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    requiresApiKey: true,
    docUrl: 'https://console.anthropic.com',
  },
  {
    id: 'groq',
    name: 'Groq',
    category: 'cloud',
    description: 'Сверхбыстрый LPU инференс для Llama 3.3 70B и Mixtral.',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    suggestedModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    requiresApiKey: true,
    docUrl: 'https://console.groq.com',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'cloud',
    description: 'Единый шлюз ко всем мировым LLM (от бесплатных до топовых флагманов).',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.0-flash-001',
    suggestedModels: [
      'google/gemini-2.0-flash-001',
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-r1',
      'anthropic/claude-3.5-sonnet',
    ],
    requiresApiKey: true,
    docUrl: 'https://openrouter.ai',
  },
];

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'llm' | 'api'>('llm');

  // LLM Config State
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 3000,
    isLocal: false,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<LLMTestResult | null>(null);

  // Fetch models state
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);

  // API docs state
  const [toolsSchema, setToolsSchema] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    // Load current LLM config
    api.getLLMConfig()
      .then((cfg) => {
        if (cfg) setLlmConfig(cfg);
      })
      .catch((e) => console.error('Failed to load LLM config:', e));

    // Load schema for API tab
    api.getLLMToolsSchema().then(setToolsSchema).catch(() => {});
  }, []);

  const currentProviderMeta =
    PROVIDER_METAS.find((p) => p.id === llmConfig.provider) || PROVIDER_METAS[0];

  const handleProviderSelect = (providerId: LLMProviderType) => {
    const meta = PROVIDER_METAS.find((p) => p.id === providerId);
    if (!meta) return;

    setLlmConfig((prev) => ({
      ...prev,
      provider: providerId,
      baseUrl: meta.defaultBaseUrl,
      model: meta.defaultModel,
      isLocal: meta.category === 'local',
      // Keep existing apiKey if switching between clouds or clear if local
    }));
    setTestResult(null);
    setDiscoveredModels([]);
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await api.updateLLMConfig(llmConfig);
      setLlmConfig(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      alert(`Ошибка при сохранении: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testLLM(llmConfig);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        error: e.message || 'Сетевая ошибка при проверке подключения',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    try {
      const res = await api.getAvailableLLMModels(llmConfig);
      if (res.models && res.models.length > 0) {
        setDiscoveredModels(res.models);
        if (!res.models.includes(llmConfig.model)) {
          setLlmConfig((prev) => ({ ...prev, model: res.models[0] }));
        }
      } else {
        alert('Сервер не вернул список моделей. Проверьте адрес и запущен ли сервер.');
      }
    } catch (e: any) {
      alert(`Не удалось опросить сервер: ${e.message}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const curlExample = `curl -X POST http://localhost:3000/api/v1/generation/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "universeId": "uni-sosnovka",
    "storyYear": 2026,
    "prompt": "Новое расследование в Сосновке",
    "canonStatus": "canon",
    "referenceLevel": "subtle"
  }'`;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 text-stone-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-amber-400" />
            Настройки движка & LLM Провайдеров
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Подключение любых языковых моделей (локальных Ollama, LM Studio, vLLM или облачных Gemini, OpenAI, Claude, DeepSeek) и параметры REST API.
          </p>
        </div>

        {/* Tabs switcher */}
        <div className="flex items-center space-x-1 p-1 bg-stone-900 border border-stone-800 rounded-lg text-xs self-start">
          <button
            onClick={() => setActiveTab('llm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'llm'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>LLM Провайдеры</span>
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'api'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>API & Боты</span>
          </button>
        </div>
      </div>

      {activeTab === 'llm' ? (
        <div className="space-y-6">
          {/* Provider Selection Card */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                  <Server className="w-4 h-4 text-amber-400" />
                  Выберите активного провайдера LLM
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Движок использует выбранную модель для планирования, генерации историй, проверки канона и извлечения сущностей.
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-400/10 text-amber-300 border border-amber-400/20">
                <Sparkles className="w-3 h-3" />
                Активен: {currentProviderMeta.name}
              </span>
            </div>

            {/* Category: Local Providers */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                <Server className="w-3 h-3" />
                Локальные нейросети (Offline / Private / Self-hosted)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {PROVIDER_METAS.filter((p) => p.category === 'local').map((provider) => {
                  const isSelected = llmConfig.provider === provider.id;
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => handleProviderSelect(provider.id)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40 shadow-sm'
                          : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-100">
                          {provider.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                        {provider.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category: Cloud Providers */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-sky-400 flex items-center gap-1.5">
                <Globe className="w-3 h-3" />
                Облачные провайдеры (Cloud API)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {PROVIDER_METAS.filter((p) => p.category === 'cloud').map((provider) => {
                  const isSelected = llmConfig.provider === provider.id;
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => handleProviderSelect(provider.id)}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-sky-950/40 border-sky-500/60 ring-1 ring-sky-500/40 shadow-sm'
                          : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-100 truncate">
                          {provider.name}
                        </span>
                        {isSelected && <Check className="w-3 h-3 text-sky-400 shrink-0 ml-1" />}
                      </div>
                      <p className="text-[10px] text-stone-400 mt-0.5 truncate">
                        {provider.defaultModel}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Connection Details Form */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                Параметры подключения: {currentProviderMeta.name}
              </h3>
              {currentProviderMeta.docUrl && (
                <a
                  href={currentProviderMeta.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-1"
                >
                  <span>Документация</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Base URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-stone-400" />
                  Base URL (Адрес API сервера)
                </label>
                <input
                  type="text"
                  value={llmConfig.baseUrl}
                  onChange={(e) => setLlmConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="http://localhost:11434/v1"
                  className="w-full px-3 py-2 text-xs bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[11px] text-stone-500">
                  {currentProviderMeta.category === 'local'
                    ? 'Для Ollama по умолчанию http://localhost:11434/v1, для LM Studio: http://localhost:1234/v1'
                    : 'Официальный эндпоинт провайдера или ваш обратный прокси.'}
                </p>
              </div>

              {/* Model ID */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-stone-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-stone-400" />
                    Модель (Model ID)
                  </label>
                  {(currentProviderMeta.id === 'ollama' ||
                    currentProviderMeta.id === 'lmstudio' ||
                    currentProviderMeta.id === 'custom') && (
                    <button
                      type="button"
                      onClick={handleFetchModels}
                      disabled={isFetchingModels}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                      <span>Обновить модели</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={llmConfig.model}
                    onChange={(e) => setLlmConfig((prev) => ({ ...prev, model: e.target.value }))}
                    placeholder="Например: llama3.1:8b или gpt-4o-mini"
                    className="w-full px-3 py-2 text-xs bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Suggested / Discovered models pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-stone-500 self-center">Рекомендуемые:</span>
                  {(discoveredModels.length > 0 ? discoveredModels : currentProviderMeta.suggestedModels).map(
                    (m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setLlmConfig((prev) => ({ ...prev, model: m }))}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          llmConfig.model === m
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
                        }`}
                      >
                        {m}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-stone-400" />
                    API Ключ
                  </span>
                  {!currentProviderMeta.requiresApiKey && (
                    <span className="text-[10px] text-emerald-400 font-normal">
                      Не обязателен для локальных моделей
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={llmConfig.apiKey || ''}
                    onChange={(e) => setLlmConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                    placeholder={
                      currentProviderMeta.requiresApiKey
                        ? 'sk-... или AIzaSy...'
                        : 'Не требуется (оставьте пустым)'
                    }
                    className="w-full pl-3 pr-10 py-2 text-xs bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-stone-500">
                  {currentProviderMeta.id === 'gemini'
                    ? 'Если не задан, используется ключ сервера из окружения GEMINI_API_KEY.'
                    : currentProviderMeta.requiresApiKey
                    ? 'Хранится локально в безопасной конфигурации движка.'
                    : 'Для локального Ollama или LM Studio ключ не нужен.'}
                </p>
              </div>

              {/* Temperature & Max Tokens */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-300">Temperature</span>
                    <span className="font-mono text-amber-400">{llmConfig.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={llmConfig.temperature}
                    onChange={(e) =>
                      setLlmConfig((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-amber-400 bg-stone-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] text-stone-500">0 = строго, 1.0+ = образнее</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-300">Max Tokens</span>
                    <span className="font-mono text-amber-400">{llmConfig.maxTokens}</span>
                  </div>
                  <input
                    type="number"
                    min="500"
                    max="8192"
                    step="250"
                    value={llmConfig.maxTokens}
                    onChange={(e) =>
                      setLlmConfig((prev) => ({ ...prev, maxTokens: parseInt(e.target.value, 10) || 3000 }))
                    }
                    className="w-full px-2 py-1.5 text-xs bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-[10px] text-stone-500">Длина ответов</span>
                </div>
              </div>
            </div>

            {/* Test Connection Results Alert */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                  testResult.success
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/30 border-red-500/40 text-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {testResult.success ? 'Соединение успешно установлено!' : 'Ошибка подключения к LLM'}
                    </span>
                    {testResult.latencyMs !== undefined && (
                      <span className="text-[11px] font-mono opacity-80">
                        {testResult.latencyMs} мс
                      </span>
                    )}
                  </div>
                  {testResult.message && <p className="text-xs opacity-90">{testResult.message}</p>}
                  {testResult.error && (
                    <p className="text-[11px] font-mono text-red-300/90 break-all bg-red-950/60 p-2 rounded border border-red-900/40">
                      {testResult.error}
                    </p>
                  )}
                  {testResult.replySnippet && (
                    <div className="mt-1.5 p-2 bg-stone-950/80 rounded border border-stone-800 text-[11px] font-mono text-stone-300">
                      <span className="text-stone-500 text-[10px] block mb-0.5">Тестовый ответ модели:</span>
                      "{testResult.replySnippet}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs border border-stone-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-stone-400 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Проверка связи...' : 'Проверить соединение'}</span>
              </button>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 animate-fade-in">
                    <Check className="w-3.5 h-3.5" />
                    Настройки сохранены!
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-md shadow-amber-500/10 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Сохранение...' : 'Применить и сохранить'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Guide for Local Models */}
          <div className="bg-stone-950 border border-stone-800/80 rounded-xl p-4 space-y-2 text-xs">
            <h4 className="text-stone-200 font-semibold flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              Как запустить локальную LLM за 2 минуты:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-stone-400 text-[11px] leading-relaxed">
              <div className="p-3 bg-stone-900/60 rounded-lg border border-stone-800">
                <span className="text-emerald-300 font-bold block mb-1">Вариант 1: Ollama</span>
                1. Скачайте с <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">ollama.com</a>.<br />
                2. Запустите модель в терминале: <code className="text-amber-300 bg-stone-950 px-1 py-0.5 rounded">ollama run llama3.1:8b</code><br />
                3. В настройках выше выберите <strong>Ollama</strong> и нажмите «Проверить соединение».
              </div>
              <div className="p-3 bg-stone-900/60 rounded-lg border border-stone-800">
                <span className="text-sky-300 font-bold block mb-1">Вариант 2: LM Studio</span>
                1. Скачайте с <a href="https://lmstudio.ai" target="_blank" rel="noreferrer" className="text-amber-400 underline">lmstudio.ai</a>.<br />
                2. Загрузите любую GGUF модель и откройте вкладку <strong>Local Server</strong>.<br />
                3. Нажмите <strong>Start Server</strong> (порт 1234) и выберите LM Studio здесь.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* API & Bots tab */
        <div className="space-y-6 text-xs">
          {/* REST API Endpoints Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Ключевые эндпоинты REST API v1
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-1 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">GET</span>
                  <span className="text-stone-200">/api/v1/stories</span>
                </div>
                <p className="text-stone-400 font-sans text-xs">Список историй с фильтрами по канону и году</p>
              </div>

              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-1 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">POST</span>
                  <span className="text-stone-200">/api/v1/generation/generate</span>
                </div>
                <p className="text-stone-400 font-sans text-xs">Полный цикл канонической генерации рассказа</p>
              </div>

              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-1 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">POST</span>
                  <span className="text-stone-200">/api/v1/stories/:id/validate</span>
                </div>
                <p className="text-stone-400 font-sans text-xs">Аудит непротиворечивости текста канону</p>
              </div>

              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-1 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">GET</span>
                  <span className="text-stone-200">/api/v1/llm/config</span>
                </div>
                <p className="text-stone-400 font-sans text-xs">Получение текущей активной конфигурации LLM</p>
              </div>
            </div>
          </div>

          {/* cURL Example */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-300">Пример вызова генерации (cURL):</span>
              <button
                onClick={() => handleCopy(curlExample, 'curl')}
                className="flex items-center space-x-1 text-stone-400 hover:text-stone-200 text-xs"
              >
                {copied === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied === 'curl' ? 'Скопировано!' : 'Копировать'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-stone-950 border border-stone-800 font-mono text-[11px] text-amber-300/90 overflow-x-auto leading-relaxed">
              {curlExample}
            </pre>
          </div>

          {/* LLM Tools Schema */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              Function Calling Schema для AI-агентов
            </h3>
            <p className="text-stone-400">
              Схема инструментов, которую агент или внешний бот может подключить для вызова Story Engine:
            </p>
            <pre className="p-4 rounded-xl bg-stone-950 border border-stone-800 font-mono text-[11px] text-stone-300 overflow-x-auto max-h-64 leading-relaxed">
              {JSON.stringify(toolsSchema, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
