import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import type { Message } from 'ai';
import { 
  getAll, 
  getMessages, 
  setMessages, 
  deleteById, 
  getNextId, 
  getUrlId 
} from '~/lib/persistence/db';

// GET /api/chats - Get all chats
// GET /api/chats?id=123 - Get specific chat by ID
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    if (id) {
      const chat = await getMessages(id);
      if (!chat) {
        return json({ error: 'Chat not found' }, { status: 404 });
      }
      return json({ chat });
    } else {
      const chats = await getAll();
      return json({ chats });
    }
  } catch (error) {
    console.error('Failed to fetch chats:', error);
    return json(
      { error: 'Failed to fetch chats' }, 
      { status: 500 }
    );
  }
}

// POST /api/chats - Create or update chat
// DELETE /api/chats - Delete chat
export async function action({ request }: ActionFunctionArgs) {
  const method = request.method;
  
  try {
    if (method === 'POST') {
      const body = await request.json();
      const { id, messages, urlId, description } = body;
      
      if (!messages || !Array.isArray(messages)) {
        return json(
          { error: 'Messages array is required' }, 
          { status: 400 }
        );
      }

      // If no ID provided, generate one
      const chatId = id || await getNextId();
      
      // If no urlId provided, generate one based on chatId
      const finalUrlId = urlId || await getUrlId(chatId);
      
      await setMessages(chatId, messages as Message[], finalUrlId, description);
      
      return json({ 
        success: true, 
        id: chatId,
        urlId: finalUrlId
      });
    }
    
    if (method === 'DELETE') {
      const body = await request.json();
      const { id } = body;
      
      if (!id) {
        return json(
          { error: 'Chat ID is required' }, 
          { status: 400 }
        );
      }
      
      await deleteById(id);
      return json({ success: true });
    }
    
    return json(
      { error: 'Method not allowed' }, 
      { status: 405 }
    );
  } catch (error) {
    console.error('Chat API error:', error);
    return json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Utility endpoints
export async function getNextChatId(): Promise<string> {
  return await getNextId();
}

export async function generateUrlId(baseId: string): Promise<string> {
  return await getUrlId(baseId);
} 