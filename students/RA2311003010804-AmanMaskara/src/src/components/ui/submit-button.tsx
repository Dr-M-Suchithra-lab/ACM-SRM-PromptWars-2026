"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants, type ButtonProps } from "./button";

type SubmitButtonProps = Omit<ButtonProps, "type"> & {
  /** Keep the caller's own classes instead of the Button styles (for custom tiles/cards). */
  unstyled?: boolean;
};

/**
 * Submit button for Server Action forms: the moment it is pressed it disables itself
 * and shows a spinner, so a slow network never looks like a dead button (and can't double-submit).
 * In a form with several submit buttons, only the pressed one shows the spinner.
 */
export function SubmitButton({
  children,
  className,
  name,
  value,
  variant,
  size,
  unstyled,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending, data } = useFormStatus();
  const isThisOne = pending && (!name || data?.get(String(name)) === String(value));
  const classes = unstyled ? className : cn(buttonVariants({ variant, size }), className);
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      aria-busy={isThisOne || undefined}
      data-pending={isThisOne || undefined}
      className={cn("relative disabled:cursor-wait", classes, isThisOne && "opacity-90")}
      {...(props as ComponentProps<"button">)}
    >
      {children}
      {isThisOne && (
        <Loader2 aria-hidden="true" className="absolute top-1/2 right-3 size-5 -translate-y-1/2 animate-spin" />
      )}
    </button>
  );
}
