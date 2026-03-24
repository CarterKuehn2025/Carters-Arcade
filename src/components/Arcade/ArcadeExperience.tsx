"use client";

import type React from "react";
import { Canvas } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { ARCADE_MACHINES } from "@/arcade/machines";
import ArcadeRoom from "./ArcadeRoom";
import { makeCppReverseRunner, type ProjectRunner } from "@/projects/runners/cppReverseRunner";

function HudPill({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      className={[
        "px-3 py-1 rounded-full bg-black/70 text-white text-sm border border-white/15",
        "transition-opacity duration-200",
        show ? "opacity-100" : "opacity-0",
        "pointer-events-none",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function TerminalOverlay({
  open,
  title,
  loading,
  lines,
  onClose,
  onSubmitLine,
}: {
  open: boolean;
  title: string;
  loading: boolean;
  lines: string[];
  onClose: () => void;
  onSubmitLine: (line: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, lines]);

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      onMouseDown={(e) => e.stopPropagation()} // prevent relock click from firing under the overlay
    >
      <div className="w-full max-w-3xl rounded-xl bg-zinc-950 border border-zinc-700 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="text-zinc-200 font-medium">{title}</div>
          <button className="text-zinc-300 hover:text-white text-sm" onClick={onClose}>
            ESC / Close
          </button>
        </div>

        <div ref={scrollRef} className="p-4 font-mono text-sm text-zinc-100 space-y-1 h-[50vh] overflow-auto">
          {loading && <div className="text-white/70">Loading runtime...</div>}
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>

        <div className="px-4 pb-4">
          <input
            ref={inputRef}
            className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 font-mono text-zinc-100 outline-none disabled:opacity-60"
            value={value}
            disabled={loading}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key !== "Enter") return;
              const trimmed = value.trim();
              if (!trimmed) return;
              setValue("");
              await onSubmitLine(trimmed);
            }}
            placeholder={loading ? "Loading..." : "Type command..."}
          />
        </div>
      </div>
    </div>
  );
}

