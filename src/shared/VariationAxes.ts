// =============================================================================
// shared/VariationAxes.ts
// =============================================================================

import {
  saveInstanceIndex,
  getSavedInstanceIndex,
  saveAxisSettings,
  getSavedAxisSettings,
  saveLastChanged,
  getSavedLastChanged,
} from './FontSession.js';
import type { AxisDefinition, VariableInstance } from '../core/Types.js';

export interface VariationAxesOptions {
  container: HTMLElement;
  onChange:  (settings: string) => void;
}

interface SliderEntry {
  slider:    HTMLInputElement;
  valueSpan: HTMLElement;
}

export class VariationAxes {
  private readonly container:     HTMLElement;
  private readonly onChange:      (settings: string) => void;
  private readonly axisContainer: HTMLDivElement;

  private currentSettings: Record<string, number> = {};
  private sliderMap:       Record<string, SliderEntry> = {};
  private _instanceSelect: HTMLSelectElement | null  = null;
  private _instances:      VariableInstance[]        = [];

  constructor(options: VariationAxesOptions) {
    this.container = options.container;
    this.onChange  = options.onChange;

    this.axisContainer = document.createElement('div');
    this.axisContainer.className = 'axis-controls';
    this.container.appendChild(this.axisContainer);
  }

  /**
   * Creates sliders for variable-font axes and an optional named-instances
   * dropdown.
   */
  createAxesControls(axes: AxisDefinition[], instances: VariableInstance[] = []): void {
    this.axisContainer.innerHTML = '';
    this.currentSettings = {};
    this.sliderMap       = {};

    // Remove any previously-inserted instances row.
    this.container.querySelector('.instances-container')?.remove();

    // ---- Named instances dropdown ------------------------------------------
    if (instances.length > 0) {
      const instancesRow = document.createElement('div');
      instancesRow.className = 'slider-container instances-container';

      const label = document.createElement('label');
      label.textContent = 'Named instances';

      const select = document.createElement('select');
      select.className = 'instances-select';

      instances.forEach((inst, i) => {
        const option = document.createElement('option');
        option.value       = String(i);
        option.textContent = inst.name;
        select.appendChild(option);
      });

      select.addEventListener('change', () => {
        const idx = parseInt(select.value, 10);
        if (!isNaN(idx) && idx < instances.length) {
          saveInstanceIndex(idx);
          saveLastChanged('instance');
          this.setAxesValues(instances[idx]!.coordinates);
          saveAxisSettings({ ...this.currentSettings });
        }
      });

      instancesRow.appendChild(label);
      instancesRow.appendChild(select);

      const firstSlider = this.container.querySelector('.slider-container');
      if (firstSlider) {
        this.container.insertBefore(instancesRow, firstSlider);
      } else {
        this.container.insertBefore(instancesRow, this.axisContainer);
      }

      this._instanceSelect = select;
      this._instances      = instances;
    } else {
      this._instanceSelect = null;
      this._instances      = [];
    }

    // ---- Axis sliders -------------------------------------------------------
    for (const axis of axes) {
      const row = document.createElement('div');
      row.className = 'slider-container variation-axis';

      const label = document.createElement('label');
      label.textContent = `${axis.name} (${axis.tag})`;

      const slider = document.createElement('input');
      slider.type  = 'range';
      slider.min   = String(axis.min);
      slider.max   = String(axis.max);
      slider.value = String(axis.default);
      slider.step  = '0.1';

      const valueSpan = document.createElement('span');
      valueSpan.className   = 'value';
      valueSpan.textContent = parseFloat(String(axis.default)).toFixed(1);

      slider.addEventListener('input', () => {
        this._updateAxisValue(axis.tag, slider.value);
        valueSpan.textContent = parseFloat(slider.value).toFixed(1);
      });

      this.currentSettings[axis.tag] = parseFloat(String(axis.default));
      this.sliderMap[axis.tag]        = { slider, valueSpan };

      row.appendChild(label);
      row.appendChild(slider);
      row.appendChild(valueSpan);
      this.axisContainer.appendChild(row);
    }

    // ---- Restore persisted state --------------------------------------------
    const lastChanged       = getSavedLastChanged();
    const savedAxisSettings = getSavedAxisSettings();

    if (lastChanged === 'sliders' && savedAxisSettings) {
      this.setAxesValues(savedAxisSettings);
      return;
    }

    if (this._instanceSelect && this._instances.length > 0) {
      const savedIdx = getSavedInstanceIndex();
      if (savedIdx !== null && savedIdx < this._instances.length) {
        this._instanceSelect.value = String(savedIdx);
        this.setAxesValues(this._instances[savedIdx]!.coordinates);
        return;
      }
    }

    // Emit initial settings from axis defaults.
    this._updateVariationSettings();
  }

  /**
   * Sets all axis sliders to the supplied coordinate values and triggers the
   * onChange callback.
   */
  setAxesValues(coordinates: Record<string, number>): void {
    for (const [tag, val] of Object.entries(coordinates)) {
      this.currentSettings[tag] = val;
      const entry = this.sliderMap[tag];
      if (entry) {
        entry.slider.value        = String(val);
        entry.valueSpan.textContent = parseFloat(String(val)).toFixed(1);
      }
    }
    this._updateVariationSettings();
  }

  private _updateAxisValue(tag: string, value: string): void {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      delete this.currentSettings[tag];
    } else {
      this.currentSettings[tag] = numValue;
    }
    saveAxisSettings({ ...this.currentSettings });
    saveLastChanged('sliders');
    this._updateVariationSettings();
  }

  private _updateVariationSettings(): void {
    const settings = Object.entries(this.currentSettings)
      .filter(([, val]) => !isNaN(val))
      .map(([tag, val]) => `"${tag}" ${val.toFixed(1)}`)
      .join(', ');
    this.onChange(settings || 'normal');
  }
}
