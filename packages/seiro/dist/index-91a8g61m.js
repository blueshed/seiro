// @bun
import {
  cid,
  decode,
  encode,
  isCmdError,
  isCmdResult,
  isEnd,
  isEvent,
  isRow
} from "./index-txbk53zc.js";

// node_modules/@preact/signals-core/dist/signals-core.mjs
var i = Symbol.for("preact-signals");
function t() {
  if (r > 1) {
    r--;
    return;
  }
  let i2, t2 = false;
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
        } catch (o2) {
          if (!t2) {
            i2 = o2;
            t2 = true;
          }
        }
      o = n;
    }
  }
  f = 0;
  r--;
  if (t2)
    throw i2;
}
var n;
var s;
function h(i2) {
  const t2 = n;
  n = undefined;
  try {
    return i2();
  } finally {
    n = t2;
  }
}
var r = 0;
var f = 0;
var e = 0;
function u(i2) {
  if (n === undefined)
    return;
  let t2 = i2.n;
  if (t2 === undefined || t2.t !== n) {
    t2 = { i: 0, S: i2, p: n.s, n: undefined, t: n, e: undefined, x: undefined, r: t2 };
    if (n.s !== undefined)
      n.s.n = t2;
    n.s = t2;
    i2.n = t2;
    if (32 & n.f)
      i2.S(t2);
    return t2;
  } else if (t2.i === -1) {
    t2.i = 0;
    if (t2.n !== undefined) {
      t2.n.p = t2.p;
      if (t2.p !== undefined)
        t2.p.n = t2.n;
      t2.p = n.s;
      t2.n = undefined;
      n.s.n = t2;
      n.s = t2;
    }
    return t2;
  }
}
function c(i2, t2) {
  this.v = i2;
  this.i = 0;
  this.n = undefined;
  this.t = undefined;
  this.W = t2 == null ? undefined : t2.watched;
  this.Z = t2 == null ? undefined : t2.unwatched;
  this.name = t2 == null ? undefined : t2.name;
}
c.prototype.brand = i;
c.prototype.h = function() {
  return true;
};
c.prototype.S = function(i2) {
  const t2 = this.t;
  if (t2 !== i2 && i2.e === undefined) {
    i2.x = t2;
    this.t = i2;
    if (t2 !== undefined)
      t2.e = i2;
    else
      h(() => {
        var i3;
        (i3 = this.W) == null || i3.call(this);
      });
  }
};
c.prototype.U = function(i2) {
  if (this.t !== undefined) {
    const { e: t2, x: o } = i2;
    if (t2 !== undefined) {
      t2.x = o;
      i2.e = undefined;
    }
    if (o !== undefined) {
      o.e = t2;
      i2.x = undefined;
    }
    if (i2 === this.t) {
      this.t = o;
      if (o === undefined)
        h(() => {
          var i3;
          (i3 = this.Z) == null || i3.call(this);
        });
    }
  }
};
c.prototype.subscribe = function(i2) {
  return E(() => {
    const t2 = this.value, o = n;
    n = undefined;
    try {
      i2(t2);
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
  const i2 = n;
  n = undefined;
  try {
    return this.value;
  } finally {
    n = i2;
  }
};
Object.defineProperty(c.prototype, "value", { get() {
  const i2 = u(this);
  if (i2 !== undefined)
    i2.i = this.i;
  return this.v;
}, set(i2) {
  if (i2 !== this.v) {
    if (f > 100)
      throw new Error("Cycle detected");
    this.v = i2;
    this.i++;
    e++;
    r++;
    try {
      for (let i3 = this.t;i3 !== undefined; i3 = i3.x)
        i3.t.N();
    } finally {
      t();
    }
  }
} });
function d(i2, t2) {
  return new c(i2, t2);
}
function v(i2) {
  for (let t2 = i2.s;t2 !== undefined; t2 = t2.n)
    if (t2.S.i !== t2.i || !t2.S.h() || t2.S.i !== t2.i)
      return true;
  return false;
}
function l(i2) {
  for (let t2 = i2.s;t2 !== undefined; t2 = t2.n) {
    const o = t2.S.n;
    if (o !== undefined)
      t2.r = o;
    t2.S.n = t2;
    t2.i = -1;
    if (t2.n === undefined) {
      i2.s = t2;
      break;
    }
  }
}
function y(i2) {
  let t2, o = i2.s;
  while (o !== undefined) {
    const i3 = o.p;
    if (o.i === -1) {
      o.S.U(o);
      if (i3 !== undefined)
        i3.n = o.n;
      if (o.n !== undefined)
        o.n.p = i3;
    } else
      t2 = o;
    o.S.n = o.r;
    if (o.r !== undefined)
      o.r = undefined;
    o = i3;
  }
  i2.s = t2;
}
function a(i2, t2) {
  c.call(this, undefined);
  this.x = i2;
  this.s = undefined;
  this.g = e - 1;
  this.f = 4;
  this.W = t2 == null ? undefined : t2.watched;
  this.Z = t2 == null ? undefined : t2.unwatched;
  this.name = t2 == null ? undefined : t2.name;
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
  const i2 = n;
  try {
    l(this);
    n = this;
    const i3 = this.x();
    if (16 & this.f || this.v !== i3 || this.i === 0) {
      this.v = i3;
      this.f &= -17;
      this.i++;
    }
  } catch (i3) {
    this.v = i3;
    this.f |= 16;
    this.i++;
  }
  n = i2;
  y(this);
  this.f &= -2;
  return true;
};
a.prototype.S = function(i2) {
  if (this.t === undefined) {
    this.f |= 36;
    for (let i3 = this.s;i3 !== undefined; i3 = i3.n)
      i3.S.S(i3);
  }
  c.prototype.S.call(this, i2);
};
a.prototype.U = function(i2) {
  if (this.t !== undefined) {
    c.prototype.U.call(this, i2);
    if (this.t === undefined) {
      this.f &= -33;
      for (let i3 = this.s;i3 !== undefined; i3 = i3.n)
        i3.S.U(i3);
    }
  }
};
a.prototype.N = function() {
  if (!(2 & this.f)) {
    this.f |= 6;
    for (let i2 = this.t;i2 !== undefined; i2 = i2.x)
      i2.t.N();
  }
};
Object.defineProperty(a.prototype, "value", { get() {
  if (1 & this.f)
    throw new Error("Cycle detected");
  const i2 = u(this);
  this.h();
  if (i2 !== undefined)
    i2.i = this.i;
  if (16 & this.f)
    throw this.v;
  return this.v;
} });
function w(i2, t2) {
  return new a(i2, t2);
}
function _(i2) {
  const o = i2.u;
  i2.u = undefined;
  if (typeof o == "function") {
    r++;
    const s2 = n;
    n = undefined;
    try {
      o();
    } catch (t2) {
      i2.f &= -2;
      i2.f |= 8;
      b(i2);
      throw t2;
    } finally {
      n = s2;
      t();
    }
  }
}
function b(i2) {
  for (let t2 = i2.s;t2 !== undefined; t2 = t2.n)
    t2.S.U(t2);
  i2.x = undefined;
  i2.s = undefined;
  _(i2);
}
function g(i2) {
  if (n !== this)
    throw new Error("Out-of-order effect");
  y(this);
  n = i2;
  this.f &= -2;
  if (8 & this.f)
    b(this);
  t();
}
function p(i2, t2) {
  this.x = i2;
  this.u = undefined;
  this.s = undefined;
  this.o = undefined;
  this.f = 32;
  this.name = t2 == null ? undefined : t2.name;
}
p.prototype.c = function() {
  const i2 = this.S();
  try {
    if (8 & this.f)
      return;
    if (this.x === undefined)
      return;
    const t2 = this.x();
    if (typeof t2 == "function")
      this.u = t2;
  } finally {
    i2();
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
  const i2 = n;
  n = this;
  return g.bind(this, i2);
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
function E(i2, t2) {
  const o = new p(i2, t2);
  try {
    o.c();
  } catch (i3) {
    o.d();
    throw i3;
  }
  const n2 = o.d.bind(o);
  n2[Symbol.dispose] = n2;
  return n2;
}

// src/client.ts
function createClient(url, options = {}) {
  const tokenKey = options.tokenKey ?? "seiro_token";
  let memoryToken = options.token ?? null;
  let ws = null;
  let queryId = 0;
  const queryListeners = new Map;
  const cmdListeners = new Map;
  const eventListeners = new Map;
  let connectPromise = null;
  const connected = d(false);
  let subscribed = false;
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
      const u2 = new URL(url);
      u2.searchParams.set("token", token);
      return u2.toString();
    }
    return url;
  }
  function connect() {
    if (connectPromise)
      return connectPromise;
    connectPromise = new Promise((resolve, reject) => {
      ws = new WebSocket(buildUrl());
      let profileReceived = false;
      ws.onerror = (e2) => reject(e2);
      ws.onmessage = (e2) => {
        const msg = decode(e2.data);
        if (!profileReceived && typeof msg === "object" && msg !== null && "profile" in msg) {
          profileReceived = true;
          connected.value = true;
          resolve(msg.profile);
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
        if (typeof msg === "object" && msg !== null && "id" in msg && "err" in msg) {
          const m = msg;
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
    ws?.send(encode(data));
  }
  function cmd(name, data, callbacks) {
    const id = cid();
    if (callbacks) {
      cmdListeners.set(id, {
        onSuccess: callbacks.onSuccess,
        onError: callbacks.onError
      });
    }
    send({ cmd: name, cid: id, data });
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
          onError: (e2) => {
            error = e2;
            resolve?.();
          }
        });
        send({ q: name, id, params });
        return {
          async next() {
            while (buffer.length === 0 && !done && !error) {
              await new Promise((r2) => {
                resolve = r2;
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
      send({ sub: pattern });
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
      send({ sub: pattern });
    }
  }
  function logout() {
    setToken(null);
  }
  function close() {
    ws?.close();
  }
  async function reconnect() {
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
    close
  };
}

export { d, w, E, createClient };
