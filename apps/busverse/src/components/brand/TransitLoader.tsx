'use client';

import React from 'react';

interface TransitLoaderProps {
  caption?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
}

/**
 * BusVerse Transit Looped Loader
 * Endless vector motion graphic: chassis suspension bounce, wheel spin, road dash scroll, and wind streaks.
 */
export function TransitLoader({
  caption = 'CONNECTING TRANSIT',
  className = '',
  size = 'md',
}: TransitLoaderProps) {
  const sizeMap = {
    sm: 'w-48 h-32',
    md: 'w-80 h-52',
    lg: 'w-96 h-64',
    fullscreen: 'w-96 h-64',
  };

  const loaderContent = (
    <div className={`loader-animating flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeMap[size]} relative flex items-center justify-center overflow-hidden`}>
        <svg
          viewBox="0 0 800 500"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#003BB5" />
              <stop offset="50%" stopColor="#0055ED" />
              <stop offset="100%" stopColor="#1E70FF" />
            </linearGradient>
            <linearGradient id="roofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0B1830" />
              <stop offset="100%" stopColor="#050C1A" />
            </linearGradient>
            <linearGradient id="glassGrad" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#1E3050" />
              <stop offset="50%" stopColor="#0E192D" />
              <stop offset="100%" stopColor="#08101E" />
            </linearGradient>
            <linearGradient id="glassSheen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0" />
              <stop offset="50%" stopColor="#00F0FF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="headlightBeam" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
              <stop offset="30%" stopColor="#00E5FF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="underglowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#0055ED" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0055ED" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="taillightGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF2A55" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FF2A55" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#182538" />
              <stop offset="50%" stopColor="#0B121E" />
              <stop offset="100%" stopColor="#24344D" />
            </linearGradient>
          </defs>

          {/* Aerodynamic Wind Streaks */}
          <g className="wind-streak-group" strokeWidth="2" strokeLinecap="round">
            <line className="wind-streak ws-d1" x1="560" y1="135" x2="680" y2="135" strokeDasharray="70 50" />
            <line className="wind-streak ws-d2" x1="500" y1="168" x2="660" y2="168" strokeDasharray="90 60" />
            <line className="wind-streak ws-d3" x1="540" y1="305" x2="700" y2="305" strokeDasharray="60 40" />
          </g>

          {/* Highway Asphalt & Dashlines */}
          <g>
            <rect className="loader-ground-bar" x="0" y="340" width="800" height="4" />
            <line className="loader-road-dash" x1="-100" y1="358" x2="900" y2="358" stroke="#0055ED" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
            <line className="loader-road-edge" x1="-100" y1="372" x2="900" y2="372" stroke="#00E5FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
          </g>

          {/* Neon Underglow and Optical Beams */}
          <ellipse className="loader-underglow-fx" cx="400" cy="336" rx="210" ry="14" fill="url(#underglowGrad)" />
          <ellipse cx="205" cy="275" rx="40" ry="18" fill="url(#taillightGlow)" opacity="0.7" />
          <polygon className="loader-headlight-poly" points="596,275 800,225 800,352 602,305" fill="url(#headlightBeam)" />

          {/* Bus Chassis Rig (Suspension Bounce) */}
          <g id="bus-chassis-rig">
            {/* Aerodynamic Roof Shield */}
            <path d="M 290,165 Q 310,154 360,154 L 465,154 Q 505,154 520,165 Z" fill="url(#roofGrad)" />
            <rect x="340" y="159" width="30" height="3" rx="1.5" fill="#1C2E4A" />
            <rect x="385" y="159" width="30" height="3" rx="1.5" fill="#1C2E4A" />
            <rect x="430" y="159" width="30" height="3" rx="1.5" fill="#1C2E4A" />

            {/* Main Coach Bodywork */}
            <path
              d="M 215,178 Q 210,178 208,186 L 204,295 Q 204,310 218,310 L 255,310 A 38,38 0 0 1 331,310 L 477,310 A 38,38 0 0 1 553,310 L 588,310 Q 605,310 605,296 L 603,260 Q 601,230 582,198 L 568,184 Q 556,178 538,178 Z"
              fill="url(#bodyGrad)"
            />
            <path d="M 204,290 L 204,298 Q 204,310 218,310 L 255,310 A 38,38 0 0 1 331,310 L 477,310 A 38,38 0 0 1 553,310 L 588,310 Q 605,310 605,296 L 604,290 Z" fill="#0B1830" />
            <path d="M 204,286 L 254,286 A 38,38 0 0 1 332,286 L 476,286 A 38,38 0 0 1 554,286 L 602,286" fill="none" stroke="#00F0FF" strokeWidth="2" opacity="0.85" />

            {/* Tinted Windshield & Windows */}
            <path d="M 220,188 L 535,188 Q 552,188 563,200 L 579,222 Q 586,232 588,246 L 589,252 L 220,252 Z" fill="url(#glassGrad)" stroke="#0B1830" strokeWidth="2" />
            <path d="M 280,252 L 325,188 L 350,188 L 305,252 Z" fill="url(#glassSheen)" />
            <path d="M 440,252 L 485,188 L 500,188 L 455,252 Z" fill="url(#glassSheen)" opacity="0.5" />

            <line x1="275" y1="188" x2="275" y2="252" stroke="#0B1830" strokeWidth="3" />
            <line x1="340" y1="188" x2="340" y2="252" stroke="#0B1830" strokeWidth="3" />
            <line x1="410" y1="188" x2="410" y2="252" stroke="#0B1830" strokeWidth="3" />
            <line x1="480" y1="188" x2="480" y2="252" stroke="#0B1830" strokeWidth="3" />

            {/* Headlight & Tail Indicator */}
            <ellipse cx="600" cy="276" rx="4" ry="5" fill="#00E5FF" />
            <rect x="202" y="262" width="3" height="20" rx="1.5" fill="#FFA3B2" />

            {/* Rear Dual Wheel Assembly */}
            <g>
              <path d="M 258,310 A 35,35 0 0 1 328,310 Z" fill="#050912" />
              <circle cx="293" cy="310" r="28" fill="#111824" stroke="#070C14" strokeWidth="2" />
              <g className="loader-wheel">
                <circle cx="293" cy="310" r="19" fill="url(#rimGrad)" />
                <circle cx="293" cy="310" r="13" fill="none" stroke="#00E5FF" strokeWidth="2" strokeDasharray="6 7" />
                <circle cx="293" cy="310" r="5" fill="#0055ED" />
              </g>
            </g>

            {/* Front Wheel Assembly */}
            <g>
              <path d="M 480,310 A 35,35 0 0 1 550,310 Z" fill="#050912" />
              <circle cx="515" cy="310" r="28" fill="#111824" stroke="#070C14" strokeWidth="2" />
              <g className="loader-wheel">
                <circle cx="515" cy="310" r="19" fill="url(#rimGrad)" />
                <circle cx="515" cy="310" r="13" fill="none" stroke="#00E5FF" strokeWidth="2" strokeDasharray="6 7" />
                <circle cx="515" cy="310" r="5" fill="#0055ED" />
              </g>
            </g>
          </g>

          {/* Telemetry Status Dots */}
          <g transform="translate(400, 435)">
            <text
              className="loader-status-text"
              textAnchor="middle"
              fontFamily="Plus Jakarta Sans, -apple-system, sans-serif"
              fontSize="14"
              fontWeight="700"
              letterSpacing="6"
            >
              {caption}
              <tspan className="loading-dot-1">.</tspan>
              <tspan className="loading-dot-2">.</tspan>
              <tspan className="loading-dot-3">.</tspan>
            </text>
          </g>
        </svg>
      </div>
    </div>
  );

  if (size === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-md">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}