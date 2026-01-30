import { signal, computed, effect, type Signal } from "@preact/signals-core";
import {
  isCmdError,
  isCmdResult,
  isRow,
  isEnd,
  isEvent,
  encode,
  decode,
  cid,
} from "./protocol";
import type {
  CommandsDef,
  QueriesDef,
  EventsDef,
  CommandData,
  QueryParams,
  QueryRow,
  EventData,
} from "./types";

type Listener = (msg: unknown) => void;

export { signal, computed, effect, type Signal };

export function createClient<
  C extends CommandsDef = CommandsDef,
  Q extends QueriesDef = QueriesDef,
  E extends EventsDef = EventsDef,
>(url: string, options: { tokenKey?: string; token?: string } = {}) {
  const tokenKey = options.tokenKey ?? "seiro_token";
  let memoryToken: string | null = options.token ?? null;

  let ws: WebSocket | null = null;
  let queryId = 0;
  const queryListeners = new Map<
    number,
    { onRow: Listener; onEnd: () => void; onError: (e: string) => void }
  >();
  const cmdListeners = new Map<
    string,
    { onSuccess?: (result: unknown) => void; onError?: (err: string) => void }
  >();
  const eventListeners = new Map<string, Set<Listener>>();
  let connectPromise: Promise<unknown> | null = null;

  const connected = signal(false);
  let subscribed = false;

  function getToken(): string | null {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(tokenKey);
    }
    return memoryToken;
  }

  function setToken(token: string | null) {
    memoryToken = token;
    if (typeof localStorage !== "undefined") {
      if (token) {
        localStorage.setItem(tokenKey, token);
      } else {
        localStorage.removeItem(tokenKey);
      }
    }
  }

  function buildUrl(): string {
    const token = getToken();
    if (token) {
      const u = new URL(url);
      u.searchParams.set("token", token);
      return u.toString();
    }
    return url;
  }

  function connect<P = unknown>(): Promise<P | null> {
    if (connectPromise) return connectPromise as Promise<P | null>;

    connectPromise = new Promise<P | null>((resolve, reject) => {
      ws = new WebSocket(buildUrl());
      let profileReceived = false;

      ws.onerror = (e) => reject(e);

      ws.onmessage = (e) => {
        const msg = decode(e.data as string);

        // Handle profile message (first message after connect)
        if (
          !profileReceived &&
          typeof msg === "object" &&
          msg !== null &&
          "profile" in msg
        ) {
          profileReceived = true;
          connected.value = true;
          resolve((msg as { profile: P | null }).profile);
          return;
        }

        if (isCmdResult(msg)) {
          const listener = cmdListeners.get(msg.cid);
          if (listener?.onSuccess) {
            listener.onSuccess(msg.result);
          }
          cmdListeners.delete(msg.cid);
          return;
        }

        if (isCmdError(msg)) {
          const listener = cmdListeners.get(msg.cid);
          if (listener?.onError) {
            listener.onError(msg.err);
          }
          cmdListeners.delete(msg.cid);
          return;
        }

        if (isRow(msg)) {
          queryListeners.get(msg.id)?.onRow(msg.row);
          return;
        }

        if (isEnd(msg)) {
          queryListeners.get(msg.id)?.onEnd();
          queryListeners.delete(msg.id);
          return;
        }

        if (
          typeof msg === "object" &&
          msg !== null &&
          "id" in msg &&
          "err" in msg
        ) {
          const m = msg as { id: number; err: string };
          queryListeners.get(m.id)?.onError(m.err);
          queryListeners.delete(m.id);
          return;
        }

        if (isEvent(msg)) {
          for (const [pattern, listeners] of eventListeners) {
            if (matchPattern(pattern, msg.ev)) {
              for (const listener of listeners) {
                listener(msg.data);
              }
            }
          }
        }
      };

      ws.onclose = () => {
        ws = null;
        connectPromise = null;
        connected.value = false;
      };
    });

    return connectPromise as Promise<P | null>;
  }

  function matchPattern(pattern: string, eventName: string): boolean {
    if (pattern === eventName) return true;
    if (pattern.endsWith("*")) {
      return eventName.startsWith(pattern.slice(0, -1));
    }
    return false;
  }

  function send(data: object) {
    ws?.send(encode(data));
  }

  function cmd<K extends keyof C & string>(
    name: K,
    data: CommandData<C, K>,
    callbacks?: {
      onSuccess?: (result: C[K]["result"]) => void;
      onError?: (err: string) => void;
    },
  ) {
    const id = cid();
    if (callbacks) {
      cmdListeners.set(id, {
        onSuccess: callbacks.onSuccess as (result: unknown) => void,
        onError: callbacks.onError,
      });
    }
    send({ cmd: name, cid: id, data });
  }

  function query<K extends keyof Q & string>(
    name: K,
    params?: QueryParams<Q, K>,
  ): AsyncIterable<QueryRow<Q, K>> {
    const id = ++queryId;

    return {
      [Symbol.asyncIterator]() {
        const buffer: QueryRow<Q, K>[] = [];
        let done = false;
        let error: string | null = null;
        let resolve: (() => void) | null = null;

        queryListeners.set(id, {
          onRow: (row) => {
            buffer.push(row as QueryRow<Q, K>);
            resolve?.();
          },
          onEnd: () => {
            done = true;
            resolve?.();
          },
          onError: (e) => {
            error = e;
            resolve?.();
          },
        });

        send({ q: name, id, params });

        return {
          async next(): Promise<IteratorResult<QueryRow<Q, K>>> {
            while (buffer.length === 0 && !done && !error) {
              await new Promise<void>((r) => {
                resolve = r;
              });
            }

            if (error) throw new Error(error);
            if (buffer.length > 0)
              return { value: buffer.shift()!, done: false };
            return { value: undefined as never, done: true };
          },
        };
      },
    };
  }

  async function queryAll<K extends keyof Q & string>(
    name: K,
    params?: QueryParams<Q, K>,
  ): Promise<QueryRow<Q, K>[]> {
    const results: QueryRow<Q, K>[] = [];
    for await (const row of query(name, params)) {
      results.push(row);
    }
    return results;
  }

  // Subscribe and sync to a signal
  function sync<K extends keyof E & string>(
    pattern: K,
    initial: EventData<E, K>,
    reducer: (
      state: EventData<E, K>,
      event: EventData<E, K>,
    ) => EventData<E, K>,
  ): Signal<EventData<E, K>> {
    const state = signal(initial);
    on(pattern, (data) => {
      state.value = reducer(state.value, data);
    });
    return state;
  }

  // Subscribe and sync to a Map signal
  function syncMap<K extends keyof E & string, MK, MV extends EventData<E, K>>(
    pattern: K,
    getKey: (v: MV) => MK,
  ): Signal<Map<MK, MV>> {
    const state = signal(new Map<MK, MV>());
    on(pattern, (data) => {
      const item = data as MV;
      const newMap = new Map(state.value);
      newMap.set(getKey(item), item);
      state.value = newMap;
    });
    return state;
  }

  function on<K extends keyof E & string>(
    pattern: K,
    listener: (data: EventData<E, K>) => void,
  ) {
    const isNew = !eventListeners.has(pattern);
    if (isNew) {
      eventListeners.set(pattern, new Set());
    }
    eventListeners.get(pattern)!.add(listener as Listener);

    // Send sub if already subscribed (i.e., after auth)
    if (isNew && subscribed) {
      send({ sub: pattern });
    }

    return () => {
      const listeners = eventListeners.get(pattern);
      if (listeners) {
        listeners.delete(listener as Listener);
        if (listeners.size === 0) {
          eventListeners.delete(pattern);
          if (subscribed) {
            send({ unsub: pattern });
          }
        }
      }
    };
  }

  function subscribe() {
    if (subscribed) return;
    subscribed = true;
    for (const pattern of eventListeners.keys()) {
      send({ sub: pattern });
    }
  }

  function logout() {
    setToken(null);
  }

  function close() {
    ws?.close();
  }

  async function reconnect(): Promise<void> {
    close();
    connectPromise = null;
    await connect();
  }

  return {
    connect,
    reconnect,
    connected,
    cmd,
    query,
    queryAll,
    sync,
    syncMap,
    on,
    subscribe,
    setToken,
    getToken,
    logout,
    close,
  };
}

export type Client<
  C extends CommandsDef = CommandsDef,
  Q extends QueriesDef = QueriesDef,
  E extends EventsDef = EventsDef,
> = ReturnType<typeof createClient<C, Q, E>>;
