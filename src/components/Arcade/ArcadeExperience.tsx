// basics:
//  - useState tracks if the terminal is open/closed
//  - 3D scene calls onInteract() when user presses E near the cabinet
//  - Terminal is normal HTML overlay (simplifies this process significantly)


"use client";

import { Canvas } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";
import { useEffect, useRef, useState } from "react";
import ArcadeRoom from "./ArcadeRoom";

function TerminalOverlay({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [lines, setLines] = useState<string[]>([
        "Welcome to the demo terminal.",
        "Type something and press Enter.",
    ]);
    const [value, setValue] = useState("");
    const inputRef = useRef<HTMLInputElement | null>(null);

    // when terminal opens, we need to focus the input (redirect input stream)
    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    // enable ESC to close terminal window
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    // just in case
    if (!open) return null;

    // now for formatting the window
    return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-xl bg-zinc-950 border border-zinc-700 shadow-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                    <div className="text-zinc-200 font-medium">Project Terminal</div>
                    <button
                        className="text-zinc-300 hover:text-white text-sm"
                        onClick={onClose}
                    >
                        ESC / Close
                    </button>
                </div>

                <div className="p-4 font-mono text-sm text-zinc-100 space-y-1 h-[50vh] overflow-auto">
                    {lines.map((l, i) => (
                        <div key={i}>{l}</div>
                    ))}
                </div>

                <div className="px-4 pb-4">
                    <input
                        ref={inputRef}
                        className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 font-mono text-zinc-100 outline-none"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                const trimmed = value.trim();
                                if (trimmed.length === 0) return;

                                // temporary for demo purposes, need to route into project runner
                                setLines((prev) => [...prev, `> ${trimmed}`, `echo: ${trimmed}`]);
                                setValue("");
                            }
                        }}
                        placeholder="Type command..."
                    />
                </div>
            </div>
        </div>
    );
}

// now export the function definition
export default function ArcadeExperience() {
    const [terminalOpen, setTerminalOpen] = useState(false);
    const [canInteract, setCanInteract] = useState(false);

    const controlsRef = useRef<PointerLockControlsImpl | null>(null);
    const [canvasEl, setCanvasEl] = useState<HTMLElement | null>(null);
    const [pointerLocked, setPointerLocked] = useState(false);

    // need to track pointer-lock state
    useEffect(() => {
        if (!canvasEl) return;

        const handleChange = () => {
            setPointerLocked(document.pointerLockElement === canvasEl);
        };

        document.addEventListener("pointerlockchange", handleChange);
        handleChange();
        return () => document.removeEventListener("pointerlockchange", handleChange);
    }, [canvasEl]);

    // terminal opens, free the mouse immediately
    useEffect(() => {
        if (terminalOpen) {
            controlsRef.current?.unlock();
        }
    }, [terminalOpen]);

    const requestRelock = () => {
        // user must invoke to get mouse back into website window
        controlsRef.current?.lock();
    };

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black">
            <Canvas
                camera={{ position: [0, 1.6, 3], fov: 75}}
                onCreated={({ gl }) => setCanvasEl(gl.domElement)}
                >
                   <ArcadeRoom
                        controlsEnabled={!terminalOpen}
                        onInteract={() => setTerminalOpen(true)}
                        onProximityChange={setCanInteract}
                    />
                    <PointerLockControls ref={controlsRef} enabled={!terminalOpen} />
                </Canvas>

                {/* HUD: info */}
                <div className="absolute left-4 top-4 text-white/90 text-sm font-medium pointer-events-none">
                    WASD move - Mouse look - E interact - ESC closes terminal
                </div>

                {/* HUD: interact prompt */}
                {!terminalOpen && pointerLocked && canInteract && (
                    <div className="absolute bottom-10 w-full flex justify-center pointer-events-none">
                        <div className="px-3 py-1 rounded-full bg-black/70 text-white text-sm border border-white/15">
                            Press <span className="font-bold">E</span> to interact
                        </div>
                    </div>
                )}

                {/* HUD: click to look */}
                {!terminalOpen && !pointerLocked && (
                    <div
                        className="absolute inset-0 flex items-end justify-center pb-10 cursor-pointer"
                        onClick={requestRelock}
                    >
                        <div className="px-3 py-1 rounded-full bg-black/70 text-white text-sm border border-white/15">
                            Click to look
                        </div>
                    </div>
                )}

                <TerminalOverlay
                    open={terminalOpen}
                    onClose={() => setTerminalOpen(false)}
                />
            </div>
    );
}