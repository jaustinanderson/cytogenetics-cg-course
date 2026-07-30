/**
 * Minimal zero-dependency DOM harness.
 *
 * The repository intentionally has no runtime or test dependencies, and CI runs
 * `npm test` without an install step, so browser smoke tests cannot rely on
 * jsdom. This module implements only the DOM surface `index.html` actually
 * uses: element creation, innerHTML parsing, class/attribute handling, the
 * selector forms present in the course, event dispatch, localStorage, history,
 * and an IntersectionObserver stub.
 *
 * It is a test fixture, not a browser. It does not implement layout, CSS,
 * or the full DOM specification. Behavior it cannot model (rendering,
 * real focus order, screen-reader semantics) still requires a real browser.
 */

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

const TEXT_NODE = "#text";

let idCounter = 0;

export class Node {
  constructor(tagName) {
    // The #text sentinel must survive verbatim; uppercasing it would break
    // text-node detection in textContent, selector matching, and serialization.
    this.tagName = tagName === TEXT_NODE ? TEXT_NODE : String(tagName).toUpperCase();
    this.nodeName = this.tagName;
    this.attributes = Object.create(null);
    this.childNodes = [];
    this.parentNode = null;
    this.style = {};
    this.disabled = false;
    this._text = "";
    this._listeners = Object.create(null);
    this._uid = ++idCounter;
  }

  /* ---------- tree ---------- */

  get children() {
    return this.childNodes.filter((node) => node.tagName !== TEXT_NODE);
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  get nextElementSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.children;
    return siblings[siblings.indexOf(this) + 1] || null;
  }

  appendChild(node) {
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.childNodes.indexOf(this);
    if (index >= 0) this.parentNode.childNodes.splice(index, 1);
    this.parentNode = null;
  }

  /* ---------- attributes ---------- */

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
      ? this.attributes[name]
      : null;
  }

  hasAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name);
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  get id() {
    return this.attributes.id || "";
  }

  set id(value) {
    this.attributes.id = value;
  }

  get className() {
    return this.attributes.class || "";
  }

  set className(value) {
    this.attributes.class = value;
  }

  // `type` is a reflected IDL attribute in the real DOM: assigning the property
  // updates the attribute. The course relies on this when it builds option
  // buttons with `button.type = "button"`.
  get type() {
    return this.attributes.type || "";
  }

  set type(value) {
    this.attributes.type = String(value);
  }

  get classList() {
    const owner = this;
    const read = () => (owner.attributes.class || "").split(/\s+/).filter(Boolean);
    const write = (list) => {
      owner.attributes.class = [...new Set(list)].join(" ");
    };
    return {
      add(...names) { write([...read(), ...names.filter(Boolean)]); },
      remove(...names) { write(read().filter((c) => !names.includes(c))); },
      contains(name) { return read().includes(name); },
      toggle(name) {
        const list = read();
        if (list.includes(name)) { write(list.filter((c) => c !== name)); return false; }
        write([...list, name]);
        return true;
      },
      get length() { return read().length; },
      toString() { return read().join(" "); },
    };
  }

  /* ---------- content ---------- */

  get textContent() {
    if (this.tagName === TEXT_NODE) return this._text;
    return this.childNodes.map((node) => node.textContent).join("");
  }

  set textContent(value) {
    this.childNodes = [];
    const text = new Node(TEXT_NODE);
    text._text = String(value);
    text.parentNode = this;
    this.childNodes.push(text);
  }

  set innerHTML(html) {
    this.childNodes = [];
    for (const node of parseFragment(String(html))) {
      node.parentNode = this;
      this.childNodes.push(node);
    }
  }

  get innerHTML() {
    return this.childNodes.map(serialize).join("");
  }

  /* ---------- queries ---------- */

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    return querySelectorAllFrom(this, selector);
  }

  /* ---------- events ---------- */

  addEventListener(type, handler) {
    (this._listeners[type] = this._listeners[type] || []).push(handler);
  }

  removeEventListener(type, handler) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter((fn) => fn !== handler);
  }

  dispatchEvent(type, event = {}) {
    const payload = {
      type,
      target: this,
      preventDefault() { payload.defaultPrevented = true; },
      stopPropagation() { payload.propagationStopped = true; },
      defaultPrevented: false,
      propagationStopped: false,
      ...event,
    };
    for (const handler of this._listeners[type] || []) handler.call(this, payload);
    return payload;
  }

  /** Convenience used by tests; mirrors a user click. */
  click() {
    if (this.disabled) return { skipped: "disabled" };
    return this.dispatchEvent("click");
  }

  /* ---------- no-ops the course calls ---------- */

  scrollIntoView() {}
  focus() { this.ownerDocumentActiveElement = true; }
  blur() {}
}

