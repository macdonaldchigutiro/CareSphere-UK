import { HeartHandshake } from "lucide-react";

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
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#087C76] to-[#16A89D] text-white shadow-[0_8px_22px_rgba(8,124,118,0.24)]">
        <HeartHandshake className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
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
