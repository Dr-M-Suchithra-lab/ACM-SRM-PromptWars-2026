import { getTranslations } from "next-intl/server";
import { LoadingAnnouncement, Skeleton } from "@/components/skeleton";

/** Shown instantly on every admin navigation while the server renders the real page. */
export default async function AdminLoading() {
  const t = await getTranslations("common");
  return (
    <div className="flex flex-col gap-6">
      <LoadingAnnouncement label={t("loading")} />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="h-28 w-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
