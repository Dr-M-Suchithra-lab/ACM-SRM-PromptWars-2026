import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EntryBar } from "@/components/entry/entry-bar";
import { LanguagePicker } from "@/components/entry/language-picker";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("landing"))("chooseLanguage") };
}

/** Step 2 of entry: pick a language in its own script, then log in. */
export default async function StartPage() {
  const t = await getTranslations("landing");
  return (
    <>
      <EntryBar />
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-8 pb-[30vh] md:pt-14">
        <div>
          <h1 className="font-display text-4xl font-extrabold md:text-5xl">{t("chooseLanguage")}</h1>
          <p className="mt-2 text-ink-2">{t("languageHint")}</p>
        </div>
        <LanguagePicker />
      </main>
    </>
  );
}
