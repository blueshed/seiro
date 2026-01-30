// JSONL-RPC Protocol Types for CQRS

// === Wire Messages ===

// Command: client → server (write intent)
export type Cmd = {
  cmd: string;
  cid: string;
  data: object;
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

// Event: server → client (broadcast)
export type Event = {
  ev: string;
  data: object;
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
    !("err" in msg)
  );
}

export function isEvent(msg: unknown): msg is Event {
  return typeof msg === "object" && msg !== null && "ev" in msg;
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
