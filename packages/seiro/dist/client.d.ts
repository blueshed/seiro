import { signal, computed, effect, type Signal } from "@preact/signals-core";
import type { CommandsDef, QueriesDef, EventsDef, CommandData, QueryParams, QueryRow, EventData } from "./types";
export { signal, computed, effect, type Signal };
export declare function createClient<C extends CommandsDef = CommandsDef, Q extends QueriesDef = QueriesDef, E extends EventsDef = EventsDef>(url: string, options?: {
    tokenKey?: string;
    token?: string;
}): {
    connect: <P = unknown>() => Promise<P | null>;
    reconnect: () => Promise<void>;
    connected: Signal<boolean>;
    cmd: <K extends keyof C & string>(name: K, data: CommandData<C, K>, callbacks?: {
        onSuccess?: (result: C[K]["result"]) => void;
        onError?: (err: string) => void;
    }) => void;
    query: <K extends keyof Q & string>(name: K, params?: QueryParams<Q, K>) => AsyncIterable<QueryRow<Q, K>>;
    queryAll: <K extends keyof Q & string>(name: K, params?: QueryParams<Q, K>) => Promise<QueryRow<Q, K>[]>;
    sync: <K extends keyof E & string>(pattern: K, initial: EventData<E, K>, reducer: (state: EventData<E, K>, event: EventData<E, K>) => EventData<E, K>) => Signal<EventData<E, K>>;
    syncMap: <K extends keyof E & string, MK, MV extends EventData<E, K>>(pattern: K, getKey: (v: MV) => MK) => Signal<Map<MK, MV>>;
    on: <K extends keyof E & string>(pattern: K, listener: (data: EventData<E, K>) => void) => () => void;
    subscribe: () => void;
    setToken: (token: string | null) => void;
    getToken: () => string | null;
    logout: () => void;
    close: () => void;
};
export type Client<C extends CommandsDef = CommandsDef, Q extends QueriesDef = QueriesDef, E extends EventsDef = EventsDef> = ReturnType<typeof createClient<C, Q, E>>;
//# sourceMappingURL=client.d.ts.map