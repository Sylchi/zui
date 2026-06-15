const _textEncoder = new TextEncoder();
const _textDecoder = new TextDecoder();

function _stringArg(str) {
  const bytes = _textEncoder.encode(str);
  return { ptr: bytes, len: bytes.length };
}

// ── Layout tree → slot mapper ───────────────────────────────

const _leafTypes = new Set([
  'text', 'button', 'input', 'card', 'badge',
  'checkbox', 'slider', 'separator', 'icon', 'row_item',
]);

class _SlotManager {
  #exports;
  #slots = new Map();

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

  render(exports, containerWidth, containerHeight) {
    this.layout(exports, containerWidth, containerHeight);
    const results = [];
    for (const [path, entry] of this._slots) {
      const b = entry.bounds;
      if (!b) continue;
      const cmds = exports.er_ui_wasm_render(entry.slot, 0, 0, b.x, b.y, b.w, b.h);
      results.push({ path, slot: entry.slot, type: entry.node.type, bounds: b, commandCount: cmds, node: entry.node });
    }
    return results;
  }
}

// ── Command stream reader ───────────────────────────────────

class _CommandReader {
  #exports;
  #cmdSize;
  #mem;

  constructor(exports) {
    this.#exports = exports;
    this.#cmdSize = exports.er_ui_wasm_command_size();
    this.#mem = new Uint8Array(exports.memory.buffer);
  }

