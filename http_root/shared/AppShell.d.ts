export interface AppInstance {
    fontLoader?: {
        restoreFromSession?: () => Promise<void>;
    };
    destroy?: () => void;
}
export type AppConstructor = new () => AppInstance;
export declare function switchApp(key: string): Promise<void>;
//# sourceMappingURL=AppShell.d.ts.map