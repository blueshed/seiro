// JSONL-RPC Protocol Types for CQRS

// === Wire Messages ===

// Command: client → server (write intent)
export type Cmd = {
  cmd: string;
  cid: string;
  data: object;
  ack?: boolean;
};

// Command Error: server → client (only on failure)
export type CmdError = {
  cid: string;
  err: string;
};

// Command Result: server → client (success with data)
export type CmdResult = {
  cid: string;
  result: unknown;
};

// Query: client → server (read)
export type QueryMsg = {
  q: string;
  id: number;
  params?: object;
};

// Query Row: server → client (streamed)
export type Row = {
  id: number;
  row: object;
};

// Query End: server → client (stream complete)
export type End = {
  id: number;
};

// Event: server → client (broadcast).
// `id` is the events-log row id as a string (bigint-safe); carried on both
// live and backfilled events so clients can dedup and advance a resume cursor.
export type Event = {
  ev: string;
  data: object;
  id?: string;
};

// Subscribe: client → server.
// If `since` is set, the server replays events with id > since matching the
// pattern before live delivery; the client then dedups by id.
export type Sub = {
  sub: string;
  since?: string;
};

export type Unsub = {
  unsub: string;
};

// === Type Guards ===

export function isCmd(msg: unknown): msg is Cmd {
  return typeof msg === "object" && msg !== null && "cmd" in msg;
}

export function isQuery(msg: unknown): msg is QueryMsg {
  return typeof msg === "object" && msg !== null && "q" in msg;
}

export function isCmdError(msg: unknown): msg is CmdError {
  return (
    typeof msg === "object" && msg !== null && "cid" in msg && "err" in msg
  );
}

export function isCmdResult(msg: unknown): msg is CmdResult {
  return (
    typeof msg === "object" && msg !== null && "cid" in msg && "result" in msg
  );
}

export function isRow(msg: unknown): msg is Row {
  return typeof msg === "object" && msg !== null && "id" in msg && "row" in msg;
}

export function isEnd(msg: unknown): msg is End {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "id" in msg &&
    !("row" in msg) &&
    !("err" in msg) &&
    !("ev" in msg)
  );
}

export function isEvent(msg: unknown): msg is Event {
  return typeof msg === "object" && msg !== null && "ev" in msg;
}

export function isSub(msg: unknown): msg is Sub {
  return typeof msg === "object" && msg !== null && "sub" in msg;
}

export function isUnsub(msg: unknown): msg is Unsub {
  return typeof msg === "object" && msg !== null && "unsub" in msg;
}

// === Utility ===

export function encode(msg: object): string {
  return JSON.stringify(msg);
}

export function decode(line: string): unknown {
  return JSON.parse(line);
}

export function cid(): string {
  return Math.random().toString(36).slice(2, 10);
}
