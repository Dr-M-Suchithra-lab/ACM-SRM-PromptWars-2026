import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

/** Frame for pages anyone can open (passport, certificate, errors): logo, then the content. */
export function PublicShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main
      id="main"
      className={`worker mx-auto flex w-full flex-1 flex-col gap-5 px-4 py-8 ${wide ? "max-w-2xl" : "max-w-md"}`}
    >
      <Link href="/" className="w-fit rounded-xl">
        <BrandMark className="text-2xl" />
      </Link>
      {children}
    </main>
  );
}
