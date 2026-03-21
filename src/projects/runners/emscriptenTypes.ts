export type EmscriptenModule = {
    cwrap: (
        ident: string,
        returnType: "string",
        argTypes: ["string"]
    ) => (arg0: string) => string;
};