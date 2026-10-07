export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#639922" />
      <rect x="8" y="8" width="7" height="7" rx="1.5" fill="#fff" fillOpacity=".95" />
      <rect x="17" y="8" width="7" height="7" rx="1.5" fill="#fff" fillOpacity=".6" />
      <rect x="8" y="17" width="7" height="7" rx="1.5" fill="#fff" fillOpacity=".6" />
      <rect x="17" y="17" width="7" height="7" rx="1.5" fill="#fff" fillOpacity=".3" />
    </svg>
  );
}

export function Wordmark({ className = "text-[20px]" }: { className?: string }) {
  return (
    <span dir="ltr" className={`font-[family-name:var(--font-outfit)] font-bold tracking-[-0.02em] ${className}`}>
      <span className="text-[#27500A]">Omni</span>
      <span className="text-[#639922]">rent</span>
    </span>
  );
}
