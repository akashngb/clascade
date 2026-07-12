"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ScenePreview({ accent = "#c4614f", compact = false }: { accent?: string; compact?: boolean }) {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#243a36");
    scene.fog = new THREE.Fog("#243a36", 5.8, 13);
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    camera.position.set(0.5, 1.9, 6.3);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    const outer = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 48, 30),
      new THREE.MeshStandardMaterial({ color: accent, roughness: 0.48, metalness: 0.02 }),
    );
    outer.scale.set(1.42, 0.76, 0.86);
    outer.rotation.z = -0.22;
    outer.castShadow = true;
    group.add(outer);

    const ridgeMaterial = new THREE.MeshStandardMaterial({ color: "#efaf87", roughness: 0.7 });
    for (let i = -2; i <= 2; i += 1) {
      const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.065, 10, 30, Math.PI * 1.25), ridgeMaterial);
      ridge.position.set(i * 0.25, i % 2 ? 0.12 : -0.1, 1.03);
      ridge.scale.set(1, 0.62, 1);
      ridge.rotation.z = Math.PI / 2 + i * 0.12;
      group.add(ridge);
    }

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: "#1b2f2c", roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.6;
    floor.receiveShadow = true;
    scene.add(floor);
    scene.add(new THREE.HemisphereLight("#c9e5d2", "#172320", 2.8));
    const key = new THREE.DirectionalLight("#ffd5ae", 5.2);
    key.position.set(-3, 5, 5);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.PointLight("#81bea8", 8, 12);
    rim.position.set(3, 0, 1);
    scene.add(rim);

    let frame = 0;
    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const start = performance.now();
    const render = (time: number) => {
      const t = (time - start) / 1000;
      group.rotation.y = Math.sin(t * 0.34) * 0.25;
      group.position.y = Math.sin(t * 0.7) * 0.08;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    };
  }, [accent]);

  return <div ref={mount} className={compact ? "h-40 w-full overflow-hidden rounded-2xl" : "h-full min-h-[310px] w-full overflow-hidden"} aria-label="Interactive 3D lesson preview" />;
}
