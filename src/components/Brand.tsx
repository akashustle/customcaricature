/**
 * Brand — site-wide consistent rendering of "Creative Caricature Club™"
 * with a fade violet gradient on the "Caricature Club" portion.
 * Use everywhere the brand name is displayed in UI.
 */
type Variant = "full" | "club-only" | "stack";

export const Brand = ({
  variant = "full",
  className = "",
  showTM = true,
}: {
  variant?: Variant;
  className?: string;
  showTM?: boolean;
}) => {
  const tm = showTM ? <span className="align-super text-[0.55em] font-semibold opacity-70 ml-0.5">™</span> : null;

  if (variant === "club-only") {
    return (
      <span className={className}>
        <span className="text-gradient-violet">Caricature Club</span>
        {tm}
      </span>
    );
  }

  if (variant === "stack") {
    return (
      <span className={`leading-tight ${className}`}>
        <span>Creative</span>
        <br />
        <span className="text-gradient-violet">Caricature Club</span>
        {tm}
      </span>
    );
  }

  return (
    <span className={className}>
      <span className="text-gradient-violet">Creative Caricature Club</span>
      {tm}
    </span>
  );
};

export default Brand;
