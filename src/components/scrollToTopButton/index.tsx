'use client';

import { useEffect, useState } from 'react';

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsVisible(window.scrollY > 360);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="맨 위로 이동"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        })
      }
      className="fixed right-[max(1rem,env(safe-area-inset-right,0px))] bottom-[calc(7rem+env(safe-area-inset-bottom,0px))] z-20 h-10 w-10 rounded-full border border-[#d7cec2] bg-[#f8f3ec]/95 text-lg font-semibold text-[#4a3322] shadow-[0_8px_18px_rgba(120,84,52,0.14)] backdrop-blur transition hover:bg-[#f3e8db] sm:right-6 sm:bottom-[calc(7rem+env(safe-area-inset-bottom,0px))]"
    >
      ↑
    </button>
  );
};

export default ScrollToTopButton;
