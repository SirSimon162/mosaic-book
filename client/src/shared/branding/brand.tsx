export function Brand({
  light = false,
  className = "h-7",
}: {
  light?: boolean;
  className?: string;
}) {
  if (light) {
    return (
      <img src="/mosaic-brand-light.svg" alt="Mosaic" className={`${className} w-auto`} />
    );
  }

  return (
    <span className="inline-flex items-center">
      <img
        src="/mosaic-brand.svg"
        alt="Mosaic"
        className={`${className} w-auto night:hidden`}
      />
      <img
        src="/mosaic-brand-light.svg"
        alt=""
        className={`hidden ${className} w-auto night:block`}
      />
    </span>
  );
}
