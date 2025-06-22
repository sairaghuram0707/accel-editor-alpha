import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { getNextId } from '~/lib/persistence/db';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const nextId = await getNextId();
    return json({ id: nextId });
  } catch (error) {
    console.error('Failed to generate next ID:', error);
    return json(
      { error: 'Failed to generate next ID' }, 
      { status: 500 }
    );
  }
} 