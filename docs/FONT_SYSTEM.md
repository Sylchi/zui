# Font System

ZUI has a built-in vector font system — no external font files, no system fonts, no FreeType. Three weights included: Regular, Semibold, Bold.

## Format (ERFNTV3)

Custom binary format:

```
┌──────────┐ ┌──────────────┐ ┌────────────────┐ ┌──────────────┐
│  Header  │ │  Glyph Table │ │  Kerning Pairs │ │  Commands    │
│  48 B    │ │  256 × 20 B  │ │  n × 12 B      │ │  var-length   │
└──────────┘ └──────────────┘ └────────────────┘ └──────────────┘
```

### Header (48 bytes)

| Field | Type | Description |
|---|---|---|
| magic | [8]u8 | `"ERFNTV3\n"` |
| glyph_count | u16 | Number of glyph records |
| units_per_em | u16 | Font units per em |
| ascender | f32 | Ascender height |
| descender | f32 | Descender depth |
| line_gap | f32 | Line gap |
| y_min | f32 | Minimum Y |
| y_max | f32 | Maximum Y |
| kern_count | u16 | Number of kerning pairs |

### Glyph Record (20 bytes each)

| Field | Type | Description |
|---|---|---|
| codepoint | u32 | Unicode codepoint |
| bbox_min_x | f32 | Bounding box min X |
| bbox_min_y | f32 | Bounding box min Y |
| bbox_max_x | f32 | Bounding box max X |
| bbox_max_y | f32 | Bounding box max Y |
| advance | f32 | Horizontal advance |
| command_offset | u32 | Offset into command table |
| command_length | u32 | Number of commands |

### Commands

Commands are variable-length sequences:

```zig
pub const Command = union(enum) {
    move_to: Point,      // (x, y)
    line_to: Point,      // (x, y)
    quad_to: Quadratic,  // (cx, cy, x, y)
    close,
};
```

## How It Works

### Vector Outline

Each glyph is stored as vector outlines (move_to/line_to/quad_to/close) in font units. These can be scaled to any pixel size — the system is genuinely vector-scalable.

### Scanline Rasterization (`vector_raster.zig`)

For the software backend:
```
vector commands → scanline intersection → 1-bit alpha bitmap
```

The rasterizer walks each scanline of the glyph bounding box, computes line intersections, and fills using non-zero winding rule. Output is a `GlyphBitmap` — a packed 1-bit-per-pixel alpha mask.

### Weighted SDF Atlas (`font_atlas_weighted.zig`)

For quality text rendering:

1. Request all needed glyphs for a frame
2. Render each to its weighted SDF (signed distance field) in a single-channel texture atlas
3. Sample the atlas during compositing for sub-pixel AA

The atlas is weighted: commonly used characters (e, t, a, o, etc.) get higher quality SDF sampling.

### Text Measurement (`text_metrics.zig`)

Pure measurement against the font data — no rasterization needed:

```zig
pub fn textWidth(text: []const u8, weight: FontWeight) f32;
    // Sum of glyph advances + kerning pairs

pub fn textHeight(weight: FontWeight) f32;
    // ascender - descender + line_gap

pub fn maxWidth(lines: []const []const u8, weight: FontWeight) f32;
    // Maximum width across multiple lines
```

## Font Assets

Embedded at compile-time via `@embedFile`:

| File | Weight |
|---|---|
| `assets/font_regular.obj` | Regular |
| `assets/font_semibold.obj` | Semibold |
| `assets/font_bold.obj` | Bold |

Each is ~8-12 KB. Total font data: ~30 KB.

## Limitations

- **One size fits all**: The font is sized by specifying the desired pixel height. The vector outlines are interpolated but the hinting is basic (no TrueType-style grid-fitting).
- **Fixed glyph set**: Only ASCII + common Latin codepoints. No CJK, Arabic, or emoji.
- **No OpenType features**: No ligatures, no font variations, no contextual alternates.
- **Weight-limited**: Only 3 weights (Regular, Semibold, Bold). No variable font support.
