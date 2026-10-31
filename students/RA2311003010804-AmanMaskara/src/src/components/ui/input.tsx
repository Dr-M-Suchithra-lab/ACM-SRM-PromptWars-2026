import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink transition-[border-color,box-shadow] placeholder:text-ink-2 hover:border-primary/40 focus:border-primary";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("min-h-12", field, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn("py-3", field, className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("block text-sm font-bold", className)} {...props} />;
}
