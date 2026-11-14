import { useState } from 'react';

const FLAKES = 50;

function createFlakes() {
  return Array.from({ length: FLAKES }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 4 + Math.random() * 8,
    duration: 8 + Math.random() * 12,
    delay: -Math.random() * 20,
    drift: (Math.random() - 0.5) * 80,
  }));
}

export function Snowfall() {
  const [flakes] = useState(createFlakes);

  return (
    <div className="snowfall" aria-hidden="true">
      {flakes.map((f) => (
        <span
          key={f.id}
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            ['--drift' as string]: `${f.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
