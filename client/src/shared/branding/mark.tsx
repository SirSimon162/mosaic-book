export function Mark({ className = "size-5" }: { className?: string }) {
  return <img src="/mosaic-logo.svg" alt="" className={`rounded-[4px] ${className}`} />;
}
