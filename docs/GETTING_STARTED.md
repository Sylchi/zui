# Getting Started with ZUI

ZUI is a pure-Zig UI framework compiled to WebAssembly. Build component trees declaratively in JavaScript, then render them to Scene commands.

## Installation

```bash
npm install @edgerun/zui
```

Or grab the files from [GitHub](https://github.com/Sylchi/zui):
- `dist/zui.wasm` — the compiled WASM binary
- `dist/zui.mjs` — the JavaScript wrapper
- `dist/zui.d.ts` — TypeScript type definitions

## Quick Start

Create an HTML file and a local server (WASM requires HTTP):

```html
<!DOCTYPE html>
<html lang="en">
<body>
  <div id="output"></div>
  <script type="module">
    import init from './node_modules/@edgerun/zui/dist/zui.mjs';

    const zui = await init('./node_modules/@edgerun/zui/dist/zui.wasm');

    // Build a declarative component tree
    zui.setTree({
      type: 'column',
      gap: 8,
      padding: 16,
      children: [
        { type: 'text', value: 'Hello ZUI!' },
        { type: 'button', id: 1, label: 'Click', variant: 0 },
        { type: 'input', id: 2, placeholder: 'Type...' },
      ],
    });

    // Render to Scene commands
    const results = zui.renderAll(400, 300);
    console.log(`${results.length} components rendered`);
    for (const r of results) {
      console.log(`${r.type}: ${r.commandCount} commands @ (${r.bounds.x},${r.bounds.y})`);
    }
  </script>
</body>
</html>
```

Serve it:

```bash
npx serve .    # any static file server works
```

## Two API Levels

ZUI has two API levels — you can use either or both.

### 1. High-Level Tree API (recommended)

Declare your UI as a JSON tree. ZUI handles slot management, layout, and rendering automatically.

```js
zui.setTree({
  type: 'column',
  gap: 12,
  padding: 16,
  children: [
    { type: 'text', value: 'My App', width: 400 },
    { type: 'button', id: 1, label: 'Save', variant: 0, width: 120 },
    { type: 'input', id: 2, placeholder: 'Name...', width: 400 },
    { type: 'checkbox', id: 3, label: 'Enable', checked: true, width: 400 },
    { type: 'separator' },
    { type: 'card', title: 'Status', detail: 'All systems nominal' },
  ],
});

const results = zui.renderAll(600, 400);
```

### 2. Low-Level Slot API

Direct access to the WASM C ABI for advanced use cases. Manage slots manually.

```js
const slot = zui.alloc();
// Write string to WASM memory
const encoder = new TextEncoder();
const bytes = encoder.encode('Hello');
const view = new Uint8Array(zui.#memory.buffer); // private — use internal
zui.render(slot, 0, 0, 200, 40);
zui.free(slot);
```

## Tree Node Types

### Containers

| Type | Description | Properties |
|---|---|---|
| `column` | Vertical flex layout | `gap`, `padding`, `children` |
| `row` | Horizontal flex layout | `gap`, `padding`, `children` |

### Leaf Components

| Type | Description | Properties |
|---|---|---|
| `text` | Text display | `value`, `width?`, `height?` |
| `button` | Clickable button | `id`, `label`, `variant?` (0–5), `width?` |
| `input` | Single-line text entry | `id`, `placeholder?`, `width?` |
| `card` | Panel card | `title`, `detail?`, `width?` |
| `badge` | Notification badge | `label`, `variant?` (0–5), `width?` |
| `checkbox` | Toggle checkbox | `id`, `label`, `checked?`, `width?` |
| `slider` | Range slider | `id`, `label`, `value?`, `width?` |
| `separator` | Horizontal divider | `width?` |
| `icon` | Single icon display | `label`, `iconValue` (0–699), `width?` |
| `row_item` | List row | `id`, `title`, `detail?`, `width?` |

### Button Variants

| Value | Variant |
|---|---|
| 0 | primary |
| 1 | secondary |
| 2 | outline |
| 3 | ghost |
| 4 | destructive |
| 5 | link |

### Badge Variants

| Value | Variant |
|---|---|
| 0 | default |
| 1 | secondary |
| 2 | destructive |
| 3 | outline |
| 4 | ghost |
| 5 | link |

## Rendering Results

`renderAll()` returns an array of `SlotRenderResult` objects:

```ts
interface SlotRenderResult {
  path: string;        // tree path, e.g. "root[2]"
  slot: number;        // WASM slot index
  type: string;        // component type
  bounds: { x, y, w, h };  // computed position in logical pixels
  commandCount: number;     // number of Scene commands produced
}
```

Each command corresponds to a drawing operation (rect, text, icon, etc.). The host can read the command stream directly from WASM linear memory for custom rendering.

## Examples

Check the `examples/` directory for working demos:

```bash
# Serve the examples
npx serve examples/basic/
# or
npx serve examples/todo/
```

- **basic** — Component tree overview with all widget types
- **todo** — Interactive todo list with add/clear

## Building from Source

```bash
git clone https://github.com/Sylchi/zui.git
cd zui

# Build WASM (Debug)
zig build wasm

# Build WASM (ReleaseSmall — 600 KB)
zig build wasm -Doptimize=ReleaseSmall

# Generate HTML docs from Zig /// comments
zig build docs

# Run tests
zig build test

# Copy WASM to dist/
cp zig-out/bin/zui.wasm dist/
```

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system design, [API.md](API.md) for the complete WASM C ABI reference, and [WASM.md](WASM.md) for build and integration details.
