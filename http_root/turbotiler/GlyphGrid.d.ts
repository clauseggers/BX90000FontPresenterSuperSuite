/**
 * GlyphGrid.ts
 * Manages the grid of glyph cells for TurboTiler BX90000 Fascination
 */
import type { AxisDefinition } from '../core/Types.js';
export interface CellInfo {
    element: HTMLElement;
    index: number;
    x: number;
    y: number;
    cellWidth: number;
    cellHeight: number;
}
/** Subset of opentype.Font needed by GlyphGrid. */
interface FontLike {
    tables: {
        os2?: {
            sTypoAscender?: number;
            sTypoDescender?: number;
        };
        fvar?: {
            axes?: Array<{
                tag: string;
            }>;
            instances?: Array<{
                coordinates: Record<string, number>;
            }>;
        };
        avar?: {
            axisSegmentMaps?: Array<{
                axisValueMaps?: Array<{
                    fromCoordinate: number;
                    toCoordinate: number;
                }>;
            }>;
        };
    };
    ascender: number;
    descender: number;
    unitsPerEm?: number;
}
export declare class GlyphGrid {
    cells: HTMLElement[];
    private glyphList;
    private axes;
    private features;
    private fontFamily;
    gridCols: number;
    gridRows: number;
    private container;
    private zoomOutScale;
    private containerWidth;
    private containerHeight;
    private axisSamplers;
    private namedInstances;
    private cellAspectRatio;
    private viewportWidth;
    private viewportHeight;
    private font;
    populate(container: HTMLElement, glyphList: string[], axes: AxisDefinition[], features: string[], fontFamily: string, font: FontLike, zoomOutScale?: number): void;
    randomiseAll(): void;
    getCellCount(): number;
    getCellInfoByIndex(index: number): CellInfo | null;
    getRandomCell(): CellInfo | null;
    getCenterCell(): CellInfo | null;
    private createCell;
    updateCell(cell: HTMLElement): void;
    private randomiseGlyph;
    private randomiseAxes;
    private randomiseAxesFromNamedInstances;
    private randomiseAxesNumerically;
    private sampleAxisValue;
    private createAxisSamplers;
    private invertAvar;
    private normalizedToAxisValue;
    private randomiseFeatures;
    private calculateFontAspectRatio;
    private extractNamedInstances;
}
export {};
//# sourceMappingURL=GlyphGrid.d.ts.map