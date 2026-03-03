export interface DragAndDropOptions {
    dropZone: HTMLElement;
    onDrop: (buffer: ArrayBuffer, filename: string) => void;
}
export declare class DragAndDrop {
    private readonly dropZone;
    private readonly onDrop;
    private readonly _highlightHandler;
    private readonly _unhighlightHandler;
    private readonly _dropHandler;
    constructor(options: DragAndDropOptions);
    private setupEventListeners;
    /** Removes all event listeners added by this instance. */
    destroy(): void;
    private highlight;
    private unhighlight;
    private handleDrop;
    private validateFontFile;
    private readFile;
}
//# sourceMappingURL=DragAndDrop.d.ts.map