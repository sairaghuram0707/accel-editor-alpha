export type LLMProvider = 'anthropic' | 'openai' | 'gemini';

export interface Env {
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
  LLM_PROVIDER: string;
  LLM_MODEL: string;
  LLM_MAX_TOKENS: string;
}

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  maxTokens: number;
}

export interface LLMProviderConfig {
  anthropic: {
    models: string[];
    defaultModel: string;
  };
  openai: {
    models: string[];
    defaultModel: string;
  };
  gemini: {
    models: string[];
    defaultModel: string;
  };
}

export const LLM_PROVIDERS: LLMProviderConfig = {
  anthropic: {
    models: [
      'claude-3-5-sonnet-20240620',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    defaultModel: 'claude-3-5-sonnet-20240620',
  },
  openai: {
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o',
  },
  gemini: {
    models: ['gemini-pro', 'gemini-1.5-flash', 'gemini-pro'],
    defaultModel: 'gemini-1.5-flash',
  },
};

export const MAX_TOKENS = 8192;
export const MAX_RESPONSE_SEGMENTS = 2;

export function getLLMConfig(env: Env): LLMConfig {
  // fallback to process.env for development when cloudflare env is not available
  const provider = (env.LLM_PROVIDER || process.env.LLM_PROVIDER || 'anthropic') as LLMProvider;
  console.log('Debug - env.LLM_PROVIDER:', env.LLM_PROVIDER);
  console.log('Debug - process.env.LLM_PROVIDER:', process.env.LLM_PROVIDER);
  console.log('Using LLM provider:', provider);

  const model = env.LLM_MODEL || process.env.LLM_MODEL || LLM_PROVIDERS[provider].defaultModel;

  let apiKey: string;

  switch (provider) {
    case 'anthropic': {
      apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';
      break;
    }
    case 'openai': {
      apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
      break;
    }
    case 'gemini': {
      apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
      break;
    }
    default: {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  if (!apiKey) {
    throw new Error(`API key not found for provider: ${provider}`);
  }

  return {
    provider,
    model,
    apiKey,
    maxTokens: parseInt(env.LLM_MAX_TOKENS || process.env.LLM_MAX_TOKENS || '8192', 10),
  };
}
