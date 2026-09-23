import type { BackfillHandler, BackfillRow, EmitMeta } from "./server";
import type { EventsDef, EventData } from "./types";
export type EventRow = {
    id: string;
    type: string;
    payload: unknown;
};
export type EventRelayOptions<E extends EventsDef> = {
    listen: (channel: string, onNotify: (payload: string) => void) => Promise<unknown>;
    fetchByIds: (ids: string[]) => Promise<EventRow[]>;
    emit: <K extends keyof E>(event: K, data: EventData<E, K>, meta?: EmitMeta) => void;
    fetchSince?: (pattern: string, since: string, ctx: {
        userId: number | null;
    }) => AsyncIterable<BackfillRow>;
    setBackfill?: (handler: BackfillHandler) => void;
    channel?: string;
    batchMs?: number;
};
export declare function createEventRelay<E extends EventsDef>(opts: EventRelayOptions<E>): Promise<void>;
//# sourceMappingURL=event-relay.d.ts.map