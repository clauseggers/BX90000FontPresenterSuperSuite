// =============================================================================
// shared/DragAndDrop.ts
// =============================================================================
export class DragAndDrop {
    dropZone;
    onDrop;
    // Bound listener references kept for cleanup
    _highlightHandler;
    _unhighlightHandler;
    _dropHandler;
    constructor(options) {
        this.dropZone = options.dropZone;
        this.onDrop = options.onDrop;
        this._highlightHandler = () => this.highlight();
        this._unhighlightHandler = () => this.unhighlight();
        this._dropHandler = (e) => this.handleDrop(e);
        this.setupEventListeners();
    }
    setupEventListeners() {
        const preventDefaults = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        for (const eventName of ['dragenter', 'dragover', 'dragleave', 'drop']) {
            this.dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        }
        for (const eventName of ['dragenter', 'dragover']) {
            this.dropZone.addEventListener(eventName, this._highlightHandler, false);
        }
        for (const eventName of ['dragleave', 'drop']) {
            this.dropZone.addEventListener(eventName, this._unhighlightHandler, false);
        }
        this.dropZone.addEventListener('drop', this._dropHandler, false);
    }
    /** Removes all event listeners added by this instance. */
    destroy() {
        const preventDefaults = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        for (const eventName of ['dragenter', 'dragover', 'dragleave', 'drop']) {
            this.dropZone.removeEventListener(eventName, preventDefaults);
            document.body.removeEventListener(eventName, preventDefaults);
        }
        for (const eventName of ['dragenter', 'dragover']) {
            this.dropZone.removeEventListener(eventName, this._highlightHandler);
        }
        for (const eventName of ['dragleave', 'drop']) {
            this.dropZone.removeEventListener(eventName, this._unhighlightHandler);
        }
        this.dropZone.removeEventListener('drop', this._dropHandler);
    }
    highlight() {
        this.dropZone.classList.add('dragover');
    }
    unhighlight() {
        this.dropZone.classList.remove('dragover');
    }
    handleDrop(e) {
        const file = e.dataTransfer?.files[0];
        if (!file || !this.validateFontFile(file)) {
            alert('Please drop a valid font file (.ttf or .otf)');
            return;
        }
        document.getElementById('drop-text')?.remove();
        void this.readFile(file);
    }
    validateFontFile(file) {
        return /\.(ttf|otf)$/i.test(file.name);
    }
    async readFile(file) {
        try {
            const buffer = await file.arrayBuffer();
            this.onDrop(buffer, file.name);
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            console.error('Error reading file:', error);
            alert(`Error reading file: ${error.message}`);
        }
    }
}
//# sourceMappingURL=DragAndDrop.js.map