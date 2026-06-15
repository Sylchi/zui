# ZUI Architecture

ZUI is a layered UI framework with zero external dependencies. Everything — color types, vector fonts, icon rasterization, layout engine, 55+ component widgets, and software renderer — is pure Zig.

## Design Principles

1. **No allocations in the hot path**. Component render/measure methods write to pre-allocated Scene buffers. The Scene owns all memory; components just push commands.
2. **Fixed-size where it counts**. The WASM bridge uses static arrays (64 max slots, 1024 commands, 256 B scratch). No malloc in the render loop.
3. **Declarative components, imperative render**. Components describe *what* to render (Node tree). The render pipeline decides *how*.
4. **Platform-agnostic core**. The UI framework has zero platform dependencies. The WASM C ABI entry point (`ui/wasm.zig`) is the only platform-specific layer.
5. **Dual IR for portability**. The high-level Scene IR is string-rich and semantic; the low-level Render IR is flat f32 arrays directly consumable by GPU or CPU rasterizer.

## Layers

```
┌────────────────────────────────────────────┐
│           WASM C ABI (ui/wasm.zig)         │
│  20 er_ui_wasm_* exports, slot-based API   │
├────────────────────────────────────────────┤
│              COMPONENTS                    │
│  ui/infra/       (8 files)                │
│    Component.zig  — union of all widgets   │
│    Primitives.zig — shared render helpers  │
│    Codec.zig      — canonical serialization│
│    ViewLayout.zig — flex layout <-> View   │
│    ListLayout.zig — linear list layout     │
│    TreeCodec.zig  — node tree codec        │
│    TestSupport.zig — test utilities        │
│  ui/components/   (55+ widget files)       │
│    Button, Input, Text, Slider, Card, ...  │
├────────────────────────────────────────────┤
│     LAYOUT          │      ICONS           │
│  ui/layouts/Types.zig│  ui/icon.zig        │
│  ui/layouts/Flex.zig │  ui/icon_pack.zig   │
│  ui/text_metrics.zig │  ui/icon_vector.zig │
├────────────────────────────────────────────┤
│                  CORE                      │
│  ui/core.zig         Color, Scene, Command │
│  ui/node.zig         Node (virtual DOM)    │
│  ui/geometry.zig     Rect                  │
│  ui/theme.zig        Design tokens         │
│  ui/interaction.zig  Hit testing           │
│  ui/codec.zig        Binary codec helpers  │
├────────────────────────────────────────────┤
│               RENDER                       │
│  ui/render/font.zig  Vector font rendering │
├────────────────────────────────────────────┤
│            VENDORED DEPS (src/ root)       │
│  clock.zig, bytes.zig, object.zig,         │
│  math.zig, bounded.zig, crypto.zig,        │
│  identity.zig, preimage.zig, seal.zig,     │
│  intent.zig, authority.zig, tpmapp.zig,    │
│  store.zig, arena.zig, region.zig,         │
│  input.zig                                 │
└────────────────────────────────────────────┘
```

## Core (`ui/core.zig`)

### Color

```zig
pub const Color = packed struct(u32) {
    r: u8,
    g: u8,
    b: u8,
    a: u8 = 255,
};
```

Named constants: `clear`, `bg`, `panel`, `row`, `border`, `text`, `muted`, `accent`. The packed u32 layout matches GPU RGBA8.

### Rect

```zig
pub const Rect = struct {
    x: f32, y: f32, w: f32, h: f32,
    // Methods: init, inset, contains, intersect, union, center
};
```

All coordinates are logical pixels. Scale transformation happens at the backend.

### Scene

The Scene is a flat array of `Command` tagged unions — the output of component rendering. 13 command variants:

| Variant | Purpose |
|---|---|
| `rect` | Filled rect, border, shadow, gradient, pie slice |
| `overlay_rect` | Overlay layer rect version |
| `border` | Border around rect |
| `text` / `overlay_text` | Text with font weight + color |
| `icon_quad` / `overlay_icon_quad` | Icon at position |
| `svg_quad` | SVG-style quad |
| `text_quad` | Text on curved path |
| `image_quad` | Textured image quad |
| `drag_source` / `drop_target` | Drag-and-drop interaction |
| `transition` | Animation transition |

### Node

The `Node` union is the virtual DOM — 40+ variant types, one per widget. Nodes are constructed via factory functions in `ui/core.zig`:

```zig
const node = ui.buttonDetailNode(0, "Submit", .primary, 0, 0);
```

## Layout (`ui/layouts/`)

### Constraint-based Flexbox

1. Parent passes `Constraints` (min/max width/height) to children
2. Children return `Measurement` (natural size within constraints)
3. Parent computes positions based on `Axis` (row/column), `Align`, gap, padding
4. Positions returned as `Rect` values for each child

### Text Measurement

```zig
pub fn textWidth(text: []const u8, weight: FontWeight) f32;
pub fn textHeight(weight: FontWeight) f32;
pub fn maxWidth(lines: []const []const u8, weight: FontWeight) f32;
```

## Icons (`ui/icon.zig`, `ui/icon_pack.zig`)

700+ built-in icons as a flat `u16` enum with packed vector data:

```zig
pub const Icon = enum(u16) {
    activity = 0,
    alert_circle = 1,
    arrow_down = 2,
    // ... ~700 entries
};
```

Each icon is described by SVG-style vector opcodes stored as packed f32 arrays in precompiled binary assets (`gen/icon_asset_pack_*.bin`).

## Components (`ui/components/`, `ui/infra/`)

Every widget follows the same pattern:

```zig
pub fn Button {
    pub fn render(scene: *Scene, bounds: Rect, options: RenderOptions) void;
    pub fn measure(constraints: Constraints, options: RenderOptions) Measurement;
}
```

The `Component` union in `infra/Component.zig` encompasses all 55+ widget variants. It provides:

- **Factory functions**: `text(value)`, `button(id, label, variant, ...)`, `card(title, detail, variant)`, `input(id, placeholder)`, etc.
- **Methods**: `node()`, `render()`, `measure()`, `toObject()`, `fromObject()`, `fromNode()`
- **View struct**: Imperative drawing API with 40+ methods for layout, interaction regions, and app surface compositors

## WASM Bridge (`ui/wasm.zig`)

The WASM bridge is a C ABI entry point that manages a fixed-size array of component slots. See [API.md](API.md) for the complete reference.

## Vendored Dependencies (`src/` root)

16 standalone library modules from the edgerun-metal project:

| Module | Description |
|---|---|
| `clock.zig` | Monotonic logical clock (tick/slot/epoch/era) |
| `bytes.zig` | Low-level byte operations (copy, zero, endian) |
| `object.zig` | Canonical object format (148-byte header, BLAKE3 content-addressed) |
| `math.zig` | Math utilities (sqrt, atan2, lerp, etc.) |
| `bounded.zig` | Bounded list containers |
| `crypto.zig` | Pure-Zig BLAKE3 implementation |
| `identity.zig` | Identity model (Id, Source, Identity, delegation) |
| `preimage.zig` | Deterministic hash builder/encoder |
| `seal.zig` | Seal policy model (public, integrity_only, machine_app, etc.) |
| `intent.zig` | Time-bounded authorization intents |
| `authority.zig` | Authority delegation chains |
| `tpmapp.zig` | TPM-backed application with event audit |
| `store.zig` | Object store with deduplication |
| `arena.zig` | Arena allocator |
| `region.zig` | Memory region tracking |
| `input.zig` | Input event types (pointer, key, text) |

These modules are self-contained (zero external dependencies) and are vendored alongside the UI framework for standalone WASM builds.
