"use client";

// Retry card when a Settings page fails to load. Shown in both languages
// because the language cookie can't be read from here.
export default function SettingsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] p-4 [font-family:var(--font-outfit),var(--font-plex-arabic),sans-serif]">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-6 py-10 text-center">
        <p dir="rtl" className="m-0 text-[17px] font-semibold">تعذّر تحميل المستخدمين</p>
        <p className="m-0 text-[17px] font-semibold">Couldn&apos;t load users</p>
        <p dir="rtl" className="m-0 text-[14px] text-[#4B5563]">تحقق من اتصالك ثم حاول مرة أخرى.</p>
        <p className="m-0 text-[14px] text-[#4B5563]">Check your connection and try again.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 inline-flex h-11 cursor-pointer items-center rounded-lg bg-[#639922] px-[18px] text-[15px] font-semibold text-white"
        >
          إعادة المحاولة · Try again
        </button>
      </div>
    </div>
  );
}
