'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type Point = [number, number, number?];
type Stroke = { points: Point[]; radius: number; closed?: boolean };

// Coordinates follow the approved 1536 × 864 composition. Depth and radius
// vary independently so overlapping strokes catch light as separate volumes.
const glyphs: { material: number; strokes: Stroke[] }[] = [
  { material: 0, strokes: [{ radius: 78, points: [[312,182,5],[235,190,16],[150,188,10],[95,225,-3],[122,277,-8],[197,303,7],[224,348,20],[182,400,10],[95,444,-10],[-35,489,-22]] }] },
  { material: 0, strokes: [{ radius: 53, closed: true, points: [[293,270],[372,218],[419,250],[409,337],[365,420],[297,462],[261,428],[265,350]] }] },
  { material: 1, strokes: [{ radius: 49, points: [[537,195],[488,280],[461,374],[456,433],[491,449],[560,436]] }] },
  { material: 1, strokes: [
    { radius: 42, points: [[778,229],[697,228],[642,262],[606,334],[579,405],[596,449],[659,437],[707,397]] },
    { radius: 30, points: [[610,335,-8],[659,320],[724,305]] },
  ] },
  { material: 1, strokes: [{ radius: 49, points: [[989,246],[982,217],[923,224],[865,270],[819,346],[809,415],[851,445],[913,419]] }] },
  { material: 2, strokes: [{ radius: 52, points: [[1070,212],[1035,288],[995,366],[1001,435],[1041,443],[1093,389],[1140,316],[1177,232]] }] },
  { material: 2, strokes: [{ radius: 61, points: [[1254,226],[1222,304],[1185,395],[1175,475],[1217,503],[1296,462]] }] },
  { material: 2, strokes: [
    { radius: 57, points: [[1347,268],[1412,244],[1499,230],[1570,235]] },
    { radius: 60, points: [[1448,260,-17],[1414,330],[1385,421],[1342,528]] },
  ] },
];

function createStroke({ points, radius, closed = false }: Stroke, material: number) {
  const path = new THREE.CatmullRomCurve3(points.map(([x, y, z = 0]) => new THREE.Vector3(x, -y, z)), closed);
  const segments = material === 0 ? 160 : 104;
  const sides = 48;
  const frames = path.computeFrenetFrames(segments, closed);
  const positions: number[] = [];
  const bent: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  const center = new THREE.Vector3();
  const surface = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const previousTangent = new THREE.Vector3();
  const bendDirection = new THREE.Vector3();
  const radial = new THREE.Vector3();
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments;
    path.getPointAt(t, center);
    path.getTangentAt(closed ? (t + .984) % 1 : Math.max(0, t - .016), previousTangent);
    path.getTangentAt(closed ? (t + .016) % 1 : Math.min(1, t + .016), tangent);
    bendDirection.subVectors(tangent, previousTangent);
    const bendAngle = t * (closed ? 2 * Math.PI : 1);
    const cap = closed ? 1 : Math.sqrt(Math.max(0.00001, 1 - (1 - Math.min(1, t * 9, (1 - t) * 9)) ** 2));
    for (let side = 0; side <= sides; side++) {
      const angle = side / sides * Math.PI * 2;
      radial.copy(frames.normals[ring]).multiplyScalar(Math.cos(angle))
        .addScaledVector(frames.binormals[ring], Math.sin(angle));
      const compression = THREE.MathUtils.clamp(radial.dot(bendDirection) * 4.5, 0, 1);
      const creaseWave = t * 20 * Math.PI * 2 + 2.8 * Math.sin(angle * 2) + 1.6 * Math.sin(t * 4 * Math.PI);
      const crease = Math.max(0, Math.cos(creaseWave)) ** 5;
      const fold = material === 0
        ? -.115 * compression * crease + .021 * Math.sin(creaseWave) * (.4 + compression)
        : material === 2 ? -.049 * compression * crease : 0;
      const width = radius * cap * (1 + .065 * Math.sin(t * (closed ? 4 * Math.PI : 17)) + fold);
      surface.copy(center).addScaledVector(radial, width);
      const z = surface.z * .82 + 12 * Math.sin(t * (closed ? 2 * Math.PI : 8));
      positions.push(surface.x, surface.y, z);
      const buckle = Math.sin((closed ? bendAngle * 3 : t * 21) - angle) * compression * cap;
      bent.push(
        surface.x + 17 * Math.sin(closed ? bendAngle : t * 7),
        surface.y + 28 * Math.sin(closed ? bendAngle * 2 : t * 9) + 10 * buckle,
        z + 53 * Math.sin(closed ? bendAngle : t * 5) + 14 * buckle,
      );
      uv.push(t, side / sides);
      if (ring < segments && side < sides) {
        const a = ring * (sides + 1) + side;
        const b = a + sides + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const flex = new THREE.BufferGeometry();
  flex.setAttribute('position', new THREE.Float32BufferAttribute(bent, 3));
  flex.setIndex(indices);
  flex.computeVertexNormals();
  geometry.morphAttributes.position = [flex.getAttribute('position')];
  geometry.morphAttributes.normal = [flex.getAttribute('normal')];
  flex.dispose();
  return geometry;
}

function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color('#514c45');
  const panels = [
    { position: [-3, 4, 3], scale: [6, 2], color: [4, 3.8, 3.55] },
    { position: [2, -3, 2], scale: [7, 2], color: [1.65, 1.57, 1.47] },
    { position: [5, 1, 0], scale: [2, 6], color: [2.1, 1.95, 1.8] },
    { position: [-3, .3, -3], scale: [1, 5], color: [2.8, 2.5, 2.25] },
    { position: [-1, 1.4, 5], scale: [2.7, .48], color: [.065, .056, .046] },
    { position: [0, 2.6, 5], scale: [4, .4], color: [4.8, 4.4, 3.9] },
    { position: [-4, -1, 3], scale: [.5, 4.5], color: [3.15, 2.9, 2.7] },
  ].map(({ position, scale, color }) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(...(scale as [number, number])),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(...(color as [number, number, number])) }));
    panel.position.fromArray(position);
    panel.lookAt(0, 0, 0);
    studio.add(panel);
    return panel;
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .021);
  pmrem.dispose();
  panels.forEach((panel) => { panel.geometry.dispose(); panel.material.dispose(); });
  return environment;
}

