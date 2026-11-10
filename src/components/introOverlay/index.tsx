'use client';

import { useEffect, useState } from 'react';

const IntroOverlay = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;
    const frameId = window.requestAnimationFrame(() => {
      try {
        if (sessionStorage.getItem('deepdeepbar_intro_seen')) return;
        sessionStorage.setItem('deepdeepbar_intro_seen', 'true');
      } catch {
        return;
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setIsVisible(true);
      timeoutId = window.setTimeout(() => setIsVisible(false), 2000);
    });
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="intro-overlay" aria-hidden="true">
      <p className="intro-overlay-message break-keep">
        혼자와도 함께하는, 밤이 깊어질수록 더 좋아지는 공간. 혼술바 딥딥
      </p>
    </div>
  );
};

export default IntroOverlay;
