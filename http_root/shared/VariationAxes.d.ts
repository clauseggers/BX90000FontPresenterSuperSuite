import type { AxisDefinition, VariableInstance } from '../core/Types.js';
export interface VariationAxesOptions {
    container: HTMLElement;
    onChange: (settings: string) => void;
}
export declare class VariationAxes {
    private readonly container;
    private readonly onChange;
    private readonly axisContainer;
    private currentSettings;
    private sliderMap;
    private _instanceSelect;
    private _instances;
    constructor(options: VariationAxesOptions);
    /**
     * Creates sliders for variable-font axes and an optional named-instances
     * dropdown.
     */
    createAxesControls(axes: AxisDefinition[], instances?: VariableInstance[]): void;
    /**
     * Sets all axis sliders to the supplied coordinate values and triggers the
     * onChange callback.
     */
    setAxesValues(coordinates: Record<string, number>): void;
    private _updateAxisValue;
    private _updateVariationSettings;
}
//# sourceMappingURL=VariationAxes.d.ts.map