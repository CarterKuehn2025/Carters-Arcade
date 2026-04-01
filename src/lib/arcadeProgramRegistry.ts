export type ArcadeProgram = {
    id: string;
    title: string;
    modulePath: string;
    wasmFolder: string;
};

export const arcadeProgramRegistry: Record<string, ArcadeProgram> = {
    "reverse-integer": {
        id: "reverse-integer",
        title: "Reverse Integer",
        modulePath: "/arcade-programs/reverse-integer/reverse-integer.js",
        wasmFolder: "/arcade-programs/reverse-integer/",
    },
    "divideandconquer": {
        id: "divideandconquer",
        title: "Divide and Conquer",
        modulePath: "/arcade-programs/divideandconquer/divideandconquer.js",
        wasmFolder: "/arcade-programs/divideandconquer/",
    },
    "greedy-arrows": {
        id: "greedy-arrows",
        title: "Greedy Arrows",
        modulePath: "/arcade-programs/greedy-arrows/greedy-arrows.js",
        wasmFolder: "/arcade-programs/greedy-arrows/",
    },
};