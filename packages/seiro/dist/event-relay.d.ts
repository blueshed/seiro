import type { EventsDef, EventData } from "./types";
export type EventRow = {
    type: string;
    payload: unknown;
};
export type EventRelayOptions<E extends EventsDef> = {
    listen: (channel: string, onNotify: (payload: string) => void) => Promise<unknown>;
    fetchByIds: (ids: string[]) => Promise<EventRow[]>;
    emit: <K extends keyof E>(event: K, data: EventData<E, K>) => void;
    channel?: string;
    batchMs?: number;
};
export declare function createEventRelay<E extends EventsDef>(opts: EventRelayOptions<E>): Promise<void>;
//# sourceMappingURL=event-relay.d.ts.map