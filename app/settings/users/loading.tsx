// Skeleton rows while the users list loads.
export default function Loading() {
  const bar = (w: number) => <span className="block h-3 animate-pulse rounded-md bg-[#E5E7EB]" style={{ width: w }} />;
  return (
    <div className="flex min-h-screen bg-[#F9FAFB] p-4 min-[900px]:ps-[288px] min-[900px]:pe-10 min-[900px]:pt-[180px]">
      <div className="w-full max-w-[1240px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-[#F3F4F6] px-4 py-4">
            <span className="h-9 w-9 flex-none animate-pulse rounded-full bg-[#E5E7EB]" />
            {bar(120)}
            <span className="hidden min-[900px]:block">{bar(200)}</span>
            <span className="hidden min-[900px]:block">{bar(90)}</span>
            <span className="hidden min-[900px]:block">{bar(60)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
