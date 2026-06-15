# ZUI WASM C ABI Reference

The WASM module (`zui.wasm`) exports 20 `er_ui_wasm_*` functions via a single linear memory export. All functions use the C ABI (parameters passed on the WASM stack).

## Memory Model

The WASM module uses fixed-size static arrays — no dynamic allocation:

| Resource | Limit | Description |
|---|---|---|
| Component slots | 64 | Max simultaneous components |
| Scene commands | 1024 | Max render commands per frame |
| UI buffer | 256 B | Scratch space for `toObject` |
| Canonical buffer | 1024 B | Scratch space for serialization |

Initial memory: 16 pages (~1 MB). The WASM module exports a single `memory` for the host to read/write.

## Slot Lifecycle

```
alloc() → idx
        ↓
  new_text(idx, ...)   // or new_button, new_checkbox, etc.
        ↓
  render(idx, x, y, w, h)  // produces Scene commands
  measure(idx, w, h)        // preferred size
  serialize(idx, out, cap)  // canonical object bytes
        ↓
  free(idx)                  // release slot
```

## Function Reference

### `er_ui_wasm_version`

```c
uint32_t er_ui_wasm_version(void);
```

Returns the API version (currently `1`). Use to verify host–module compatibility at load time.

---

### `er_ui_wasm_max_slots`

```c
uint32_t er_ui_wasm_max_slots(void);
```

Returns `64` — the maximum number of component slots. `alloc()` will return `-1` if all slots are occupied.

---

### `er_ui_wasm_slot_count`

```c
uint32_t er_ui_wasm_slot_count(void);
```

Returns how many slots are currently in use. Iterates the validity array (O(n) where n = max slots).

---

### `er_ui_wasm_alloc`

```c
int32_t er_ui_wasm_alloc(void);
```

**Returns:** slot index (0–63) on success, or `-1` if all slots are full.

Allocates a fresh component slot. The slot must be populated with a component (via `new_*`) before calling `render` or `measure`. The caller owns the slot until `free` is called.

```js
const slot = instance.exports.er_ui_wasm_alloc();
if (slot < 0) throw new Error('no free slots');
```

---

### `er_ui_wasm_free`

```c
int32_t er_ui_wasm_free(uint32_t idx);
```

**Returns:** `0` on success, `-1` if `idx` is out of range or already free.

Releases a slot, making it available for future allocations.

---

### `er_ui_wasm_clear`

```c
void er_ui_wasm_clear(void);
```

Frees **all** component slots. Equivalent to freeing each slot individually, but cheaper (single O(n) scan).

---

### `er_ui_wasm_deserialize`

```c
int32_t er_ui_wasm_deserialize(const uint8_t* ptr, uint32_t len);
```

**Returns:** new slot index on success, or `-1` on error.

Deserializes canonical object bytes (produced by `serialize`) into a new component slot. The bytes use the edgerun canonical object format (BLAKE3 content-addressed, 148-byte header).

```js
const bytes = getStoredComponent();
const ptr = copyToWasmMemory(bytes);
const slot = instance.exports.er_ui_wasm_deserialize(ptr, bytes.length);
```

---

### `er_ui_wasm_serialize`

```c
int32_t er_ui_wasm_serialize(uint32_t idx, uint8_t* out_ptr, uint32_t out_cap);
```

**Returns:** number of bytes written on success, `-1` on error.

Serializes the component in slot `idx` to its canonical object encoding. Writes to the caller-provided buffer. The format is the edgerun canonical object format (BLAKE3 hash domain `"edgerun:v1:object"`).

---

### `er_ui_wasm_render`

```c
int32_t er_ui_wasm_render(
    uint32_t idx,
    uint8_t* cmd_out_ptr,
    uint32_t cmd_out_cap,
    float x, float y, float w, float h
);
```

**Returns:** number of Scene commands produced on success, `-1` on error.

Renders the component in slot `idx` into the internal command buffer. The `(x, y, w, h)` parameters define the rendering bounds in logical pixels.

Currently `cmd_out_ptr` and `cmd_out_cap` are reserved (the host reads the internal command buffer directly from WASM linear memory at a known offset). The returned count can be used to iterate `command_storage` in WASM memory.

The Scene commands are tagged unions with these variants:

| Variant | Purpose |
|---|---|
| `rect` | Filled rectangle, border, shadow, gradient, pie slice |
| `overlay_rect` | Rectangle rendered on overlay layer (no clip) |
| `border` | Border around a rectangle |
| `text` | Text at position with font weight and color |
| `overlay_text` | Text on overlay layer |
| `icon_quad` | Icon at position with size and color |
| `overlay_icon_quad` | Icon on overlay layer |
| `svg_quad` | SVG-style quad (alias for icon_quad) |
| `text_quad` | Text on curved path |
| `image_quad` | Textured image quad |
| `drag_source` | Drag-and-drop source region |
| `drop_target` | Drag-and-drop target region |
| `transition` | Animation transition |

---

### `er_ui_wasm_measure`

```c
uint64_t er_ui_wasm_measure(uint32_t idx, float w, float h);
```

**Returns:** packed `u64` — upper 32 bits = preferred width (f32 bitcast), lower 32 bits = preferred height (f32 bitcast). Returns `0` on invalid slot.

Measures the component's preferred size. Pass `-1` for `w` or `h` to leave that axis unconstrained.

