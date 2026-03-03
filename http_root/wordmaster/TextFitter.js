// =============================================================================
// wordmaster/TextFitter.ts
// =============================================================================
export class TextFitter {
    paddingPercentage;
    constructor({ paddingPercentage = 10 } = {}) {
        this.paddingPercentage = paddingPercentage;
    }
    fitText(element, container) {
        if (!element || !container)
            return;
        const currentFontFamily = element.style.fontFamily;
        const currentFeatureSettings = element.style.fontFeatureSettings;
        const currentVariationSettings = element.style.fontVariationSettings;
        element.style.cssText = '';
        if (currentFontFamily)
            element.style.fontFamily = currentFontFamily;
        if (currentFeatureSettings)
            element.style.fontFeatureSettings = currentFeatureSettings;
        if (currentVariationSettings)
            element.style.fontVariationSettings = currentVariationSettings;
        element.style.position = 'absolute';
        element.style.whiteSpace = 'nowrap';
        element.style.fontSize = '200px';
        element.style.left = '50%';
        element.style.top = '50%';
        const containerWidth = container.offsetWidth;
        const paddingPixels = (containerWidth * this.paddingPercentage) / 100;
        const availableWidth = containerWidth - paddingPixels * 2;
        const naturalWidth = element.offsetWidth;
        const scale = availableWidth / naturalWidth;
        element.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }
}
//# sourceMappingURL=TextFitter.js.map