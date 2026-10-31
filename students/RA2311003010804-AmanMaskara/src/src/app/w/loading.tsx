import { getTranslations } from "next-intl/server";
import { LoadingAnnouncement, Skeleton } from "@/components/skeleton";

/** Shown instantly on every worker-page navigation while the server renders the real page. */
export default async function WorkerLoading() {
  const t = await getTranslations("common");
  return (
    <div className="flex flex-col gap-6">
      <LoadingAnnouncement label={t("loading")} />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-56" />
      </div>
      <Skeleton className="h-48 w-full rounded-card" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-card" />
        <Skeleton className="h-20 w-full rounded-card" />
        <Skeleton className="h-20 w-full rounded-card" />
      </div>
    </div>
  );
}
