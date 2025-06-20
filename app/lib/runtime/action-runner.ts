import { map, type MapStore } from 'nanostores';
import type { BoltAction } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import type { ActionCallbackData } from './message-parser';
import type { FilesStore } from '~/lib/stores/files';

const logger = createScopedLogger('ActionRunner');

export type ActionStatus = 'pending' | 'running' | 'complete' | 'aborted' | 'failed';

export type BaseActionState = BoltAction & {
  status: Exclude<ActionStatus, 'failed'>;
  abort: () => void;
  executed: boolean;
  abortSignal: AbortSignal;
};

export type FailedActionState = BoltAction &
  Omit<BaseActionState, 'status'> & {
    status: Extract<ActionStatus, 'failed'>;
    error: string;
  };

export type ActionState = BaseActionState | FailedActionState;

type BaseActionUpdate = Partial<Pick<BaseActionState, 'status' | 'abort' | 'executed'>>;

export type ActionStateUpdate =
  | BaseActionUpdate
  | (Omit<BaseActionUpdate, 'status'> & { status: 'failed'; error: string });

type ActionsMap = MapStore<Record<string, ActionState>>;

export class ActionRunner {
  #currentExecutionPromise: Promise<void> = Promise.resolve();
  #filesStore: FilesStore;
  #onFilesChanged?: () => void;

  actions: ActionsMap = map({});

  constructor(filesStore: FilesStore, onFilesChanged?: () => void) {
    this.#filesStore = filesStore;
    this.#onFilesChanged = onFilesChanged;

    // no longer needs WebContainer - actions are processed differently
  }

