# Components

ZUI provides 55+ reusable widget components. Each component is a Zig struct implementing the render/measure pattern:

```zig
pub fn Button {
    /// Write commands to scene describing what to draw.
    pub fn render(scene: *Scene, bounds: Rect, options: RenderOptions) void;
    /// Return natural size given constraints.
    pub fn measure(constraints: Constraints, options: RenderOptions) Measurement;
}
```

## Full List

| Component | Lines | Description |
|---|---|---|
| **Accordion** | ~120 | Collapsible section with toggle header |
| **Alert** | ~100 | Inline notification banner (info/success/warning/error) |
| **AlertDialog** | ~100 | Modal confirmation dialog with backdrop |
| **AppSurfaces** | ~80 | Surface container for composited app tiles |
| **AspectRatio** | ~60 | Container maintaining aspect ratio |
| **Avatar** | ~80 | Circular user avatar with initials |
| **Badge** | ~90 | Notification dot / count badge |
| **Breadcrumb** | ~90 | Navigation breadcrumb trail |
| **Button** | ~120 | Clickable button (primary/secondary/ghost/danger) |
| **ButtonGroup** | ~80 | Spaced button cluster |
| **Calendar** | ~180 | Month grid with day selection |
| **Card** | ~110 | Container card with title/subtitle/icon |
| **Carousel** | ~130 | Horizontal swipeable panels with dots |
| **Chart** | ~140 | Bar/line data visualization |
| **Checkbox** | ~90 | Toggle checkbox with label |
| **Combobox** | ~150 | Dropdown with text input |
| **Command** | ~120 | Command palette / quick action search |
| **ContextMenu** | ~100 | Right-click popup menu |
| **Dialog** | ~120 | Modal overlay with header/body/actions |
| **Direction** | ~80 | RTL/LTR direction context |
| **Display** | ~70 | Data display with label + value |
| **Drawer** | ~110 | Side panel that slides in from edge |
| **DropdownMenu** | ~100 | Cascading popup menu |
| **Empty** | ~70 | Empty state placeholder with icon + text |
| **Field** | ~90 | Form field wrapper with label + error |
| **Graph** | ~100 | Generic graph/network visualization |
| **HoverCard** | ~90 | Popup card on hover |
| **Icon** | ~90 | Single icon display |
| **Input** | ~150 | Single-line text entry |
| **InputGroup** | ~80 | Input with prepend/append adornments |
| **InputOtp** | ~100 | One-time-password digit entry |
| **Menubar** | ~110 | Horizontal menu bar with dropdowns |
| **NavigationMenu** | ~130 | Nested navigation with submenus |
| **Pagination** | ~90 | Page number navigation |
| **Popover** | ~100 | Floating popup anchored to element |
| **RadioGroup** | ~90 | Radio button group |
| **Resizable** | ~110 | Draggable split pane container |
| **RowItem** | ~90 | Single row in a list/table |
| **ScrollArea** | ~80 | Scrollable content container |
| **Select** | ~120 | Native-style dropdown selector |
| **Semantic** | ~60 | Semantic HTML-like element |
| **Sheet** | ~100 | Bottom sheet / slide-up panel |
| **Sidebar** | ~110 | Side navigation panel |
| **Slider** | ~120 | Horizontal/vertical range slider |
| **Slot** | ~80 | Content slot / named insertion point |
| **Stack** | ~100 | Flex stack (row/column with gap) |
| **Switch** | ~80 | Toggle switch on/off |
| **Table** | ~180 | Sortable data table with columns |
| **Tabs** | ~110 | Tab bar with active indicator |
| **Text** | ~130 | Text display (heading/body/caption/code) |
| **Textarea** | ~100 | Multi-line text input |
| **Timeline** | ~90 | Chronological event timeline |
| **Toast** | ~90 | Notification toast with auto-dismiss |
| **Toggle** | ~80 | Binary toggle with label |
| **ToggleGroup** | ~80 | Grouped toggle buttons (single/multi select) |
| **Tooltip** | ~80 | Hover tooltip with delay |
| **Tree** | ~150 | Collapsible tree with icons |
| **Workspace** | ~120 | Multi-panel workspace container |

## Usage

### Zig (Native)

```zig
const zui = @import("zui");
const scene = zui.Scene.init(allocator);

// Push a button
zui.widgets.Button.render(&scene, bounds, .{
    .label = "Submit",
    .variant = .primary,
    .on_click = handleSubmit,
});

// Push a card with title + description
zui.widgets.Card.render(&scene, bounds, .{
    .title = "Settings",
    .subtitle = "Manage your preferences",
    .icon = .settings,
});
```

### WASM (JS/WASM)

```js
import init, { setTree } from '@edgerun/zui';
await init();

setTree({
  type: 'stack',
  children: [
    { type: 'button', label: 'Click me', variant: 'primary' },
    { type: 'card', title: 'Hello', subtitle: 'World' }
  ]
});
```

## Creating Custom Components

```zig
pub const MyWidget = struct {
    pub fn render(scene: *Scene, bounds: Rect, options: RenderOptions) void {
        const pad = 8;
        const inner = bounds.insetUniform(pad);
        scene.pushRect(inner, .{ .fill = .panel, .radius = 4 });
        scene.pushText(.{
            .x = inner.x + 4,
            .y = inner.y + textHeight(.regular),
            .text = "Hello",
            .weight = .regular,
            .color = .text,
        });
    }

    pub fn measure(constraints: Constraints, options: RenderOptions) Measurement {
        return .{ .width = 200, .height = 40 };
    }
};
```
