import { ViewTransition } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSession, HOME_FOR_ROLE } from "@/server/dal";
import { getRepos } from "@/server/repos";
import type { SessionPayload } from "@/server/session";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { RevealText } from "@/components/reveal-text";
import { EntryBar } from "@/components/entry/entry-bar";
import { DemoLogins } from "@/components/entry/demo-logins";
import { LoginForms } from "./login-forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("login"))("loginButton") };
}

/** Who an old session belongs to, so the page can offer "continue" or "switch" instead of jumping there. */
async function signedInName(session: SessionPayload): Promise<string | undefined> {
  const repos = getRepos();
  const person =
    session.role === "worker" ? await repos.workers.getById(session.uid) : await repos.admins.getById(session.uid);
  return person?.name;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [session, t, params] = await Promise.all([getSession(), getTranslations("login"), searchParams]);
  const role = params.role === "admin" ? "admin" : "worker";
  // A leftover session (e.g. an earlier demo) must never decide where "I'm an employer" leads.
  const name = session ? await signedInName(session) : undefined;
  const current = session && name ? { name, home: HOME_FOR_ROLE[session.role] } : null;

  return (
    <>
      <EntryBar />
      <main
        id="main"
        className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 pt-8 pb-[28vh] md:grid-cols-[1fr_1.05fr] md:items-start md:gap-14 md:px-8 md:pt-14"
      >
        <section className="flex flex-col gap-6">
          <h1 className="font-display text-4xl leading-[1.02] font-extrabold md:text-6xl">
            <RevealText text={t("title")} />
          </h1>
          <div className="hidden md:block">
            <DemoLogins compact />
          </div>
        </section>

        {/* The chosen language card morphs into this one. */}
        <ViewTransition name="entry-card" share="card-morph" default="none">
          <div className="card w-full max-w-md justify-self-center p-5 md:p-7">
            {current ? (
              <div className="flex flex-col gap-4">
                <p className="font-display text-2xl font-extrabold">{t("signedInAs", { name: current.name })}</p>
                <Link href={current.home} className={cn(buttonVariants({ size: "lg" }), "min-h-14")}>
                  {t("continueAs", { name: current.name })}
                  <ArrowRight aria-hidden="true" className="size-5" />
                </Link>
                <LogoutButton nextRole={role} label={t("switchAccount")} className="w-full" />
              </div>
            ) : (
              <LoginForms initialTab={role} />
            )}
          </div>
        </ViewTransition>

        <div className="md:hidden">
          <DemoLogins compact />
        </div>
      </main>
    </>
  );
}
