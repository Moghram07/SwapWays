import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`flex h-11 w-full text-content bg-surface border border-line rounded-lg px-3 py-2 text-sm placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-[#1E6FB9] focus:border-[#1E6FB9] disabled:opacity-50 ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";
export { Input };
