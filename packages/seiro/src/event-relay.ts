import { notifyLogger } from "./logger";
import type { BackfillHandler, BackfillRow, EmitMeta } from "./server";
import type { EventsDef, EventData } from "./types";

export type EventRow = { id: string; type: string; payload: unknown };

export type EventRelayOptions<E extends EventsDef> = {
  listen: (
    channel: string,
    onNotify: (payload: string) => void,
  ) => Promise<unknown>;
  fetchByIds: (ids: string[]) => Promise<EventRow[]>;
  emit: <K extends keyof E>(
    event: K,
    data: EventData<E, K>,
    meta?: EmitMeta,
  ) => void;
  // Optional: enables `{sub, since}` resume. If provided alongside
  // setBackfill, the relay registers a backfill handler that streams rows
  // matching a pattern for a given client context.
  fetchSince?: (
    pattern: string,
    since: string,
    ctx: { userId: number | null },
  ) => AsyncIterable<BackfillRow>;
  setBackfill?: (handler: BackfillHandler) => void;
  channel?: string;
  batchMs?: number;
};

export async function createEventRelay<E extends EventsDef>(
  opts: EventRelayOptions<E>,
): Promise<void> {
  const channel = opts.channel ?? "events";
  const batchMs = opts.batchMs ?? 5;
  let pending: string[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function flush() {
    const ids = pending;
    pending = [];
    timer = null;
    if (ids.length === 0) return;
    try {
      const rows = await opts.fetchByIds(ids);
      for (const row of rows) {
        opts.emit(
          row.type as keyof E,
          row.payload as EventData<E, keyof E>,
          { id: row.id },
        );
      }
    } catch (e) {
      notifyLogger.error(
        `Event relay fetch failed for ids ${ids.join(",")}:`,
        e,
      );
    }
  }

  await opts.listen(channel, (payload) => {
    pending.push(payload);
    if (timer === null) {
      timer = setTimeout(flush, batchMs);
    }
  });
  notifyLogger.info(`Event relay listening on "${channel}"`);

  if (opts.fetchSince && opts.setBackfill) {
    const fetchSince = opts.fetchSince;
    opts.setBackfill((pattern, since, ctx) => fetchSince(pattern, since, ctx));
    notifyLogger.info("Event relay resume enabled");
  }
}
