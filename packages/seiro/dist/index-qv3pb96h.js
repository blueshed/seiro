// @bun
// src/protocol.ts
function isCmd2(msg) {
  return typeof msg === "object" && msg !== null && "cmd" in msg;
}
function isQuery2(msg) {
  return typeof msg === "object" && msg !== null && "q" in msg;
}
function isCmdError2(msg) {
  return typeof msg === "object" && msg !== null && "cid" in msg && "err" in msg;
}
function isCmdResult2(msg) {
  return typeof msg === "object" && msg !== null && "cid" in msg && "result" in msg;
}
function isRow2(msg) {
  return typeof msg === "object" && msg !== null && "id" in msg && "row" in msg;
}
function isEnd2(msg) {
  return typeof msg === "object" && msg !== null && "id" in msg && !("row" in msg) && !("err" in msg) && !("ev" in msg);
}
function isEvent2(msg) {
  return typeof msg === "object" && msg !== null && "ev" in msg;
}
function isSub2(msg) {
  return typeof msg === "object" && msg !== null && "sub" in msg;
}
function isUnsub2(msg) {
  return typeof msg === "object" && msg !== null && "unsub" in msg;
}
function encode2(msg) {
  return JSON.stringify(msg);
}
function decode2(line) {
  return JSON.parse(line);
}
function cid2() {
  return Math.random().toString(36).slice(2, 10);
}

export { isCmd2, isQuery2, isCmdError2, isCmdResult2, isRow2, isEnd2, isEvent2, isSub2, isUnsub2, encode2, decode2, cid2 };
