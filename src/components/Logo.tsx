/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Custom SVG logo depicting a 'V' formed by two feathers joining at the bottom.
 */
export function Logo({ className = '', size = 48 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none ${className}`}
    >
      <defs>
        {/* Soft, modern gradients for the feathers */}
        <linearGradient id="featherLeftGrad" x1="20" y1="20" x2="50" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" /> {/* Teal-400 */}
          <stop offset="100%" stopColor="#0EA5E9" /> {/* Sky-500 */}
        </linearGradient>
        <linearGradient id="featherRightGrad" x1="80" y1="20" x2="50" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" /> {/* Blue-500 */}
          <stop offset="100%" stopColor="#0EA5E9" /> {/* Sky-500 */}
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
          <feOffset dx="0" dy="2.5" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.18" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main Container with shadow filter */}
      <g filter="url(#softShadow)">
        {/* Left Feather */}
        <g id="left-feather">
          {/* Central quill (Rachis) */}
          <path
            d="M 28,15 C 32,32 40,65 50,85"
            stroke="url(#featherLeftGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Main Feather body & barbs */}
          <path
            d="M 28,15 
               C 18,30 23,45 32,53 
               C 23,55 24,64 35,68
               C 27,70 30,77 40,79
               C 35,80 39,84 50,85
               C 47,75 42,60 38,45
               C 42,32 35,22 28,15 Z"
            fill="url(#featherLeftGrad)"
            fillOpacity="0.85"
            stroke="url(#featherLeftGrad)"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </g>

        {/* Right Feather (mirrors the left and overlaps slightly at the base) */}
        <g id="right-feather">
          {/* Central quill (Rachis) */}
          <path
            d="M 72,15 C 68,32 60,65 50,85"
            stroke="url(#featherRightGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Main Feather body & barbs */}
          <path
            d="M 72,15 
               C 82,30 77,45 68,53 
               C 77,55 76,64 65,68
               C 73,70 70,77 60,79
               C 65,80 61,84 50,85
               C 53,75 58,60 62,45
               C 58,32 65,22 72,15 Z"
            fill="url(#featherRightGrad)"
            fillOpacity="0.85"
            stroke="url(#featherRightGrad)"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </g>

        {/* Shimmer / Accent joining point at the bottom V */}
        <circle cx="50" cy="85" r="2.5" fill="#38BDF8" className="animate-pulse" />
      </g>
    </svg>
  );
}
