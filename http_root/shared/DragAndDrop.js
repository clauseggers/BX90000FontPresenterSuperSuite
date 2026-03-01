// =============================================================================
// shared/DragAndDrop.js
// =============================================================================

export class DragAndDrop {
  constructor(options) {
    this.dropZone = options.dropZone;
    this.onDrop = options.onDrop;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Save bound references so destroy() can remove the exact same listeners.
    this._highlightHandler   = this.highlight.bind(this);
    this._unhighlightHandler = this.unhighlight.bind(this);
    this._dropHandler        = this.handleDrop.bind(this);

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, this._highlightHandler, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, this._unhighlightHandler, false);
    });

    this.dropZone.addEventListener('drop', this._dropHandler, false);
  }

  // Remove all listeners added by this instance.
  destroy() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dropZone.removeEventListener(eventName, this.preventDefaults);
      document.body.removeEventListener(eventName, this.preventDefaults);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropZone.removeEventListener(eventName, this._highlightHandler);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      this.dropZone.removeEventListener(eventName, this._unhighlightHandler);
    });
    this.dropZone.removeEventListener('drop', this._dropHandler);
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  highlight() {
    this.dropZone.classList.add('dragover');
  }

  unhighlight() {
    this.dropZone.classList.remove('dragover');
  }

  handleDrop(e) {
    const file = e.dataTransfer.files[0];
    if (!this.validateFontFile(file)) {
      alert('Please drop a valid font file (.ttf or .otf)');
      return;
    }

    // Remove drop text immediately when a valid file is dropped
    const dropText = document.getElementById('drop-text');
    if (dropText) {
      dropText.parentNode.removeChild(dropText);
    }

    this.readFile(file);
  }

  validateFontFile(file) {
    return file && file.name.match(/\.(ttf|otf)$/i);
  }

  async readFile(file) {
    try {
      const buffer = await file.arrayBuffer();
      this.onDrop?.(buffer, file.name);
    } catch (error) {
      console.error('Error reading file:', error);
      alert(`Error reading file: ${error.message}`);
    }
  }
}