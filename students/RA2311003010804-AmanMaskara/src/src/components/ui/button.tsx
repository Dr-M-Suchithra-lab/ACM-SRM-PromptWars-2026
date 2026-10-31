import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-bold cursor-pointer select-none transition-[transform,background-color,box-shadow,color,border-color] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] active:duration-75 disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary shadow-[0_8px_20px_-12px_var(--primary)] hover:bg-primary-strong",
        accent: "bg-accent text-on-accent shadow-[0_8px_20px_-12px_rgb(163_95_0/0.6)] hover:brightness-105",
        secondary: "bg-primary-soft text-primary-strong hover:bg-primary-soft/70",
        outline: "border border-line bg-surface text-ink hover:border-primary/50",
        ghost: "text-ink hover:bg-surface-2 hover:translate-y-0",
        danger: "bg-danger text-white shadow-[0_8px_20px_-12px_var(--danger)]",
      },
      size: {
        sm: "min-h-10 px-4 text-sm rounded-full",
        md: "min-h-12 px-5 text-base rounded-full",
        lg: "min-h-14 px-6 text-lg rounded-[18px]",
        icon: "size-12 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
