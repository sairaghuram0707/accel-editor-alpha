import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { getLLMConfig, type LLMConfig, type Env } from './config';
import { getSystemPrompt } from './prompts';

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

export interface LLMProxyService {
  streamText(messages: Messages, options?: StreamingOptions): Promise<any>;
  config: LLMConfig;
}

export class LLMProxy implements LLMProxyService {
  config: LLMConfig;

  constructor(env: Env) {
    this.config = getLLMConfig(env);
  }

  _getModel(): any {
    const { provider, model, apiKey } = this.config;

    switch (provider) {
      case 'anthropic': {
        const anthropicClient = createAnthropic({
          apiKey,
        });
        return anthropicClient(model);
      }
      case 'openai': {
        const openaiClient = createOpenAI({
          apiKey,
        });
        return openaiClient(model);
      }
      case 'gemini': {
        const googleClient = createGoogleGenerativeAI({
          apiKey,
        });
        return googleClient(model);
      }
      default: {
        throw new Error(`Unsupported LLM provider: ${provider}`);
      }
    }
  }

  async streamText(messages: Messages, options?: StreamingOptions) {
    const model = this._getModel();

    const headers =
      this.config.provider === 'anthropic' ? { 'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15' } : undefined;

    return _streamText({
      model,
      system: getSystemPrompt(),
      maxTokens: this.config.maxTokens,
      headers,
      messages: convertToCoreMessages(messages),
      ...options,
    });
  }
}

// factory function to create LLM proxy instance
export function createLLMProxy(env: Env): LLMProxyService {
  return new LLMProxy(env);
}

// legacy support - maintain backward compatibility
export function streamText(messages: Messages, env: Env, options?: StreamingOptions) {
  const proxy = createLLMProxy(env);
  return proxy.streamText(messages, options);
}
