import { useEffect, useRef } from 'react';

export function useAnimationFrame(callback: (delta: number) => void, active: boolean): void {
  const requestRef = useRef<number>();
  const previousRef = useRef<number>();

  useEffect(() => {
    if (!active) {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
      previousRef.current = undefined;
      return;
    }

    const loop = (time: number) => {
      if (previousRef.current !== undefined) {
        const delta = time - previousRef.current;
        callback(delta);
      }
      previousRef.current = time;
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
      previousRef.current = undefined;
    };
  }, [callback, active]);
}