function leatherGrain() {
  const dimension = 512;
  const pixels = new Uint8Array(dimension * dimension);
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const grain = Math.sin(x * .73 + Math.sin(y * .53) * 2) * Math.sin(y * .83 + Math.cos(x * .61) * 2);
      const pores = ((Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) & 255) / 255;
      const across = y / dimension;
      const seamDistance = Math.min(Math.abs(across - .19), Math.abs(across - .81));
      const groove = 30 * Math.exp(-((seamDistance * 255) ** 2));
      const stitch = 44 * Math.exp(-(((seamDistance - .012) * 330) ** 2))
        * Math.max(0, Math.sin(x / dimension * Math.PI * 2 * 64)) ** 2;
      pixels[y * dimension + x] = 124 + grain * 35 + pores * 34 - groove + stitch;
    }
  }
  const texture = new THREE.DataTexture(pixels, dimension, dimension, THREE.RedFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export default function HeroScene({ pulse }: { pulse: number }) {
  const host = useRef<HTMLDivElement>(null);
  const animateTransition = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pulse) animateTransition.current();
  }, [pulse]);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let renderer: THREE.WebGLRenderer;
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
      if (!context) return;
      renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
    } catch {
      return;
    }

    const canvas = renderer.domElement;
    node.append(canvas);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 10, 10000);
    const environment = studioEnvironment(renderer);
    scene.environment = environment.texture;
    const key = new THREE.DirectionalLight('#fff0dc', 2.85);
    key.position.set(-500, 650, 650);
    const fill = new THREE.DirectionalLight('#fff6eb', .42);
    fill.position.set(550, -50, 400);
    scene.add(key, fill, new THREE.HemisphereLight('#fff4de', '#655241', .67));

    const grain = leatherGrain();
    const materials = [
      new THREE.MeshPhysicalMaterial({ color: '#e4d1b8', roughness: .47, sheen: .28, sheenColor: new THREE.Color('#fff4e6'), sheenRoughness: .7, side: THREE.DoubleSide }),
      new THREE.MeshPhysicalMaterial({ color: '#dedbd7', metalness: 1, roughness: .12, envMapIntensity: 1.58, side: THREE.DoubleSide }),
      new THREE.MeshPhysicalMaterial({ color: '#211d19', roughness: .49, clearcoat: .3, clearcoatRoughness: .35, bumpMap: grain, bumpScale: 1.35, side: THREE.DoubleSide }),
    ];

    const groups = glyphs.map(({ strokes, material }) => {
      const group = new THREE.Group();
      const pivot = strokes[0].points[Math.floor(strokes[0].points.length / 2)];
      group.position.set(pivot[0], -pivot[1], 0);
      for (const stroke of strokes) {
        const mesh = new THREE.Mesh(createStroke(stroke, material), materials[material]);
        mesh.position.copy(group.position).multiplyScalar(-1);
        group.add(mesh);
      }
      scene.add(group);
      return group;
    });

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const target = new THREE.Vector2();
    const pointer = new THREE.Vector2();
    const aim = new THREE.Vector3(768, -432, 0);
    let distance = 1329;
    let frame = 0;
    let visible = true;
    let available = true;
    let started = -10000;
    let lastRender = -10000;

    function draw(now: number) {
      frame = 0;
      if (!visible || !available) return;
      if (!motion.matches && now - lastRender < 30) {
        frame = requestAnimationFrame(draw);
        return;
      }
      lastRender = now;
      const time = motion.matches ? 0 : now / 1000;
      const progress = THREE.MathUtils.clamp((now - started) / 1190, 0, 1);
      const cameraPulse = motion.matches ? 0 : Math.sin(Math.PI * progress) ** 2;
      pointer.lerp(target, .055);
      camera.position.set(aim.x + pointer.x * 38 + cameraPulse * 16, aim.y + pointer.y * 25 + cameraPulse * 8, distance - cameraPulse * 32);
      camera.lookAt(aim);
      key.position.x = -500 + pointer.x * 200 + cameraPulse * 140;
      materials[1].roughness = .12 + cameraPulse * .065;
      groups.forEach((group, i) => {
        const progress = (now - started - i * 47) / 850;
        const compression = THREE.MathUtils.smootherstep(progress, 0, .58);
        const release = 1 - THREE.MathUtils.smootherstep(progress, .58, .9);
        const rebound = .12 * Math.sin(Math.PI * THREE.MathUtils.smoothstep(progress, .87, 1));
        const flex = motion.matches ? 0 : Math.max(0, compression * release - rebound);
        group.position.z = 10 * Math.sin(time * 1.15 + i * .8) + flex * 29;
        group.rotation.z = .012 * Math.sin(time * .8 + i) + flex * (i % 2 ? .12 : -.13);
        group.rotation.y = flex * (i % 2 ? .22 : -.17);
        group.scale.set(1 + .045 * flex, 1 - .075 * flex, 1 + .12 * flex);
        for (const child of group.children) {
          const mesh = child as THREE.Mesh;
          if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[0] = flex;
        }
      });
      renderer.render(scene, camera);
      if (!motion.matches) frame = requestAnimationFrame(draw);
    }

    function wake() {
      if (!frame && visible && available) frame = requestAnimationFrame(draw);
    }

    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      const mobile = width < 700;
      camera.aspect = width / height;
      const worldWidth = mobile ? 1690 : 1536;
      distance = Math.max(worldWidth / camera.aspect, 864) / (2 * Math.tan(THREE.MathUtils.degToRad(18)));
      const shift = mobile ? Math.min(230, (height / width - .72) * 197) : 0;
      aim.y = -432 - Math.max(0, shift);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.2 : 1.45));
      renderer.setSize(width, height);
      wake();
    });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    function move(event: PointerEvent) {
      if (motion.matches || event.pointerType === 'touch') return;
      target.set(event.clientX / window.innerWidth * 2 - 1, 1 - event.clientY / window.innerHeight * 2);
    }
    function resetMotion() {
      target.set(0, 0);
      pointer.set(0, 0);
      wake();
    }
    function lost(event: Event) {
      event.preventDefault();
      available = false;
      setReady(false);
    }
    function restored() {
      available = true;
      setReady(true);
      wake();
    }
    animateTransition.current = () => { started = performance.now(); wake(); };
    resize.observe(node);
    intersection.observe(node);
    motion.addEventListener('change', resetMotion);
    window.addEventListener('pointermove', move, { passive: true });
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    setReady(true);
    return () => {
      cancelAnimationFrame(frame);
      animateTransition.current = () => {};
      resize.disconnect();
      intersection.disconnect();
      motion.removeEventListener('change', resetMotion);
      window.removeEventListener('pointermove', move);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      groups.forEach((group) => group.children.forEach((child) => (child as THREE.Mesh).geometry.dispose()));
      materials.forEach((material) => material.dispose());
      grain.dispose();
      environment.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return <div className="hero-scene" data-webgl={ready} ref={host} aria-hidden="true">
    {!ready && <span className="scene-fallback">SOLE CULT</span>}
  </div>;
}
