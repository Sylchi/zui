const _textEncoder = new TextEncoder();
const _textDecoder = new TextDecoder();

// ── Component creation helpers ──────────────────────────────
// Each returns { alloc: (exports) => slot, ... } binding

function _stringArg(str) {
  const bytes = _textEncoder.encode(str);
  return { ptr: bytes, len: bytes.length };
}

// ── Layout tree → slot mapper ───────────────────────────────
// Tree nodes:
//   { type: 'column', gap, padding, children: [...] }
//   { type: 'row',    gap, padding, children: [...] }
//   { type: 'text',   value, weight? }
//   { type: 'button', id, label, variant?, leadingIcon?, trailingIcon? }
//   { type: 'input',  id, placeholder? }
//   { type: 'card',   title, detail? }
//   { type: 'badge',  label, variant? }
//   { type: 'checkbox', id, label, checked? }
//   { type: 'slider', id, label, value? }
//   { type: 'separator' }
//   { type: 'icon',   label, iconValue }
//   { type: 'row_item', id, title, detail? }

const _leafTypes = new Set([
  'text', 'button', 'input', 'card', 'badge',
  'checkbox', 'slider', 'separator', 'icon', 'row_item',
]);

class _SlotManager {
  #exports;
  #slots = new Map(); // node path → { slot, node, bounds }

  constructor(exports) {
    this.#exports = exports;
    this.rootNode = null;
  }

  alloc() {
    const s = this.#exports.er_ui_wasm_alloc();
    if (s < 0) throw new Error('out of component slots');
    return s;
  }

  freeAll() {
    this.#exports.er_ui_wasm_clear();
    this.#slots.clear();
    this.rootNode = null;
  }

