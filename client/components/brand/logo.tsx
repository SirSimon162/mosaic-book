import { cn } from "@/lib/utils";

export function MosaicMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      <rect x="2" y="2" width="8.5" height="8.5" rx="1.6" fill="currentColor" opacity="0.35" />
      <rect x="13.5" y="2" width="8.5" height="8.5" rx="1.6" fill="currentColor" opacity="0.7" />
      <rect x="2" y="13.5" width="8.5" height="8.5" rx="1.6" fill="currentColor" opacity="0.7" />
      <rect
        x="13.15"
        y="13.15"
        width="8.5"
        height="8.5"
        rx="1.6"
        fill="currentColor"
        transform="rotate(15 17.4 17.4)"
      />
    </svg>
  );
}

export function MosaicLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <MosaicMark className="size-5 text-sea" />
      <span className="font-heading text-[0.975rem] font-semibold tracking-tight">
        Mosaic
      </span>
    </span>
  );
}
