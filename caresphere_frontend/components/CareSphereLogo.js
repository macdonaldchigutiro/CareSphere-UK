export function CareSphereMark({ className = "", title = "CareSphere" }) {
  return (
    <svg viewBox="0 0 72 72" role="img" aria-label={title} className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="csDisc" x1="8" y1="5" x2="64" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#69E6C2" />
          <stop offset="0.52" stopColor="#16B68E" />
          <stop offset="1" stopColor="#087664" />
        </linearGradient>
      </defs>
      <circle cx="36" cy="36" r="33" fill="url(#csDisc)" />
      <path d="M36 32.8 24.9 22.2c-6.7-6.4-16.1 3.9-9.3 10.3L36 51.7l20.4-19.2c6.8-6.4-2.6-16.7-9.3-10.3L36 32.8Z" fill="white" />
      <path d="M5.3 40.2c5.8-3.9 11.9-4.1 17.4-.8l10.7 6.4c1.7 1 2.3 3.2 1.3 4.9-1 1.7-3.2 2.3-4.9 1.3l-8.2-4.8c4.7 5.6 10.3 9.4 16.8 11.3C25.5 64.6 11.1 57.2 5.3 40.2Z" fill="#07584E" />
      <path d="M66.7 40.2c-5.8-3.9-11.9-4.1-17.4-.8l-10.7 6.4c-1.7 1-2.3 3.2-1.3 4.9 1 1.7 3.2 2.3 4.9 1.3l8.2-4.8c-4.7 5.6-10.3 9.4-16.8 11.3 12.9 6.1 27.3-1.3 33.1-18.3Z" fill="#07584E" />
    </svg>
  );
}

export default function CareSphereLogo({ compact = false, context, className = "", light = false }) {
  const ink = light ? "text-white" : "text-[#092F2B]";
  const accent = light ? "text-[#6EE7C8]" : "text-[#087664]";
  const sub = light ? "text-white/70" : "text-slate-500";
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center">
        <CareSphereMark className="h-12 w-12" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className={`block whitespace-nowrap text-xl font-extrabold leading-none tracking-[-0.035em] ${ink}`}>
            CareSphere <span className={accent}>UK</span>
          </span>
          <span className={`mt-1.5 block whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.24em] ${sub}`}>
            {context && context !== "public" ? context : "Care with confidence"}
          </span>
        </span>
      )}
    </span>
  );
}