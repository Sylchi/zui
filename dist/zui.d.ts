/**
 * ZUI — Pure-Zig UI framework compiled to WASM.
 *
 * Slot-based component API. The WASM module manages a fixed-size array
 * of component slots (64 max). Host allocates a slot, creates a component,
 * renders/measures, then frees.
 *
 * @example
 * ```ts
 * import init from '@edgerun/zui';
 * const zui = await init('zui.wasm');
 *
 * const slot = zui.alloc();
 * zui.newButton(slot, 0, 'Click me', 0);
 * const cmds = zui.render(slot, 0, 0, 200, 40);
 * zui.free(slot);
 * ```
 */

export interface ButtonVariant {
  /** 0 = primary, 1 = secondary, 2 = outline, 3 = ghost, 4 = destructive, 5 = link */
  readonly Primary = 0;
  readonly Secondary = 1;
  readonly Outline = 2;
  readonly Ghost = 3;
  readonly Destructive = 4;
  readonly Link = 5;
}

export interface BadgeVariant {
  /** 0 = default, 1 = secondary, 2 = destructive, 3 = outline, 4 = ghost, 5 = link */
  readonly Default = 0;
  readonly Secondary = 1;
  readonly Destructive = 2;
  readonly Outline = 3;
  readonly Ghost = 4;
  readonly Link = 5;
}

export interface MeasureResult {
  readonly width: number;
  readonly height: number;
}

export class Zui {
  /** API version (currently 1) */
  readonly version: number;

  /** Maximum component slots (64) */
  readonly maxSlots: number;

  /** Currently occupied slot count */
  readonly slotCount: number;

  /**
   * Create a Zui instance from a WASM binary URL.
   * @param wasmUrl URL to `zui.wasm`
   */
  static create(wasmUrl?: string): Promise<Zui>;

  /**
   * Allocate a component slot.
   * Returns slot index (0–63) on success, or -1 if full.
   */
  alloc(): number;

  /**
   * Free a component slot.
   * @param idx Slot index to free
   */
  free(idx: number): number;

  /** Free all component slots. */
  clear(): void;

  /** Create a Text component in the given slot. */
  newText(slot: number, value: string): number;

  /** Create a Button component. */
  newButton(
    slot: number, id: number, label: string,
    variant?: number, leadingIcon?: number, trailingIcon?: number
  ): number;

  /** Create a RowItem (list row with title + detail). */
  newRowItem(slot: number, id: number, title: string, detail: string): number;

  /** Create a Badge component. */
  newBadge(slot: number, label: string, variant?: number): number;

  /** Create a Checkbox component. */
  newCheckbox(slot: number, id: number, label: string, checked?: boolean): number;

  /** Create an Input component. */
  newInput(slot: number, id: number, placeholder: string): number;

  /** Create a Slider component. */
  newSlider(slot: number, id: number, label: string, value?: number): number;

  /** Create a Card component. */
  newCard(slot: number, title: string, detail: string): number;

  /** Create a Separator component. */
  newSeparator(slot: number): number;

  /** Create an Icon component. */
  newIcon(slot: number, label: string, iconValue: number): number;

  /**
   * Render a component slot into Scene commands.
   * Returns the number of commands produced, or -1 on error.
   */
  render(slot: number, x?: number, y?: number, w?: number, h?: number): number;

  /**
   * Measure a component's preferred size.
   * Pass -1 for w/h to leave that axis unconstrained.
   */
  measure(slot: number, w?: number, h?: number): MeasureResult;

  /**
   * Serialize a component slot to canonical object bytes.
   * Returns a Uint8Array, or null on error.
   */
  serialize(slot: number): Uint8Array | null;

  /**
   * Deserialize canonical object bytes into a new slot.
   * Returns the new slot index, or -1 on error.
   */
  deserialize(bytes: Uint8Array): number;
}

/** Create and return a singleton Zui instance. */
export default function init(wasmUrl?: string): Promise<Zui>;
