// Pulsing blocks while Channels loads, as in the design's loading state:
// eight platform cards on desktop, platform rows on phones.
export default function Loading() {
  return (
    <main aria-busy="true" className="flex w-full min-w-0 max-w-[1280px] flex-1 flex-col gap-3 px-4 py-4 min-[900px]:gap-[18px] min-[900px]:px-9 min-[900px]:py-6">
      <div className="flex flex-col gap-3 max-[899px]:hidden">
        <span className="block h-8 w-40 animate-pulse rounded-md bg-[#E5E7EB]" />
        <span className="block h-4 w-[520px] max-w-full animate-pulse rounded-md bg-[#F3F4F6]" />
        <span className="block h-[46px] w-full animate-pulse rounded-lg bg-[#F3F4F6]" />
      </div>
      <div className="grid grid-cols-4 gap-3 max-[899px]:hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-[180px] animate-pulse rounded-xl bg-[#F3F4F6]" />
        ))}
      </div>
      <div className="flex flex-col gap-2 min-[900px]:hidden">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-[62px] animate-pulse rounded-xl bg-[#F3F4F6]" />
          ))}
        </div>
        <span className="block h-11 w-full animate-pulse rounded-lg bg-[#E5E7EB]" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-[#F3F4F6]" />
        ))}
      </div>
    </main>
  );
}
