// registry to identify unique arcade machines
export type ArcadeMachineDef = {
    machineId: string;          // unique identifier
    projectId: string;          // what program is stored in machine
    label: string;              // what is shown in hud
    position: [number, number, number];
    rotationY?: number;
};

export const ARCADE_MACHINES: ArcadeMachineDef[] = [
    {
        machineId: "cab-1",
        projectId: "cpp-reverse",
        label: "C++ Reverse Integer",
        position: [-2.2, 0, 2],
        rotationY: Math.PI,     // should face toward hallway
    },
    {
        machineId: "cab-2",
        projectId: "cpp-reverse",
        label: "C++ Reverse Integer",
        position: [2.2, 0, 2],
        rotationY: Math.PI,     // should face toward hallway
    },
    {
        machineId: "cab-3",
        projectId: "cpp-reverse",
        label: "C++ Reverse Integer",
        position: [-2.2, 0, -3],
        rotationY: 0,     // should face toward hallway
    },
    {
        machineId: "cab-4",
        projectId: "cpp-reverse",
        label: "C++ Reverse Integer",
        position: [2.2, 0, 3],
        rotationY: 0,     // should face toward hallway
    },
];