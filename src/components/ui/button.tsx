import * as React from "react";

const variants = {
  default: "bg-[#1E6FB9] text-white hover:bg-[#1a63a3]",
  secondary: "bg-surface-2 text-content hover:opacity-90",
  outline: "border border-line bg-transparent hover:bg-surface-2 text-content",
  ghost: "bg-transparent hover:bg-surface-2 text-muted hover:text-content",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  // hero variants are for the light landing/marketing pages (colored hero bg) — keep as-is.
  hero: "bg-surface text-content hover:bg-surface/95 shadow-lg",
  "hero-outline": "border-2 border-white bg-transparent text-white hover:bg-surface/10",
};
const sizes = { default: "h-11 px-5 py-2", sm: "h-9 px-3 text-xs", lg: "h-12 px-6 text-base" };

const buttonClass = (variant: keyof typeof variants, size: keyof typeof sizes, className: string) =>
  `inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", asChild, children, ...props }, ref) => {
    const computedClassName = buttonClass(variant, size, className);
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
        className: [computedClassName, (children as React.ReactElement<{ className?: string }>).props?.className].filter(Boolean).join(" "),
      });
    }
    return (
      <button
        ref={ref}
        className={computedClassName}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
export { Button };
