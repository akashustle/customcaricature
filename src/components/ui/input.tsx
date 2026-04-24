import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input — universal text field used across the entire site.
 *
 * Visual: pill / rounded-xl, soft white surface, subtle inner shadow on
 * focus, light slate border. Matches the clean 3D auth design system
 * shown in the reference mockups.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Layout
          "flex h-11 w-full px-4 py-2 text-base md:text-sm",
          // Surface
          "rounded-xl border border-slate-200 bg-white text-slate-900",
          "placeholder:text-slate-400",
          // Soft shadow for the 3D feel
          "shadow-[inset_0_1px_2px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.04)]",
          // Focus ring — matches brand violet
          "focus-visible:outline-none focus-visible:border-primary",
          "focus-visible:shadow-[0_0_0_4px_hsl(var(--primary)/0.12),inset_0_1px_2px_rgba(15,23,42,0.04)]",
          "transition-[box-shadow,border-color] duration-200",
          // File / disabled
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
