// Skeleton rows while a Settings list loads, as in the design's loading state.
export function SkeletonRows() {
  const widths = [160, 110, 90, 120, 60];
  return (
    <div className="flex min-h-screen bg-[#F9FAFB] p-4 min-[900px]:ps-[288px] min-[900px]:pe-10 min-[900px]:pt-[150px]">
      <div aria-busy="true" className="w-full max-w-[1240px] self-start rounded-xl border border-[#E5E7EB] bg-white py-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-8 border-b border-[#F3F4F6] px-4 py-[18px]">
            {widths.map((w, j) => (
              <span
                key={j}
                className={`block h-3 animate-pulse rounded-md bg-[#E5E7EB] ${j > 1 ? "max-[899px]:hidden" : ""}`}
                style={{ width: w }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
