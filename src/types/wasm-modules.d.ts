import type { EmscriptenModule } from "@/projects/runners/emscriptenTypes";

declare module "*.mjs" {
    const factory: (opts?: Record<string, unknown>) => Promise<EmscriptenModule>;
    export default factory;
}