import React, { useState, useEffect } from 'react';

export default function AnimatedCounter({ value, duration = 1500, suffix = '' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const endValue = parseInt(value, 10);

    if (isNaN(endValue)) {
      setCount(value);
      return;
    }

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      setCount(Math.floor(easeProgress * endValue));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}