/* ============================ selector engine ============================ */

/** Parse one compound selector, e.g. `.quiz-mount[data-quiz="m1"]` or `a[data-target]`. */
function parseCompound(part) {
  const spec = { tag: null, id: null, classes: [], attrs: [] };
  const pattern = /(^[a-zA-Z][\w-]*)|#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?\]/g;
  let match;
  while ((match = pattern.exec(part))) {
    if (match[1]) spec.tag = match[1].toUpperCase();
    else if (match[2]) spec.id = match[2];
    else if (match[3]) spec.classes.push(match[3]);
    else if (match[4]) spec.attrs.push({ name: match[4], value: match[5] ?? match[6] ?? null });
  }
  return spec;
}

function matchesCompound(node, spec) {
  if (node.tagName === TEXT_NODE) return false;
  if (spec.tag && node.tagName !== spec.tag) return false;
  if (spec.id && node.getAttribute("id") !== spec.id) return false;
  for (const cls of spec.classes) if (!node.classList.contains(cls)) return false;
  for (const attr of spec.attrs) {
    if (!node.hasAttribute(attr.name)) return false;
    if (attr.value !== null && node.getAttribute(attr.name) !== attr.value) return false;
  }
  return true;
}

function descendants(root, out = []) {
  for (const child of root.childNodes) {
    if (child.tagName === TEXT_NODE) continue;
    out.push(child);
    descendants(child, out);
  }
  return out;
}

/** Supports comma groups and descendant combinators — the forms the course uses. */
function querySelectorAllFrom(root, selector) {
  const results = [];
  for (const group of String(selector).split(",")) {
    const parts = group.trim().split(/\s+/).filter(Boolean).map(parseCompound);
    if (!parts.length) continue;
    const last = parts[parts.length - 1];
    for (const node of descendants(root)) {
      if (!matchesCompound(node, last)) continue;
      let ok = true;
      let cursor = node.parentNode;
      for (let i = parts.length - 2; i >= 0; i -= 1) {
        let found = false;
        while (cursor && cursor !== root.parentNode) {
          if (matchesCompound(cursor, parts[i])) { found = true; cursor = cursor.parentNode; break; }
          cursor = cursor.parentNode;
        }
        if (!found) { ok = false; break; }
      }
      if (ok && !results.includes(node)) results.push(node);
    }
  }
  return results;
}

/* ============================ HTML parsing ============================ */

function decode(text) {
  return text
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, "\u00a0").replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013").replace(/&amp;/g, "&");
}

