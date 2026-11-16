import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

const QUERY = '(min-width: 1024px)';

// True only for a desktop-sized *browser* window. The Capacitor app always gets
// false, so the Android app keeps its existing layout on any screen size.
export function useDesktopWeb() {
  const native = Capacitor.isNativePlatform();
  const [matches, setMatches] = useState(
    () => !native && typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    if (native) return undefined;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [native]);

  return matches;
}
