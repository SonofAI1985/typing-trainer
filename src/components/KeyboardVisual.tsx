import { useMemo, useEffect, useState } from 'react'
import { KEYBOARD_KEYS } from '../data/keyboardLayout'
import { KEY_FINGER_MAP, KEY_TO_ID, FINGER_COLORS } from '../data/fingerMap'
import type { FingerName } from '../types'

const VW = 1068
const VH = 295

// Mirror X for left hand transform: translate(MIRROR_X, 0) scale(-1, 1)
const MIRROR_X = 350

// Hand image display size (200px wide, proportional height 200*2254/1490 ≈ 302)
const IMG_W = 200
const IMG_H = 302

// ── Fingertip pixel offsets within the 200×302 displayed right-hand image ──
// Measured from image top-left corner. Same offsets used for left hand (mirrored).
//   thumb is low/left, pinky is right
const FINGER_PX: Record<FingerName, { x: number; y: number }> = {
  'right-index':  { x: 78,  y: 22 },
  'right-middle': { x: 104, y: 11 },
  'right-ring':   { x: 131, y: 21 },
  'right-pinky':  { x: 157, y: 44 },
  'right-thumb':  { x: 24,  y: 97 },
  'left-index':   { x: 78,  y: 22 },
  'left-middle':  { x: 104, y: 11 },
  'left-ring':    { x: 131, y: 21 },
  'left-pinky':   { x: 157, y: 44 },
  'left-thumb':   { x: 24,  y: 97 },
}

const KEY_MAP = new Map(KEYBOARD_KEYS.map(k => [k.id, k]))
function keyCx(id: string) { const k = KEY_MAP.get(id); return k ? k.x + k.w / 2 : 0 }
function keyCy(id: string) { const k = KEY_MAP.get(id); return k ? k.y + k.h / 2 : 0 }

// Home-row reference for each hand (used to compute resting image position)
const R_HOME = { finger: 'right-index' as FingerName, key: 'KeyJ' }
const L_HOME = { finger: 'left-index'  as FingerName, key: 'KeyF' }

function rightImgPos(finger: FingerName, cx: number, cy: number) {
  const fp = FINGER_PX[finger]
  return { x: cx - fp.x, y: cy - fp.y }
}
function leftImgPos(finger: FingerName, cx: number, cy: number) {
  const fp = FINGER_PX[finger]
  return { x: MIRROR_X - cx - fp.x, y: cy - fp.y }
}

// Static home-position image coords
const R_HOME_POS = rightImgPos(R_HOME.finger, keyCx(R_HOME.key), keyCy(R_HOME.key))
const L_HOME_POS = leftImgPos( L_HOME.finger, keyCx(L_HOME.key), keyCy(L_HOME.key))

// ── Main component ─────────────────────────────────────────────────────────
interface Props {
  expectedKey: string | null
  lastKey: string | null
  lastCorrect: boolean | null
}

