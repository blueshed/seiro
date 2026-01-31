import { describe, test, expect } from "bun:test";
import {
  encode,
  decode,
  cid,
  isCmd,
  isQuery,
  isCmdResult,
  isCmdError,
  isRow,
  isEnd,
  isEvent,
  type Cmd,
  type CmdResult,
  type CmdError,
  type QueryMsg,
  type Row,
  type End,
  type Event,
} from "./protocol";

describe("protocol", () => {
  describe("encode/decode", () => {
    test("round-trips objects", () => {
      const obj = { cmd: "test", cid: "abc123", data: { foo: "bar" } };
      const encoded = encode(obj);
      const decoded = decode(encoded);
      expect(decoded).toEqual(obj);
    });

    test("handles nested objects", () => {
      const obj = { nested: { deep: { value: [1, 2, 3] } } };
      expect(decode(encode(obj))).toEqual(obj);
    });

    test("handles null and undefined values", () => {
      const obj = { a: null, b: undefined };
      const decoded = decode(encode(obj));
      expect(decoded).toEqual({ a: null }); // undefined is omitted in JSON
    });

    test("handles empty objects", () => {
      expect(decode(encode({}))).toEqual({});
    });

    test("handles arrays", () => {
      const obj = { items: [1, "two", { three: 3 }] };
      expect(decode(encode(obj))).toEqual(obj);
    });
  });

  describe("cid", () => {
    test("generates string IDs", () => {
      const id = cid();
      expect(typeof id).toBe("string");
    });

    test("generates unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(cid());
      }
      expect(ids.size).toBe(1000);
    });

    test("generates IDs of reasonable length", () => {
      const id = cid();
      expect(id.length).toBeGreaterThanOrEqual(4);
      expect(id.length).toBeLessThanOrEqual(12);
    });
  });

  describe("isCmd", () => {
    test("returns true for valid command", () => {
      const cmd: Cmd = { cmd: "user.create", cid: "abc", data: {} };
      expect(isCmd(cmd)).toBe(true);
    });

    test("returns true for command with ack flag", () => {
      const cmd: Cmd = { cmd: "user.create", cid: "abc", data: {}, ack: true };
      expect(isCmd(cmd)).toBe(true);
    });

    test("returns false for query", () => {
      expect(isCmd({ q: "users.all", id: 1 })).toBe(false);
    });

    test("returns false for null", () => {
      expect(isCmd(null)).toBe(false);
    });

    test("returns false for non-object", () => {
      expect(isCmd("string")).toBe(false);
      expect(isCmd(123)).toBe(false);
    });
  });

  describe("isQuery", () => {
    test("returns true for valid query", () => {
      const query: QueryMsg = { q: "users.all", id: 1 };
      expect(isQuery(query)).toBe(true);
    });

    test("returns true for query with params", () => {
      const query: QueryMsg = { q: "users.byId", id: 1, params: { id: 5 } };
      expect(isQuery(query)).toBe(true);
    });

    test("returns false for command", () => {
      expect(isQuery({ cmd: "test", cid: "abc", data: {} })).toBe(false);
    });

    test("returns false for null", () => {
      expect(isQuery(null)).toBe(false);
    });
  });

  describe("isCmdResult", () => {
    test("returns true for valid result", () => {
      const result: CmdResult = { cid: "abc", result: { id: 1 } };
      expect(isCmdResult(result)).toBe(true);
    });

    test("returns true for result with undefined value", () => {
      const result = { cid: "abc", result: undefined };
      expect(isCmdResult(result)).toBe(true);
    });

    test("returns true for result with null value", () => {
      const result = { cid: "abc", result: null };
      expect(isCmdResult(result)).toBe(true);
    });

    test("returns false for error", () => {
      expect(isCmdResult({ cid: "abc", err: "failed" })).toBe(false);
    });

    test("returns false without cid", () => {
      expect(isCmdResult({ result: { id: 1 } })).toBe(false);
    });
  });

  describe("isCmdError", () => {
    test("returns true for valid error", () => {
      const error: CmdError = { cid: "abc", err: "Something went wrong" };
      expect(isCmdError(error)).toBe(true);
    });

    test("returns false for result", () => {
      expect(isCmdError({ cid: "abc", result: {} })).toBe(false);
    });

    test("returns false without cid", () => {
      expect(isCmdError({ err: "failed" })).toBe(false);
    });

    test("returns false without err", () => {
      expect(isCmdError({ cid: "abc" })).toBe(false);
    });
  });

  describe("isRow", () => {
    test("returns true for valid row", () => {
      const row: Row = { id: 1, row: { name: "Alice" } };
      expect(isRow(row)).toBe(true);
    });

    test("returns false for end marker", () => {
      expect(isRow({ id: 1 })).toBe(false);
    });

    test("returns false for error", () => {
      expect(isRow({ id: 1, err: "failed" })).toBe(false);
    });
  });

  describe("isEnd", () => {
    test("returns true for valid end marker", () => {
      const end: End = { id: 1 };
      expect(isEnd(end)).toBe(true);
    });

    test("returns false for row", () => {
      expect(isEnd({ id: 1, row: {} })).toBe(false);
    });

    test("returns false for error", () => {
      expect(isEnd({ id: 1, err: "failed" })).toBe(false);
    });

    test("returns false without id", () => {
      expect(isEnd({})).toBe(false);
    });
  });

  describe("isEvent", () => {
    test("returns true for valid event", () => {
      const event: Event = { ev: "user.created", data: { id: 1 } };
      expect(isEvent(event)).toBe(true);
    });

    test("returns false without ev", () => {
      expect(isEvent({ data: {} })).toBe(false);
    });

    test("returns false for null", () => {
      expect(isEvent(null)).toBe(false);
    });
  });
});
