import { useEffect, useRef } from 'react';
import type { PetMood } from '../motion/pet';

type FoxPet3DProps = {
  mood: PetMood;
  reducedMotion: boolean;
  onReady: () => void;
  onError: () => void;
};

type MoodPlayer = (mood: PetMood, reducedMotion: boolean) => void;

export function FoxPet3D({ mood, reducedMotion, onReady, onError }: FoxPet3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const moodRef = useRef(mood);
  const reducedMotionRef = useRef(reducedMotion);
  const playMoodRef = useRef<MoodPlayer | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    moodRef.current = mood;
    reducedMotionRef.current = reducedMotion;
    playMoodRef.current?.(mood, reducedMotion);
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
    let frameId: number | null = null;
    let renderer: import('three').WebGLRenderer | null = null;
    let scene: import('three').Scene | null = null;
    let camera: import('three').PerspectiveCamera | null = null;
    let mixer: import('three').AnimationMixer | null = null;
    let root: import('three').Object3D | null = null;
    let activeAction: import('three').AnimationAction | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeHandler: (() => void) | null = null;
    let threeMeshConstructor: typeof import('three').Mesh | null = null;
    let visibilityHandler: (() => void) | null = null;
    let renderFrame: (() => void) | null = null;
    let syncMotion: (() => void) | null = null;

    const reportError = () => {
      if (disposed || failed) return;
      failed = true;
      onErrorRef.current();
    };

    const stopLoop = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    const startLoop = () => {
      if (frameId !== null || disposed || !renderer || !scene || !camera) return;
      let previousTime = performance.now();
      const tick = (time: number) => {
        if (disposed) return;
        const delta = Math.min(Math.max((time - previousTime) / 1000, 0), 0.1);
        previousTime = time;
        if (!reducedMotionRef.current && !document.hidden) mixer?.update(delta);
        renderFrame?.();
        frameId = window.requestAnimationFrame(tick);
      };
      frameId = window.requestAnimationFrame(tick);
    };

    const disposeObject = (object: import('three').Object3D) => {
      object.traverse((child) => {
        if (!threeMeshConstructor || !(child instanceof threeMeshConstructor)) return;
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      });
    };

    const init = async () => {
      try {
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        if (disposed) return;
        threeMeshConstructor = THREE.Mesh;

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
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(29, 1, 0.1, 30);
        camera.position.set(0, 1.7, 7.2);
        camera.lookAt(0, 1.6, 0);
        scene.add(new THREE.HemisphereLight(0xfff8dc, 0x176a78, 2.2));
        const keyLight = new THREE.DirectionalLight(0xfff2c7, 2.8);
        keyLight.position.set(-3.5, 5, 5);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0x73e1dd, 1.8);
        rimLight.position.set(4, 3, -3);
        scene.add(rimLight);

        renderFrame = () => {
          if (renderer && scene && camera) renderer.render(scene, camera);
        };

        const resize = () => {
          if (!renderer || !camera) return;
          const rect = canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
          const width = Math.max(1, Math.floor(rect.width));
          const height = Math.max(1, Math.floor(rect.height));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderFrame?.();
        };

        resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
        resizeObserver?.observe(canvas.parentElement ?? canvas);
        resizeHandler = resize;
        window.addEventListener('resize', resizeHandler);

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync('/art/fox-pet.glb');
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }

        root = gltf.scene;
        root.position.y = 0.2;
        root.scale.setScalar(0.86);
        scene.add(root);
        mixer = new THREE.AnimationMixer(root);
        const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));

        const playMood: MoodPlayer = (nextMood, shouldReduceMotion) => {
          if (!mixer) return;
          if (shouldReduceMotion || document.hidden) {
            mixer.stopAllAction();
            activeAction = null;
            stopLoop();
            renderFrame?.();
            return;
          }
          const clip = clips.get(nextMood) ?? clips.get('idle');
          if (!clip) return;
          const nextAction = mixer.clipAction(clip);
          nextAction.reset();
          if (nextMood === 'greet' || nextMood === 'celebrate') {
            nextAction.setLoop(THREE.LoopOnce, 1);
            nextAction.clampWhenFinished = true;
          } else {
            nextAction.setLoop(THREE.LoopRepeat, Infinity);
            nextAction.clampWhenFinished = false;
          }
          if (activeAction && activeAction !== nextAction) activeAction.fadeOut(0.14);
          activeAction = nextAction.fadeIn(0.14).play();
          startLoop();
        };

        playMoodRef.current = playMood;
        syncMotion = () => playMood(moodRef.current, reducedMotionRef.current);
        visibilityHandler = () => syncMotion?.();
        document.addEventListener('visibilitychange', visibilityHandler);
        resize();
        playMood(moodRef.current, reducedMotionRef.current);
        renderFrame();
        onReadyRef.current();
      } catch {
        reportError();
      }
    };

    void init();

    return () => {
      disposed = true;
      stopLoop();
      playMoodRef.current = null;
      syncMotion = null;
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      resizeObserver?.disconnect();
      mixer?.stopAllAction();
      if (root) disposeObject(root);
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer = null;
      scene = null;
      camera = null;
      mixer = null;
      root = null;
    };
  }, []);

  return <canvas ref={canvasRef} className="fox-pet-3d-canvas" aria-hidden="true" />;
}
