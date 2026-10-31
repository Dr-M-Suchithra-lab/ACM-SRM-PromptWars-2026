import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Status is never conveyed by colour alone: callers always pass an icon and a word.
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-bold",
  {
    variants: {
      tone: {
        neutral: "bg-surface-2 text-ink",
        brand: "bg-primary-soft text-primary-strong",
        signal: "bg-accent text-on-accent",
        danger: "bg-danger-soft text-danger",
        warning: "bg-warning-soft text-warning-ink",
        success: "bg-success-soft text-success",
        info: "bg-info-soft text-[#2558b5]",
        solidDanger: "bg-danger text-white",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
