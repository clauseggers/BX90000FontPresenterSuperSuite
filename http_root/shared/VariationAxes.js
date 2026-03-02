// =============================================================================
// shared/VariationAxes.js
// =============================================================================

import { saveInstanceIndex, getSavedInstanceIndex, saveAxisSettings, getSavedAxisSettings, saveLastChanged, getSavedLastChanged } from './FontSession.js';

export class VariationAxes {
  constructor(options) {
    this.container = options.container;
    this.onChange = options.onChange;
    this.currentSettings = {};
    this.sliderMap = {};
    // Create a specific container for axis controls
    this.axisContainer = document.createElement('div');
    this.axisContainer.className = 'axis-controls';
    this.container.appendChild(this.axisContainer);
  }

  /**
   * Creates sliders for variable font axes, and a named instances dropdown if provided
   * @param {Array<AxisDefinition>} axes - Array of axis definitions
   * @param {Array} instances - Array of named instances (optional)
   */
  createAxesControls(axes, instances = []) {
    // Clear only the axis container, not the entire controls div
    this.axisContainer.innerHTML = '';
    this.currentSettings = {};
    this.sliderMap = {};

    // Remove any previously inserted instances row
    const existingInstancesRow = this.container.querySelector('.instances-container');
    if (existingInstancesRow) existingInstancesRow.remove();

    // Named instances dropdown (only if instances exist)
    if (instances.length > 0) {
      const instancesRow = document.createElement('div');
      instancesRow.className = 'slider-container instances-container';

      const label = document.createElement('label');
      label.textContent = 'Named instances';

      const select = document.createElement('select');
      select.className = 'instances-select';

      instances.forEach((inst, i) => {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = inst.name;
        select.appendChild(option);
      });

      select.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value);
        if (!isNaN(idx)) {
          saveInstanceIndex(idx);
          saveLastChanged('instance');
          this.setAxesValues(instances[idx].coordinates);
          // Snapshot the resulting axis state so the next page can restore it exactly
          saveAxisSettings({ ...this.currentSettings });
        }
      });

      instancesRow.appendChild(label);
      instancesRow.appendChild(select);

      // Insert before the first existing slider-container so it appears above all sliders
      const firstSlider = this.container.querySelector('.slider-container');
      if (firstSlider) {
        this.container.insertBefore(instancesRow, firstSlider);
      } else {
        this.container.insertBefore(instancesRow, this.axisContainer);
      }

      this._instanceSelect = select;
      this._instances = instances;
    } else {
      this._instanceSelect = null;
      this._instances = [];
    }

    axes.forEach(axis => {
      const container = document.createElement('div');
      container.className = 'slider-container variation-axis';

      const label = document.createElement('label');
      label.textContent = `${axis.name} (${axis.tag})`;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = axis.min;
      slider.max = axis.max;
      slider.value = axis.default;
      slider.step = 0.1;  // Set fixed step size for better control

      const value = document.createElement('span');
      value.className = 'value';
      value.textContent = parseFloat(axis.default).toFixed(1);  // Format initial value

      slider.addEventListener('input', (e) => {
        this.updateAxisValue(axis.tag, e.target.value);
        value.textContent = parseFloat(e.target.value).toFixed(1);
      });

      // Store axis default in currentSettings so initial values are emitted
      this.currentSettings[axis.tag] = parseFloat(axis.default);

      this.sliderMap[axis.tag] = { slider, valueSpan: value };

      container.appendChild(label);
      container.appendChild(slider);
      container.appendChild(value);
      this.axisContainer.appendChild(container);
    });

    // Restore state after sliderMap is fully populated
    const lastChanged = getSavedLastChanged();
    const savedAxisSettings = getSavedAxisSettings();

    // If sliders were the last thing the user touched, use those values (even if
    // a named instance is also recorded — the manual edits take precedence).
    if (lastChanged === 'sliders' && savedAxisSettings) {
      this.setAxesValues(savedAxisSettings);
      return; // setAxesValues already calls updateVariationSettings
    }

    // Otherwise fall back to the saved named instance (existing behaviour).
    if (this._instanceSelect && this._instances.length > 0) {
      const savedIdx = getSavedInstanceIndex();
      if (savedIdx !== null && savedIdx < this._instances.length) {
        this._instanceSelect.value = savedIdx;
        this.setAxesValues(this._instances[savedIdx].coordinates);
        return; // setAxesValues already calls updateVariationSettings
      }
    }

    // Emit initial variation settings from axis defaults
    this.updateVariationSettings();
  }

  /**
   * Sets all axis sliders to the given coordinate values and triggers onChange
   * @param {Object} coordinates - Map of axis tag to value
   */
  setAxesValues(coordinates) {
    Object.entries(coordinates).forEach(([tag, val]) => {
      this.currentSettings[tag] = val;
      const entry = this.sliderMap[tag];
      if (entry) {
        entry.slider.value = val;
        entry.valueSpan.textContent = parseFloat(val).toFixed(1);
      }
    });
    this.updateVariationSettings();
  }

  /**
   * Updates a single axis value
   * @private
   */
  updateAxisValue(tag, value) {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      delete this.currentSettings[tag];
    } else {
      this.currentSettings[tag] = numValue;
    }
    // Persist slider state so it survives page navigation
    saveAxisSettings({ ...this.currentSettings });
    saveLastChanged('sliders');
    this.updateVariationSettings();
  }

  /**
   * Updates variation settings and triggers callback
   * @private
   */
  updateVariationSettings() {
    const settings = Object.entries(this.currentSettings)
      .filter(([_, val]) => !isNaN(val))
      .map(([tag, val]) => `"${tag}" ${val.toFixed(1)}`)  // Format value in settings string
      .join(', ');
    this.onChange?.(settings || 'normal');
  }
}
