import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full px-4 py-3 text-sm",
        "rounded-xl border border-slate-200 bg-white text-slate-900",
        "placeholder:text-slate-400",
        "shadow-[inset_0_1px_2px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.04)]",
        "focus-visible:outline-none focus-visible:border-primary",
        "focus-visible:shadow-[0_0_0_4px_hsl(var(--primary)/0.12),inset_0_1px_2px_rgba(15,23,42,0.04)]",
        "transition-[box-shadow,border-color] duration-200",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
