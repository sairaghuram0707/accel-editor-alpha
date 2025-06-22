import { useLoaderData, useNavigate, useFetcher } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { atom } from 'nanostores';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
}

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);

// API helper functions
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error('API request failed');
  }

  return response.json();
}

async function fetchChat(id: string): Promise<ChatHistoryItem | null> {
  try {
    const result = await apiRequest<{ chat?: ChatHistoryItem }>(`/api/chats?id=${encodeURIComponent(id)}`);
    return result.chat || null;
  } catch (error) {
    console.error('Failed to fetch chat:', error);
    return null;
  }
}

async function saveChat(
  id: string,
  messages: Message[],
  urlId?: string,
  description?: string
): Promise<{ id: string; urlId?: string }> {
  return apiRequest<{ id: string; urlId?: string }>('/api/chats', {
    method: 'POST',
    body: JSON.stringify({ id, messages, urlId, description }),
  });
}

async function generateNextId(): Promise<string> {
  const result = await apiRequest<{ id: string }>('/api/chats/next-id');
  return result.id;
}

async function generateUrlId(baseId: string): Promise<string> {
  const result = await apiRequest<{ urlId: string }>(`/api/chats/url-id?base=${encodeURIComponent(baseId)}`);
  return result.urlId;
}

export function useChatHistory() {
  const navigate = useNavigate();
  const { id: mixedId } = useLoaderData<{ id?: string }>();
  const fetcher = useFetcher();

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (mixedId) {
      setLoading(true);
      fetchChat(mixedId)
        .then((storedChat) => {
          if (storedChat && storedChat.messages.length > 0) {
            setInitialMessages(storedChat.messages);
            setUrlId(storedChat.urlId);
            description.set(storedChat.description);
            chatId.set(storedChat.id);
            setError(undefined);
          } else {
            navigate('/', { replace: true });
          }
        })
        .catch((error) => {
          console.error('Failed to load chat:', error);
          setError(error.message);
          toast.error(`Failed to load chat: ${error.message}`);
        })
        .finally(() => {
          setLoading(false);
          setReady(true);
        });
    } else {
      setReady(true);
    }
  }, [mixedId, navigate]);

  const storeMessageHistory = useCallback(async (messages: Message[]) => {
    if (messages.length === 0) {
      return;
    }

    try {
      const { firstArtifact } = workbenchStore;

      // Generate URL ID if needed
      if (!urlId && firstArtifact?.id) {
        const newUrlId = await generateUrlId(firstArtifact.id);
        navigateChat(newUrlId);
        setUrlId(newUrlId);
      }

      // Set description if not already set
      if (!description.get() && firstArtifact?.title) {
        description.set(firstArtifact.title);
      }

      // Generate chat ID if this is a new chat
      let currentChatId = chatId.get();
      if (initialMessages.length === 0 && !currentChatId) {
        // We'll let the API generate the ID
        currentChatId = '';
      }

      // Save to database via API
      const result = await saveChat(
        currentChatId || '',
        messages,
        urlId,
        description.get()
      );

      // Update local state with returned values
      if (!chatId.get()) {
        chatId.set(result.id);
      }

      if (!urlId && result.urlId) {
        setUrlId(result.urlId);
        navigateChat(result.urlId);
      }

      setError(undefined);
    } catch (error) {
      console.error('Failed to save chat history:', error);
      setError(error instanceof Error ? error.message : 'Failed to save chat');
      toast.error(`Failed to save chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [urlId, initialMessages.length]);

  return {
    ready: !mixedId || ready,
    loading,
    error,
    initialMessages,
    storeMessageHistory,
  };
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}

// Export additional utilities for managing chat history
export async function getAllChats(): Promise<ChatHistoryItem[]> {
  try {
    const result = await apiRequest<{ chats: ChatHistoryItem[] }>('/api/chats');
    return result.chats;
  } catch (error) {
    console.error('Failed to fetch all chats:', error);
    return [];
  }
}

export async function deleteChat(id: string): Promise<boolean> {
  try {
    await apiRequest('/api/chats', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    return true;
  } catch (error) {
    console.error('Failed to delete chat:', error);
    return false;
  }
}
