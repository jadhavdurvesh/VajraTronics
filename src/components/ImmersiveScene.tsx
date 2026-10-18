import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type SceneMode = 'home' | 'industrial' | 'firebots';

function box(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material, bevel?: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function ImmersiveScene({ mode = 'home' }: { mode?: SceneMode }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    let disposed = false;
    let frame = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const accent = mode === 'industrial' ? 0x83c9ff : 0xff704c;
    const accentSoft = mode === 'industrial' ? 0x3d9ee8 : 0xf04d2f;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    camera.position.set(3.65, 2.65, 7.6);
    camera.lookAt(0.15, -0.05, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setClearColor(0x080b0f, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.className = 'immersive-canvas';
    element.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xbddfff, 0x10151b, 2.05));
    const keyLight = new THREE.DirectionalLight(0xe4f2ff, 3.2);
    keyLight.position.set(-2, 6, 5);
    scene.add(keyLight);
    const blueLight = new THREE.PointLight(0x379dff, 26, 12);
    blueLight.position.set(-2, 1.7, -2);
    scene.add(blueLight);
    const amberLight = new THREE.PointLight(accent, 15, 8);
    amberLight.position.set(2.6, 1, 3);
    scene.add(amberLight);

    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x202b35, metalness: 0.88, roughness: 0.28 });
    const frameMetal = new THREE.MeshStandardMaterial({ color: 0x394754, metalness: 0.83, roughness: 0.34 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x080c10, metalness: 0.15, roughness: 0.8 });
    const darkPanel = new THREE.MeshStandardMaterial({ color: 0x111920, metalness: 0.65, roughness: 0.38 });
    const accentMetal = new THREE.MeshStandardMaterial({ color: accentSoft, metalness: 0.52, roughness: 0.31, emissive: accent, emissiveIntensity: 0.12 });
    const glow = new THREE.MeshBasicMaterial({ color: accent });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x10283b, metalness: 0.3, roughness: 0.1, transmission: 0.22, emissive: 0x0b4f7a, emissiveIntensity: 0.38 });

    const rig = new THREE.Group();
    rig.position.set(0.1, -0.2, 0);
    scene.add(rig);

    // A small but mechanically plausible tracked inspection / response robot.
    box(rig, [2.16, 0.43, 1.22], [0, -0.12, 0], darkMetal);
    box(rig, [1.43, 0.22, 0.99], [-0.08, 0.21, 0], frameMetal);
    box(rig, [1.85, 0.06, 1.1], [-0.04, 0.075, 0], accentMetal);
    box(rig, [0.8, 0.1, 0.83], [-0.26, 0.35, 0], darkPanel);
    box(rig, [0.16, 0.16, 0.88], [-0.97, -0.1, 0], accentMetal);

    const wheels: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      box(rig, [2.15, 0.32, 0.25], [0, -0.43, side * 0.73], rubber);
      box(rig, [1.78, 0.035, 0.018], [0, -0.25, side * 0.866], frameMetal);
      for (const x of [-0.83, -0.28, 0.28, 0.83]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.13, 24), frameMetal);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(x, -0.43, side * 0.81);
        wheel.castShadow = true;
        rig.add(wheel);
        wheels.push(wheel);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.086, 0.145, 16), darkPanel);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(x, -0.43, side * 0.81);
        rig.add(hub);
      }
    }

    // Sensor mast, lens hood, lens glass and two understated status indicators.
    box(rig, [0.13, 0.54, 0.13], [0.28, 0.55, 0], frameMetal);
    box(rig, [0.47, 0.24, 0.37], [0.37, 0.88, 0], darkMetal);
    box(rig, [0.17, 0.12, 0.42], [0.65, 0.88, 0], accentMetal);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 16), glass);
    lens.position.set(0.72, 0.88, 0.04);
    rig.add(lens);
    const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 28), glow);
    lensRing.position.set(0.77, 0.88, 0.04);
    lensRing.rotation.y = Math.PI / 2;
    rig.add(lensRing);
    for (const z of [-0.27, 0.27]) {
      const status = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), glow);
      status.position.set(-0.84, 0.18, z);
      rig.add(status);
    }

    // A separate industrial motor module sits behind the robot for the combined team view.
    const motor = new THREE.Group();
    motor.position.set(1.42, -0.12, -0.94);
    rig.add(motor);
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.9, 36), darkMetal);
    cylinder.rotation.z = Math.PI / 2;
    motor.add(cylinder);
    const motorEnd = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 12, 36), frameMetal);
    motorEnd.position.x = 0.47;
    motorEnd.rotation.y = Math.PI / 2;
    motor.add(motorEnd);
    box(motor, [1.12, 0.1, 0.1], [0, -0.25, 0], frameMetal);
    box(motor, [0.24, 0.18, 0.22], [-0.03, 0.46, 0], darkPanel);
    for (let i = 0; i < 7; i++) {
      const fin = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.018, 6, 36), frameMetal);
      fin.rotation.z = Math.PI / 2;
      fin.position.x = -0.35 + i * 0.115;
      motor.add(fin);
    }

    // Technical orbit rings, a floor grid and sparse particles give the space depth.
    const orbitGroup = new THREE.Group();
    orbitGroup.position.set(0.1, 0.05, 0);
    scene.add(orbitGroup);
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.18, 0.008, 6, 180), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.48 }));
    ring1.rotation.set(1.16, 0.1, -0.22);
    orbitGroup.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.004, 6, 180), new THREE.MeshBasicMaterial({ color: 0x63baff, transparent: true, opacity: 0.35 }));
    ring2.rotation.set(0.95, -0.4, 0.6);
    orbitGroup.add(ring2);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.006, 6, 160), new THREE.MeshBasicMaterial({ color: 0x80cbff, transparent: true, opacity: 0.35 }));
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -0.82;
    orbitGroup.add(halo);

    const grid = new THREE.GridHelper(18, 32, 0x25465d, 0x172938);
    grid.position.set(0, -1.03, 0);
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((m) => { m.transparent = true; m.opacity = 0.34; });
    scene.add(grid);

    const count = 180;
    const points = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      points[i * 3] = (Math.random() - 0.5) * 10;
      points[i * 3 + 1] = (Math.random() - 0.5) * 5;
      points[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0x86caff, size: 0.018, transparent: true, opacity: 0.68 }));
    scene.add(particles);

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      pointer.y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const resize = () => {
      if (disposed) return;
      const width = Math.max(element.clientWidth, 1);
      const height = Math.max(element.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    const clock = new THREE.Clock();
    const animate = () => {
      if (disposed) return;
      const t = clock.getElapsedTime();
      if (!reducedMotion) {
        rig.rotation.y = -0.18 + Math.sin(t * 0.24) * 0.045 + pointer.x * 0.055;
        rig.position.y = -0.2 + Math.sin(t * 0.7) * 0.035;
        orbitGroup.rotation.y = t * 0.035;
        ring1.rotation.z = -0.22 + Math.sin(t * 0.12) * 0.035;
        ring2.rotation.y = -0.4 + Math.cos(t * 0.1) * 0.04;
        motor.rotation.x = Math.sin(t * 0.33) * 0.018;
        particles.rotation.y = t * 0.008;
      }
      camera.position.x += (3.65 + pointer.x * 0.14 - camera.position.x) * 0.025;
      camera.position.y += (2.65 - pointer.y * 0.08 - camera.position.y) * 0.025;
      camera.lookAt(0.15, -0.05, 0);
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
        else if (mesh.material) mesh.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [mode]);

  return <div className={'immersive-scene immersive-scene-' + mode} ref={host} aria-hidden="true">
    <div className="scene-hud scene-hud-top"><span><i/> VT / SYSTEM 0{mode === 'firebots' ? '2' : '1'}</span><span>OPTICAL TRACKING <b>ACTIVE</b></span></div>
    <div className="scene-reticle"><span/><i/><b/></div>
    <div className="scene-hud scene-hud-bottom"><span>FIELD / 01—03</span><span>XYZ <b>CALIBRATED</b></span><span>VJ—{mode === 'firebots' ? 'FIRE' : 'LAB'} / 026</span></div>
    <div className="scene-edge-glow"/>
  </div>;
}
