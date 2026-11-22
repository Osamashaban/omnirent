// Pulsing rows while Guests loads, as in the design's loading state.
export default function Loading() {
  return (
    <main aria-busy="true" className="flex w-full min-w-0 max-w-[1280px] flex-1 flex-col gap-2.5 px-4 py-4 min-[900px]:gap-[18px] min-[900px]:px-9 min-[900px]:py-6">
      <div className="flex flex-col gap-3 max-[899px]:hidden">
        <span className="block h-8 w-40 animate-pulse rounded-md bg-[#E5E7EB]" />
        <span className="block h-4 w-[520px] max-w-full animate-pulse rounded-md bg-[#F3F4F6]" />
        <span className="block h-[46px] w-full animate-pulse rounded-lg bg-[#F3F4F6]" />
      </div>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-[10px] bg-[#F3F4F6] max-[899px]:h-[120px] max-[899px]:rounded-xl" />
        ))}
      </div>
    </main>
  );
}
