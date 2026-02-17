import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
  const variants = {
    primary: "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90",
    secondary: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700",
    danger: "bg-danger text-white shadow-lg shadow-danger/20 hover:bg-danger/90",
    ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400",
    outline: "border border-slate-200 dark:border-dark-border bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800",
  };

  const sizes = {
    sm: "h-9 px-3 text-xs",
    md: "h-11 px-6 text-sm",
    lg: "h-14 px-8 text-base",
    icon: "h-10 w-10",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' /> : null}
      {children as React.ReactNode}
    </motion.button>
  );
});
Button.displayName = "Button";

export { Button };
