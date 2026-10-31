import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enqueue, flushQueue, pendingCount, pendingOps, SYNC_BATCH_SIZE, type QueuedOp } from "@/lib/offline-queue";

// An in-memory stand-in for the IndexedDB object store behind `idb`.
const { store } = vi.hoisted(() => ({ store: new Map<string, unknown>() }));
vi.mock("idb", () => ({
  openDB: async () => ({
    put: async (_: string, op: { clientOpId: string }) => void store.set(op.clientOpId, op),
    getAll: async () => [...store.values()],
    count: async () => store.size,
    delete: async (_: string, id: string) => void store.delete(id),
  }),
}));

const checkin = (id: string, minute: number): QueuedOp => ({
  type: "checkin",
  clientOpId: id,
  createdAt: `2026-10-31T06:${String(minute).padStart(2, "0")}:00.000Z`,
  payload: { token: "qr" },
});

let online = true;
const events: string[] = [];
beforeEach(() => {
  store.clear();
  events.length = 0;
  online = true;
  vi.stubGlobal("window", { dispatchEvent: (e: Event) => events.push(e.type) });
  vi.stubGlobal("navigator", {
    get onLine() {
      return online;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

function server(respond: (ops: QueuedOp[]) => Response) {
  const fetch = vi.fn(async (_: string, init?: RequestInit) => respond(JSON.parse(init!.body as string).ops));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("offline check-in queue", () => {
  it("keeps queued check-ins oldest first and tells the app the queue changed", async () => {
    await enqueue(checkin("b", 5));
    await enqueue(checkin("a", 1));
    expect((await pendingOps()).map((op) => op.clientOpId)).toEqual(["a", "b"]);
    expect(await pendingCount()).toBe(2);
    expect(events).toEqual(["fairshift:queue", "fairshift:queue"]);
  });

  it("sends a batch when back online and removes only what the server settled", async () => {
    for (let i = 0; i < SYNC_BATCH_SIZE + 2; i++) await enqueue(checkin(`op${i}`, i));
    const fetch = server((ops) =>
      Response.json({ results: ops.slice(0, 3).map((op) => ({ clientOpId: op.clientOpId, ok: true })) }),
    );
    expect(await flushQueue()).toBe(3);
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string).ops).toHaveLength(SYNC_BATCH_SIZE);
    expect(await pendingCount()).toBe(SYNC_BATCH_SIZE - 1);
  });

  it("keeps everything when offline, on a server error, or if the request fails", async () => {
    await enqueue(checkin("a", 1));
    online = false;
    const fetch = server(() => Response.json({ results: [] }));
    expect(await flushQueue()).toBe(0);
    expect(fetch).not.toHaveBeenCalled();

    online = true;
    server(() => new Response("busy", { status: 503 }));
    expect(await flushQueue()).toBe(0);
    server(() => {
      throw new TypeError("network");
    });
    expect(await flushQueue()).toBe(0);
    expect(await pendingCount()).toBe(1);
  });

  it("does not call the server with an empty queue", async () => {
    const fetch = server(() => Response.json({ results: [] }));
    expect(await flushQueue()).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});