  addAction(data: ActionCallbackData) {
    const { actionId } = data;

    const actions = this.actions.get();
    const action = actions[actionId];

    if (action) {
      // action already added
      return;
    }

    const abortController = new AbortController();

    this.actions.setKey(actionId, {
      ...data.action,
      status: 'pending',
      executed: false,
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: 'aborted' });
      },
      abortSignal: abortController.signal,
    });

    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: 'running' });
    });
  }

  async runAction(data: ActionCallbackData) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];

    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }

    if (action.executed) {
      return;
    }

    // DEBUG: Enhanced logging for action content
    logger.debug(`=== RUNNING ACTION ${actionId} ===`);
    logger.debug(`Action type: ${data.action.type}`);

    if (data.action.type === 'file') {
      logger.debug(`File path: ${data.action.filePath}`);
    }

    logger.debug(`Action content length: ${data.action.content?.length || 0}`);
    logger.debug(`Action content preview: "${data.action.content?.substring(0, 200) || ''}..."`);
    logger.debug(`Action content full: "${data.action.content || ''}"`);

    /**
     * BUGFIX: Use data.action content directly - don't merge with potentially stale action content.
     * The data.action contains the final parsed content from the message parser.
     */
    this.#updateAction(actionId, { ...data.action, executed: true });

    logger.debug(`Running action ${actionId}: ${data.action.type}`, data.action);

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId);
      })
      .catch((error) => {
        logger.error(`Action ${actionId} failed:`, error);
        console.error('Action failed:', error);
      });
  }

  async #executeAction(actionId: string) {
    const action = this.actions.get()[actionId];

    this.#updateAction(actionId, { status: 'running' });

    try {
      switch (action.type) {
        case 'shell': {
          await this.#runShellAction(action);
          break;
        }
        case 'file': {
          await this.#runFileAction(action);
          break;
        }
      }

      this.#updateAction(actionId, { status: action.abortSignal.aborted ? 'aborted' : 'complete' });
    } catch (error) {
      this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });

      // re-throw the error to be caught in the promise chain
      throw error;
    }
  }

  async #runShellAction(action: ActionState) {
    if (action.type !== 'shell') {
      unreachable('Expected shell action');
    }

    // in a real implementation, this would execute shell commands via a backend service
    logger.info(`Shell action simulated: ${action.content}`);

    // simulate command execution time
    await new Promise((resolve) => setTimeout(resolve, 1000));

    logger.debug('Shell action completed (simulated)');
  }

  async #runFileAction(action: ActionState) {
    if (action.type !== 'file') {
      unreachable('Expected file action');
    }

    const { filePath, content } = action;

    // ENHANCED DEBUG: Log exact action details at the start of file creation
    logger.debug(`=== FILE ACTION START ===`);
    logger.debug(`File path: "${filePath}"`);
    logger.debug(`Content length: ${content?.length || 0}`);
    logger.debug(`Content hash (first 50 chars): "${content?.substring(0, 50) || 'EMPTY'}"`);
    logger.debug(`Full content: "${content || 'EMPTY'}"`);

    if (!filePath) {
      logger.error('File path is required for file actions');
      throw new Error('File path is required for file actions');
    }

    if (!content) {
      logger.warn(`File action has empty content for: ${filePath}`);
    }

    try {
      logger.info(`Creating/updating file: ${filePath} (${content?.length || 0} characters)`);

      // normalize the file path - ensure it follows the expected directory structure
      let normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

      // ensure the path starts with the work directory structure
      if (!normalizedPath.startsWith('home/project/')) {
        normalizedPath = `home/project/${normalizedPath}`;
      }

      logger.debug(`Normalized file path: ${normalizedPath}`);

      // create any necessary parent directories
      const pathParts = normalizedPath.split('/');
      let currentPath = '';

      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += (i > 0 ? '/' : '') + pathParts[i];

        if (currentPath && !this.#filesStore.files.get()[currentPath]) {
          logger.debug(`Creating directory: ${currentPath}`);
          this.#filesStore.addFolder(currentPath);
        }
      }

      // clean up the content - remove any markdown formatting but preserve actual code structure
      let cleanContent = content || '';

      // remove markdown code block markers if present - handle various patterns
      cleanContent = cleanContent.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
      cleanContent = cleanContent.replace(/^```\n?/, '').replace(/\n?```$/, '');

      // remove any remaining stray backticks at the start or end
      cleanContent = cleanContent.replace(/^`+/, '').replace(/`+$/, '');

      // trim leading/trailing whitespace but preserve internal structure
      cleanContent = cleanContent.trim();

      // ensure proper line endings
      if (cleanContent && !cleanContent.endsWith('\n')) {
        cleanContent += '\n';
      }

      // validate that we have actual content
      if (!cleanContent || cleanContent.trim().length === 0) {
        logger.warn(`File action has empty or invalid content after cleanup for: ${filePath}`);
        throw new Error(`File content is empty or invalid for: ${filePath}`);
      }

      // enhanced duplicate content detection
      const existingFiles = this.#filesStore.files.get();
      const contentHash = cleanContent.substring(0, 200); // first 200 chars for comparison

      for (const [existingPath, existingFile] of Object.entries(existingFiles)) {
        if (existingFile?.type === 'file' && existingPath !== normalizedPath) {
          const existingContentHash = existingFile.content.substring(0, 200);

          if (contentHash === existingContentHash && cleanContent === existingFile.content) {
            logger.warn(
              `⚠️ DUPLICATE CONTENT DETECTED! File "${normalizedPath}" has identical content to "${existingPath}"`,
            );
            logger.warn(`This may indicate an issue with file generation - each file should have unique content`);
          }
        }
      }

      logger.debug(`File content preview (first 100 chars): ${cleanContent.substring(0, 100)}...`);
      logger.debug(`File content length: ${cleanContent.length} characters`);

      // add or update the file
      logger.info(`Adding file to store: ${normalizedPath}`);
      this.#filesStore.addFile(normalizedPath, cleanContent, false);

      // verify the file was added correctly
      const addedFile = this.#filesStore.getFile(normalizedPath);

      if (addedFile) {
        logger.debug(`File verification - stored content length: ${addedFile.content.length}`);
        logger.debug(`File verification - content matches: ${addedFile.content === cleanContent}`);
      } else {
        logger.error(`File was not properly stored: ${normalizedPath}`);
      }

      // trigger files refresh
      this.#onFilesChanged?.();

      logger.debug(`File operation completed: ${normalizedPath}`);
    } catch (error) {
      logger.error(`Failed to write file ${filePath}:`, error);
      throw error;
    }
  }

  #updateAction(id: string, newState: ActionStateUpdate) {
    const actions = this.actions.get();
    const existingAction = actions[id];

    // debug: log action updates to track content changes
    const newStateWithContent = newState as any;

    if (newStateWithContent.content !== undefined && existingAction?.content !== newStateWithContent.content) {
      logger.debug(
        `Action ${id} content updated from ${existingAction?.content?.length || 0} to ${newStateWithContent.content?.length || 0} chars`,
      );

      if (
        existingAction?.content &&
        newStateWithContent.content &&
        existingAction.content !== newStateWithContent.content
      ) {
        logger.debug(`Content changed - Old: "${existingAction.content.substring(0, 100)}..."`);
        logger.debug(`Content changed - New: "${newStateWithContent.content.substring(0, 100)}..."`);
      }
    }

    this.actions.setKey(id, { ...existingAction, ...newState });
  }
}
