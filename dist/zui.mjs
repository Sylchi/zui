const _textEncoder = new TextEncoder();
const _textDecoder = new TextDecoder();

export class Zui {
  #exports = null;
  #memory = null;

  constructor(exports, memory) {
    this.#exports = exports;
    this.#memory = memory;
  }

  static async create(wasmUrl = 'zui.wasm') {
    const response = await fetch(wasmUrl);
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

  get version() { return this.#exports.er_ui_wasm_version(); }
  get maxSlots() { return this.#exports.er_ui_wasm_max_slots(); }
  get slotCount() { return this.#exports.er_ui_wasm_slot_count(); }

  alloc() { return this.#exports.er_ui_wasm_alloc(); }
  free(idx) { return this.#exports.er_ui_wasm_free(idx); }
  clear() { this.#exports.er_ui_wasm_clear(); }

  #writeString(str) {
    const bytes = _textEncoder.encode(str);
    const view = new Uint8Array(this.#memory.buffer);
    const ptr = view.length - bytes.length - 1;
    view.set(bytes, ptr);
    view[ptr + bytes.length] = 0;
    return { ptr: ptr >>> 0, len: bytes.length };
  }

  newText(slot, value) {
    const { ptr, len } = this.#writeString(value);
    return this.#exports.er_ui_wasm_new_text(slot, ptr, len);
  }

  newButton(slot, id, label, variant = 0, leadingIcon = 0, trailingIcon = 0) {
    const { ptr, len } = this.#writeString(label);
    return this.#exports.er_ui_wasm_new_button(slot, id, ptr, len, variant, leadingIcon, trailingIcon);
  }

  newRowItem(slot, id, title, detail) {
    const t = this.#writeString(title);
    const d = this.#writeString(detail);
    return this.#exports.er_ui_wasm_new_row_item(slot, id, t.ptr, t.len, d.ptr, d.len);
  }

  newBadge(slot, label, variant = 0) {
    const { ptr, len } = this.#writeString(label);
    return this.#exports.er_ui_wasm_new_badge(slot, ptr, len, variant);
  }

  newCheckbox(slot, id, label, checked = false) {
    const { ptr, len } = this.#writeString(label);
    return this.#exports.er_ui_wasm_new_checkbox(slot, id, ptr, len, checked ? 1 : 0);
  }

  newInput(slot, id, placeholder) {
    const { ptr, len } = this.#writeString(placeholder);
    return this.#exports.er_ui_wasm_new_input(slot, id, ptr, len);
  }

  newSlider(slot, id, label, value = 0) {
    const { ptr, len } = this.#writeString(label);
    return this.#exports.er_ui_wasm_new_slider(slot, id, ptr, len, value);
  }

  newCard(slot, title, detail) {
    const t = this.#writeString(title);
    const d = this.#writeString(detail);
    return this.#exports.er_ui_wasm_new_card(slot, t.ptr, t.len, d.ptr, d.len);
  }

  newSeparator(slot) {
    return this.#exports.er_ui_wasm_new_separator(slot);
  }

  newIcon(slot, label, iconValue) {
    const { ptr, len } = this.#writeString(label);
    return this.#exports.er_ui_wasm_new_icon(slot, ptr, len, iconValue);
  }

  render(slot, x = 0, y = 0, w = 200, h = 40) {
    return this.#exports.er_ui_wasm_render(slot, 0, 0, x, y, w, h);
  }

  measure(slot, w = -1, h = -1) {
    const packed = this.#exports.er_ui_wasm_measure(slot, w, h);
    const f32 = new Float32Array(2);
    f32[0] = packed >>> 32;
    f32[1] = packed & 0xFFFFFFFF;
    return { width: f32[0], height: f32[1] };
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
    const ptr = this.#writeDense(bytes);
    return this.#exports.er_ui_wasm_deserialize(ptr, bytes.length);
  }

  #writeDense(bytes) {
    const view = new Uint8Array(this.#memory.buffer);
    const ptr = view.length - bytes.length;
    view.set(bytes, ptr);
    return ptr >>> 0;
  }
}

export default async function init(wasmUrl) {
  return await Zui.create(wasmUrl);
}
