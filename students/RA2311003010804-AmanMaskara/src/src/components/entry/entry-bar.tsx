import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LanguageMenu } from "@/components/language-menu";
import { BackButton } from "@/components/layout/back-button";

/** Top bar of the entry screens: Back (where it applies), logo, language. */
export function EntryBar({ animatedLogo = false }: { animatedLogo?: boolean }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 pt-4 md:px-8 md:pt-6">
      <BackButton />
      <Link href="/" className="rounded-xl">
        <BrandMark className="text-2xl" animated={animatedLogo} />
      </Link>
      <LanguageMenu className="ml-auto" />
    </header>
  );
}
