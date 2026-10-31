import { getTranslations } from "next-intl/server";
import { WifiOff } from "lucide-react";

export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <main
      id="main"
      className="worker mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <span className="flex size-24 items-center justify-center rounded-[28px] bg-primary-soft text-primary-strong">
        <WifiOff aria-hidden="true" className="size-12" />
      </span>
      <h1 className="font-display text-3xl font-extrabold">{t("title")}</h1>
      <p>{t("message")}</p>
    </main>
  );
}
