import { map, type MapStore } from 'nanostores';
import { computeFileModifications } from '~/utils/diff';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';

const logger = createScopedLogger('FilesStore');

export interface File {
  type: 'file';
  content: string;
  isBinary: boolean;
}

export interface Folder {
  type: 'folder';
}

type Dirent = File | Folder;

export type FileMap = Record<string, Dirent | undefined>;

export class FilesStore {
  /**
   * Tracks the number of files without folders.
   */
  #size = 0;

  /**
   * @note Keeps track all modified files with their original content since the last user message.
   * Needs to be reset when the user sends another message and all changes have to be submitted
   * for the model to be aware of the changes.
   */
  #modifiedFiles: Map<string, string> = import.meta.hot?.data.modifiedFiles ?? new Map();

  /**
   * Map of files that represents the project structure.
   */
  files: MapStore<FileMap> = import.meta.hot?.data.files ?? map({});

  get filesCount() {
    return this.#size;
  }

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.files = this.files;
      import.meta.hot.data.modifiedFiles = this.#modifiedFiles;
    }
  }

  getFile(filePath: string) {
    const dirent = this.files.get()[filePath];

    if (dirent?.type !== 'file') {
      return undefined;
    }

    return dirent;
  }

  getFileModifications() {
    return computeFileModifications(this.files.get(), this.#modifiedFiles);
  }

  resetFileModifications() {
    this.#modifiedFiles.clear();
  }

  async saveFile(filePath: string, content: string) {
    try {
      const oldContent = this.getFile(filePath)?.content;

      if (!oldContent) {
        unreachable('Expected content to be defined');
      }

      if (!this.#modifiedFiles.has(filePath)) {
        this.#modifiedFiles.set(filePath, oldContent);
      }

      // update the file in our local store
      this.files.setKey(filePath, { type: 'file', content, isBinary: false });

      logger.info('File updated in local store');
    } catch (error) {
      logger.error('Failed to update file content\n\n', error);

      throw error;
    }
  }

  // method to manually add a file (for testing or external integrations)
  addFile(filePath: string, content: string, isBinary: boolean = false) {
    const existingFile = this.files.get()[filePath];

    // only increment size if it's a new file
    if (!existingFile || existingFile.type !== 'file') {
      this.#size++;
    }

    this.files.setKey(filePath, { type: 'file', content, isBinary });

    logger.debug(`File added/updated: ${filePath} (total files: ${this.#size})`);
  }

  // method to manually add a folder
  addFolder(folderPath: string) {
    this.files.setKey(folderPath, { type: 'folder' });
  }

  // method to remove a file or folder
  remove(path: string) {
    const dirent = this.files.get()[path];

    if (dirent?.type === 'file') {
      this.#size--;
    }

    this.files.setKey(path, undefined);

    // if it's a folder, remove all children
    if (dirent?.type === 'folder') {
      for (const [direntPath] of Object.entries(this.files.get())) {
        if (direntPath.startsWith(path)) {
          this.files.setKey(direntPath, undefined);
        }
      }
    }
  }

  // method to update file content
  updateFile(filePath: string, content: string, isBinary: boolean = false) {
    const dirent = this.getFile(filePath);

    if (dirent) {
      this.files.setKey(filePath, { type: 'file', content, isBinary });
    }
  }
}
