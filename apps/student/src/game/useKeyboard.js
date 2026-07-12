import { useEffect, useRef } from 'react';

// Tracks which movement keys are held. Returns a ref to a Set of key codes so
// the render loop can read it without causing re-renders.
export function useKeyboard() {
  const keys = useRef(new Set());
  useEffect(() => {
    const down = (e) => keys.current.add(e.code);
    const up = (e) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
  return keys;
}

export default useKeyboard;