export function KeyboardVisual({ expectedKey, lastKey, lastCorrect }: Props) {
  const [flashKeyId, setFlashKeyId] = useState<string | null>(null)
  const [flashCorrect, setFlashCorrect] = useState(false)

  const { activeFinger, expectedKeyId } = useMemo(() => {
    if (!expectedKey) return { activeFinger: null, expectedKeyId: null }
    const keyId = expectedKey === ' ' ? 'Space' : KEY_TO_ID[expectedKey] ?? null
    return {
      activeFinger: (keyId ? (KEY_FINGER_MAP[keyId]?.finger ?? null) : null) as FingerName | null,
      expectedKeyId: keyId,
    }
  }, [expectedKey])

  useEffect(() => {
    if (!lastKey) return
    const keyId = lastKey === ' ' ? 'Space' : KEY_TO_ID[lastKey] ?? null
    if (!keyId) return
    setFlashKeyId(keyId)
    setFlashCorrect(lastCorrect ?? false)
    const t = setTimeout(() => setFlashKeyId(null), 250)
    return () => clearTimeout(t)
  }, [lastKey, lastCorrect])

  // Compute image positions: active hand moves to target, other stays at home
  const { leftDx, leftDy, rightDx, rightDy, glowCx, glowCy, glowColor } = useMemo(() => {
    if (!activeFinger || !expectedKeyId) {
      return { leftDx: 0, leftDy: 0, rightDx: 0, rightDy: 0, glowCx: 0, glowCy: 0, glowColor: '' }
    }
    const k = KEY_MAP.get(expectedKeyId)
    if (!k) {
      return { leftDx: 0, leftDy: 0, rightDx: 0, rightDy: 0, glowCx: 0, glowCy: 0, glowColor: '' }
    }
    const cx = k.x + k.w / 2
    const cy = k.y + k.h / 2
    let ldx = 0, ldy = 0, rdx = 0, rdy = 0
    if (activeFinger.startsWith('left-')) {
      const pos = leftImgPos(activeFinger, cx, cy)
      ldx = -(pos.x - L_HOME_POS.x)   // negate: <g> translate is outside the mirror, so +ldx = rightward on screen
      ldy = pos.y - L_HOME_POS.y
    } else {
      const pos = rightImgPos(activeFinger, cx, cy)
      rdx = pos.x - R_HOME_POS.x
      rdy = pos.y - R_HOME_POS.y
    }
    return { leftDx: ldx, leftDy: ldy, rightDx: rdx, rightDy: rdy,
             glowCx: cx, glowCy: cy, glowColor: FINGER_COLORS[activeFinger] }
  }, [activeFinger, expectedKeyId])

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="auto"
           style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <filter id="kglow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="fglow" x="-80%" y="-60%" width="260%" height="220%">
            <feGaussianBlur stdDeviation="10" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <linearGradient id="bevel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#fff" stopOpacity="0.08"/>
            <stop offset="75%"  stopColor="#fff" stopOpacity="0"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0.25"/>
          </linearGradient>
          {/* Clip hands to their keyboard half */}
          <clipPath id="clip-L">
            <rect x="-8" y="-12" width="332" height="290"/>
          </clipPath>
          <clipPath id="clip-R">
            <rect x="410" y="-12" width="340" height="290"/>
          </clipPath>
        </defs>

        {/* ── Keyboard body plates ────────────────────────────── */}
        <rect x="-8"  y="-12" width="332" height="276" rx="16" fill="#141414"/>
        <rect x="410" y="-12" width="340" height="276" rx="16" fill="#141414"/>
        <rect x="736" y="-12" width="344" height="276" rx="16" fill="#1a1a1a"/>
        {[0,1,2].map(i=>(
          <rect key={i} x={756+i*14} y={-4} width={10} height={5} rx={2}
                fill={i===0?'#22C55E':'#374151'} opacity={0.7}/>
        ))}

        {/* ── Keys ─────────────────────────────────────────────── */}
        {KEYBOARD_KEYS.map(key => {
          const fi       = KEY_FINGER_MAP[key.id]
          const fColor   = fi?.color ?? '#555555'
          const isExpect = key.id === expectedKeyId
          const isFlash  = key.id === flashKeyId
          const surface  =
            isFlash  ? (flashCorrect ? '#22C55E' : '#EF4444') :
            isExpect ? fColor + 'dd' :
            fi       ? fColor + '3a' : '#262626'
          const stroke =
            isFlash  ? (flashCorrect ? '#16A34A' : '#DC2626') :
            isExpect ? fColor :
            fi       ? fColor + '55' : '#2e2e2e'
          const labelFill = isFlash || isExpect ? '#fff' : fi ? fColor + 'cc' : '#666'
          const fSize = key.w>60?7:key.label.length>4?8:key.label.length>2?9:10
          return (
            <g key={key.id} filter={isExpect?'url(#kglow)':undefined}>
              <rect x={key.x} y={key.y+4} width={key.w} height={key.h} rx={5} fill="#090909"/>
              <rect x={key.x} y={key.y} width={key.w} height={key.h} rx={5}
                    fill={surface} stroke={stroke} strokeWidth={isExpect?1.5:0.5}
                    style={{transition:'fill 0.1s'}}/>
              <rect x={key.x} y={key.y} width={key.w} height={key.h} rx={5}
                    fill="url(#bevel)" style={{pointerEvents:'none'}}/>
              <text x={key.x+key.w/2} y={key.y+key.h/2+4}
                    textAnchor="middle" fontSize={fSize}
                    fontFamily="ui-monospace,monospace"
                    fontWeight={isExpect?'700':'500'}
                    fill={labelFill}
                    style={{pointerEvents:'none',userSelect:'none',transition:'fill 0.1s'}}>
                {key.label.length>6?key.label.slice(0,5):key.label}
              </text>
            </g>
          )
        })}

        {/* ── LEFT HAND — mirrored, moves so active finger lands on target ── */}
        <g clipPath="url(#clip-L)">
          <g
            transform={`translate(${leftDx}, ${leftDy})`}
            style={{ transition: 'transform 0.15s ease' }}
          >
            <image
              href="/hand.jpg"
              x={L_HOME_POS.x} y={L_HOME_POS.y}
              width={IMG_W} height={IMG_H}
              preserveAspectRatio="xMidYMin meet"
              opacity="0.60"
              transform={`translate(${MIRROR_X}, 0) scale(-1, 1)`}
              style={{ mixBlendMode: 'lighten' }}
            />
          </g>
        </g>

        {/* ── RIGHT HAND — moves so active finger lands on target ─────────── */}
        <g clipPath="url(#clip-R)">
          <g
            transform={`translate(${rightDx}, ${rightDy})`}
            style={{ transition: 'transform 0.15s ease' }}
          >
            <image
              href="/hand.jpg"
              x={R_HOME_POS.x} y={R_HOME_POS.y}
              width={IMG_W} height={IMG_H}
              preserveAspectRatio="xMidYMin meet"
              opacity="0.60"
              style={{ mixBlendMode: 'lighten' }}
            />
          </g>
        </g>

        {/* ── Colored glow spot on the exact target key ──────────────────── */}
        {activeFinger && glowColor && (
          <ellipse
            cx={glowCx} cy={glowCy}
            rx={14} ry={20}
            fill={glowColor}
            opacity={0.55}
            filter="url(#fglow)"
            style={{ mixBlendMode: 'screen' }}
          />
        )}
      </svg>
    </div>
  )
}
