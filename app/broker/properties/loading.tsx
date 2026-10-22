// Skeleton rows while a Properties page loads, as in the design's loading
// state. The sidebar stays in place around it.
export default function Loading() {
  const widths = [160, 140, 60, 30, 80, 70];
  return (
    <main aria-busy="true" className="flex w-full max-w-[1280px] flex-col gap-6 px-4 py-4 min-[900px]:px-9 min-[900px]:py-8">
      <div className="flex flex-col gap-3 max-[899px]:hidden">
        <span className="block h-7 w-48 animate-pulse rounded-md bg-[#E5E7EB]" />
        <span className="block h-4 w-96 max-w-full animate-pulse rounded-md bg-[#F3F4F6]" />
      </div>
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-8 border-b border-[#F3F4F6] px-4 py-3 last:border-b-0">
            <span className="block h-11 w-11 flex-none animate-pulse rounded-lg bg-[#F3F4F6]" />
            {widths.map((w, j) => (
              <span key={j} className={`block h-3 animate-pulse rounded-md bg-[#E5E7EB] ${j > 0 ? "max-[899px]:hidden" : ""}`} style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
