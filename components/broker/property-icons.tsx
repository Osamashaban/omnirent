// Stroke icons for the broker app's Properties screens, matching the design
// files (the same set as components/ops/icons.tsx).
type P = { size?: number; className?: string };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const Building = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
  </svg>
);

export const Copy = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect width="14" height="14" x="8" y="8" rx="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

export const Filter = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
  </svg>
);

export const Layers = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
  </svg>
);

export const Bed = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
  </svg>
);

export const Receipt = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11" />
  </svg>
);

export const ImageIcon = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
  </svg>
);

export const AlertTriangle = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const CornerArrow = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m15 10 5 5-5 5" />
    <path d="M4 4v7a4 4 0 0 0 4 4h12" />
  </svg>
);

export const ArrowBack = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m12 19-7-7 7-7M19 12H5" />
  </svg>
);

export const Clock = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const CalendarIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
  </svg>
);

export const Sliders = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3" />
  </svg>
);

export const Ban = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </svg>
);

// Points to the previous item in reading order (flips in Arabic).
export const ChevronStart = ({ size = 18, className = "" }: P) => (
  <svg {...base(size)} className={`rtl:-scale-x-100 ${className}`}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const ChevronEnd = ({ size = 18, className = "" }: P) => (
  <svg {...base(size)} className={`rtl:-scale-x-100 ${className}`}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);
