"use client";

import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { logout } from "@/server/actions/auth";
import { resetWelcome } from "@/components/welcome/welcome";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Logs out (the server replaces history with /login) and lets the next login play its welcome again. */
export function LogoutButton({
  className,
  variant = "outline",
  size = "lg",
  iconOnly = false,
  label,
  nextRole,
}: Pick<ButtonProps, "className" | "variant" | "size"> & {
  iconOnly?: boolean;
  label?: string;
  nextRole?: "worker" | "admin";
}) {
  const t = useTranslations("common");
  return (
    <form action={logout} onSubmit={resetWelcome}>
      {nextRole && <input type="hidden" name="role" value={nextRole} />}
      <SubmitButton
        variant={variant}
        size={size}
        className={cn("whitespace-nowrap", className)}
        aria-label={iconOnly ? t("logout") : undefined}
      >
        <LogOut aria-hidden="true" className="size-5" />
        {!iconOnly && (label ?? t("logout"))}
      </SubmitButton>
    </form>
  );
}
