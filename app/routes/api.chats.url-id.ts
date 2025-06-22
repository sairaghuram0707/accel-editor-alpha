import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { getUrlId } from '~/lib/persistence/db';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const base = url.searchParams.get('base');

  if (!base) {
    return json(
      { error: 'Base ID parameter is required' }, 
      { status: 400 }
    );
  }

  try {
    const urlId = await getUrlId(base);
    return json({ urlId });
  } catch (error) {
    console.error('Failed to generate URL ID:', error);
    return json(
      { error: 'Failed to generate URL ID' }, 
      { status: 500 }
    );
  }
} 