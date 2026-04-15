import type { HTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "aside";
};

export function Card({
  as: Component = "section",
  className,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-soft",
        className
      )}
      {...props}
    />
  );
}
