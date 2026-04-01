import type { KeyDef } from '../types'

const U = 40   // 1 unit = 40px pitch
const KH = 36  // key height

// ── Left half ──────────────────────────────────────────────────────────────
const LEFT_X_ORIGIN = 0
const LEFT_ROW_OFFSETS = [0, 0, 4, 8, 12, 18]

// ── Right main half ────────────────────────────────────────────────────────
const RIGHT_X_ORIGIN = 420   // wider gap from left half
const RIGHT_ROW_OFFSETS = [0, 0, 0, -4, -8, -14]

// ── Extension sections (navigation cluster + numpad) ───────────────────────
// Right main last key (Backspace row) ends around x=420+300=720
// Nav cluster starts at x=744 (24px gap)
const NAV_X = 744
// Numpad starts at x=744+3*40+24=888 (3 nav cols + gap)
const NUM_X = 908

const Y0 = 0   // function row
const Y1 = 48  // number row
const Y2 = 88  // top alpha (Q/Y)
const Y3 = 128 // home row (A/H)
const Y4 = 168 // bottom alpha (Z/N)
const Y5 = 208 // thumb row

function row(
  y: number, rowIdx: number, section: 'left' | 'right',
  keys: Array<{ id: string; label: string; w?: number }>
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

function key(id: string, label: string, x: number, y: number, w = 36, h = 36, section: 'left' | 'right' = 'right'): KeyDef {
  return { id, label, x, y, w, h, section }
}

export const KEYBOARD_KEYS: KeyDef[] = [
  // ─── LEFT HALF ─────────────────────────────────────────────────────────
  ...row(Y0, 0, 'left', [
    { id: 'Escape', label: 'Esc', w: 1 },
    { id: 'F1', label: 'F1' }, { id: 'F2', label: 'F2' },
    { id: 'F3', label: 'F3' }, { id: 'F4', label: 'F4' },
    { id: 'F5', label: 'F5' }, { id: 'F6', label: 'F6' },
  ]),
  ...row(Y1, 1, 'left', [
    { id: 'Backquote', label: '`' },
    { id: 'Digit1', label: '1' }, { id: 'Digit2', label: '2' },
    { id: 'Digit3', label: '3' }, { id: 'Digit4', label: '4' },
    { id: 'Digit5', label: '5' }, { id: 'Digit6', label: '6' },
  ]),
  ...row(Y2, 2, 'left', [
    { id: 'Tab', label: 'Tab', w: 1.5 },
    { id: 'KeyQ', label: 'Q' }, { id: 'KeyW', label: 'W' },
    { id: 'KeyE', label: 'E' }, { id: 'KeyR', label: 'R' },
    { id: 'KeyT', label: 'T' },
  ]),
  ...row(Y3, 3, 'left', [
    { id: 'CapsLock', label: 'Caps', w: 1.75 },
    { id: 'KeyA', label: 'A' }, { id: 'KeyS', label: 'S' },
    { id: 'KeyD', label: 'D' }, { id: 'KeyF', label: 'F' },
    { id: 'KeyG', label: 'G' },
  ]),
  ...row(Y4, 4, 'left', [
    { id: 'ShiftLeft', label: 'Shift', w: 2.25 },
    { id: 'KeyZ', label: 'Z' }, { id: 'KeyX', label: 'X' },
    { id: 'KeyC', label: 'C' }, { id: 'KeyV', label: 'V' },
    { id: 'KeyB', label: 'B' },
  ]),
  ...row(Y5, 5, 'left', [
    { id: 'ControlLeft', label: 'Ctrl', w: 1.25 },
    { id: 'MetaLeft', label: 'Win', w: 1.25 },
    { id: 'AltLeft', label: 'Alt', w: 1.25 },
    { id: 'Space', label: 'Space', w: 3.5 },
  ]),

  // ─── RIGHT MAIN HALF ───────────────────────────────────────────────────
  ...row(Y0, 0, 'right', [
    { id: 'F7', label: 'F7' }, { id: 'F8', label: 'F8' },
    { id: 'F9', label: 'F9' }, { id: 'F10', label: 'F10' },
    { id: 'F11', label: 'F11' }, { id: 'F12', label: 'F12' },
  ]),
  ...row(Y1, 1, 'right', [
    { id: 'Digit7', label: '7' }, { id: 'Digit8', label: '8' },
    { id: 'Digit9', label: '9' }, { id: 'Digit0', label: '0' },
    { id: 'Minus', label: '-' }, { id: 'Equal', label: '=' },
    { id: 'Backspace', label: '⌫', w: 1.5 },
  ]),
  ...row(Y2, 2, 'right', [
    { id: 'KeyY', label: 'Y' }, { id: 'KeyU', label: 'U' },
    { id: 'KeyI', label: 'I' }, { id: 'KeyO', label: 'O' },
    { id: 'KeyP', label: 'P' }, { id: 'BracketLeft', label: '[' },
    { id: 'BracketRight', label: ']' },
    { id: 'Backslash', label: '\\', w: 1.5 },
  ]),
  ...row(Y3, 3, 'right', [
    { id: 'KeyH', label: 'H' }, { id: 'KeyJ', label: 'J' },
    { id: 'KeyK', label: 'K' }, { id: 'KeyL', label: 'L' },
    { id: 'Semicolon', label: ';' }, { id: 'Quote', label: "'" },
    { id: 'Enter', label: 'Enter', w: 1.75 },
  ]),
  ...row(Y4, 4, 'right', [
    { id: 'KeyN', label: 'N' }, { id: 'KeyM', label: 'M' },
    { id: 'Comma', label: ',' }, { id: 'Period', label: '.' },
    { id: 'Slash', label: '/' },
    { id: 'ShiftRight', label: 'Shift', w: 2.75 },
  ]),
  ...row(Y5, 5, 'right', [
    { id: 'SpaceRight', label: 'Space', w: 3.5 },
    { id: 'AltRight', label: 'Alt', w: 1.25 },
    { id: 'Fn', label: 'Fn', w: 1.25 },
    { id: 'ControlRight', label: 'Ctrl', w: 1.25 },
  ]),

  // ─── NAVIGATION CLUSTER ────────────────────────────────────────────────
  key('PrintScreen', 'PrtSc', NAV_X,      Y0),
  key('ScrollLock',  'ScrLk', NAV_X + 40, Y0),
  key('Pause',       'Pause', NAV_X + 80, Y0),

  key('Insert',   'Ins',  NAV_X,      Y1),
  key('Home',     'Home', NAV_X + 40, Y1),
  key('PageUp',   'PgUp', NAV_X + 80, Y1),

  key('Delete',   'Del',  NAV_X,      Y2),
  key('End',      'End',  NAV_X + 40, Y2),
  key('PageDown', 'PgDn', NAV_X + 80, Y2),

  key('ArrowUp',    '↑', NAV_X + 40, Y4),
  key('ArrowLeft',  '←', NAV_X,      Y5),
  key('ArrowDown',  '↓', NAV_X + 40, Y5),
  key('ArrowRight', '→', NAV_X + 80, Y5),

  // ─── NUMPAD ─────────────────────────────────────────────────────────────
  key('NumLock',        'NumLk', NUM_X,       Y0),
  key('NumpadDivide',   '/',     NUM_X + 40,  Y0),
  key('NumpadMultiply', '*',     NUM_X + 80,  Y0),
  key('NumpadSubtract', '-',     NUM_X + 120, Y0),

  key('Numpad7', '7', NUM_X,       Y1),
  key('Numpad8', '8', NUM_X + 40,  Y1),
  key('Numpad9', '9', NUM_X + 80,  Y1),
  key('NumpadAdd', '+', NUM_X + 120, Y1, 36, 76),   // tall +

  key('Numpad4', '4', NUM_X,      Y2),
  key('Numpad5', '5', NUM_X + 40, Y2),
  key('Numpad6', '6', NUM_X + 80, Y2),

  key('Numpad1', '1', NUM_X,       Y3),
  key('Numpad2', '2', NUM_X + 40,  Y3),
  key('Numpad3', '3', NUM_X + 80,  Y3),
  key('NumpadEnter', 'Ent', NUM_X + 120, Y3, 36, 76), // tall Enter

  key('Numpad0',       '0', NUM_X,      Y4, 76, 36),  // wide 0
  key('NumpadDecimal', '.', NUM_X + 80, Y4),
]

// Total viewBox width: numpad right edge = NUM_X + 156 = 908+156 = 1064
export const KEYBOARD_TOTAL_WIDTH = 1068
export const KEYBOARD_TOTAL_HEIGHT = 252

// X boundaries for hand overlay (only over main key area)
export const LEFT_HALF_RIGHT_EDGE  = 320
export const RIGHT_HALF_LEFT_EDGE  = 420
export const RIGHT_HALF_RIGHT_EDGE = 740
