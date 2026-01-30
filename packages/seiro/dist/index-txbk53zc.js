// @bun
// src/protocol.ts
function isCmd(msg) {
  return typeof msg === "object" && msg !== null && "cmd" in msg;
}
function isQuery(msg) {
  return typeof msg === "object" && msg !== null && "q" in msg;
}
function isCmdError(msg) {
  return typeof msg === "object" && msg !== null && "cid" in msg && "err" in msg;
}
function isCmdResult(msg) {
  return typeof msg === "object" && msg !== null && "cid" in msg && "result" in msg;
}
function isRow(msg) {
  return typeof msg === "object" && msg !== null && "id" in msg && "row" in msg;
}
function isEnd(msg) {
  return typeof msg === "object" && msg !== null && "id" in msg && !("row" in msg) && !("err" in msg);
}
function isEvent(msg) {
  return typeof msg === "object" && msg !== null && "ev" in msg;
}
function encode(msg) {
  return JSON.stringify(msg);
}
function decode(line) {
  return JSON.parse(line);
}
function cid() {
  return Math.random().toString(36).slice(2, 10);
}

export { isCmd, isQuery, isCmdError, isCmdResult, isRow, isEnd, isEvent, encode, decode, cid };
