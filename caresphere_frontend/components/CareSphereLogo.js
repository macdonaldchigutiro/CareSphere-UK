export default function CareSphereLogo({
  compact = false,
  context,
  className = "",
  light = false,
}) {
  const ink = light ? "text-white" : "text-[#0A2035]";
  const sub = light ? "text-white/70" : "text-slate-500";

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 48 48"
        role="img"
        aria-label="CareSphere"
        className="h-10 w-10 shrink-0"
      >
        <defs>
          <linearGradient id="cs-logo-a" x1="7" y1="5" x2="35" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2BD4C5" />
            <stop offset="1" stopColor="#0B9188" />
          </linearGradient>
          <linearGradient id="cs-logo-b" x1="42" y1="8" x2="12" y2="41" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2E87E8" />
            <stop offset="1" stopColor="#1558B5" />
          </linearGradient>
        </defs>
        <path
          d="M23.8 4.5c-7.6 0-13.9 4.7-16.5 11.3-1.2 3 .3 6.3 3.2 7.5 2.9 1.1 6.2-.3 7.4-3.2 1-2.5 3.2-4.2 5.9-4.2 2 0 3.9.9 5.1 2.5l8.2-7.3C33.8 7 29.1 4.5 23.8 4.5Z"
          fill="url(#cs-logo-a)"
        />
        <path
          d="M39.2 9.8a5.7 5.7 0 0 0-8 .7l-5.3 6.1a6.4 6.4 0 0 1 1.8 7.6l9.5 5.5c4.5-7.8 3.5-15.2 2-19.9Z"
          fill="url(#cs-logo-b)"
        />
        <path
          d="M37.6 29.1a5.7 5.7 0 0 0-7.8-2.1c-1.8 1.1-3.7 2.6-6 3.7-3.1 1.5-6.8-.1-7.9-3.4L5.5 30.8C8.2 39 15.3 43.5 23.7 43.5c6.3 0 11.5-3.2 15.8-6.7a5.7 5.7 0 0 0-1.9-7.7Z"
          fill="url(#cs-logo-a)"
        />
        <circle cx="23.8" cy="23.9" r="5.2" fill="#F7FFFD" />
      </svg>

      {!compact && (
        <span className="min-w-0">
          <span className={`block whitespace-nowrap text-lg font-black leading-none tracking-[-0.025em] ${ink}`}>
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
