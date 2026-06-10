import React from 'react';

export default function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--r-md)',
  style = {},
  className = '',
}) {
  const defaultStyle = {
    width,
    height,
    borderRadius,
    background:
      'linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    ...style,
  };

  return <div style={defaultStyle} className={className} />;
}
