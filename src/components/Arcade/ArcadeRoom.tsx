// basics:
//  - game loop is created using useFrame((state, delta))
//  - player movement is determined by speed * delta, allow for move speed to be seperated from client FPS
//  - positioning is clamped to keep player in room
//  - compute distance to cabinet, if under threshold, show prompt and enable interact (e)

"use client";

import { Html, PointerLockControls } from "@react-three/drei";
import { useFrame} from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ARCADE_MACHINES } from "@/arcade/machines";
import * as THREE from "three";

// cam.quaternion represents camera rotation
// forward and right direction vectors are created based on camera rotation
// wasd adds and subs the movement vectors
// ALMOST FORGOT to zero out y, started floating lol
function FirstPersonController({ enabled }: { enabled: boolean }) {
    const keys = React.useRef({ w: false, a: false, s: false, d: false});

    // key listeners
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "w") keys.current.w = true;
            if (e.key === "a") keys.current.a = true;
            if (e.key === "s") keys.current.s = true;
            if (e.key === "d") keys.current.d = true;
        };
        const up = (e: KeyboardEvent) => {
            if (e.key === "w") keys.current.w = false;
            if (e.key === "a") keys.current.a = false;
            if (e.key === "s") keys.current.s = false;
            if (e.key === "d") keys.current.d = false;
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return() => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
    }, []);

    useFrame((state, delta) => {
        if (!enabled) return;

        const cam = state.camera;
        const speed = 3.0;

        // movement vectors based on where the camera is looking
        // only need forward and right (I think)
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
        right.y = 0;
        right.normalize();

        const move = new THREE.Vector3();

        if (keys.current.w) move.add(forward);
        if (keys.current.s) move.sub(forward);
        if (keys.current.d) move.add(right);
        if (keys.current.a) move.sub(right);

        if (move.lengthSq() > 0) {
            move.normalize().multiplyScalar(speed * delta);
            cam.position.add(move);
        }

        // set room bounds
        cam.position.y = 1.6;
        cam.position.x = THREE.MathUtils.clamp(cam.position.x, -4.2, 4.2);
        cam.position.z = THREE.MathUtils.clamp(cam.position.z, -4.2, 4.2);
    });

    return null;
}

    

// now for a semi-reuseable arcade machine
function ArcadeMachine({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
          {/* cabinet body */}
            <mesh position={[0, 0.9, 0]}>
                <boxGeometry args={[1.2, 1.8, 1.0]} />
                <meshStandardMaterial />
            </mesh>
          {/* screen */}
            <mesh position={[0, 1.25, 0.51]}>
                <boxGeometry args={[0.9, 0.55, 0.05]} />
                <meshStandardMaterial />
            </mesh>
        </group>
    );
}

export default function ArcadeRoom({
  controlsEnabled,
  onInteract,
  onProximityChange,
}: {
  controlsEnabled: boolean;
  onInteract: (projectId: string) => void;
  onProximityChange: (nearMachineId: string | null) => void;
}) {
  const machinePos = useMemo<[number, number, number]>(() => [0, 0, -2], []);
  const nearMachineIdRef = useRef<string | null>(null);
  const nearProjectIdRef = useRef<string | null>(null);
  const canInteractRef = useRef(false);
  const lastNearMachineIdRef = useRef<string | null>(null);
  const controlsEnabledRef = useRef(true);
  const onInteractRef = useRef(onInteract);

  useEffect(() => {
    onInteractRef.current = onInteract;
  }, [onInteract]);

  // E to interact, grabs pid on interact (e is pressed by user)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "e") return;
      if (!controlsEnabledRef.current) return;

      const pid = nearProjectIdRef.current;
      if (!pid) return;

      onInteractRef.current(pid);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // updated to find the nearest interactable machine
  useFrame((state) => {
    controlsEnabledRef.current = controlsEnabled;

    const p = state.camera.position;

    // not rly following the proximity logic, but I think it'll work
    let bestDist = Infinity;
    let bestMachineId: string | null = null;
    let bestProjectId: string | null = null;

    for (const m of ARCADE_MACHINES) {
      const dx = p.x - m.position[0];
      const dz = p.z - m.position[2];
      const dist = Math.hypot(dx, dz);

      if (dist < bestDist) {
        bestDist = dist;
        bestMachineId = m.machineId;
        bestProjectId = m.projectId;
      }
    }

    const interactRadius = 2.0;
    const near = bestDist < interactRadius;

    const newNearMachineId = near ? bestMachineId : null;
    const newNearProjectId = near ? bestProjectId : null;

    // update refs
    nearMachineIdRef.current = newNearMachineId;
    nearProjectIdRef.current = newNearProjectId;

    // notify parent only when it changes
    if (newNearMachineId !== lastNearMachineIdRef.current) {
      lastNearMachineIdRef.current = newNearMachineId;
      onProximityChange(newNearMachineId);
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial />
      </mesh>

      <mesh position={[0, 1.5, -5.5]}>
        <boxGeometry args={[12, 3, 1]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0, 1.5, 5.5]}>
        <boxGeometry args={[12, 3, 1]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[-5.5, 1.5, 0]}>
        <boxGeometry args={[1, 3, 12]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[5.5, 1.5, 0]}>
        <boxGeometry args={[1, 3, 12]} />
        <meshStandardMaterial />
      </mesh>

      {ARCADE_MACHINES.map((m) => (
        <ArcadeMachine
          key={m.machineId}
          position={m.position}
          rotationY={m.rotationY ?? 0}
          />
      ))}
      <FirstPersonController enabled={controlsEnabled} />
    </>
  );
}