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
        <rect x="3" y="3" width="42" height="42" rx="13" fill="#0B9188" />
        <path
          d="M24 37.2S11.2 29.6 11.2 20.1c0-5 3.2-8.3 7.6-8.3 2.5 0 4.3 1.2 5.2 2.8.9-1.6 2.7-2.8 5.2-2.8 4.4 0 7.6 3.3 7.6 8.3C36.8 29.6 24 37.2 24 37.2Z"
          fill="none"
          stroke="#F7FFFD"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m16.8 22.2 4.4 4.1a4 4 0 0 0 5.6 0l4.4-4.1"
          fill="none"
          stroke="#F7FFFD"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m20.2 21 3.8 3.6 3.8-3.6"
          fill="none"
          stroke="#66E2D6"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

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
