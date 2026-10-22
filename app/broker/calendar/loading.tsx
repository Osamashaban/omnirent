// Skeleton rows while the Calendar loads, as in the design's loading state:
// grid rows on desktop, the day list on phones.
export default function Loading() {
  return (
    <main aria-busy="true" className="flex w-full min-w-0 max-w-[1280px] flex-1 flex-col gap-3 px-4 py-4 min-[900px]:gap-4 min-[900px]:px-9 min-[900px]:py-6">
      <div className="flex flex-col gap-3 max-[899px]:hidden">
        <span className="block h-7 w-48 animate-pulse rounded-md bg-[#E5E7EB]" />
        <span className="block h-4 w-96 max-w-full animate-pulse rounded-md bg-[#F3F4F6]" />
        <span className="block h-10 w-full animate-pulse rounded-lg bg-[#F3F4F6]" />
      </div>
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white max-[899px]:hidden">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="flex items-center gap-2 border-b border-[#F3F4F6] px-3 py-3 last:border-b-0">
            <span className="block h-4 w-[180px] flex-none animate-pulse rounded-md bg-[#E5E7EB]" />
            {Array.from({ length: 11 }, (_, j) => (
              <span key={j} className="block h-7 flex-1 animate-pulse rounded-md bg-[#F3F4F6]" />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 min-[900px]:hidden">
        <span className="block h-11 w-full animate-pulse rounded-lg bg-[#E5E7EB]" />
        <span className="block h-10 w-full animate-pulse rounded-lg bg-[#F3F4F6]" />
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5">
            <span className="block h-10 w-10 flex-none animate-pulse rounded-lg bg-[#F3F4F6]" />
            <span className="block h-3 w-24 animate-pulse rounded-md bg-[#E5E7EB]" />
            <span className="flex-1" />
            <span className="block h-3 w-14 animate-pulse rounded-md bg-[#E5E7EB]" />
          </div>
        ))}
      </div>
    </main>
  );
}
