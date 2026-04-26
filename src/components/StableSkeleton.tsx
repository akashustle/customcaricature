import { ReactNode } from "react";

/**
 * StableSkeleton — keeps the card *layout* mounted and only swaps the
 * inner content between a shimmer placeholder and the real children.
 *
 * The wrapper element never unmounts during data refetches, so:
 *   • the surrounding card no longer collapses & re-expands on tab switch
 *   • scroll position is preserved
 *   • shimmer only appears on the very first load (when there is no cached data)
 */
export const StableSkeleton = ({
  ready,
  skeleton,
  children,
  className = "",
  minHeight,
}: {
  ready: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
  /** Optional reserved height so the layout never jumps. */
  minHeight?: number | string;
}) => (
  <div
    className={className}
    style={minHeight ? { minHeight } : undefined}
    aria-busy={!ready}
  >
    {ready ? children : skeleton}
  </div>
);

export default StableSkeleton;