  _toSlot(node, path) {
    const exports = this.#exports;
    const type = node.type;

    if (type === 'text') {
      const s = this.alloc();
      const { ptr, len } = _stringArg(node.value ?? '');
      const buf = new Uint8Array(exports.memory.buffer);
      const memPtr = buf.length - len - 1;
      buf.set(ptr, memPtr);
      buf[memPtr + len] = 0;
      exports.er_ui_wasm_new_text(s, memPtr >>> 0, len);
      return s;
    }

    if (type === 'button') {
      const s = this.alloc();
      const { ptr, len } = _stringArg(node.label ?? '');
      const buf = new Uint8Array(exports.memory.buffer);
      const memPtr = buf.length - len - 1;
      buf.set(ptr, memPtr);
      buf[memPtr + len] = 0;
      const v = node.variant ?? 0;
      const li = node.leadingIcon ?? 0;
      const ti = node.trailingIcon ?? 0;
      exports.er_ui_wasm_new_button(s, node.id ?? 0, memPtr >>> 0, len, v, li, ti);
      return s;
    }

    if (type === 'input') {
      const s = this.alloc();
      const { ptr, len } = _stringArg(node.placeholder ?? '');
      const buf = new Uint8Array(exports.memory.buffer);
      const memPtr = buf.length - len - 1;
      buf.set(ptr, memPtr);
      buf[memPtr + len] = 0;
      exports.er_ui_wasm_new_input(s, node.id ?? 0, memPtr >>> 0, len);
      return s;
    }

    if (type === 'card') {
      const s = this.alloc();
      const t = _stringArg(node.title ?? '');
      const d = _stringArg(node.detail ?? '');
      const buf = new Uint8Array(exports.memory.buffer);
      const tPtr = buf.length - t.len - d.len - 2;
      const dPtr = tPtr + t.len + 1;
      buf.set(t.ptr, tPtr);
      buf[tPtr + t.len] = 0;
      buf.set(d.ptr, dPtr);
      buf[dPtr + d.len] = 0;
      exports.er_ui_wasm_new_card(s, tPtr >>> 0, t.len, dPtr >>> 0, d.len);
      return s;
    }

    if (type === 'badge') {
      const s = this.alloc();
      const { ptr, len } = _stringArg(node.label ?? '');
      const buf = new Uint8Array(exports.memory.buffer);
      const memPtr = buf.length - len - 1;
      buf.set(ptr, memPtr);
      buf[memPtr + len] = 0;
      exports.er_ui_wasm_new_badge(s, memPtr >>> 0, len, node.variant ?? 0);
      return s;
    }

    if (type === 'checkbox') {
      const s = this.alloc();
      const { ptr, len } = _stringArg(node.label ?? '');
      const buf = new Uint8Array(exports.memory.buffer);
      const memPtr = buf.length - len - 1;
      buf.set(ptr, memPtr);
      buf[memPtr + len] = 0;
      exports.er_ui_wasm_new_checkbox(s, node.id ?? 0, memPtr >>> 0, len, node.checked ? 1 : 0);
      return s;
    }

    if (type === 'slider') {
      const s = this.alloc();
      const { ptr, len } = _stringArg(node.label ?? '');
      const buf = new Uint8Array(exports.memory.buffer);
      const memPtr = buf.length - len - 1;
      buf.set(ptr, memPtr);
      buf[memPtr + len] = 0;
      exports.er_ui_wasm_new_slider(s, node.id ?? 0, memPtr >>> 0, len, node.value ?? 0);
      return s;
    }

    if (type === 'separator') {
      const s = this.alloc();
      exports.er_ui_wasm_new_separator(s);
      return s;
    }

    if (type === 'icon') {
      const s = this.alloc();
      const { ptr, len } = _stringArg(node.label ?? '');
      const buf = new Uint8Array(exports.memory.buffer);
      const memPtr = buf.length - len - 1;
      buf.set(ptr, memPtr);
      buf[memPtr + len] = 0;
      exports.er_ui_wasm_new_icon(s, memPtr >>> 0, len, node.iconValue ?? 0);
      return s;
    }

    if (type === 'row_item') {
      const s = this.alloc();
      const t = _stringArg(node.title ?? '');
      const d = _stringArg(node.detail ?? '');
      const buf = new Uint8Array(exports.memory.buffer);
      const tPtr = buf.length - t.len - d.len - 2;
      const dPtr = tPtr + t.len + 1;
      buf.set(t.ptr, tPtr);
      buf[tPtr + t.len] = 0;
      buf.set(d.ptr, dPtr);
      buf[dPtr + d.len] = 0;
      exports.er_ui_wasm_new_row_item(s, node.id ?? 0, tPtr >>> 0, t.len, dPtr >>> 0, d.len);
      return s;
    }

    throw new Error(`unknown component type: ${type}`);
  }

  setTree(node, path = 'root') {
    this.freeAll();
    this.rootNode = node;
    this._buildTree(node, path);
  }

  _buildTree(node, path) {
    if (_leafTypes.has(node.type)) {
      const slot = this._toSlot(node, path);
      this._slots.set(path, { slot, node, bounds: null });
      return slot;
    }

    // Container: column or row
    if (node.type === 'column' || node.type === 'row') {
      const children = node.children ?? [];
      for (let i = 0; i < children.length; i++) {
        this._buildTree(children[i], `${path}[${i}]`);
      }
      return -1;
    }

    throw new Error(`unknown node type: ${node.type}`);
  }

  layout(exports, containerWidth, containerHeight) {
    const gap = this.rootNode?.gap ?? 0;
    const padding = this.rootNode?.padding ?? 0;
    const axis = this.rootNode?.type === 'row' ? 'row' : 'column';

    let x = padding;
    let y = padding;
    const maxW = containerWidth - 2 * padding;

    for (const [path, entry] of this._slots) {
      const measureW = entry.node.width ?? maxW;
      const measureH = entry.node.height ?? -1;
      const packed = exports.er_ui_wasm_measure(entry.slot, measureW, measureH);
      const wF32 = new Float32Array(new Uint32Array([packed >>> 32]).buffer)[0];
      const hF32 = new Float32Array(new Uint32Array([packed & 0xFFFFFFFF]).buffer)[0];
      const w = isNaN(wF32) ? 100 : Math.min(wF32, maxW);
      const h = isNaN(hF32) ? 24 : hF32;

      if (axis === 'column') {
        entry.bounds = { x, y, w, h };
        y += h + gap;
      } else {
        entry.bounds = { x, y, w, h };
        x += w + gap;
      }
    }
  }