function encodeText(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function encodeAttribute(text) {
  return encodeText(text).replace(/"/g, "&quot;");
}

function parseAttributes(source) {
  const attrs = Object.create(null);
  const pattern = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s">]+)))?/g;
  let match;
  while ((match = pattern.exec(source))) {
    const name = match[1];
    if (!name) continue;
    attrs[name] = decode(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

/**
 * Tolerant fragment parser. Handles nested elements, void elements,
 * self-closing SVG tags, attributes, and text. It does not implement
 * error recovery for malformed markup beyond ignoring stray closers.
 */
export function parseFragment(html) {
  const roots = [];
  const stack = [];
  const tokenizer = /<!--[\s\S]*?-->|<\/([\w:-]+)\s*>|<([\w:-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let cursor = 0;
  let match;

  const push = (node) => {
    const parent = stack[stack.length - 1];
    if (parent) { node.parentNode = parent; parent.childNodes.push(node); }
    else roots.push(node);
  };

  const pushText = (raw) => {
    if (!raw) return;
    const text = decode(raw);
    if (!text.trim() && !text.includes("\u00a0")) return;
    const node = new Node(TEXT_NODE);
    node._text = text;
    push(node);
  };

  while ((match = tokenizer.exec(html))) {
    pushText(html.slice(cursor, match.index));
    cursor = tokenizer.lastIndex;

    if (match[0].startsWith("<!--")) continue;

    if (match[1]) {
      const closing = match[1].toUpperCase();
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tagName === closing) { stack.length = i; break; }
      }
      continue;
    }

    const tag = match[2];
    const node = new Node(tag);
    Object.assign(node.attributes, parseAttributes(match[3] || ""));
    push(node);

    const selfClosing = match[4] === "/" || VOID_ELEMENTS.has(tag.toLowerCase());
    if (!selfClosing) stack.push(node);
  }
  pushText(html.slice(cursor));
  return roots;
}

function serialize(node) {
  // A real element's innerHTML serializes text as escaped markup. This matters
  // because the course's esc() helper intentionally uses textContent followed
  // by innerHTML to make authored and injected content safe to interpolate.
  if (node.tagName === TEXT_NODE) return encodeText(node._text);
  const tag = node.tagName.toLowerCase();
  const attrs = Object.entries(node.attributes)
    .map(([key, value]) => ` ${key}="${encodeAttribute(value)}"`).join("");
  if (VOID_ELEMENTS.has(tag)) return `<${tag}${attrs}>`;
  return `<${tag}${attrs}>${node.childNodes.map(serialize).join("")}</${tag}>`;
}

/* ============================ environment ============================ */

function createStorage(seed = {}) {
  let store = { ...seed };
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
    clear() { store = {}; },
    get _raw() { return { ...store }; },
    get length() { return Object.keys(store).length; },
  };
}

/**
 * Build a document from the course's static markup and return a sandbox
 * suitable for running the inline script.
 *
 * @param {string} bodyHtml static markup extracted from index.html
 * @param {object} options  { storage, readyState, failStorageWrites }
 */
export function createEnvironment(bodyHtml, options = {}) {
  const root = new Node("body");
  root.innerHTML = bodyHtml;

  const storage = createStorage(options.storage || {});
  if (options.failStorageWrites) {
    storage.setItem = () => { throw new Error("QuotaExceededError"); };
  }

  const documentListeners = Object.create(null);
  const printCalls = [];
  const confirmQueue = Array.isArray(options.confirmResponses) ? [...options.confirmResponses] : [];

  const documentStub = {
    readyState: options.readyState || "complete",
    body: root,
    documentElement: root,
    addEventListener(type, handler) {
      (documentListeners[type] = documentListeners[type] || []).push(handler);
    },
    dispatchEvent(type) {
      for (const handler of documentListeners[type] || []) handler({ type });
    },
    createElement(tag) { return new Node(tag); },
    createTextNode(text) {
      const node = new Node(TEXT_NODE);
      node._text = String(text);
      return node;
    },
    getElementById(id) { return root.querySelector(`#${id}`); },
    querySelector(selector) { return root.querySelector(selector); },
    querySelectorAll(selector) { return root.querySelectorAll(selector); },
  };

  const windowListeners = Object.create(null);
  const reloads = [];
  const windowStub = {
    addEventListener(type, handler) {
      (windowListeners[type] = windowListeners[type] || []).push(handler);
    },
    dispatchEvent(type) {
      for (const handler of windowListeners[type] || []) handler({ type });
    },
    print() { printCalls.push(Date.now()); windowStub.dispatchEvent("beforeprint"); windowStub.dispatchEvent("afterprint"); },
    confirm() { return confirmQueue.length ? confirmQueue.shift() : false; },
    alert() {},
    location: { hash: "", reload() { reloads.push(Date.now()); } },
    matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} }; },
    requestAnimationFrame(fn) { return setTimeout(() => fn(Date.now()), 0); },
  };

  class IntersectionObserverStub {
    constructor(callback) { this.callback = callback; this.observed = []; }
    observe(node) { this.observed.push(node); }
    unobserve() {}
    disconnect() { this.observed = []; }
    /** Test hook: simulate a section entering the viewport. */
    trigger(node) { this.callback([{ isIntersecting: true, target: node }]); }
  }

  const observers = [];
  const ObserverProxy = function (callback, opts) {
    const instance = new IntersectionObserverStub(callback, opts);
    observers.push(instance);
    return instance;
  };

  const sandbox = {
    window: windowStub,
    document: documentStub,
    // The course calls bare `location.reload()`; in a browser `location` is a
    // global that aliases `window.location`, so the sandbox must mirror that.
    location: windowStub.location,
    localStorage: storage,
    history: { replaceState() {}, pushState() {} },
    IntersectionObserver: ObserverProxy,
    console,
    Date, JSON, Math, Array, Object, String, Number, Boolean, RegExp, Error,
    setTimeout, clearTimeout, setInterval, clearInterval,
    isNaN, parseInt, parseFloat,
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  return {
    sandbox,
    document: documentStub,
    window: windowStub,
    body: root,
    storage,
    observers,
    printCalls,
    reloads,
    /** Fire DOMContentLoaded for readyState:"loading" scenarios. */
    ready() { documentStub.readyState = "complete"; documentStub.dispatchEvent("DOMContentLoaded"); },
  };
}

export { createStorage };
