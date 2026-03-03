// =============================================================================
// shared/DragAndDrop.ts
// =============================================================================

export interface DragAndDropOptions {
  dropZone: HTMLElement;
  onDrop:   (buffer: ArrayBuffer, filename: string) => void;
}

export class DragAndDrop {
  private readonly dropZone: HTMLElement;
  private readonly onDrop:   (buffer: ArrayBuffer, filename: string) => void;

  // Bound listener references kept for cleanup
  private readonly _highlightHandler:   (e: Event) => void;
  private readonly _unhighlightHandler: (e: Event) => void;
  private readonly _dropHandler:        (e: DragEvent) => void;

  constructor(options: DragAndDropOptions) {
    this.dropZone = options.dropZone;
    this.onDrop   = options.onDrop;

    this._highlightHandler   = () => this.highlight();
    this._unhighlightHandler = () => this.unhighlight();
    this._dropHandler        = (e: DragEvent) => this.handleDrop(e);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const preventDefaults = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
    };

    for (const eventName of ['dragenter', 'dragover', 'dragleave', 'drop'] as const) {
      this.dropZone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    }

    for (const eventName of ['dragenter', 'dragover'] as const) {
      this.dropZone.addEventListener(eventName, this._highlightHandler, false);
    }

    for (const eventName of ['dragleave', 'drop'] as const) {
      this.dropZone.addEventListener(eventName, this._unhighlightHandler, false);
    }

    this.dropZone.addEventListener('drop', this._dropHandler as EventListener, false);
  }

  /** Removes all event listeners added by this instance. */
  destroy(): void {
    const preventDefaults = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
    };

    for (const eventName of ['dragenter', 'dragover', 'dragleave', 'drop'] as const) {
      this.dropZone.removeEventListener(eventName, preventDefaults);
      document.body.removeEventListener(eventName, preventDefaults);
    }
    for (const eventName of ['dragenter', 'dragover'] as const) {
      this.dropZone.removeEventListener(eventName, this._highlightHandler);
    }
    for (const eventName of ['dragleave', 'drop'] as const) {
      this.dropZone.removeEventListener(eventName, this._unhighlightHandler);
    }
    this.dropZone.removeEventListener('drop', this._dropHandler as EventListener);
  }

  private highlight(): void {
    this.dropZone.classList.add('dragover');
  }

  private unhighlight(): void {
    this.dropZone.classList.remove('dragover');
  }

  private handleDrop(e: DragEvent): void {
    const file = e.dataTransfer?.files[0];
    if (!file || !this.validateFontFile(file)) {
      alert('Please drop a valid font file (.ttf or .otf)');
      return;
    }

    document.getElementById('drop-text')?.remove();
    void this.readFile(file);
  }

  private validateFontFile(file: File): boolean {
    return /\.(ttf|otf)$/i.test(file.name);
  }

  private async readFile(file: File): Promise<void> {
    try {
      const buffer = await file.arrayBuffer();
      this.onDrop(buffer, file.name);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Error reading file:', error);
      alert(`Error reading file: ${error.message}`);
    }
  }
}
