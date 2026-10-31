"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CloudUpload } from "lucide-react";
import { flushQueue, pendingCount } from "@/lib/offline-queue";

/** Flushes the offline queue on load and when the connection returns; shows how many items wait. */
export function OfflineSync() {
  const t = useTranslations("offline");
  const router = useRouter();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      pendingCount()
        .then((n) => active && setPending(n))
        .catch(() => {});
    const flush = async () => {
      if ((await flushQueue()) > 0) router.refresh();
      refresh();
    };
    flush();
    window.addEventListener("online", flush);
    window.addEventListener("fairshift:queue", refresh);
    return () => {
      active = false;
      window.removeEventListener("online", flush);
      window.removeEventListener("fairshift:queue", refresh);
    };
  }, [router]);

  if (pending === 0) return null;
  return (
    <p role="status" className="flex items-center justify-center gap-2 bg-accent px-4 py-2 text-sm font-bold text-ink">
      <CloudUpload aria-hidden="true" className="size-5" />
      {t("pending", { count: pending })}
    </p>
  );
}
