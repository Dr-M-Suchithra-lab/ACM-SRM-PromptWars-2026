import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Status is never conveyed by colour alone: callers always pass an icon and a word. A badge stays
// on one line when it fits and wraps inside its pill when it doesn't (long words in other languages).
const badgeVariants = cva(
  "inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-sm leading-snug font-bold [&>svg]:shrink-0",
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