```js
const packed = instance.exports.er_ui_wasm_measure(slot, -1, -1);
const width = new Float32Array(new Uint32Array([packed >> 32]).buffer)[0];
const height = new Float32Array(new Uint32Array([packed & 0xFFFFFFFF]).buffer)[0];
```

---

### `er_ui_wasm_new_text`

```c
int32_t er_ui_wasm_new_text(uint32_t slot, const uint8_t* value_ptr, uint32_t value_len);
```

**Returns:** `0` on success, `-1` on error.

Creates a Text component displaying `value` (UTF-8 string).

```js
const str = 'Hello World';
const ptr = copyString(str);
instance.exports.er_ui_wasm_new_text(slot, ptr, str.length);
```

---

### `er_ui_wasm_new_button`

```c
int32_t er_ui_wasm_new_button(
    uint32_t slot, uint32_t id,
    const uint8_t* label_ptr, uint32_t label_len,
    uint32_t variant,
    uint32_t leading_icon, uint32_t trailing_icon
);
```

**Returns:** `0` on success, `-1` on error.

Creates a Button component. `id` is the host-assigned interaction ID (used in hit-test results). `variant`:

| Value | Variant |
|---|---|
| 0 | `primary` |
| 1 | `secondary` |
| 2 | `outline` |
| 3 | `ghost` |
| 4 | `destructive` |
| 5 | `link` |

`leading_icon` and `trailing_icon`: `0` = no icon, `N > 0` = icon ID `N - 1` from the icon enum (0–699).

---

### `er_ui_wasm_new_row_item`

```c
int32_t er_ui_wasm_new_row_item(
    uint32_t slot, uint32_t id,
    const uint8_t* title_ptr, uint32_t title_len,
    const uint8_t* detail_ptr, uint32_t detail_len
);
```

**Returns:** `0` on success, `-1` on error.

Creates a RowItem — a list row with a title (bold) and detail (muted, secondary text).

---

### `er_ui_wasm_new_badge`

```c
int32_t er_ui_wasm_new_badge(
    uint32_t slot,
    const uint8_t* label_ptr, uint32_t label_len,
    uint32_t variant
);
```

**Returns:** `0` on success, `-1` on error.

Creates a Badge component. `variant`:

| Value | Variant |
|---|---|
| 0 | `default` |
| 1 | `secondary` |
| 2 | `destructive` |
| 3 | `outline` |
| 4 | `ghost` |
| 5 | `link` |

---

### `er_ui_wasm_new_checkbox`

```c
int32_t er_ui_wasm_new_checkbox(
    uint32_t slot, uint32_t id,
    const uint8_t* label_ptr, uint32_t label_len,
    uint32_t checked
);
```

**Returns:** `0` on success, `-1` on error.

Creates a Checkbox component. `checked`: `0` = unchecked, non-zero = checked.

---

### `er_ui_wasm_new_input`

```c
int32_t er_ui_wasm_new_input(
    uint32_t slot, uint32_t id,
    const uint8_t* placeholder_ptr, uint32_t placeholder_len
);
```

**Returns:** `0` on success, `-1` on error.

Creates a single-line text Input component with a placeholder string.

---

### `er_ui_wasm_new_slider`

```c
int32_t er_ui_wasm_new_slider(
    uint32_t slot, uint32_t id,
    const uint8_t* label_ptr, uint32_t label_len,
    float value
);
```

**Returns:** `0` on success, `-1` on error.

Creates a horizontal range Slider component. `value` is the initial position (typically 0.0–1.0).

---

### `er_ui_wasm_new_card`

```c
int32_t er_ui_wasm_new_card(
    uint32_t slot,
    const uint8_t* title_ptr, uint32_t title_len,
    const uint8_t* detail_ptr, uint32_t detail_len
);
```

**Returns:** `0` on success, `-1` on error.

Creates a Card component (panel surface variant) with title and detail text.

---

### `er_ui_wasm_new_separator`

```c
int32_t er_ui_wasm_new_separator(uint32_t slot);
```

**Returns:** `0` on success, `-1` on error.

Creates a horizontal separator/divider line.

---

### `er_ui_wasm_new_icon`

```c
int32_t er_ui_wasm_new_icon(
    uint32_t slot,
    const uint8_t* label_ptr, uint32_t label_len,
    uint32_t icon_value
);
```

**Returns:** `0` on success, `-1` on error.

Creates an Icon component. `icon_value` is the icon's `u16` enum value (0–699 for the 700+ built-in icons). See [ICONS.md](ICONS.md) for the full list.

---

## Typical Usage Flow

```js
// 1. Load WASM module
const { instance } = await WebAssembly.instantiate(wasmBytes, {
  env: { zui_log: (p, l) => {}, zui_now: () => performance.now() }
});

// 2. Allocate and populate a slot
const slot = instance.exports.er_ui_wasm_alloc();
let label = "Click me";
let labelMem = encodeString(label);
instance.exports.er_ui_wasm_new_button(
  slot, 0,           // slot, id
  labelMem, label.length,  // label
  0,                 // variant: primary
  0, 0               // no icons
);

// 3. Render
const cmds = instance.exports.er_ui_wasm_render(
  slot, 0, 0,   // slot, cmd_out (unused), cap (unused)
  0, 0, 200, 40 // bounds: x, y, w, h
);
// cmd is the number of Scene commands written to WASM memory

// 4. Free when done
instance.exports.er_ui_wasm_free(slot);
```