  render(exports) {
    this.layout(exports, 800, 600);
    const results = [];
    for (const [path, entry] of this._slots) {
      const b = entry.bounds;
      if (!b) continue;
      const cmds = exports.er_ui_wasm_render(entry.slot, 0, 0, b.x, b.y, b.w, b.h);
      results.push({ path, slot: entry.slot, type: entry.node.type, bounds: b, commandCount: cmds });
    }
    return results;
  }
}

// ── Main Zui class ─────────────────────────────────────────

export class Zui {
  #exports = null;
  #memory = null;
  #manager = null;
  #stringBufSize = 4096;
  #stringPtr = 0;

  constructor(exports, memory) {
    this.#exports = exports;
    this.#memory = memory;
    this.#manager = new _SlotManager(exports);
    // Reserve string buffer at end of linear memory
    const mem = new Uint8Array(memory.buffer);
    this.#stringPtr = mem.length - this.#stringBufSize;
  }

  static async create(wasmUrl) {
    const response = await fetch(wasmUrl ?? 'zui.wasm');
    const wasmBytes = await response.arrayBuffer();
    const wasmModule = await WebAssembly.compile(wasmBytes);
    const importObject = {
      env: {
        zui_log: (ptr, len) => {
          const mem = new Uint8Array(wasmModule.exports.memory.buffer);
          console.log('[zui]', _textDecoder.decode(mem.subarray(ptr, ptr + len)));
        },
        zui_now: () => performance.now(),
      },
    };
    const instance = await WebAssembly.instantiate(wasmModule, importObject);
    return new Zui(instance.exports, instance.exports.memory);
  }

  // ── Low-level slot API ─────────────────────────────────

  get version()       { return this.#exports.er_ui_wasm_version(); }
  get maxSlots()      { return this.#exports.er_ui_wasm_max_slots(); }
  get slotCount()     { return this.#exports.er_ui_wasm_slot_count(); }

  alloc()             { return this.#exports.er_ui_wasm_alloc(); }
  free(idx)           { return this.#exports.er_ui_wasm_free(idx); }
  clear()             { this.#exports.er_ui_wasm_clear(); }

  render(slot, x, y, w, h)    { return this.#exports.er_ui_wasm_render(slot, 0, 0, x ?? 0, y ?? 0, w ?? 200, h ?? 40); }
  measure(slot, w, h) {
    const packed = this.#exports.er_ui_wasm_measure(slot, w ?? -1, h ?? -1);
    const u32 = new Uint32Array([packed >>> 32, packed & 0xFFFFFFFF]);
    return { width: new Float32Array(u32.slice(0,1).buffer)[0], height: new Float32Array(u32.slice(1,2).buffer)[0] };
  }
  serialize(slot) {
    const cap = 1024;
    const view = new Uint8Array(this.#memory.buffer);
    const ptr = view.length - cap;
    const written = this.#exports.er_ui_wasm_serialize(slot, ptr, cap);
    if (written < 0) return null;
    return view.slice(ptr, ptr + written);
  }
  deserialize(bytes) {
    const view = new Uint8Array(this.#memory.buffer);
    const ptr = view.length - bytes.length;
    view.set(bytes, ptr);
    return this.#exports.er_ui_wasm_deserialize(ptr, bytes.length);
  }

  // ── High-level tree API ─────────────────────────────────

  /** Set UI tree from a declarative JSON tree, erasing any previous tree. */
  setTree(node) {
    this.#manager.setTree(node);
  }

  /** Render the current tree with slot layout. Returns per-slot render results. */
  renderAll(containerWidth = 800, containerHeight = 600) {
    return this.#manager.render(this.#exports, containerWidth, containerHeight);
  }
}

// ── Singleton factory ──────────────────────────────────────

let _default = null;

export default async function init(wasmUrl) {
  if (!_default) _default = await Zui.create(wasmUrl);
  return _default;
}
