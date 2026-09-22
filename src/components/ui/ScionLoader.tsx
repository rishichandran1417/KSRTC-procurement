interface ScionLoaderProps {
  text?: string;
  subtext?: string;
  size?: "sm" | "md" | "lg";
  fullPage?: boolean;
}

export function ScionLoader({
  text = "SCION is analyzing data…",
  fullPage = false,
}: ScionLoaderProps) {
  const content = (
    <div className="flex items-center gap-3 py-2 text-xs font-semibold text-cyan-400">
      <div className="h-7 w-7 rounded-lg bg-[--color-surface-1] border border-cyan-500/30 flex items-center justify-center p-1 shrink-0 shadow-sm">
        <img
          src="/scion-logo.png"
          alt="SCION Loader"
          className="h-5 w-5 scion-loader-logo object-contain"
        />
      </div>
      <span className="animate-pulse tracking-wide">{text}</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        {content}
      </div>
    );
  }

  return content;
}
