// @bun
import {
  isCmdError2,
  isCmdResult2,
  isRow2,
  isEnd2,
  isEvent2,
  encode2,
  decode2,
  cid2
} from "./index-qv3pb96h.js";

// ../../node_modules/.bun/@preact+signals-core@1.12.2/node_modules/@preact/signals-core/dist/signals-core.mjs
var i = Symbol.for("preact-signals");
function t() {
  if (r > 1) {
    r--;
    return;
  }
  let i, t = false;
  while (s !== undefined) {
    let o = s;
    s = undefined;
    f++;
    while (o !== undefined) {
      const n = o.o;
      o.o = undefined;
      o.f &= -3;
      if (!(8 & o.f) && v(o))
        try {
          o.c();
        } catch (o) {
          if (!t) {
            i = o;
            t = true;
          }
        }
      o = n;
    }
  }
  f = 0;
  r--;
  if (t)
    throw i;
}
var n;
var s;
function h(i) {
  const t = n;
  n = undefined;
  try {
    return i();
  } finally {
    n = t;
  }
}
var r = 0;
var f = 0;
var e = 0;
function u(i) {
  if (n === undefined)
    return;
  let t = i.n;
  if (t === undefined || t.t !== n) {
    t = { i: 0, S: i, p: n.s, n: undefined, t: n, e: undefined, x: undefined, r: t };
    if (n.s !== undefined)
      n.s.n = t;
    n.s = t;
    i.n = t;
    if (32 & n.f)
      i.S(t);
    return t;
  } else if (t.i === -1) {
    t.i = 0;
    if (t.n !== undefined) {
      t.n.p = t.p;
      if (t.p !== undefined)
        t.p.n = t.n;
      t.p = n.s;
      t.n = undefined;
      n.s.n = t;
      n.s = t;
    }
    return t;
  }
}
function c(i, t) {
  this.v = i;
  this.i = 0;
  this.n = undefined;
  this.t = undefined;
  this.W = t == null ? undefined : t.watched;
  this.Z = t == null ? undefined : t.unwatched;
  this.name = t == null ? undefined : t.name;
}
c.prototype.brand = i;
c.prototype.h = function() {
  return true;
};
c.prototype.S = function(i) {
  const t = this.t;
  if (t !== i && i.e === undefined) {
    i.x = t;
    this.t = i;
    if (t !== undefined)
      t.e = i;
    else
      h(() => {
        var i;
        (i = this.W) == null || i.call(this);
      });
  }
};
c.prototype.U = function(i) {
  if (this.t !== undefined) {
    const { e: t, x: o } = i;
    if (t !== undefined) {
      t.x = o;
      i.e = undefined;
    }
    if (o !== undefined) {
      o.e = t;
      i.x = undefined;
    }
    if (i === this.t) {
      this.t = o;
      if (o === undefined)
        h(() => {
          var i;
          (i = this.Z) == null || i.call(this);
        });
    }
  }
};
c.prototype.subscribe = function(i) {
  return E(() => {
    const t = this.value, o = n;
    n = undefined;
    try {
      i(t);
    } finally {
      n = o;
    }
  }, { name: "sub" });
};
c.prototype.valueOf = function() {
  return this.value;
};
c.prototype.toString = function() {
  return this.value + "";
};
c.prototype.toJSON = function() {
  return this.value;
};
c.prototype.peek = function() {
  const i = n;
  n = undefined;
  try {
    return this.value;
  } finally {
    n = i;
  }
};
Object.defineProperty(c.prototype, "value", { get() {
  const i = u(this);
  if (i !== undefined)
    i.i = this.i;
  return this.v;
}, set(i) {
  if (i !== this.v) {
    if (f > 100)
      throw new Error("Cycle detected");
    this.v = i;
    this.i++;
    e++;
    r++;
    try {
      for (let i = this.t;i !== undefined; i = i.x)
        i.t.N();
    } finally {
      t();
    }
  }
} });
function d(i, t) {
  return new c(i, t);
}
function v(i) {
  for (let t = i.s;t !== undefined; t = t.n)
    if (t.S.i !== t.i || !t.S.h() || t.S.i !== t.i)
      return true;
  return false;
}
function l(i) {
  for (let t = i.s;t !== undefined; t = t.n) {
    const o = t.S.n;
    if (o !== undefined)
      t.r = o;
    t.S.n = t;
    t.i = -1;
    if (t.n === undefined) {
      i.s = t;
      break;
    }
  }
}
function y(i) {
  let t, o = i.s;
  while (o !== undefined) {
    const i = o.p;
    if (o.i === -1) {
      o.S.U(o);
      if (i !== undefined)
        i.n = o.n;
      if (o.n !== undefined)
        o.n.p = i;
    } else
      t = o;
    o.S.n = o.r;
    if (o.r !== undefined)
      o.r = undefined;
    o = i;
  }
  i.s = t;
}
function a(i, t) {
  c.call(this, undefined);
  this.x = i;
  this.s = undefined;
  this.g = e - 1;
  this.f = 4;
  this.W = t == null ? undefined : t.watched;
  this.Z = t == null ? undefined : t.unwatched;
  this.name = t == null ? undefined : t.name;
}
a.prototype = new c;
a.prototype.h = function() {
  this.f &= -3;
  if (1 & this.f)
    return false;
  if ((36 & this.f) == 32)
    return true;
  this.f &= -5;
  if (this.g === e)
    return true;
  this.g = e;
  this.f |= 1;
  if (this.i > 0 && !v(this)) {
    this.f &= -2;
    return true;
  }
  const i = n;
  try {
    l(this);
    n = this;
    const i = this.x();
    if (16 & this.f || this.v !== i || this.i === 0) {
      this.v = i;
      this.f &= -17;
      this.i++;
    }
  } catch (i) {
    this.v = i;
    this.f |= 16;
    this.i++;
  }
  n = i;
  y(this);
  this.f &= -2;
  return true;
};
a.prototype.S = function(i) {
  if (this.t === undefined) {
    this.f |= 36;
    for (let i = this.s;i !== undefined; i = i.n)
      i.S.S(i);
  }
  c.prototype.S.call(this, i);
};
a.prototype.U = function(i) {
  if (this.t !== undefined) {
    c.prototype.U.call(this, i);
    if (this.t === undefined) {
      this.f &= -33;
      for (let i = this.s;i !== undefined; i = i.n)
        i.S.U(i);
    }
  }
};
a.prototype.N = function() {
  if (!(2 & this.f)) {
    this.f |= 6;
    for (let i = this.t;i !== undefined; i = i.x)
      i.t.N();
  }
};
Object.defineProperty(a.prototype, "value", { get() {
  if (1 & this.f)
    throw new Error("Cycle detected");
  const i = u(this);
  this.h();
  if (i !== undefined)
    i.i = this.i;
  if (16 & this.f)
    throw this.v;
  return this.v;
} });
function w(i, t) {
  return new a(i, t);
}
function _(i) {
  const o = i.u;
  i.u = undefined;
  if (typeof o == "function") {
    r++;
    const s = n;
    n = undefined;
    try {
      o();
    } catch (t) {
      i.f &= -2;
      i.f |= 8;
      b(i);
      throw t;
    } finally {
      n = s;
      t();
    }
  }
}
function b(i) {
  for (let t = i.s;t !== undefined; t = t.n)
    t.S.U(t);
  i.x = undefined;
  i.s = undefined;
  _(i);
}
function g(i) {
  if (n !== this)
    throw new Error("Out-of-order effect");
  y(this);
  n = i;
  this.f &= -2;
  if (8 & this.f)
    b(this);
  t();
}
function p(i, t) {
  this.x = i;
  this.u = undefined;
  this.s = undefined;
  this.o = undefined;
  this.f = 32;
  this.name = t == null ? undefined : t.name;
}
p.prototype.c = function() {
  const i = this.S();
  try {
    if (8 & this.f)
      return;
    if (this.x === undefined)
      return;
    const t = this.x();
    if (typeof t == "function")
      this.u = t;
  } finally {
    i();
  }
};
p.prototype.S = function() {
  if (1 & this.f)
    throw new Error("Cycle detected");
  this.f |= 1;
  this.f &= -9;
  _(this);
  l(this);
  r++;
  const i = n;
  n = this;
  return g.bind(this, i);
};
p.prototype.N = function() {
  if (!(2 & this.f)) {
    this.f |= 2;
    this.o = s;
    s = this;
  }
};
p.prototype.d = function() {
  this.f |= 8;
  if (!(1 & this.f))
    b(this);
};
p.prototype.dispose = function() {
  this.d();
};
function E(i, t) {
  const o = new p(i, t);
  try {
    o.c();
  } catch (i) {
    o.d();
    throw i;
  }
  const n = o.d.bind(o);
  n[Symbol.dispose] = n;
  return n;
}

