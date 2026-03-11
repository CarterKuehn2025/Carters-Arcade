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

function HudPill({
    show,
    children,
    clickable = false,
    onClick,
}: {
    show: boolean;
    children: React.ReactNode;
    clickable?: boolean;
    onCLick?: () => void;
}) {
    return (
        <div
            className={[
                "px-3 py-1 rounded-full bg-black/70 text-white text-sm border border-white/15",
                "transition-opacity duration-200",
                show ? "opacity-100" : "opacity-0",
                clickable && show ? "cursor-pointer pointer-events-auto" : "pointer-events-none",
            ].join(" ")}
            onClick={clickable && show ? onClick : undefined}
        >
            {children}
        </div>
    );
}

function TerminalOverlay({
    open,
    onClose,
    onLine,
    loading,
}: {
    open: boolean;
    onClose: () => void;
    onLine: (line: string) => Promise<void>;
    loading: boolean;
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

    // need to reset the lines when opened
    useEffect(() => {
        if (!open) return;
        setLines([
            "Booting project...",
            "Type 'help' fro commands.",
        ]);
        setValue("");
    }, [open]);

    // just in case
    if (!open) return null;

    // now for formatting the window
    return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-xl bg-zinc-950 border border-zinc-700 shadow-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                    <div className="text-zinc-200 font-medium">Project Terminal</div>
                    <button
                        className="text-zinc-300 hover:text-white text-sm" onClick={onClose}>
                        ESC / Close
                    </button>
                </div>

                <div className="p-4 font-mono text-sm text-zinc-100 space-y-1 h-[50vh] overflow-auto">
                    {loading && <div className="text-white/70"> Loading runtime...</div>}
                    {lines.map((l, i) => (
                        <div key={i}>{l}</div>
                    ))}
                </div>

                <div className="px-4 pb-4">
                    <input
                        ref={inputRef}
                        className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 font-mono text-zinc-100 outline-none"
                        value={value}
                        disabled={loading}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={async (e) => {
                            if (e.key !== "Enter") return;
                            const trimmed = value.trim();
                            if (!trimmed) return;

                            // now we'll show prompt line
                            setLines((prev) => [...prev, `> ${trimmed}`]);
                            setValue("");

                            // delegate to our program "runner" aka come back later and wire to C++
                            await onLine(trimmed);

                            // runner will append output by calling the window event
                        }}
                        placeholder={loading ? "Loading..." : "Type command..."}
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

    // for diff HUD visibility states (aka auto hide)
    const [showInteractHint, setShowInteractHint] = useState(false);
    const [showResumeHint, setShowResumeHint] = useState(false);
    const resumeArmedRef = useRef(false);

    // append terminal output using local state setter
    const [terminalLoading, setTerminalLoading] = useState(false);
    const terminalAppendRef = useRef<(lines: string[]) => void>(() => {});

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
        else {
            // terminal just closed, ready the resume hint but don't want to show until user moves/presses a key
            resumeArmedRef.current = true;
            setShowResumeHint(false);
        }
    }, [terminalOpen]);

    // when pointer lock is regain, hide resume hint immediately
    useEffect(() => {
        if (pointerLocked) {
            resumeArmedRef.current = false;
            setShowResumeHint(false);
        }
    }, [pointerLocked]);

    // show "Press E" breifly when user walks into interact range (+ auto hide)
    useEffect(() => {
        if (terminalOpen) {
            setShowInteractHint(false);
            return;
        }
        if (!pointerLocked) {
            setShowInteractHint(false);
            return;
        }
        if (!canInteract) {
            setShowInteractHint(false);
            return;
        }

        setShowInteractHint(true);
        const t = window.setTimeout(() => setShowInteractHint(false), 1600);
        return () => window.clearTimeout(t);
    }, [terminalOpen, pointerLocked, canInteract]);

    // now to only show "Click to look" after the user attempts input while pointer is unlocked
    useEffect(() => {
        if (terminalOpen) return;

        const maybeShow = (e: Event) => {
            if (terminalOpen) return;
            if (pointerLocked) return;
            if (!resumeArmedRef.current) return;

            // want to display hint for a moment, then hide (keep "armed" so it can reappear)
            setShowResumeHint(true);
            const t = window.setTimeout(() => setShowResumeHint(false), 1800);

            // after displays one, remain armed, any future attempt can still display it again
            // cleanup timer for next showing
            return () => window.clearTimeout(t);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === "w" || k === "a" || k === "s" || k === "d") maybeShow(e);
        };
        const onMouseMove = (e: MouseEvent) => maybeShow(e);

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("mousemove", onMouseMove);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("mousemove", onMouseMove);
        };
    }, [terminalOpen, pointerLocked]);

    // clicking anywhere when terminal is closed tries to re-lock
    const onBackgroundMouseDown = () => {
        if (terminalOpen) return;
        if (pointerLocked) return;
        controlsRef.current?.lock();
    };

    // temp runner for now, replacing with C++ WASM runner
    const onTerminalLine = async (line: string) => {
        // just echo
        terminalAppendRef.current([`echo: ${line}`]);
    };

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black"
            onMouseDown={onBackgroundMouseDown}
        >
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

            {/* top left HUD */}
            <div className="absolute left-4 top-4 text-white/90 text-sm font-medium pointer-events-none">
                WASD move - Mouse Look - E Interact - ESC closes terminal
            </div>

            {/* bottom center HUD */}
            <div className="absolute bottom-10 w-full flex justify-center">
                <HudPill show={!terminalOpen && pointerLocked && canInteract && showInteractHint}>
                    Press <span className="font-bold">E</span> to interact
                </HudPill>
            </div>

            {/* resume hint (only after attempted input) */}
            <div className="absolute bottom-20 w-full flex justify-center">
                <HudPill show={!terminalOpen && !pointerLocked && showResumeHint}>
                    Click to look
                </HudPill>
            </div>

            <TerminalOverlay
                open={terminalOpen}
                loading={terminalLoading}
                onClose={() => setTerminalOpen(false)}
                onLine={onTerminalLine}
            />
        </div>
    );
}