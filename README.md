# @edgerun/zui

**Pure-Zig UI framework compiled to WASM.** 55+ components, 700+ built-in vector icons, 3-weight vector font, flex layout — zero external dependencies. 600 KB ReleaseSmall.

## Quick Start

```html
<script type="module">
import init from '@edgerun/zui';

const zui = await init('node_modules/@edgerun/zui/dist/zui.wasm');

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

const results = zui.renderAll(400, 300);
for (const r of results) {
  console.log(`${r.type}: ${r.commandCount} commands @ (${r.bounds.x},${r.bounds.y})`);
}
</script>
```

## API

**High-level tree API** — declarative JSON trees, auto slot management, flex layout:

```js
zui.setTree(node);           // Set UI tree
zui.renderAll(w, h);         // Layout + render → per-slot results
```

10 leaf component types: text, button, input, card, badge, checkbox, slider, separator, icon, row_item.
2 container types: column, row (flex layout with gap + padding).

**Low-level slot API** — direct WASM C ABI access:

```js
zui.alloc();                 // → slot index
zui.free(slot);
zui.render(slot, x, y, w, h); // → command count
zui.measure(slot, w, h);      // → { width, height }
zui.serialize(slot);          // → Uint8Array of canonical object
zui.deserialize(bytes);       // → new slot index
```

## Demos

```bash
npx serve examples/basic/   # Component tree overview
npx serve examples/todo/    # Interactive todo list
```

## Build

```bash
zig build wasm                          # Debug (2.6 MB)
zig build wasm -Doptimize=ReleaseSmall   # 600 KB
zig build docs                           # HTML docs from /// source comments
zig build test                           # Run component tests
```

## Components

| Component | Properties |
|---|---|
| `text` | value, weight? |
| `button` | id, label, variant? (0–5), leadingIcon?, trailingIcon? |
| `input` | id, placeholder? |
| `card` | title, detail? |
| `badge` | label, variant? (0–5) |
| `checkbox` | id, label, checked? |
| `slider` | id, label, value? |
| `separator` | — |
| `icon` | label, iconValue (0–699) |
| `row_item` | id, title, detail? |
| `column` | gap?, padding?, children |
| `row` | gap?, padding?, children |

## Docs

- [Getting Started](docs/GETTING_STARTED.md)
- [API Reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [WASM Integration](docs/WASM.md)
- [Components](docs/COMPONENTS.md)
- [Icons (700+)](docs/ICONS.md)
- [Font System](docs/FONT_SYSTEM.md)
- [Render Pipeline](docs/RENDER_PIPELINE.md)

## License

MIT
