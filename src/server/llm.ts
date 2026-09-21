import { GoogleGenAI } from '@google/genai';
import { storage } from './storage';
import { LLMConfig, LLMTestResult, LLMProviderType } from '../types';

let geminiClient: GoogleGenAI | null = null;
let lastGeminiKey: string | null = null;

export const DEFAULT_PROVIDER_CONFIGS: Record<LLMProviderType, { baseUrl: string; defaultModel: string; isLocal: boolean }> = {
  gemini: {
    baseUrl: '',
    defaultModel: 'gemini-2.5-flash',
    isLocal: false,
  },
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    isLocal: true,
  },
  lmstudio: {
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    isLocal: true,
  },
  vllm: {
    baseUrl: 'http://localhost:8000/v1',
    defaultModel: 'default',
    isLocal: true,
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    isLocal: false,
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    isLocal: false,
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    isLocal: false,
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    isLocal: false,
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    isLocal: false,
  },
  custom: {
    baseUrl: 'http://localhost:8080/v1',
    defaultModel: 'custom-model',
    isLocal: false,
  },
};

export function getGemini(apiKeyOverride?: string): GoogleGenAI | null {
  const key = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!geminiClient || lastGeminiKey !== key) {
    geminiClient = new GoogleGenAI({ apiKey: key });
    lastGeminiKey = key;
  }
  return geminiClient;
}

export function safeParseJson<T>(rawText: string | null | undefined, fallback: T): T {
  if (!rawText) return fallback;
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    if (!cleaned) return fallback;
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('safeParseJson error:', err);
    return fallback;
  }
}

/**
 * Universal text generation dispatching to Google Gemini, Ollama, LM Studio, vLLM, OpenAI, DeepSeek, Anthropic, or any OpenAI-compatible server.
 */
export async function callLLM(options: {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  overrideConfig?: Partial<LLMConfig>;
}): Promise<string> {
  const storedConfig = storage.getLLMConfig();
  const config: LLMConfig = {
    ...storedConfig,
    ...(options.overrideConfig || {}),
  };

  const provider = config.provider || 'gemini';

  // 1. Google Gemini
  if (provider === 'gemini') {
    const gemini = getGemini(config.apiKey);
    if (!gemini) {
      throw new Error(
        'Gemini API key не обнаружен. Укажите ключ в настройках или установите переменную GEMINI_API_KEY.'
      );
    }
    const modelName = config.model || 'gemini-2.5-flash';
    const genConfig: any = {};
    if (options.systemInstruction) {
      genConfig.systemInstruction = options.systemInstruction;
    }
    if (typeof options.temperature === 'number') {
      genConfig.temperature = options.temperature;
    }

    const res = await gemini.models.generateContent({
      model: modelName,
      contents: options.prompt,
      config: Object.keys(genConfig).length ? genConfig : undefined,
    });
    return res.text || '';
  }

  // 2. Anthropic Native Messages API
  if (provider === 'anthropic') {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key не задан в настройках.');
    }
    const baseUrl = (config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    const url = `${baseUrl}/messages`;

    const body: any = {
      model: config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens || config.maxTokens || 4096,
      messages: [{ role: 'user', content: options.prompt }],
    };
    if (options.systemInstruction) {
      body.system = options.systemInstruction;
    }
    if (typeof options.temperature === 'number') {
      body.temperature = options.temperature;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || '';
    return reply;
  }

  // 3. OpenAI-compatible providers: Ollama (/v1), LM Studio, vLLM, OpenAI, DeepSeek, Groq, OpenRouter, Custom
  const defaults = DEFAULT_PROVIDER_CONFIGS[provider] || DEFAULT_PROVIDER_CONFIGS.custom;
  let baseUrl = (config.baseUrl || defaults.baseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '');
  
  // Ensure endpoint ends with /chat/completions
  const endpoint = baseUrl.endsWith('/chat/completions')
    ? baseUrl
    : `${baseUrl}/chat/completions`;

  const messages: any[] = [];
  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction });
  }
  messages.push({ role: 'user', content: options.prompt });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.customHeaders || {}),
  };

  const effectiveKey = config.apiKey || (provider === 'openai' ? process.env.OPENAI_API_KEY : '');
  if (effectiveKey) {
    headers['Authorization'] = `Bearer ${effectiveKey}`;
  }

  const payload: any = {
    model: config.model || defaults.defaultModel,
    messages,
    temperature: options.temperature ?? config.temperature ?? 0.7,
  };
  if (options.maxTokens || config.maxTokens) {
    payload.max_tokens = options.maxTokens || config.maxTokens;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout for local models

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`HTTP ${response.status} от ${provider} (${baseUrl}): ${errBody.slice(0, 300)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    }
    // Fallback for some non-standard local endpoints
    if (data.response && typeof data.response === 'string') {
      return data.response;
    }

    return JSON.stringify(data);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Превышен тайм-аут ответа от модели (${provider} на ${baseUrl}). Возможно, модель ещё загружается.`);
    }
    if (err.code === 'ECONNREFUSED' || err.message?.includes('fetch failed')) {
      throw new Error(
        `Не удалось подключиться к серверу ${baseUrl}. Если это локальный сервер (${provider}), убедитесь, что он запущен и принимает входящие подключения.`
      );
    }
    throw err;
  }
}

