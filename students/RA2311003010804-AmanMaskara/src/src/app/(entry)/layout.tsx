import { WorkScene } from "@/components/entry/work-scene";

/**
 * Landing, language and login share this layout, so the animated worker scene is mounted once
 * and keeps playing while the visitor moves between the three screens.
 */
export default function EntryLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="worker relative isolate flex min-h-dvh flex-col overflow-x-clip">
      <WorkScene />
      {children}
    </div>
  );
}
