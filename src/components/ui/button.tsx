import * as React from "react";

const variants = {
  default: "bg-[#1E6FB9] text-white hover:bg-[#1a63a3]",
  secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300",
  outline: "border border-slate-300 bg-transparent hover:bg-slate-50 text-slate-700",
  ghost: "bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  hero: "bg-white text-slate-900 hover:bg-white/95 shadow-lg",
  "hero-outline": "border-2 border-white bg-transparent text-white hover:bg-white/10",
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
