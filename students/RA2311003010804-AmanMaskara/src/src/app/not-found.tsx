import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Compass, House } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PublicShell } from "@/components/public-shell";

/** Styled, translated 404 for any unknown address. */
export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <PublicShell>
      <section className="card flex flex-col items-center gap-4 px-5 py-10 text-center">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-primary-soft text-primary-strong">
          <Compass aria-hidden="true" className="size-8" />
        </span>
        <p className="figure font-display text-6xl font-extrabold text-primary">404</p>
        <h1 className="font-display text-2xl font-extrabold">{t("title")}</h1>
        <p className="text-ink-2">{t("hint")}</p>
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          <House aria-hidden="true" className="size-5" />
          {t("home")}
        </Link>
      </section>
    </PublicShell>
  );
}
