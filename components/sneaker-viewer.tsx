"use client";
import {
  Component,
  Suspense,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import {
  Box3,
  Color,
  Vector3,
  type Group,
  Mesh,
  MeshStandardMaterial,
} from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { ImageIcon } from "lucide-react";
import type { Sneaker } from "@/data/products";
export type Phase = "idle" | "out" | "in";
class ModelBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function AssetFallback({
  product,
  reason,
}: {
  product: Sneaker;
  reason?: string;
}) {
  return (
    <div className="asset-fallback">
      {product.image ? (
        <img src={product.image} alt={product.name} draggable={false} />
      ) : (
        <div className="asset-missing">
          <ImageIcon size={42} strokeWidth={1} />
          <span>Product imagery coming soon</span>
        </div>
      )}
      <p>
        {reason ||
          (product.image
            ? "Product photo · 3D model unavailable"
            : "3D model not yet available")}
      </p>
    </div>
  );
}
export default function SneakerViewer({
  product,
  phase,
  reduced,
  rotate,
  zoom,
  reset,
  onReady,
  onAvailabilityChange,
}: {
  product: Sneaker;
  phase: Phase;
  reduced: boolean;
  rotate: number;
  zoom: number;
  reset: number;
  onReady: () => void;
  onAvailabilityChange: (available: boolean) => void;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const ready = useCallback(() => {
    setLoadedId(product.id);
    onReady();
  }, [product.id, onReady]);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    setSupported(Boolean(gl));
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }, []);
  useEffect(() => {
    if (!product.model || supported === false) {
      onAvailabilityChange(false);
      onReady();
    }
  }, [product.id, product.model, supported, onReady, onAvailabilityChange]);
  if (!product.model || supported === false)
    return (
      <AssetFallback
        product={product}
        reason={
          supported === false
            ? "3D is unavailable on this device. Product photo shown when available."
            : undefined
        }
      />
    );
  if (supported === null)
    return (
      <div className="viewer-loading" role="status">
        Preparing showroom…
      </div>
    );
  return (
    <ModelBoundary
      key={product.model}
      fallback={
        <ReadyFallback
          product={product}
          onReady={onReady}
          onAvailabilityChange={onAvailabilityChange}
        />
      }
    >
      <div
        className="canvas-wrap"
        role="img"
        aria-label={`Interactive 3D model of ${product.name}. Drag to rotate through 360 degrees; scroll or pinch to zoom. Use the buttons below for keyboard control.`}
      >
        {loadedId !== product.id && (
          <div className="model-loading" role="status">
            Loading 3D model…
          </div>
        )}
        <Canvas
          dpr={[1, 1.5]}
          frameloop={phase === "idle" ? "demand" : "always"}
          camera={{ position: [0, 0.4, 5.8], fov: 38 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "low-power",
            preserveDrawingBuffer: Boolean(product.previewColor),
          }}
        >
          <ContextMonitor onLost={() => setSupported(false)} />
          <ambientLight intensity={1.6} />
          <hemisphereLight args={["#fff6e8", "#b5987c", 2]} />
          <directionalLight position={[3, 5, 4]} intensity={3} />
          <directionalLight position={[-3, 1, -2]} intensity={1.7} />
          <Suspense fallback={null}>
            <Model
              key={product.id}
              url={product.model}
              tint={product.previewColor}
              phase={phase}
              reduced={reduced}
              onReady={ready}
              onAvailabilityChange={onAvailabilityChange}
            />
          </Suspense>
          <Controls
            identity={product.id}
            rotate={rotate}
            zoom={zoom}
            reset={reset}
            enabled={phase === "idle"}
          />
        </Canvas>
      </div>
    </ModelBoundary>
  );
}
function ReadyFallback({
  product,
  onReady,
  onAvailabilityChange,
}: {
  product: Sneaker;
  onReady: () => void;
  onAvailabilityChange: (available: boolean) => void;
}) {
  useEffect(() => {
    onAvailabilityChange(false);
    onReady();
  }, [onReady, onAvailabilityChange]);
  return (
    <AssetFallback
      product={product}
      reason="The 3D model could not load. Product photo shown when available."
    />
  );
}
function Model({
  url,
  tint,
  phase,
  reduced,
  onReady,
  onAvailabilityChange,
}: {
  url: string;
  tint?: string;
  phase: Phase;
  reduced: boolean;
  onReady: () => void;
  onAvailabilityChange: (available: boolean) => void;
}) {
  useEffect(() => {
    onAvailabilityChange(true);
    onReady();
  }, [onReady, onAvailabilityChange]);
  const { scene } = useGLTF(url);
  const object = useMemo(() => {
    const clone = scene.clone(true);
    if (tint)
      clone.traverse((node) => {
        if ((node as Mesh).isMesh) {
          const mesh = node as Mesh;
          const recolor = (material: MeshStandardMaterial) => {
            const copy = material.clone();
            copy.color.set("#ffffff");
            copy.onBeforeCompile = (shader) => {
              shader.uniforms.previewTint = { value: new Color(tint) };
              shader.fragmentShader =
                "uniform vec3 previewTint;\n" + shader.fragmentShader;
              shader.fragmentShader = shader.fragmentShader.replace(
                "#include <map_fragment>",
                "#include <map_fragment>\n float previewLuma=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722)); vec3 previewColor=mix(previewTint,vec3(0.96),smoothstep(0.45,0.75,previewLuma))*(0.45+0.55*sqrt(previewLuma)); diffuseColor.rgb=mix(diffuseColor.rgb,previewColor,smoothstep(0.015,0.08,previewLuma));",
              );
            };
            copy.customProgramCacheKey = () => tint;
            return copy;
          };
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map((m) => recolor(m as MeshStandardMaterial))
            : recolor(mesh.material as MeshStandardMaterial);
        }
      });
    const bounds = new Box3().setFromObject(clone),
      size = bounds.getSize(new Vector3()),
      center = bounds.getCenter(new Vector3());
    const rootScale = 3.6 / Math.max(size.x, size.y, size.z, 0.001);
    clone.position.sub(center);
    return { clone, rootScale };
  }, [scene, tint]);
  const group = useRef<Group>(null);
  const start = useRef<number | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    start.current = null;
    invalidate();
  }, [phase, invalidate]);
  useFrame(({ clock }) => {
    if (!group.current) return;
    if (start.current === null) start.current = clock.elapsedTime;
    const t =
      reduced || phase === "idle"
        ? 1
        : Math.min(
            1,
            (clock.elapsedTime - start.current) /
              (phase === "out" ? 0.75 : 0.65),
          );
    const eased = t * t * (3 - 2 * t);
    const g = group.current;
    if (phase === "out") {
      g.rotation.set(eased * Math.PI * 2, eased * Math.PI * 2, -0.12);
      g.position.set(
        eased * 5,
        Math.sin(eased * Math.PI) * 1.5 + eased * 0.8,
        0,
      );
      g.scale.setScalar(1 - eased * 0.4);
    } else if (phase === "in") {
      g.rotation.set(0, 0, -0.12);
      g.position.set(
        (1 - eased) * -5,
        Math.sin((1 - eased) * Math.PI) * 0.5,
        0,
      );
      g.scale.setScalar(0.6 + eased * 0.4);
    } else {
      g.rotation.set(0, 0, -0.12);
      g.position.set(0, 0, 0);
      g.scale.setScalar(1);
    }
  });
  return (
    <group ref={group}>
      <group scale={object.rootScale}>
        <primitive object={object.clone} />
      </group>
    </group>
  );
}
function Controls({
  identity,
  rotate,
  zoom,
  reset,
  enabled,
}: {
  identity: string;
  rotate: number;
  zoom: number;
  reset: number;
  enabled: boolean;
}) {
  const ref = useRef<OrbitControlsType>(null);
  const previousRotate = useRef(rotate);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    ref.current?.reset();
    invalidate();
  }, [identity, reset, invalidate]);
  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    if (rotate === previousRotate.current) return;
    previousRotate.current = rotate;
    const offset = controls.object.position.clone().sub(controls.target);
    offset.applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 4);
    controls.object.position.copy(controls.target).add(offset);
    controls.update();
    invalidate();
  }, [rotate, invalidate]);
  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    controls.object.position.copy(
      controls.target.clone().add(
        controls.object.position
          .clone()
          .sub(controls.target)
          .normalize()
          .multiplyScalar(zoom % 2 ? 4 : Math.hypot(0.4, 5.8)),
      ),
    );
    controls.update();
    invalidate();
  }, [zoom, invalidate]);
  return (
    <OrbitControls
      ref={ref}
      enabled={enabled}
      enablePan={false}
      minDistance={3.2}
      maxDistance={9}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI - 0.15}
      enableDamping={false}
      makeDefault
    />
  );
}

function ContextMonitor({ onLost }: { onLost: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = () => onLost();
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  return null;
}
