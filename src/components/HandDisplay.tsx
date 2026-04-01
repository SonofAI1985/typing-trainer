import type { FingerName } from '../types'
import { FINGER_COLORS } from '../data/fingerMap'

interface Props {
  activeFinger: FingerName | null
}

// Semi-transparent skin tone helper
const skin = (a: number) => `rgba(220, 175, 145, ${a})`

interface FingerDef {
  name: FingerName
  x: number
  y: number
  w: number
  h: number
  rx: number
  transform?: string
  isThumb?: boolean
}

// Left hand: pinky on left, thumb on lower-right (toward keyboard center / spacebar)
const L_FINGERS: FingerDef[] = [
  { name: 'left-pinky',  x: 8,  y: 50, w: 21, h: 62,  rx: 10 },
  { name: 'left-ring',   x: 32, y: 27, w: 23, h: 85,  rx: 11 },
  { name: 'left-middle', x: 58, y: 12, w: 25, h: 100, rx: 12 },
  { name: 'left-index',  x: 86, y: 24, w: 23, h: 88,  rx: 11 },
  {
    name: 'left-thumb', x: 0, y: 0, w: 26, h: 58, rx: 13,
    transform: 'translate(100, 110) rotate(-35)',
    isThumb: true,
  },
]

// Right hand: mirror — pinky on right, thumb on lower-left
const R_FINGERS: FingerDef[] = [
  { name: 'right-pinky',  x: 126, y: 50, w: 21, h: 62,  rx: 10 },
  { name: 'right-ring',   x: 100, y: 27, w: 23, h: 85,  rx: 11 },
  { name: 'right-middle', x: 72,  y: 12, w: 25, h: 100, rx: 12 },
  { name: 'right-index',  x: 46,  y: 24, w: 23, h: 88,  rx: 11 },
  {
    name: 'right-thumb', x: 0, y: 0, w: 26, h: 58, rx: 13,
    transform: 'translate(55, 110) rotate(35)',
    isThumb: true,
  },
]

// Organic palm+wrist paths (taper toward wrist for natural look)
const LEFT_PALM_PATH =
  'M 8 112 L 122 112 Q 128 155 115 182 Q 80 200 45 182 Q 28 158 22 112 Z'
const RIGHT_PALM_PATH =
  'M 147 112 L 33 112 Q 27 155 40 182 Q 75 200 110 182 Q 127 158 133 112 Z'

function FingerShape({ def, isActive }: { def: FingerDef; isActive: boolean }) {
  const color = FINGER_COLORS[def.name]
  const { x, y, w, h, rx } = def

  return (
    <g
      transform={def.transform}
      style={{
        filter: isActive
          ? `drop-shadow(0 0 7px ${color}) drop-shadow(0 0 18px ${color}99)`
          : 'none',
        transition: 'filter 0.18s ease',
      }}
    >
      {/* Main finger body */}
      <rect
        x={x} y={y} width={w} height={h} rx={rx}
        fill={isActive ? color + 'aa' : skin(0.16)}
        stroke={isActive ? color : skin(0.42)}
        strokeWidth={isActive ? 1.5 : 1}
        style={{ transition: 'fill 0.18s ease, stroke 0.18s ease' }}
      />

      {/* Fingernail at tip */}
      {!def.isThumb && (
        <rect
          x={x + 3} y={y + 3} width={w - 6} height={h * 0.22}
          rx={rx - 1}
          fill={isActive ? color + '55' : skin(0.28)}
          stroke={isActive ? color + '88' : skin(0.32)}
          strokeWidth={0.7}
          style={{ transition: 'fill 0.18s, stroke 0.18s' }}
        />
      )}

      {/* Knuckle crease lines */}
      {!def.isThumb && [0.52, 0.72].map(ratio => (
        <line
          key={ratio}
          x1={x + 5} y1={y + h * ratio}
          x2={x + w - 5} y2={y + h * ratio}
          stroke={isActive ? color + '77' : skin(0.38)}
          strokeWidth={1}
          strokeLinecap="round"
          style={{ transition: 'stroke 0.18s' }}
        />
      ))}

      {/* Pulse glow overlay when active */}
      {isActive && (
        <rect
          x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={rx}
          fill={color + '22'}
          style={{ animation: 'fingerPulse 1s ease-in-out infinite' }}
        />
      )}
    </g>
  )
}

interface HandSvgProps {
  fingers: FingerDef[]
  palmPath: string
  knuckleCenters: number[]
  activeFinger: FingerName | null
  label: string
}

function HandSvg({ fingers, palmPath, knuckleCenters, activeFinger, label }: HandSvgProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width="155" height="215"
        viewBox="0 0 155 215"
        className="overflow-visible"
      >
        <defs>
          <style>{`
            @keyframes fingerPulse {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.9; }
            }
          `}</style>
        </defs>

        {/* Palm + wrist organic shape */}
        <path
          d={palmPath}
          fill={skin(0.18)}
          stroke={skin(0.36)}
          strokeWidth={1}
        />

        {/* Tendon lines on palm */}
        <line x1="60"  y1="115" x2="55"  y2="172" stroke={skin(0.18)} strokeWidth={0.8} strokeLinecap="round" />
        <line x1="78"  y1="115" x2="75"  y2="174" stroke={skin(0.18)} strokeWidth={0.8} strokeLinecap="round" />
        <line x1="96"  y1="115" x2="95"  y2="170" stroke={skin(0.18)} strokeWidth={0.8} strokeLinecap="round" />

        {/* Knuckle bumps at finger bases */}
        {knuckleCenters.map((cx, i) => (
          <ellipse key={i} cx={cx} cy={112} rx={8} ry={4}
            fill={skin(0.22)} stroke={skin(0.30)} strokeWidth={0.6} />
        ))}

        {/* Fingers (rendered on top of palm) */}
        {fingers.map(def => (
          <FingerShape key={def.name} def={def} isActive={def.name === activeFinger} />
        ))}
      </svg>
      <span className="text-xs text-gray-500 tracking-wide">{label}</span>
    </div>
  )
}

export function HandDisplay({ activeFinger }: Props) {
  return (
    <div className="flex gap-10 items-end justify-center py-2">
      <HandSvg
        fingers={L_FINGERS}
        palmPath={LEFT_PALM_PATH}
        knuckleCenters={[19, 43, 70, 97]}
        activeFinger={activeFinger}
        label="左手"
      />
      <HandSvg
        fingers={R_FINGERS}
        palmPath={RIGHT_PALM_PATH}
        knuckleCenters={[136, 111, 84, 57]}
        activeFinger={activeFinger}
        label="右手"
      />
    </div>
  )
}
