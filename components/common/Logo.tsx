import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="viralz-gradient" x1="0" y1="100" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9333EA" /> {/* Purple-600 */}
          <stop offset="50%" stopColor="#D946EF" /> {/* Fuchsia-500 */}
          <stop offset="100%" stopColor="#F43F5E" /> {/* Rose-500 */}
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main V Shape - Abstract and Dynamic */}
      <path
        d="M30 25 C 30 25, 45 75, 50 90 C 55 75, 85 15, 85 15"
        stroke="url(#viralz-gradient)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* The AI Spark/Star - Situated at the top right indicating magic/intelligence */}
      <path
        d="M85 15 L92 5 M85 15 L95 22 M85 15 L78 8"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        filter="url(#glow)"
        opacity="0.9"
      />
      
      {/* Central Dot - The Core/Nucleus */}
      <circle cx="50" cy="65" r="4" fill="white" />
    </svg>
  );
};

export default Logo;