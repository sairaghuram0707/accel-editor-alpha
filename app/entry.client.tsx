import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

// load debug utilities in development
import '~/utils/debug';

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
