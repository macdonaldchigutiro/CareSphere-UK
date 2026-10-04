export function CareSphereMark({ className = "", title = "CareSphere" }) {
  return (
    <img
      src="/images/caresphere-approved-logo.png"
      alt={title}
      className={`h-full w-full object-contain object-left ${className}`}
    />
  );
}

export default function CareSphereLogo({ compact = false, context, className = "" }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      {compact ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white shadow-[0_8px_24px_rgba(8,127,104,0.18)] ring-1 ring-[#087F68]/15">
          <CareSphereMark className="h-11 w-[204px] max-w-none" />
        </span>
      ) : (
        <img
          src="/images/caresphere-approved-logo.png"
          alt={context || "CareSphere UK"}
          className="h-12 w-auto max-w-[240px] object-contain object-left"
        />
      )}
    </span>
  );
}