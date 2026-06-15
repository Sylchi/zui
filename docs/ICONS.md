# Icon System

ZUI includes 700+ built-in icons as a flat enum with packed vector data. No external icon libraries needed.

## Icon Enum

```zig
pub const Icon = enum(u16) {
    activity = 0,
    alert_circle = 1,
    arrow_down = 2,
    arrow_left = 3,
    arrow_right = 4,
    arrow_up = 5,
    at_sign = 6,
    // ... ~700 total entries
};
```

`u16` values 0–699. The enum is auto-generated from the icon pack source.

## Vector Opcodes

Each icon is a sequence of `f32` opcodes defining SVG-style commands:

| Opcode | Value | Operands |
|---|---|---|
| `op_move_to` | 0 | x, y |
| `op_line_to` | 1 | x, y |
| `op_quad_to` | 2 | cx, cy, x, y |
| `op_cubic_to` | 3 | cx1, cy1, cx2, cy2, x, y |
| `op_close` | 4 | — |
| `op_circle` | 5 | cx, cy, r |
| `op_ellipse` | 6 | cx, cy, rx, ry |
| `op_arc_to` | 7 | rx, ry, x_axis_rotation, large_arc, sweep, x, y |
| `op_polyline` | 8 | n_points, (x, y) × n |
| `op_polygon` | 9 | n_points, (x, y) × n |
| `op_rounded_rect` | 10 | x, y, w, h, r |
| `op_begin_fill_path` | 11 | — |
| `op_begin_stroke_path` | 12 | — |
| `op_paint_rgba` | 13 | r, g, b, a |
| `op_stroke_attributes` | 14 | width, cap, join, miter_limit |
| `op_begin_path` | 15 | — |
| `op_end_path` | 16 | — |
| `op_composite` | 17 | mode |

## Packed Assets

Three precompiled binary files in `assets/gen/`:

- **icon_asset_pack_ir.bin** — All icon vector data as packed f32 arrays
- **icon_asset_pack_index.bin** — Index table: icon_id → offset into IR
- **icon_names.bin** — Human-readable name strings

Load at compile-time via `@embedFile` in `icon_pack.zig`:

```zig
pub fn iconId(icon: Icon) u32;
pub fn getIr(id: u32) []const f32;  // opcode stream for this icon
pub fn name(id: u32) []const u8;    // "alert_circle"
```

## Icon Rendering

The pipeline rasterizes icons in two stages:

1. **Mask rasterization** (`icon_mask.zig`): Convert vector opcodes to 128×128 alpha mask using fill-path scanning, stroke rendering, and anti-aliasing.

2. **Icon line buffer** (`icon_line_buffer.zig`): For GPU backends, tessellate icon instances into line vertex buffers (arc, circle, curve → line segments).

### Software Backend

```
Icon ID → vector opcodes → mask rasterization (128×128 alpha)
                          → fill with color
                          → composite into framebuffer
                          → bilinear scale to target size
```

### GPU Backend

```
Icon ID → vector opcodes → line tessellation
                          → vertex buffer upload
                          → GPU line rendering with color
```

## Adding New Icons

1. Add SVG source to the icon pack builder (external tool)
2. Regenerate `assets/gen/` binaries
3. Add entry to `icon.zig` enum
