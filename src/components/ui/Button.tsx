import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "warning" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white shadow-pop hover:bg-indigo-600",
  secondary: "border border-line bg-white text-ink hover:border-primary hover:text-primary",
  ghost: "text-muted hover:bg-slate-100 hover:text-ink",
  success: "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  warning: "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
  danger: "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100",
};

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
