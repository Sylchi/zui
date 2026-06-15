# @edgerun/zui

Pure-Zig UI framework compiled to WASM. 55+ components, 700+ built-in icons, vector fonts, flex layout — zero dependencies.

## Quick Start

```js
import init from '@edgerun/zui';

const zui = await init('zui.wasm');

// Allocate a slot and create a button
const slot = zui.alloc();
zui.newButton(slot, 0, 'Click me', 0);  // variant 0 = primary

// Render into Scene commands
const cmds = zui.render(slot, 0, 0, 200, 40);

// Free when done
zui.free(slot);
```

## Slot-Based API

The WASM module manages 64 fixed-size component slots — no dynamic allocation:

1. `alloc()` → slot index (or -1 if full)
2. `new_text(slot, value)` / `new_button(slot, id, label, variant, ...)` / etc.
3. `render(slot, x, y, w, h)` → number of Scene commands
4. `measure(slot, w, h)` → `{ width, height }`
5. `serialize(slot)` → canonical object bytes
6. `free(slot)` → release slot

## Components

| Constructor | Parameters |
|---|---|
| `newText(slot, value)` | UTF-8 string |
| `newButton(slot, id, label, variant, leadingIcon, trailingIcon)` | variant: 0–5 |
| `newRowItem(slot, id, title, detail)` | list row |
| `newBadge(slot, label, variant)` | variant: 0–5 |
| `newCheckbox(slot, id, label, checked)` | checked: bool |
| `newInput(slot, id, placeholder)` | single-line text |
| `newSlider(slot, id, label, value)` | 0.0–1.0 |
| `newCard(slot, title, detail)` | panel card |
| `newSeparator(slot)` | divider line |
| `newIcon(slot, label, iconValue)` | icon ID: 0–699 |

## Build

```bash
zig build wasm                         # Debug
zig build wasm -Doptimize=ReleaseSmall # 600 KB
zig build docs                         # HTML docs from /// comments
zig build test                         # Run component tests
```

## Documentation

- [API Reference](docs/API.md) — Complete WASM C ABI reference
- [Architecture](docs/ARCHITECTURE.md) — System design and layers
- [WASM Platform](docs/WASM.md) — Build and integration guide
- [Components](docs/COMPONENTS.md) — Widget list and patterns
- [Icons](docs/ICONS.md) — 700+ built-in icon reference
- [Font System](docs/FONT_SYSTEM.md) — Vector font format
- [Render Pipeline](docs/RENDER_PIPELINE.md) — Scene → pixels
- [Generated Docs](https://edgerun-metal.github.io/zui/) — HTML from /// comments

## Publishing

```bash
npm run build
npm publish --access public
```

## License

MIT
