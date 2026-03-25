import * as React from "react";

const variants: Record<string, string> = {
  default: "bg-sky-100 text-sky-800",
  secondary: "bg-slate-100 text-slate-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  destructive: "bg-red-100 text-red-800",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
export { Badge };
