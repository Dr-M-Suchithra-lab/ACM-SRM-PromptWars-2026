import "server-only";
import { cookies } from "next/headers";

const TRACK_COOKIE = "fs_tracked";
const MAX_TRACKED = 20;
const TRACKED_ENTRY = /^(haz-[0-9a-z-]{2,40})~(FS-[A-Z0-9]{6})$/;

interface TrackedReport {
  hazardId: string;
  ref: string;
}

/**
 * Anonymous reports are remembered only on the reporter's own device (httpOnly cookie):
 * the hazard id plus the private reference whose hash is stored on the hazard.
 */
export async function trackedReports(): Promise<TrackedReport[]> {
  const raw = (await cookies()).get(TRACK_COOKIE)?.value ?? "";
  return raw.split(",").flatMap((entry) => {
    const match = TRACKED_ENTRY.exec(entry);
    return match ? [{ hazardId: match[1], ref: match[2] }] : [];
  });
}

export async function rememberReport(tracked: TrackedReport): Promise<void> {
  const others = (await trackedReports()).filter((t) => t.hazardId !== tracked.hazardId);
  const entries = [tracked, ...others].slice(0, MAX_TRACKED).map((t) => `${t.hazardId}~${t.ref}`);
  (await cookies()).set(TRACK_COOKIE, entries.join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/w",
    maxAge: 60 * 60 * 24 * 90,
  });
}