  readAll(count) {
    const ptr = this.#exports.er_ui_wasm_command_buffer_ptr();
    const dv = new DataView(this.#exports.memory.buffer);
    const cmds = [];

    for (let i = 0; i < count; i++) {
      const base = ptr + i * this.#cmdSize;
      const tag = dv.getUint8(base);
      // tag (1 byte) + padding (3 bytes) → variant payload at base+4
      const payload = base + 4;
      cmds.push(this._parse(tag, payload, dv));
    }

    return cmds;
  }

  _parse(tag, off, dv) {
    switch (tag) {
      case 0: return this._rect(off, dv, 'rect');
      case 1: return this._rect(off, dv, 'overlay_rect');
      case 2: return this._border(off, dv);
      case 3: return this._text(off, dv, 'text');
      case 4: return this._text(off, dv, 'overlay_text');
      case 5: return this._dragSource(off, dv);
      case 6: return this._dropTarget(off, dv);
      case 7: return this._iconQuad(off, dv, 'icon_quad');
      case 8: return this._iconQuad(off, dv, 'overlay_icon_quad');
      case 9: return this._svgQuad(off, dv);
      case 10: return this._quad(off, dv, 'text_quad');
      case 11: return this._quad(off, dv, 'image_quad');
      case 12: return this._transition(off, dv);
      default: return { type: 'unknown', tag };
    }
  }

  _rect(off, dv, type) {
    const x = dv.getFloat32(off, true);
    const y = dv.getFloat32(off + 4, true);
    const w = dv.getFloat32(off + 8, true);
    const h = dv.getFloat32(off + 12, true);
    const r = dv.getUint8(off + 16);
    const g = dv.getUint8(off + 17);
    const b = dv.getUint8(off + 18);
    const a = dv.getUint8(off + 19);
    const mode = dv.getUint8(off + 24);
    const radius = dv.getFloat32(off + 28, true);
    return { type, bounds: { x, y, w, h }, color: { r, g, b, a }, mode, radius };
  }

  _border(off, dv) {
    const x = dv.getFloat32(off, true);
    const y = dv.getFloat32(off + 4, true);
    const w = dv.getFloat32(off + 8, true);
    const h = dv.getFloat32(off + 12, true);
    const r = dv.getUint8(off + 16);
    const g = dv.getUint8(off + 17);
    const b = dv.getUint8(off + 18);
    const a = dv.getUint8(off + 19);
    return { type: 'border', bounds: { x, y, w, h }, color: { r, g, b, a } };
  }

  _text(off, dv, type) {
    const x = dv.getFloat32(off, true);
    const y = dv.getFloat32(off + 4, true);
    const w = dv.getFloat32(off + 8, true);
    const h = dv.getFloat32(off + 12, true);
    const strPtr = dv.getUint32(off + 16, true);
    const strLen = dv.getUint32(off + 20, true);
    const r = dv.getUint8(off + 24);
    const g = dv.getUint8(off + 25);
    const b = dv.getUint8(off + 26);
    const a = dv.getUint8(off + 27);
    const alignment = dv.getUint8(off + 28);
    const weight = dv.getUint8(off + 29);
    let value = '';
    if (strPtr > 0 && strLen > 0) {
      value = _textDecoder.decode(this.#mem.slice(strPtr, strPtr + strLen));
    }
    return { type, origin: { x, y, w, h }, value, color: { r, g, b, a }, alignment, weight };
  }

  _iconQuad(off, dv, type) {
    const x = dv.getFloat32(off, true);
    const y = dv.getFloat32(off + 4, true);
    const w = dv.getFloat32(off + 8, true);
    const h = dv.getFloat32(off + 12, true);
    const iconId = dv.getUint32(off + 16, true);
    const r = dv.getUint8(off + 20);
    const g = dv.getUint8(off + 21);
    const b = dv.getUint8(off + 22);
    const a = dv.getUint8(off + 23);
    return { type, bounds: { x, y, w, h }, iconId, color: { r, g, b, a } };
  }

  _quad(off, dv, type) {
    const x = dv.getFloat32(off, true);
    const y = dv.getFloat32(off + 4, true);
    const w = dv.getFloat32(off + 8, true);
    const h = dv.getFloat32(off + 12, true);
    const u0 = dv.getFloat32(off + 16, true);
    const v0 = dv.getFloat32(off + 20, true);
    const u1 = dv.getFloat32(off + 24, true);
    const v1 = dv.getFloat32(off + 28, true);
    const atlasId = dv.getUint32(off + 32, true);
    const r = dv.getUint8(off + 36);
    const g = dv.getUint8(off + 37);
    const b = dv.getUint8(off + 38);
    const a = dv.getUint8(off + 39);
    return { type, bounds: { x, y, w, h }, uv: { u0, v0, u1, v1 }, atlasId, color: { r, g, b, a } };
  }

  _dragSource(off, dv) {
    const scopeId = dv.getUint32(off, true);
    const itemId = dv.getUint32(off + 4, true);
    const index = dv.getUint32(off + 8, true);
    const x = dv.getFloat32(off + 12, true);
    const y = dv.getFloat32(off + 16, true);
    const w = dv.getFloat32(off + 20, true);
    const h = dv.getFloat32(off + 24, true);
    return { type: 'drag_source', scopeId, itemId, index, bounds: { x, y, w, h } };
  }

  _dropTarget(off, dv) {
    const scopeId = dv.getUint32(off, true);
    const index = dv.getUint32(off + 4, true);
    const x = dv.getFloat32(off + 8, true);
    const y = dv.getFloat32(off + 12, true);
    const w = dv.getFloat32(off + 16, true);
    const h = dv.getFloat32(off + 20, true);
    return { type: 'drop_target', scopeId, index, bounds: { x, y, w, h } };
  }

  _transition(off, dv) {
    const id = dv.getUint32(off, true);
    const property = dv.getUint8(off + 4);
    const from = dv.getFloat32(off + 8, true);
    const to = dv.getFloat32(off + 12, true);
    const duration = dv.getUint32(off + 16, true);
    const delay = dv.getUint32(off + 20, true);
    const easing = dv.getUint8(off + 24);
    return { type: 'transition', id, property, from, to, duration, delay, easing };
  }

  _svgQuad(off, dv) {
    return this._iconQuad(off, dv, 'svg_quad');
  }
}

// ── Main Zui class ─────────────────────────────────────────

export class Zui {
  #exports = null;
  #memory = null;
  #manager = null;
  #reader = null;

  constructor(exports, memory) {
    this.#exports = exports;
    this.#memory = memory;
    this.#manager = new _SlotManager(exports);
    this.#reader = new _CommandReader(exports);
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

  // ── Command reading ────────────────────────────────────

  /** Read parsed Scene commands from WASM linear memory. Call after render(). */
  readCommands(count) {
    return this.#reader.readAll(count);
  }

  /** Read commands for a specific slot by re-rendering it.
   *  `bounds` should match the original render position so re-rendering
   *  produces consistent results. */
  readSlotCommands(slot, bounds = {}) {
    const { x = 0, y = 0, w = 200, h = 40 } = bounds;
    const count = this.#exports.er_ui_wasm_render(slot, 0, 0, x, y, w, h);
    return this.#reader.readAll(count);
  }

  // ── High-level tree API ─────────────────────────────────

  setTree(node) {
    this.#manager.setTree(node);
  }

  renderAll(containerWidth = 800, containerHeight = 600) {
    return this.#manager.render(this.#exports, containerWidth, containerHeight);
  }

  /** Read the exported WASM memory buffer (for advanced use). */
  get memoryBuffer() {
    return this.#memory.buffer;
  }
}

// ── Singleton factory ──────────────────────────────────────

let _default = null;

export default async function init(wasmUrl) {
  if (!_default) _default = await Zui.create(wasmUrl);
  return _default;
}
