import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-blue-700 focus:ring-blue-100 disabled:bg-slate-200 disabled:text-slate-500",
  secondary:
    "border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-100 disabled:border-slate-200 disabled:text-slate-400"
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "px-4 py-3 text-sm",
  lg: "h-12 px-6 text-sm"
};

export function Button({
  className,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "rounded-xl font-semibold shadow-sm transition focus:outline-none focus:ring-4",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
