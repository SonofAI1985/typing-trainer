import type { FingerInfo, FingerName } from '../types'

// Color palette for 10 fingers
export const FINGER_COLORS: Record<FingerName, string> = {
  'left-pinky':   '#8B5CF6', // purple
  'left-ring':    '#3B82F6', // blue
  'left-middle':  '#06B6D4', // cyan
  'left-index':   '#10B981', // green
  'left-thumb':   '#F59E0B', // amber
  'right-thumb':  '#F59E0B', // amber (same as left)
  'right-index':  '#F97316', // orange
  'right-middle': '#EF4444', // red
  'right-ring':   '#EC4899', // pink
  'right-pinky':  '#A855F7', // violet
}

export const FINGER_NAMES: Record<FingerName, string> = {
  'left-pinky':   '左手小指',
  'left-ring':    '左手无名指',
  'left-middle':  '左手中指',
  'left-index':   '左手食指',
  'left-thumb':   '左手拇指',
  'right-thumb':  '右手拇指',
  'right-index':  '右手食指',
  'right-middle': '右手中指',
  'right-ring':   '右手无名指',
  'right-pinky':  '右手小指',
}

function fi(finger: FingerName): FingerInfo {
  return {
    finger,
    hand: finger.startsWith('left') ? 'left' : 'right',
    name: FINGER_NAMES[finger],
    color: FINGER_COLORS[finger],
  }
}

// Standard QWERTY finger assignment
export const KEY_FINGER_MAP: Record<string, FingerInfo> = {
  // ─── LEFT HAND ───────────────────────────────────
  // Left pinky: Esc, `, 1, Tab, Q, CapsLock, A, Shift(L), Z, Ctrl(L)
  'Escape':      fi('left-pinky'),
  'Backquote':   fi('left-pinky'),
  'Digit1':      fi('left-pinky'),
  'Tab':         fi('left-pinky'),
  'KeyQ':        fi('left-pinky'),
  'CapsLock':    fi('left-pinky'),
  'KeyA':        fi('left-pinky'),
  'ShiftLeft':   fi('left-pinky'),
  'KeyZ':        fi('left-pinky'),
  'ControlLeft': fi('left-pinky'),

  // Left ring: 2, W, S, X
  'Digit2': fi('left-ring'),
  'KeyW':   fi('left-ring'),
  'KeyS':   fi('left-ring'),
  'KeyX':   fi('left-ring'),

  // Left middle: 3, E, D, C
  'Digit3': fi('left-middle'),
  'KeyE':   fi('left-middle'),
  'KeyD':   fi('left-middle'),
  'KeyC':   fi('left-middle'),

  // Left index: 4, 5, 6, R, T, F, G, V, B
  'Digit4': fi('left-index'),
  'Digit5': fi('left-index'),
  'Digit6': fi('left-index'),
  'KeyR':   fi('left-index'),
  'KeyT':   fi('left-index'),
  'KeyF':   fi('left-index'),
  'KeyG':   fi('left-index'),
  'KeyV':   fi('left-index'),
  'KeyB':   fi('left-index'),

  // Left thumb: Space (left half), Win, Alt(L)
  'Space':     fi('left-thumb'),
  'MetaLeft':  fi('left-thumb'),
  'AltLeft':   fi('left-thumb'),

  // ─── RIGHT HAND ──────────────────────────────────
  // Right thumb: Space (right half), Alt(R)
  'SpaceRight': fi('right-thumb'),
  'AltRight':   fi('right-thumb'),

  // Right index: 7, 8, Y, U, H, J, N, M
  'Digit7': fi('right-index'),
  'Digit8': fi('right-index'),
  'KeyY':   fi('right-index'),
  'KeyU':   fi('right-index'),
  'KeyH':   fi('right-index'),
  'KeyJ':   fi('right-index'),
  'KeyN':   fi('right-index'),
  'KeyM':   fi('right-index'),

  // Right middle: 9, I, K, ,
  'Digit9': fi('right-middle'),
  'KeyI':   fi('right-middle'),
  'KeyK':   fi('right-middle'),
  'Comma':  fi('right-middle'),

  // Right ring: 0, O, L, .
  'Digit0': fi('right-ring'),
  'KeyO':   fi('right-ring'),
  'KeyL':   fi('right-ring'),
  'Period': fi('right-ring'),

  // Right pinky: -, =, Backspace, P, [, ], \, ;, ', Enter, /, Shift(R), Ctrl(R), Fn
  'Minus':         fi('right-pinky'),
  'Equal':         fi('right-pinky'),
  'Backspace':     fi('right-pinky'),
  'KeyP':          fi('right-pinky'),
  'BracketLeft':   fi('right-pinky'),
  'BracketRight':  fi('right-pinky'),
  'Backslash':     fi('right-pinky'),
  'Semicolon':     fi('right-pinky'),
  'Quote':         fi('right-pinky'),
  'Enter':         fi('right-pinky'),
  'Slash':         fi('right-pinky'),
  'ShiftRight':    fi('right-pinky'),
  'ControlRight':  fi('right-pinky'),
  'Fn':            fi('right-pinky'),

  // Function keys
  'F1':  fi('left-pinky'),
  'F2':  fi('left-ring'),
  'F3':  fi('left-middle'),
  'F4':  fi('left-index'),
  'F5':  fi('left-index'),
  'F6':  fi('left-index'),
  'F7':  fi('right-index'),
  'F8':  fi('right-index'),
  'F9':  fi('right-middle'),
  'F10': fi('right-ring'),
  'F11': fi('right-pinky'),
  'F12': fi('right-pinky'),
}

// Map from e.key value to KeyDef id (for common typed keys)
export const KEY_TO_ID: Record<string, string> = {
  ' ': 'Space',
  'a': 'KeyA', 'b': 'KeyB', 'c': 'KeyC', 'd': 'KeyD',
  'e': 'KeyE', 'f': 'KeyF', 'g': 'KeyG', 'h': 'KeyH',
  'i': 'KeyI', 'j': 'KeyJ', 'k': 'KeyK', 'l': 'KeyL',
  'm': 'KeyM', 'n': 'KeyN', 'o': 'KeyO', 'p': 'KeyP',
  'q': 'KeyQ', 'r': 'KeyR', 's': 'KeyS', 't': 'KeyT',
  'u': 'KeyU', 'v': 'KeyV', 'w': 'KeyW', 'x': 'KeyX',
  'y': 'KeyY', 'z': 'KeyZ',
  '1': 'Digit1', '2': 'Digit2', '3': 'Digit3', '4': 'Digit4',
  '5': 'Digit5', '6': 'Digit6', '7': 'Digit7', '8': 'Digit8',
  '9': 'Digit9', '0': 'Digit0',
  '-': 'Minus', '=': 'Equal', '[': 'BracketLeft', ']': 'BracketRight',
  '\\': 'Backslash', ';': 'Semicolon', "'": 'Quote', ',': 'Comma',
  '.': 'Period', '/': 'Slash', '`': 'Backquote',
}
