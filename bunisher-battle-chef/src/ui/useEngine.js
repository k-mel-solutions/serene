import { useEffect, useRef, useState } from 'react';
import { createEngine } from '../game/engine.js';

/**
 * Mounts a Pixi engine into `mountRef` and runs the scene returned by
 * `makeScene(canvas)`. Tears everything down on unmount.
 * Returns { sceneRef, ready }.
 */
export function useEngine(mountRef, makeScene) {
  const sceneRef = useRef(null);
  const makeRef = useRef(makeScene);
  makeRef.current = makeScene;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let engine;
    let cancelled = false;

    createEngine(mountRef.current).then((eng) => {
      if (cancelled) {
        eng.destroy();
        return;
      }
      engine = eng;
      const scene = makeRef.current(eng.app.canvas);
      sceneRef.current = scene;
      eng.setScene(scene);
      setReady(true);
    });

    return () => {
      cancelled = true;
      sceneRef.current = null;
      engine?.destroy();
    };
  }, [mountRef]);

  return { sceneRef, ready };
}