// src/client.ts
function createClient2(url, options = {}) {
  const tokenKey = options.tokenKey ?? "seiro_token";
  const eventIdKey = options.eventIdKey ?? `${tokenKey}_last_event_id`;
  let memoryToken = options.token ?? null;
  let lastSeenId = null;
  if (typeof localStorage !== "undefined") {
    lastSeenId = localStorage.getItem(eventIdKey);
  }
  let ws = null;
  let queryId = 0;
  const queryListeners = new Map;
  const cmdListeners = new Map;
  const eventListeners = new Map;
  let connectPromise = null;
  const connected = d(false);
  let subscribed = false;
  function gtBigint(a, b) {
    try {
      return BigInt(a) > BigInt(b);
    } catch {
      return a > b;
    }
  }
  function advanceCursor(id) {
    if (lastSeenId === null || gtBigint(id, lastSeenId)) {
      lastSeenId = id;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(eventIdKey, id);
      }
    }
  }
  function getToken() {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(tokenKey);
    }
    return memoryToken;
  }
  function setToken(token) {
    memoryToken = token;
    if (typeof localStorage !== "undefined") {
      if (token) {
        localStorage.setItem(tokenKey, token);
      } else {
        localStorage.removeItem(tokenKey);
      }
    }
  }
  function buildUrl() {
    const token = getToken();
    if (token) {
      const u = new URL(url);
      u.searchParams.set("token", token);
      return u.toString();
    }
    return url;
  }
  function connect() {
    if (connectPromise)
      return connectPromise;
    connectPromise = new Promise((resolve, reject) => {
      const socket = new WebSocket(buildUrl());
      ws = socket;
      let profileReceived = false;
      socket.onerror = (e) => reject(e);
      socket.onmessage = (e) => {
        const msg = decode2(e.data);
        if (!profileReceived && typeof msg === "object" && msg !== null && "profile" in msg) {
          profileReceived = true;
          connected.value = true;
          if (subscribed) {
            for (const pattern of eventListeners.keys()) {
              send(lastSeenId !== null ? { sub: pattern, since: lastSeenId } : { sub: pattern });
            }
          }
          resolve(msg.profile);
          return;
        }
        if (isEvent2(msg)) {
          if (msg.id !== undefined) {
            if (lastSeenId !== null && !gtBigint(msg.id, lastSeenId)) {
              return;
            }
            advanceCursor(msg.id);
          }
          for (const [pattern, listeners] of eventListeners) {
            if (matchPattern(pattern, msg.ev)) {
              for (const listener of listeners) {
                listener(msg.data);
              }
            }
          }
          return;
        }
        if (isCmdResult2(msg)) {
          const listener = cmdListeners.get(msg.cid);
          if (listener?.onSuccess) {
            listener.onSuccess(msg.result);
          }
          cmdListeners.delete(msg.cid);
          return;
        }
        if (isCmdError2(msg)) {
          const listener = cmdListeners.get(msg.cid);
          if (listener?.onError) {
            listener.onError(msg.err);
          }
          cmdListeners.delete(msg.cid);
          return;
        }
        if (isRow2(msg)) {
          queryListeners.get(msg.id)?.onRow(msg.row);
          return;
        }
        if (isEnd2(msg)) {
          queryListeners.get(msg.id)?.onEnd();
          queryListeners.delete(msg.id);
          return;
        }
        if (typeof msg === "object" && msg !== null && "id" in msg && "err" in msg) {
          const m = msg;
          queryListeners.get(m.id)?.onError(m.err);
          queryListeners.delete(m.id);
          return;
        }
      };
      socket.onclose = () => {
        if (ws !== socket)
          return;
        ws = null;
        connectPromise = null;
        connected.value = false;
        subscribed = false;
      };
    });
    return connectPromise;
  }
  function matchPattern(pattern, eventName) {
    if (pattern === eventName)
      return true;
    if (pattern.endsWith("*")) {
      return eventName.startsWith(pattern.slice(0, -1));
    }
    return false;
  }
  function send(data) {
    ws?.send(encode2(data));
  }
  function cmd(name, data, callbacks) {
    const id = cid2();
    const ack = callbacks !== undefined;
    if (ack) {
      cmdListeners.set(id, {
        onSuccess: callbacks.onSuccess,
        onError: callbacks.onError
      });
    }
    send({ cmd: name, cid: id, data, ack });
  }
  function query(name, params) {
    const id = ++queryId;
    return {
      [Symbol.asyncIterator]() {
        const buffer = [];
        let done = false;
        let error = null;
        let resolve = null;
        queryListeners.set(id, {
          onRow: (row) => {
            buffer.push(row);
            resolve?.();
          },
          onEnd: () => {
            done = true;
            resolve?.();
          },
          onError: (e) => {
            error = e;
            resolve?.();
          }
        });
        send({ q: name, id, params });
        return {
          async next() {
            while (buffer.length === 0 && !done && !error) {
              await new Promise((r) => {
                resolve = r;
              });
            }
            if (error)
              throw new Error(error);
            if (buffer.length > 0)
              return { value: buffer.shift(), done: false };
            return { value: undefined, done: true };
          }
        };
      }
    };
  }
  async function queryAll(name, params) {
    const results = [];
    for await (const row of query(name, params)) {
      results.push(row);
    }
    return results;
  }
  function sync(pattern, initial, reducer) {
    const state = d(initial);
    on(pattern, (data) => {
      state.value = reducer(state.value, data);
    });
    return state;
  }
  function syncMap(pattern, getKey) {
    const state = d(new Map);
    on(pattern, (data) => {
      const item = data;
      const newMap = new Map(state.value);
      newMap.set(getKey(item), item);
      state.value = newMap;
    });
    return state;
  }
  function on(pattern, listener) {
    const isNew = !eventListeners.has(pattern);
    if (isNew) {
      eventListeners.set(pattern, new Set);
    }
    eventListeners.get(pattern).add(listener);
    if (isNew && subscribed) {
      send(lastSeenId !== null ? { sub: pattern, since: lastSeenId } : { sub: pattern });
    }
    return () => {
      const listeners = eventListeners.get(pattern);
      if (listeners) {
        listeners.delete(listener);
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
    if (subscribed)
      return;
    subscribed = true;
    for (const pattern of eventListeners.keys()) {
      send(lastSeenId !== null ? { sub: pattern, since: lastSeenId } : { sub: pattern });
    }
  }
  function logout() {
    setToken(null);
    lastSeenId = null;
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(eventIdKey);
    }
  }
  function close() {
    ws?.close();
  }
  async function reconnect() {
    close();
    connectPromise = null;
    await connect();
  }
  function getLastEventId() {
    return lastSeenId;
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
    getLastEventId,
    logout,
    close
  };
}

export { d, w, E, createClient2 };
