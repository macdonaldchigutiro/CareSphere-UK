export function CareSphereMark({ className = "", title = "CareSphere" }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 31.5C7.8 18.2 17.7 6 32 6s24.2 12.2 19.5 25.5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 36.2 21.6 26.1a7.1 7.1 0 0 1 10-10.1l.4.4.4-.4a7.1 7.1 0 0 1 10 10.1L32 36.2Z" stroke="currentColor" strokeWidth="4.2" strokeLinejoin="round" />
      <path d="M8.5 34.5c4.3 1.1 7.2 3.5 10.1 6.5 2.7 2.8 6.8 4.9 13.4 5.1" stroke="currentColor" strokeWidth="5.2" strokeLinecap="round" />
      <path d="M55.5 34.5c-4.3 1.1-7.2 3.5-10.1 6.5-2.7 2.8-6.8 4.9-13.4 5.1" stroke="currentColor" strokeWidth="5.2" strokeLinecap="round" />
      <path d="M11.2 43.5c4.2 7.7 11.9 12.5 20.8 12.5s16.6-4.8 20.8-12.5" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" opacity=".82" />
    </svg>
  );
}

export default function CareSphereLogo({ compact = false, context, className = "", light = false }) {
  const ink = light ? "text-white" : "text-[#123B36]";
  const sub = light ? "text-white/70" : "text-slate-500";

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#087F68] via-[#0B9A7C] to-[#31CFA8] text-white shadow-[0_8px_24px_rgba(8,127,104,0.28)] ring-1 ring-white/20">
        <CareSphereMark className="h-7 w-7" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className={`block whitespace-nowrap text-lg font-extrabold leading-none tracking-[-0.02em] ${ink}`}>
            CareSphere{context === "public" ? " UK" : ""}
          </span>
          <span className={`mt-1 block whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.15em] ${sub}`}>
            {context && context !== "public" ? context : "Care with confidence"}
          </span>
        </span>
      )}
    </span>
  );
}