export default function ArcadeExperience() {
  // Single source of truth:
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const terminalOpen = activeProjectId !== null;

  const [terminalLoading, setTerminalLoading] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);

  const [nearMachineId, setNearMachineId] = useState<string | null>(null);

  const controlsRef = useRef<React.ComponentRef<typeof PointerLockControls> | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLElement | null>(null);
  const [pointerLocked, setPointerLocked] = useState(false);

  // auto-hide HUD hints
  const [showInteractHint, setShowInteractHint] = useState(false);
  const [showResumeHint, setShowResumeHint] = useState(false);
  const resumeArmedRef = useRef(false);

  // Runner registry (ready for multiple machines later)
  const runnersRef = useRef<Record<string, ProjectRunner>>({});
  const runnerInitPromisesRef = useRef<Record<string, Promise<void>>>({});

  // NOT SURE IF THIS IS IN THE RIGHT PLACE
  const canInteract = nearMachineId !== null;

  // LIKEWISE
  const nearLabel = ARCADE_MACHINES.find((m) => m.machineId === nearMachineId)?.label ?? "Machine";

  const appendLines = (newLines: string[]) => {
    setTerminalLines((prev) => [...prev, ...newLines]);
  };

  const ensureRunnerReady = async (projectId: string) => {
    if (runnersRef.current[projectId]) return;

    if (!runnerInitPromisesRef.current[projectId]) {
      if (projectId === "cpp-reverse") {
        runnersRef.current[projectId] = makeCppReverseRunner();
      } else {
        throw new Error(`Unknown projectId: ${projectId}`);
      }

      runnerInitPromisesRef.current[projectId] = runnersRef.current[projectId].init();
    }

    await runnerInitPromisesRef.current[projectId];
  };

  // Track pointer-lock state
  useEffect(() => {
    if (!canvasEl) return;

    const handleChange = () => setPointerLocked(document.pointerLockElement === canvasEl);

    document.addEventListener("pointerlockchange", handleChange);
    handleChange();
    return () => document.removeEventListener("pointerlockchange", handleChange);
  }, [canvasEl]);

  // Terminal open => unlock mouse immediately
  useEffect(() => {
    if (terminalOpen) {
      controlsRef.current?.unlock();
    } else {
      resumeArmedRef.current = true;
      setShowResumeHint(false);
    }
  }, [terminalOpen]);

  // If pointer lock regained => hide resume hint
  useEffect(() => {
    if (pointerLocked) {
      resumeArmedRef.current = false;
      setShowResumeHint(false);
    }
  }, [pointerLocked]);

  // Show "Press E" briefly on entering range
  useEffect(() => {
    if (terminalOpen || !pointerLocked || !canInteract) {
      setShowInteractHint(false);
      return;
    }
    setShowInteractHint(true);
    const t = window.setTimeout(() => setShowInteractHint(false), 1600);
    return () => window.clearTimeout(t);
  }, [terminalOpen, pointerLocked, canInteract]);

  // Show "Click to look" only after attempted input while unlocked
  useEffect(() => {
    if (terminalOpen) return;

    const maybeShow = () => {
      if (pointerLocked) return;
      if (!resumeArmedRef.current) return;
      setShowResumeHint(true);
      window.setTimeout(() => setShowResumeHint(false), 1800);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "a" || k === "s" || k === "d") maybeShow();
    };
    const onMouseMove = () => maybeShow();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [terminalOpen, pointerLocked]);

  // Clicking anywhere (when terminal is closed) tries to re-lock
  const onBackgroundMouseDown = () => {
    if (terminalOpen) return;
    if (pointerLocked) return;
    controlsRef.current?.lock();
  };

  // Boot runner when a project becomes active
  useEffect(() => {
    if (!activeProjectId) return;

    let cancelled = false;

    (async () => {
      setTerminalLoading(true);
      setTerminalLines([`Booting ${activeProjectId}...`, "Type `help` for commands."]);

      try {
        await ensureRunnerReady(activeProjectId);
        if (!cancelled) appendLines(["(ready)"]);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) appendLines([`(error) ${msg}`]);
      } finally {
        if (!cancelled) setTerminalLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  const onTerminalLine = async (line: string) => {
    appendLines([`> ${line}`]);

    const projectId = activeProjectId;
    if (!projectId) return;

    const runner = runnersRef.current[projectId];
    if (!runner) {
      appendLines(["(runner not loaded)"]);
      return;
    }

    const outs = await runner.runLine(line);
    if (outs.length) appendLines(outs);
  };

  const terminalTitle = useMemo(
    () => `Project Terminal - ${activeProjectId ?? ""}`,
    [activeProjectId]
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black" onMouseDown={onBackgroundMouseDown}>
      <Canvas camera={{ position: [0, 1.6, 3], fov: 75 }} onCreated={({ gl }) => setCanvasEl(gl.domElement)}>
        <ArcadeRoom
          controlsEnabled={!terminalOpen}
          onInteract={(projectId) => setActiveProjectId(projectId)}
          onProximityChange={setNearMachineId}
        />
        <PointerLockControls ref={controlsRef} enabled={!terminalOpen} />
      </Canvas>

      <div className="absolute left-4 top-4 text-white/90 text-sm font-medium pointer-events-none">
        WASD move - Mouse look - E interact - ESC closes terminal
      </div>

      <div className="absolute bottom-10 w-full flex justify-center">
        <HudPill show={!terminalOpen && pointerLocked && canInteract && showInteractHint}>
          Press <span className="font-bold">E</span> to interact - {nearLabel}
        </HudPill>
      </div>

      <div className="absolute bottom-20 w-full flex justify-center">
        <HudPill show={!terminalOpen && !pointerLocked && showResumeHint}>Click to look</HudPill>
      </div>

      <TerminalOverlay
        open={terminalOpen}
        title={terminalTitle}
        loading={terminalLoading}
        lines={terminalLines}
        onClose={() => setActiveProjectId(null)}
        onSubmitLine={onTerminalLine}
      />
    </div>
  );
}