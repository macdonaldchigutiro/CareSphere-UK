export function CareSphereMark({ className = "", title = "CareSphere UK" }) {
  return (
    <img
      src="/images/caresphere-mark.png"
      alt={title}
      className={`block object-contain ${className}`}
    />
  );
}

export default function CareSphereLogo({ compact = false, context, className = "", light = false }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center">
        <CareSphereMark className="h-12 w-12" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className={`block whitespace-nowrap text-xl font-black leading-none tracking-[-0.045em] ${light ? "text-white" : "text-[#043C36]"}`}>
            CareSphere <span className={light ? "text-[#72F0C5]" : "text-[#07866F]"}>UK</span>
          </span>
          <span className={`mt-1.5 block whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.24em] ${light ? "text-emerald-100/75" : "text-[#607873]"}`}>
            {context && context !== "public" ? context : "Care with confidence"}
          </span>
        </span>
      )}
    </span>
  );
}