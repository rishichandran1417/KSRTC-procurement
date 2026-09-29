interface ScionLoaderProps {
  text?: string;
  subtext?: string;
  size?: "sm" | "md" | "lg";
  fullPage?: boolean;
}

export function ScionLoader({
  text = "Analyzing supply chain data…",
  fullPage = false,
}: ScionLoaderProps) {
  const content = (
    <div className="flex items-center gap-2.5 py-2 text-xs font-medium text-blue-600 dark:text-blue-400">
      <div className="h-6 w-6 rounded border border-blue-500/20 bg-blue-500/10 flex items-center justify-center p-0.5 shrink-0">
        <img
          src="/scion-logo.png"
          alt="Loader"
          className="h-4 w-4 object-contain"
        />
      </div>
      <span className="tracking-normal">{text}</span>
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