/**
 * Sends a lightweight ping prompt to test the specified or current LLM configuration.
 */
export async function testLLMConnection(testConfig?: LLMConfig): Promise<LLMTestResult> {
  const config = testConfig || storage.getLLMConfig();
  const start = Date.now();

  try {
    const prompt = 'Ответь кратко одним предложением на русском: подтверди, что ты на связи и готов писать истории в Story Engine.';
    const reply = await callLLM({
      prompt,
      overrideConfig: config,
      temperature: 0.3,
      maxTokens: 100,
    });

    const latencyMs = Date.now() - start;
    return {
      success: true,
      message: reply.trim(),
      model: config.model,
      provider: config.provider,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      success: false,
      error: err.message || String(err),
      model: config.model,
      provider: config.provider,
      latencyMs,
    };
  }
}

/**
 * Fetches available models from local or remote providers (Ollama /api/tags or OpenAI /v1/models).
 */
export async function fetchAvailableModels(testConfig?: LLMConfig): Promise<string[]> {
  const config = testConfig || storage.getLLMConfig();
  const provider = config.provider;

  if (provider === 'gemini') {
    return [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ];
  }

  if (provider === 'anthropic') {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ];
  }

  const defaults = DEFAULT_PROVIDER_CONFIGS[provider] || DEFAULT_PROVIDER_CONFIGS.custom;
  let baseUrl = (config.baseUrl || defaults.baseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '');

  const headers: Record<string, string> = {};
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  // 1. Try Ollama specific /api/tags
  if (provider === 'ollama') {
    try {
      const rootUrl = baseUrl.replace(/\/v1\/?$/, '');
      const res = await fetch(`${rootUrl}/api/tags`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          return data.models.map((m: any) => m.name || m.model);
        }
      }
    } catch {
      // Fall through to /models
    }
  }

  // 2. Try standard /models
  try {
    const modelsUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
    const res = await fetch(modelsUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id || m.name);
      }
    }
  } catch (e) {
    console.warn('Could not fetch models from', baseUrl, e);
  }

  // Return provider-specific common fallbacks
  switch (provider) {
    case 'ollama':
      return ['llama3.2', 'mistral', 'qwen2.5:14b', 'gemma2:9b', 'phi3:medium', 'deepseek-r1'];
    case 'lmstudio':
      return ['local-model', 'meta-llama-3.1-8b-instruct', 'qwen2.5-7b-instruct'];
    case 'deepseek':
      return ['deepseek-chat', 'deepseek-reasoner'];
    case 'openai':
      return ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'gpt-4-turbo'];
    case 'groq':
      return ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
    case 'openrouter':
      return ['anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-chat'];
    default:
      return [config.model || 'default-model'];
  }
}
