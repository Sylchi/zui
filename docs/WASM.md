# WASM Platform

ZUI compiles to WebAssembly for use in browsers, Node.js, and edge runtimes. The WASM binary plus JS wrapper is published to npm as `@edgerun/zui`.

## Build

```bash
zig build wasm        # → zig-out/bin/zui.wasm (software backend)
cp zig-out/bin/zui.wasm dist/
```

The WASM target uses `wasm32-freestanding` with `rdynamic = true` and `entry = .disabled` (no `_start` — it's a library, not an executable).

## API

### Slot-Based Model

The WASM module manages a fixed-size array of **component slots** (64 max). The host:
1. Allocates a slot (`alloc` → returns index)
2. Creates a component in it (`new_button`, `new_text`, etc.)
3. Renders or measures the component
4. Optionally serializes to/from canonical object bytes
5. Frees the slot when done

This avoids dynamic allocation in the WASM heap — all storage is static arrays, making the API deterministic.

### Exported Functions

| Function | Purpose |
|---|---|
| `er_ui_wasm_version()` | Returns API version (1) |
| `er_ui_wasm_max_slots()` | Returns 64 |
| `er_ui_wasm_slot_count()` | Returns occupied slot count |
| `er_ui_wasm_alloc()` | Allocate a slot |
| `er_ui_wasm_free(idx)` | Free a slot |
| `er_ui_wasm_clear()` | Free all slots |
| `er_ui_wasm_deserialize(ptr, len)` | Deserialize canonical object → new slot |
| `er_ui_wasm_serialize(idx, out, cap)` | Serialize slot to canonical bytes |
| `er_ui_wasm_render(idx, out, cap, x, y, w, h)` | Render component → Scene commands |
| `er_ui_wasm_measure(idx, w, h)` | Measure preferred size |
| `er_ui_wasm_new_text(slot, ptr, len)` | Create Text component |
| `er_ui_wasm_new_button(slot, id, label, len, variant, leading, trailing)` | Create Button |
| `er_ui_wasm_new_row_item(slot, id, title, tlen, detail, dlen)` | Create RowItem |
| `er_ui_wasm_new_badge(slot, label, len, variant)` | Create Badge |
| `er_ui_wasm_new_checkbox(slot, id, label, len, checked)` | Create Checkbox |
| `er_ui_wasm_new_input(slot, id, placeholder, len)` | Create Input |
| `er_ui_wasm_new_slider(slot, id, label, len, value)` | Create Slider |
| `er_ui_wasm_new_card(slot, title, tlen, detail, dlen)` | Create Card |
| `er_ui_wasm_new_separator(slot)` | Create Separator |
| `er_ui_wasm_new_icon(slot, label, len, icon)` | Create Icon |

See [API.md](API.md) for complete signatures, variant tables, and examples.

### WASM Imports

The module expects these imports from the host environment:

| Name | Signature | Purpose |
|---|---|---|
| `zui_log` | `(ptr: i32, len: i32) → void` | Log a string from WASM memory |
| `zui_now` | `() → f64` | Current time in milliseconds |

### Binary Size

| Mode | Size |
|---|---|
| Debug | 2.6 MB |
| ReleaseFast | 1.8 MB |
| ReleaseSmall | 600 KB |

### Memory Model

Initial memory: 16 pages (~1 MB). Fixed-size static arrays:

```
┌─────────────────┐
│ Component Slots │  64 components max
├─────────────────┤
│ Scene Commands  │  1024 commands max
├─────────────────┤
│ Scratch Buffers │  256 B + 1024 B
└─────────────────┘
```

## JS Integration

### Example

```js
const wasmBytes = await (await fetch('zui.wasm')).arrayBuffer();
const { instance } = await WebAssembly.instantiate(wasmBytes, {
  env: {
    zui_log: (ptr, len) => console.log(new TextDecoder().decode(mem.subarray(ptr, ptr + len))),
    zui_now: () => performance.now(),
  }
});

// Allocate a slot and create a button
const slot = instance.exports.er_ui_wasm_alloc();
const label = 'Click me';
const labelMem = new Uint8Array([...new TextEncoder().encode(label), 0]);
const labelPtr = instance.exports.er_ui_wasm_alloc_str(labelMem.length);  // hypothetical
instance.exports.er_ui_wasm_new_button(slot, 0, labelPtr, label.length, 0, 0, 0);

// Render
const cmds = instance.exports.er_ui_wasm_render(slot, 0, 0, 0, 0, 200, 40);

// Free
instance.exports.er_ui_wasm_free(slot);
```

## Publishing

```bash
zig build wasm -Doptimize=ReleaseSmall
cp zig-out/bin/zui.wasm dist/
npm publish --access public
```
