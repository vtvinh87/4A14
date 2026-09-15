import { useEffect, useRef } from 'react';
import type { PetMood } from '../motion/pet';
import { createPetMotionController } from '../pet2d5d/motion';
import { createFoxRig, deformFoxVertices, FOX_TEXTURE_ASPECT } from '../pet2d5d/rig';
import type { PetMotionController } from '../pet2d5d/types';

type FoxPet2D5DProps = {
  mood: PetMood;
  reducedMotion: boolean;
  onReady: () => void;
  onError: () => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function FoxPet2D5D({ mood, reducedMotion, onReady, onError }: FoxPet2D5DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const moodRef = useRef(mood);
  const reducedMotionRef = useRef(reducedMotion);
  const motionRef = useRef<PetMotionController | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const renderFrameRef = useRef<(() => void) | null>(null);
  const startLoopRef = useRef<(() => void) | null>(null);
  const stopLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    moodRef.current = mood;
    reducedMotionRef.current = reducedMotion;
    const controller = motionRef.current;
    if (!controller) return;
    controller.setMood(mood);
    controller.setReducedMotion(reducedMotion);
    renderFrameRef.current?.();
    if (controller.isAnimating()) startLoopRef.current?.();
    else stopLoopRef.current?.();
  }, [mood, reducedMotion]);

  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onReady, onError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let disposed = false;
    let failed = false;
    let ready = false;
    let frameId: number | null = null;
    let renderer: import('three').WebGLRenderer | null = null;
    let scene: import('three').Scene | null = null;
    let camera: import('three').OrthographicCamera | null = null;
    let geometry: import('three').BufferGeometry | null = null;
    let material: import('three').MeshBasicMaterial | null = null;
    let texture: import('three').Texture | null = null;
    let mesh: import('three').Mesh | null = null;
    let positionAttribute: import('three').BufferAttribute | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeHandler: (() => void) | null = null;
    let visibilityHandler: (() => void) | null = null;

    const reportError = () => {
      if (disposed || failed) return;
      failed = true;
      stopLoop();
      onErrorRef.current();
    };

    const notifyReady = () => {
      if (disposed || failed || ready) return;
      ready = true;
      onReadyRef.current();
    };

    const stopLoop = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    const updateMesh = () => {
      const controller = motionRef.current;
      if (!controller || !positionAttribute) return;
      positionAttribute.array.set(deformFoxVertices(rig, controller.getPose()));
      positionAttribute.needsUpdate = true;
    };

    const renderFrame = () => {
      if (!renderer || !scene || !camera) return;
      updateMesh();
      renderer.render(scene, camera);
    };

    const startLoop = () => {
      const controller = motionRef.current;
      if (frameId !== null || disposed || !renderer || !scene || !camera || !controller?.isAnimating()) return;
      let previousTime = performance.now();
      const tick = (time: number) => {
        frameId = null;
        if (disposed || !renderer || !scene || !camera) return;
        const delta = clamp((time - previousTime) / 1000, 0, 0.05);
        previousTime = time;
        const currentController = motionRef.current;
        if (!currentController || document.hidden) return;
        currentController.advance(delta);
        renderFrame();
        if (currentController.isAnimating()) frameId = window.requestAnimationFrame(tick);
      };
      frameId = window.requestAnimationFrame(tick);
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const rect = canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const viewportAspect = width / height;
      const textureAspect = 1 / FOX_TEXTURE_ASPECT;
      const viewWidth = viewportAspect >= textureAspect ? 2 * viewportAspect * FOX_TEXTURE_ASPECT : 2;
      const viewHeight = viewportAspect >= textureAspect ? 2 * FOX_TEXTURE_ASPECT : 2 / viewportAspect;
      renderer.setSize(width, height, false);
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      renderFrame();
    };

    const cleanupMaterial = () => {
      geometry?.dispose();
      material?.dispose();
      texture?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
    };

    renderFrameRef.current = renderFrame;
    startLoopRef.current = startLoop;
    stopLoopRef.current = stopLoop;

    const isForcedError = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('pet-2d5d-error') === '1';
    if (isForcedError) {
      reportError();
      return () => {
        disposed = true;
        stopLoop();
        if (renderFrameRef.current === renderFrame) renderFrameRef.current = null;
        if (startLoopRef.current === startLoop) startLoopRef.current = null;
        if (stopLoopRef.current === stopLoop) stopLoopRef.current = null;
      };
    }

    const rig = createFoxRig();

    const init = async () => {
      try {
        const THREE = await import('three');
        if (disposed) return;
        const hasWebGL = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
        if (!hasWebGL) {
          reportError();
          return;
        }

        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'low-power',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, FOX_TEXTURE_ASPECT, -FOX_TEXTURE_ASPECT, -1, 1);
        camera.position.z = 1;

        const loader = new THREE.TextureLoader();
        texture = await loader.loadAsync('/art/fox-pet-alpha.png');
        if (disposed) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        motionRef.current = createPetMotionController(rig, moodRef.current);
        motionRef.current.setReducedMotion(reducedMotionRef.current);
        motionRef.current.setVisible(!document.hidden);
        geometry = new THREE.BufferGeometry();
        const initialPositions = deformFoxVertices(rig, motionRef.current.getPose());
        positionAttribute = new THREE.BufferAttribute(initialPositions, 3);
        geometry.setAttribute('position', positionAttribute);
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(rig.vertices.flatMap((vertex) => [vertex.u, 1 - vertex.v]), 2));
        geometry.setIndex(rig.indices);
        geometry.computeBoundingSphere();

        material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.02,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
        resizeObserver?.observe(canvas.parentElement ?? canvas);
        resizeHandler = resize;
        window.addEventListener('resize', resizeHandler);
        visibilityHandler = () => {
          const controller = motionRef.current;
          controller?.setVisible(!document.hidden);
          if (document.hidden) stopLoop();
          else {
            renderFrame();
            if (controller?.isAnimating()) startLoop();
          }
        };
        document.addEventListener('visibilitychange', visibilityHandler);

        resize();
        renderFrame();
        notifyReady();
        if (motionRef.current.isAnimating() && !document.hidden) startLoop();
      } catch {
        reportError();
      }
    };

    void init();

    return () => {
      disposed = true;
      stopLoop();
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      resizeObserver?.disconnect();
      motionRef.current = null;
      cleanupMaterial();
      scene?.clear();
      renderer = null;
      scene = null;
      camera = null;
      geometry = null;
      material = null;
      texture = null;
      mesh = null;
      positionAttribute = null;
      if (renderFrameRef.current === renderFrame) renderFrameRef.current = null;
      if (startLoopRef.current === startLoop) startLoopRef.current = null;
      if (stopLoopRef.current === stopLoop) stopLoopRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} className="fox-pet-2d5d-canvas" aria-hidden="true" />;
}
