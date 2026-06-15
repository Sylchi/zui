# Render Pipeline

The ZUI render pipeline transforms a declarative Scene (high-level IR) into pixels through three phases.

## Dual IR Architecture

```
Scene (Commands)           High-Level IR
     │                      semantic, string-rich
     │                      Color, FontWeight, Icon enum values
     v
Pipeline.packScene()       3-phase lowering
     │
Buffers (flat f32[])       Low-Level IR
     │                      GPU-ready, fixed stride per primitive
     v
Backend                     Software / GLES / Headless
```

### High-Level IR — Scene Commands

The Scene is an `ArrayList(Command)` where each command is a tagged union:

- `rect` — filled rect, border, shadow, linear gradient, pie slice
- `text` — text at position with font weight, color
- `icon_quad` — icon by ID at position with size + color
- `image_quad` — textured quad
- `text_quad` — text on curved path
- `overlay_*` — overlay variants (top layer, no clip)
- `drag_source`, `drop_target` — drag-and-drop interaction
- `transition` — animation transition

This IR is what components produce. It's human-readable and debuggable but not GPU-friendly (string data, enums, variable-size).

### Low-Level IR — Render Buffers

The low-level IR is a set of flat `[]f32` arrays, one per primitive kind, with fixed strides:

| Buffer | Stride | Fields |
|---|---|---|
| `rects` | 15 | x, y, w, h, radius, shadow, color.rgba, color2.rgba, mode |
| `overlay_rects` | 15 | same as above |
| `texts` | 8 | x, baseline_y, font_px, codepoint_weight_key, color.rgba |
| `overlay_texts` | 8 | same as above |
| `icon_quads` | 9 | x, y, w, h, color.rgba, icon_id |
| `overlay_icon_quads` | 9 | same as above |
| `icon_lines` | 6 | x, y, color.rgba (vertex) |
| `overlay_icon_lines` | 6 | same as above |
| `images` | 8 | x, y, u, v, color.rgba (textured quad vertex) |

This maps directly to GPU instanced drawing (rects, icons) and vertex buffers (text, images, icon lines).

## Three-Phase Pipeline

### Phase 1: Prepare Scene Assets

```
Command[] ──→ scan for text commands
              collect unique codepoints
              prepare glyphs in SDF font atlas
              prepare icon resources
```

### Phase 2: Pack Scene to Buffers

```
Scene commands ──→ iterate commands
                   for each:
                     rect       → pushRect()      (15 f32s)
                     icon_quad  → pushSvgQuad()   (9 f32s)
                     image_quad → pushImage()      (8 f32s)
                   then:
                     icon instances → tessellate to icon_lines
```

### Phase 3: Pack Text

```
Scene commands ──→ iterate text commands
                   for each codepoint:
                     look up glyph metrics + kerning
                     pushTextGlyph()   (8 f32s)
```

## Font System

### Vector Font Format (ERFNTV3)

Custom binary format with 48-byte header:

```
┌────────┬──────────────┬──────────────┬──────────────┐
│ Header │ Glyph Table  │ Kern Table   │ Commands     │
│  48 B  │ records[256] │ pairs[n]     │  var-length  │
└────────┴──────────────┴──────────────┴──────────────┘
```

Each glyph record (20 bytes):
- `bbox_min_x/y`, `bbox_max_x/y` — bounding box
- `advance` — horizontal advance
- `command_offset`, `command_length` — offset into command table
- `base_index` — for composite glyphs

Commands: `move_to` (1), `line_to` (2), `quad_to` (3), `close` (4)

### Weighted SDF Atlas

`font_atlas_weighted.zig` builds a single-channel alpha texture atlas:
- All requested glyphs rendered at once
- Weighted by usage frequency (common chars get higher quality)
- Used by the software backend for text rendering

### Rasterizer

`vector_raster.zig` scanline-rasterizes vector outlines:
```
Glyph commands → scanline intersection → GlyphBitmap
```

Supports non-zero winding fill rule. Output is a 1-bit alpha bitmap.

## Backends

### Software (`backends/software.zig`)

Full CPU rasterizer. 3186 lines. Handles all primitive types:

- **Rects**: Fill, border, shadow (box blur), linear gradient, pie slice
- **Text**: SDF sampling from weighted atlas with sub-pixel AA
- **Icons**: Multi-pass: mask rasterization → fill with color → composite
- **Images**: Bilinear sampled textured quads
- **Overlays**: Same as above but without clip rect

Renders to a `Framebuffer` struct (pixel slice + metadata).

Best for: Canvas 2D (WASM), embedded displays, CPU-only environments.

### GPU (`backends/gpu.zig`)

Abstract GPU backend interface (784 lines):

```zig
pub const Device = struct {
    vtable: *const VTable,
    pub fn beginFrame(...) void;
    pub fn uploadPrimitives(...) void;
    pub fn renderTiles(...) void;
    pub fn present(...) void;
};
```

Tiled rendering model with `Partition`, `Plane`, `Tile` for frustum culling and parallel render.

### OpenGL ES 2.0 (`backends/gles.zig`)

Concrete GLES implementation (644 lines):
- Compiles GLSL shaders at init
- Uploads IR batches as vertex buffer data
- Draws instanced for rects/icons
- Uses texture atlas for fonts
- Supports `CpuFilledGpuBuffer` mode (CPU fills buffers, GPU rasterizes)

## Presentation

The `present.zig` module defines how rendered frames reach the display:

```zig
pub const Destination = enum {
    pixel_frame,     // raw RGBA pixel buffer
    packed_frame,    // packed low-level IR
    command_frame,   // high-level command stream
    native_surface,  // Wayland/DRM surface commit
};

pub const Transport = enum {
    pixel_bytes,
    packed_buffers,
    command_stream,
    surface_commit,
};
```

`surface.zig` provides dirty-tiled pixel buffer management with invalidation tracking. Only changed tiles are re-rendered/uploaded.
