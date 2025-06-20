import { atom, type WritableAtom } from 'nanostores';
import type { ITerminal } from '~/types/terminal';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('TerminalStore');

export class TerminalStore {
  #terminals: Array<{ terminal: ITerminal }> = [];

  showTerminal: WritableAtom<boolean> = import.meta.hot?.data.showTerminal ?? atom(false);

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.showTerminal = this.showTerminal;
    }
  }

  toggleTerminal(value?: boolean) {
    this.showTerminal.set(value !== undefined ? value : !this.showTerminal.get());
  }

  async attachTerminal(terminal: ITerminal) {
    try {
      /**
       * In a real implementation, this would connect to a backend terminal service.
       * For now, we just track the terminal instance.
       */
      this.#terminals.push({ terminal });
      logger.info('Terminal attached (mock implementation)');
    } catch (error: any) {
      logger.error('Failed to attach terminal:', error.message);
    }
  }

  onTerminalResize(cols: number, rows: number) {
    // in a real implementation, this would resize backend terminal processes
    logger.debug(`Terminal resize requested: ${cols}x${rows}`);
  }
}
