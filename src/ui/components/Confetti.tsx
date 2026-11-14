import { useState } from 'react';

const PIECES = 40;
const COLORS = ['#e23b3b', '#2fa36b', '#ffd23f', '#5b8def', '#f28dc0'];

function createPieces() {
  return Array.from({ length: PIECES }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.2 + Math.random() * 1.2,
    rotate: Math.random() * 360,
    color: COLORS[i % COLORS.length],
  }));
}

export function Confetti() {
  const [pieces] = useState(createPieces);

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
