import { atom } from 'nanostores';

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
}

export class PreviewsStore {
  #availablePreviews = new Map<number, PreviewInfo>();

  previews = atom<PreviewInfo[]>([]);

  constructor() {
    /**
     * No longer needs WebContainer - previews will be managed differently.
     * In a real implementation, this could connect to a backend service
     * that manages preview ports and services.
     */
  }

  // method to manually add preview (for testing or external integrations)
  addPreview(port: number, baseUrl: string, ready: boolean = true) {
    const previewInfo: PreviewInfo = { port, ready, baseUrl };
    this.#availablePreviews.set(port, previewInfo);

    const previews = this.previews.get();
    previews.push(previewInfo);
    this.previews.set([...previews]);
  }

  // method to remove preview
  removePreview(port: number) {
    this.#availablePreviews.delete(port);
    this.previews.set(this.previews.get().filter((preview) => preview.port !== port));
  }

  // method to update preview status
  updatePreview(port: number, ready: boolean, baseUrl?: string) {
    const previewInfo = this.#availablePreviews.get(port);

    if (previewInfo) {
      previewInfo.ready = ready;

      if (baseUrl) {
        previewInfo.baseUrl = baseUrl;
      }

      this.previews.set([...this.previews.get()]);
    }
  }
}
