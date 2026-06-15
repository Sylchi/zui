/**
 * ZUI — Pure-Zig UI framework compiled to WASM.
 *
 * Two API levels:
 * 1. Slot API (low-level): alloc/free slots, create components, render individually.
 * 2. Tree API (high-level): setTree(JSON) → auto slot management → renderAll().
 */

// ── Tree node types ─────────────────────────────────────────

export interface TextNode {
  type: 'text';
  value: string;
  weight?: 'regular' | 'semibold' | 'bold';
  width?: number;
  height?: number;
}

export interface ButtonNode {
  type: 'button';
  id: number;
  label: string;
  variant?: number;
  leadingIcon?: number;
  trailingIcon?: number;
  width?: number;
  height?: number;
}

export interface InputNode {
  type: 'input';
  id: number;
  placeholder?: string;
  width?: number;
  height?: number;
}

export interface CardNode {
  type: 'card';
  title: string;
  detail?: string;
  width?: number;
  height?: number;
}

export interface BadgeNode {
  type: 'badge';
  label: string;
  variant?: number;
  width?: number;
  height?: number;
}

export interface CheckboxNode {
  type: 'checkbox';
  id: number;
  label: string;
  checked?: boolean;
  width?: number;
  height?: number;
}

export interface SliderNode {
  type: 'slider';
  id: number;
  label: string;
  value?: number;
  width?: number;
  height?: number;
}

export interface SeparatorNode {
  type: 'separator';
  width?: number;
  height?: number;
}

export interface IconNode {
  type: 'icon';
  label: string;
  iconValue: number;
  width?: number;
  height?: number;
}

export interface RowItemNode {
  type: 'row_item';
  id: number;
  title: string;
  detail?: string;
  width?: number;
  height?: number;
}

export interface ColumnNode {
  type: 'column';
  gap?: number;
  padding?: number;
  children?: ZuiNode[];
}

export interface RowNode {
  type: 'row';
  gap?: number;
  padding?: number;
  children?: ZuiNode[];
}

export type ZuiNode = TextNode | ButtonNode | InputNode | CardNode | BadgeNode
  | CheckboxNode | SliderNode | SeparatorNode | IconNode | RowItemNode
  | ColumnNode | RowNode;

// ── Render result ───────────────────────────────────────────

export interface SlotRenderResult {
  path: string;
  slot: number;
  type: string;
  bounds: { x: number; y: number; w: number; h: number };
  commandCount: number;
}

export interface MeasureResult {
  width: number;
  height: number;
}

// ── Options ─────────────────────────────────────────────────

export interface ZuiOptions {
  /** URL to zui.wasm */
  wasmUrl?: string;
}

// ── Main class ──────────────────────────────────────────────

export class Zui {
  readonly version: number;
  readonly maxSlots: number;
  readonly slotCount: number;

  static create(wasmUrl?: string): Promise<Zui>;

  // Slot API
  alloc(): number;
  free(idx: number): number;
  clear(): void;
  render(slot: number, x?: number, y?: number, w?: number, h?: number): number;
  measure(slot: number, w?: number, h?: number): MeasureResult;
  serialize(slot: number): Uint8Array | null;
  deserialize(bytes: Uint8Array): number;

  // Tree API
  setTree(node: ZuiNode): void;
  renderAll(containerWidth?: number, containerHeight?: number): SlotRenderResult[];
}

export default function init(wasmUrl?: string): Promise<Zui>;
