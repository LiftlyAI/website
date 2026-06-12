'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Full-bleed Three.js hero: a slowly rotating barbell built from primitives,
 * floating in a drifting particle field. Reacts to pointer (parallax) and
 * scroll (tilt + dolly). Renders a single static frame when the visitor
 * prefers reduced motion.
 */
export function HeroScene({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070d, 0.055);

    const camera = new THREE.PerspectiveCamera(
      38,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.4, 11);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    // ---- Lights -----------------------------------------------------------
    scene.add(new THREE.AmbientLight(0x8a93a6, 0.35));

    const keyLight = new THREE.DirectionalLight(0xf4f7fb, 1.6);
    keyLight.position.set(6, 8, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 2.4);
    rimLight.position.set(-8, -2, -4);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x22d3ee, 14, 30);
    fillLight.position.set(0, -4, 5);
    scene.add(fillLight);

    // ---- Barbell ----------------------------------------------------------
    const barbell = new THREE.Group();

    const steel = new THREE.MeshStandardMaterial({
      color: 0xb9c2d4,
      metalness: 0.95,
      roughness: 0.28,
    });
    const darkPlate = new THREE.MeshStandardMaterial({
      color: 0x10151f,
      metalness: 0.6,
      roughness: 0.5,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.06,
    });
    const bluePlate = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      metalness: 0.55,
      roughness: 0.45,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.22,
    });

    // Bar (lying along the X axis)
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 9.6, 32),
      steel
    );
    bar.rotation.z = Math.PI / 2;
    barbell.add(bar);

    // Sleeves + collars
    for (const side of [-1, 1]) {
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 2.2, 32),
        steel
      );
      sleeve.rotation.z = Math.PI / 2;
      sleeve.position.x = side * 3.7;
      barbell.add(sleeve);

      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.22, 32),
        steel
      );
      collar.rotation.z = Math.PI / 2;
      collar.position.x = side * 2.55;
      barbell.add(collar);

      // Plates: big blue 45s inboard, smaller dark change plates outboard
      const plates: Array<[number, number, THREE.MeshStandardMaterial]> = [
        [1.35, 0.16, bluePlate],
        [1.35, 0.16, bluePlate],
        [1.0, 0.12, darkPlate],
        [0.7, 0.1, darkPlate],
      ];
      let offset = 2.8;
      for (const [radius, thickness, material] of plates) {
        const plate = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, thickness, 48),
          material
        );
        plate.rotation.z = Math.PI / 2;
        plate.position.x = side * (offset + thickness / 2);
        barbell.add(plate);

        // Thin glowing rim on the blue plates
        if (material === bluePlate) {
          const rim = new THREE.Mesh(
            new THREE.TorusGeometry(radius, 0.018, 12, 64),
            new THREE.MeshBasicMaterial({ color: 0x60a5fa })
          );
          rim.rotation.y = Math.PI / 2;
          rim.position.x = side * (offset + thickness / 2);
          barbell.add(rim);
        }
        offset += thickness + 0.06;
      }
    }

    barbell.rotation.set(0.18, -0.35, -0.08);
    // Float up and to the right so the headline and sub copy stay readable.
    barbell.position.set(1.7, 1.15, -1.2);
    scene.add(barbell);

    // ---- Particle field ---------------------------------------------------
    const particleCount = 650;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 34;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 18 - 4;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0x3b82f6,
        size: 0.045,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
        depthWrite: false,
      })
    );
    scene.add(particles);

    // ---- Interaction state ------------------------------------------------
    const pointer = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    let scrollProgress = 0;

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      const limit = window.innerHeight * 1.2;
      scrollProgress = Math.min(window.scrollY / limit, 1);
    };
    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      if (prefersReducedMotion) renderer.render(scene, camera);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // ---- Render loop ------------------------------------------------------
    let frameId = 0;
    const clock = new THREE.Clock();

    const renderFrame = () => {
      const t = clock.getElapsedTime();

      eased.x += (pointer.x - eased.x) * 0.04;
      eased.y += (pointer.y - eased.y) * 0.04;

      barbell.rotation.y = -0.35 + t * 0.12 + eased.x * 0.18;
      barbell.rotation.x = 0.18 + eased.y * 0.12 + scrollProgress * 0.55;
      barbell.position.y = 1.15 + Math.sin(t * 0.7) * 0.18 - scrollProgress * 1.6;

      particles.rotation.y = t * 0.015;
      camera.position.z = 11 + scrollProgress * 2.2;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    if (prefersReducedMotion) {
      renderFrame();
    } else {
      const loop = () => {
        renderFrame();
        frameId = requestAnimationFrame(loop);
      };
      loop();
    }

    // Pause when the tab is hidden to save battery.
    const onVisibility = () => {
      if (prefersReducedMotion) return;
      if (document.hidden) {
        cancelAnimationFrame(frameId);
      } else {
        frameId = requestAnimationFrame(function loop() {
          renderFrame();
          frameId = requestAnimationFrame(loop);
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
