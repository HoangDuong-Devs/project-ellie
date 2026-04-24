import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import {
  VRM,
  VRMLoaderPlugin,
  VRMUtils,
  VRMHumanBoneName,
  VRMExpressionPresetName,
} from "@pixiv/three-vrm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

export type CompanionMood = "neutral" | "happy" | "sad" | "surprised" | "angry" | "relaxed";

interface VRMCanvasProps {
  modelUrl?: string;
  mood?: CompanionMood;
  /** 0..1 — drives mouth open for lip-sync. */
  speakingLevel?: number;
  className?: string;
}

const DEFAULT_MODEL = "/models/ellie.vrm";

/**
 * VRMScene — actual Three scene contents.
 * Loads the VRM, runs idle breathing, blink, look-at-cursor, expression + lip-sync.
 */
function VRMScene({
  modelUrl,
  mood,
  speakingLevel,
}: {
  modelUrl: string;
  mood: CompanionMood;
  speakingLevel: number;
}) {
  const gltf = useLoader(GLTFLoader, modelUrl, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const vrm: VRM | undefined = (gltf as unknown as { userData: { vrm?: VRM } }).userData.vrm;

  const { camera, pointer } = useThree();

  // Track time refs
  const blinkTimerRef = useRef({ next: 2 + Math.random() * 3, t: 0, closing: false, closeT: 0 });
  const speakingPhaseRef = useRef(0);
  const lookTargetRef = useRef(new THREE.Vector3(0, 1.4, 1));

  // Setup once vrm is loaded
  useEffect(() => {
    if (!vrm) return;
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    vrm.scene.traverse((obj) => {
      obj.frustumCulled = false;
    });
    // Rotate to face camera (VRM default faces +Z which is away)
    vrm.scene.rotation.y = Math.PI;
    return () => {
      VRMUtils.deepDispose(vrm.scene);
    };
  }, [vrm, gltf.scene]);

  useFrame((_, delta) => {
    if (!vrm) return;

    const t = performance.now() / 1000;

    // --- Idle breathing: gentle spine sway + chest rise ---
    const spine = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Spine);
    const chest = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Chest);
    if (spine) {
      spine.rotation.x = Math.sin(t * 1.2) * 0.015;
      spine.rotation.z = Math.sin(t * 0.6) * 0.01;
    }
    if (chest) {
      chest.rotation.x = Math.sin(t * 1.2 + 0.4) * 0.012;
    }

    // --- Head subtle motion ---
    const head = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
    if (head) {
      head.rotation.z = Math.sin(t * 0.7) * 0.02;
    }

    // --- Look-at cursor ---
    if (vrm.lookAt) {
      // Map pointer (-1..1) to a world point in front of head
      lookTargetRef.current.set(pointer.x * 1.5, 1.4 + pointer.y * 0.5, 1.5);
      vrm.lookAt.target = (() => {
        const dummy = new THREE.Object3D();
        dummy.position.copy(lookTargetRef.current);
        return dummy;
      })();
    }

    // --- Blinking ---
    const blinkState = blinkTimerRef.current;
    blinkState.t += delta;
    if (!blinkState.closing && blinkState.t >= blinkState.next) {
      blinkState.closing = true;
      blinkState.closeT = 0;
    }
    if (blinkState.closing) {
      blinkState.closeT += delta;
      // 0.15s close+open cycle (sine)
      const phase = Math.min(blinkState.closeT / 0.18, 1);
      const blink = Math.sin(phase * Math.PI);
      vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, blink);
      if (phase >= 1) {
        blinkState.closing = false;
        blinkState.t = 0;
        blinkState.next = 2 + Math.random() * 4;
        vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, 0);
      }
    }

    // --- Mood expression (smoothly applied) ---
    const moodMap: Record<CompanionMood, VRMExpressionPresetName | null> = {
      neutral: null,
      happy: VRMExpressionPresetName.Happy,
      sad: VRMExpressionPresetName.Sad,
      surprised: VRMExpressionPresetName.Surprised,
      angry: VRMExpressionPresetName.Angry,
      relaxed: VRMExpressionPresetName.Relaxed,
    };
    const allMoods: VRMExpressionPresetName[] = [
      VRMExpressionPresetName.Happy,
      VRMExpressionPresetName.Sad,
      VRMExpressionPresetName.Surprised,
      VRMExpressionPresetName.Angry,
      VRMExpressionPresetName.Relaxed,
    ];
    const active = moodMap[mood];
    for (const m of allMoods) {
      const cur = vrm.expressionManager?.getValue(m) ?? 0;
      const target = m === active ? 0.7 : 0;
      vrm.expressionManager?.setValue(m, THREE.MathUtils.lerp(cur, target, 0.08));
    }

    // --- Lip-sync via mouth shapes ---
    if (speakingLevel > 0.01) {
      speakingPhaseRef.current += delta * 8;
      const phase = speakingPhaseRef.current;
      const shapes = [
        VRMExpressionPresetName.Aa,
        VRMExpressionPresetName.Ih,
        VRMExpressionPresetName.Ou,
        VRMExpressionPresetName.Ee,
        VRMExpressionPresetName.Oh,
      ];
      shapes.forEach((shape, idx) => {
        const offset = (idx * Math.PI * 2) / shapes.length;
        const v = Math.max(0, Math.sin(phase + offset)) * speakingLevel * 0.6;
        vrm.expressionManager?.setValue(shape, v);
      });
    } else {
      [
        VRMExpressionPresetName.Aa,
        VRMExpressionPresetName.Ih,
        VRMExpressionPresetName.Ou,
        VRMExpressionPresetName.Ee,
        VRMExpressionPresetName.Oh,
      ].forEach((s) => {
        const cur = vrm.expressionManager?.getValue(s) ?? 0;
        vrm.expressionManager?.setValue(s, THREE.MathUtils.lerp(cur, 0, 0.3));
      });
    }

    vrm.expressionManager?.update();
    vrm.update(delta);
  });

  // Position camera on first mount
  useEffect(() => {
    camera.position.set(0, 1.35, 1.6);
    camera.lookAt(0, 1.35, 0);
  }, [camera]);

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
}

export function VRMCanvas({
  modelUrl = DEFAULT_MODEL,
  mood = "happy",
  speakingLevel = 0,
  className,
}: VRMCanvasProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ fov: 30, near: 0.1, far: 20, position: [0, 1.35, 1.6] }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 4, 3]} intensity={1.1} color={"#fff5e6"} />
        <directionalLight position={[-2, 2, -1]} intensity={0.5} color={"#a78bfa"} />
        <Suspense fallback={null}>
          <VRMScene modelUrl={modelUrl} mood={mood} speakingLevel={speakingLevel} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={0.8}
          maxDistance={3.5}
          target={[0, 1.35, 0]}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  );
}
