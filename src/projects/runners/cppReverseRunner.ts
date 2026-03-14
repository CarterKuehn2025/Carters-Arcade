export type ProjectRunner = {
    init(): Promise<void>;
    runLine(line: string): Promise<string[]>;
};

export function makeCppReverseRunner(): ProjectRunner {
    let mod: any = null;
    let handleLine: ((s: string) => string) | null = null;

    return {
        async init() {
            // dynamic importy so only loads when needed and resides on client
            const { default: createModule } = await import ("@/wasm/reverse_terminal.mjs");

            mod = await createModule();
            // handleLine will be the name
            handleLine = mod.cwrap("handleLine", "string", ["string"]);
        },

        async runLine(line: string) {
            if (!handleLine) return ["(runner not ready yet)"];
            const out = (handleLine(line) ?? "").toString();
            return out.length ? out.split("\n") : [];
        },
    };
}