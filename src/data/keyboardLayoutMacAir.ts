// MacBook Air (M2/M3) keyboard layout
// Same coordinate system as standard layout so hand overlay still works.
// Main difference: Mac modifiers, no nav cluster / numpad, arrow inverted-T.

import type { KeyDef } from '../types'

const U = 40
const KH = 36

const LEFT_X_ORIGIN = 0
const LEFT_ROW_OFFSETS  = [0, 0, 4, 8, 12, 18]
const RIGHT_X_ORIGIN = 420
const RIGHT_ROW_OFFSETS = [0, 0, 0, -4, -8, -14]

const Y0 = 0
const Y1 = 48
const Y2 = 88
const Y3 = 128
const Y4 = 168
const Y5 = 208

function row(
  y: number, rowIdx: number, section: 'left' | 'right',
  keys: Array<{ id: string; label: string; w?: number }>,
): KeyDef[] {
  const origin = section === 'left' ? LEFT_X_ORIGIN : RIGHT_X_ORIGIN
  const offset = section === 'left' ? LEFT_ROW_OFFSETS[rowIdx] : RIGHT_ROW_OFFSETS[rowIdx]
  let x = origin + offset
  return keys.map(k => {
    const w = (k.w ?? 1) * U - 4
    const def: KeyDef = { id: k.id, label: k.label, x, y, w, h: KH, section }
    x += (k.w ?? 1) * U
    return def
  })
}

function key(id: string, label: string, x: number, y: number, w = 36, h = KH, section: 'left' | 'right' = 'right'): KeyDef {
  return { id, label, x, y, w, h, section }
}

// Arrow key half-height for up/down
const AH = 17
// Right-side arrow cluster x start (after ShiftRight which ends around x=762)
const ARR_X = 720

export const MAC_AIR_KEYS: KeyDef[] = [
  // ── LEFT HALF ──────────────────────────────────────────────────────────────
  ...row(Y0, 0, 'left', [
    { id: 'Escape',    label: 'esc',  w: 1 },
    { id: 'F1',  label: 'F1'  }, { id: 'F2',  label: 'F2'  },
    { id: 'F3',  label: 'F3'  }, { id: 'F4',  label: 'F4'  },
    { id: 'F5',  label: 'F5'  }, { id: 'F6',  label: 'F6'  },
  ]),
  ...row(Y1, 1, 'left', [
    { id: 'Backquote', label: '`' },
    { id: 'Digit1', label: '1' }, { id: 'Digit2', label: '2' },
    { id: 'Digit3', label: '3' }, { id: 'Digit4', label: '4' },
    { id: 'Digit5', label: '5' }, { id: 'Digit6', label: '6' },
  ]),
  ...row(Y2, 2, 'left', [
    { id: 'Tab',    label: 'tab', w: 1.5 },
    { id: 'KeyQ',   label: 'Q' }, { id: 'KeyW', label: 'W' },
    { id: 'KeyE',   label: 'E' }, { id: 'KeyR', label: 'R' },
    { id: 'KeyT',   label: 'T' },
  ]),
  ...row(Y3, 3, 'left', [
    { id: 'CapsLock', label: 'caps', w: 1.75 },
    { id: 'KeyA', label: 'A' }, { id: 'KeyS', label: 'S' },
    { id: 'KeyD', label: 'D' }, { id: 'KeyF', label: 'F' },
    { id: 'KeyG', label: 'G' },
  ]),
  ...row(Y4, 4, 'left', [
    { id: 'ShiftLeft', label: '⇧', w: 2.25 },
    { id: 'KeyZ', label: 'Z' }, { id: 'KeyX', label: 'X' },
    { id: 'KeyC', label: 'C' }, { id: 'KeyV', label: 'V' },
    { id: 'KeyB', label: 'B' },
  ]),
  ...row(Y5, 5, 'left', [
    { id: 'Fn',          label: 'fn',  w: 1    },
    { id: 'ControlLeft', label: 'ctrl', w: 1.25 },
    { id: 'AltLeft',     label: '⌥',  w: 1.25 },
    { id: 'MetaLeft',    label: '⌘',  w: 1.25 },
  ]),

  // ── RIGHT HALF ─────────────────────────────────────────────────────────────
  ...row(Y0, 0, 'right', [
    { id: 'F7',  label: 'F7'  }, { id: 'F8',  label: 'F8'  },
    { id: 'F9',  label: 'F9'  }, { id: 'F10', label: 'F10' },
    { id: 'F11', label: 'F11' }, { id: 'F12', label: 'F12' },
    // Touch ID / Power
    { id: 'Power', label: '⏻',  w: 1 },
  ]),
  ...row(Y1, 1, 'right', [
    { id: 'Digit7',    label: '7' }, { id: 'Digit8',    label: '8' },
    { id: 'Digit9',    label: '9' }, { id: 'Digit0',    label: '0' },
    { id: 'Minus',     label: '-' }, { id: 'Equal',     label: '=' },
    { id: 'Backspace', label: '⌫', w: 1.5 },
  ]),
  ...row(Y2, 2, 'right', [
    { id: 'KeyY',        label: 'Y' }, { id: 'KeyU', label: 'U' },
    { id: 'KeyI',        label: 'I' }, { id: 'KeyO', label: 'O' },
    { id: 'KeyP',        label: 'P' },
    { id: 'BracketLeft', label: '[' }, { id: 'BracketRight', label: ']' },
    { id: 'Backslash',   label: '\\', w: 1.5 },
  ]),
  ...row(Y3, 3, 'right', [
    { id: 'KeyH',    label: 'H' }, { id: 'KeyJ', label: 'J' },
    { id: 'KeyK',    label: 'K' }, { id: 'KeyL', label: 'L' },
    { id: 'Semicolon', label: ';' }, { id: 'Quote', label: "'" },
    { id: 'Enter',   label: '↩', w: 1.75 },
  ]),
  ...row(Y4, 4, 'right', [
    { id: 'KeyN',    label: 'N' }, { id: 'KeyM',   label: 'M' },
    { id: 'Comma',   label: ',' }, { id: 'Period', label: '.' },
    { id: 'Slash',   label: '/' },
    { id: 'ShiftRight', label: '⇧', w: 2.25 },
  ]),
  ...row(Y5, 5, 'right', [
    { id: 'Space',     label: 'space', w: 3.5 },
    { id: 'MetaRight', label: '⌘',    w: 1.25 },
    { id: 'AltRight',  label: '⌥',   w: 1.25 },
  ]),

  // ── Arrow keys (inverted T) — after right modifier row ───────────────────
  key('ArrowLeft',  '←', ARR_X,       Y5,      36, KH),
  key('ArrowUp',    '↑', ARR_X + 40,  Y5 - AH, 36, AH),
  key('ArrowDown',  '↓', ARR_X + 40,  Y5 + AH, 36, AH),
  key('ArrowRight', '→', ARR_X + 80,  Y5,      36, KH),
]

export const MAC_AIR_WIDTH  = ARR_X + 120   // ~840
export const MAC_AIR_HEIGHT = 252
