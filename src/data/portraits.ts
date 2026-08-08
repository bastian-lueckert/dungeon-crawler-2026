/**
 * Handgezeichnete, stilisierte SVG-Portraits für Charakterklassen und Monster.
 * Jedes Portrait ist eine eigenständige Illustration innerhalb eines gemeinsamen Rahmens.
 */

function frame(bg: string[], inner: string, accent = '#c9a24b'): string {
  const [c1, c2] = bg;
  const gid = `g${Math.abs(hashCode(c1 + c2 + inner.length))}`;
  return `
<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="${gid}" cx="42%" cy="32%" r="75%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="60%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <radialGradient id="hl-${gid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clip-${gid}"><circle cx="80" cy="80" r="76"/></clipPath>
  </defs>
  <circle cx="80" cy="80" r="79" fill="${accent}" opacity="0.5"/>
  <circle cx="80" cy="80" r="78" fill="#0d0805" stroke="${accent}" stroke-width="3"/>
  <g clip-path="url(#clip-${gid})">
    <circle cx="80" cy="80" r="78" fill="url(#${gid})"/>
    ${inner}
    <ellipse cx="60" cy="42" rx="52" ry="34" fill="url(#hl-${gid})"/>
  </g>
  <circle cx="80" cy="80" r="76" fill="none" stroke="#00000066" stroke-width="4"/>
  <circle cx="80" cy="80" r="76" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.6"/>
</svg>`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
}

// ---------------- Charakterklassen ----------------

const CLASS_PORTRAITS: Record<string, string> = {
  warrior: frame(['#c98a4a', '#5a3a1a'], `
    <path d="M40 160 Q80 100 120 160 Z" fill="#6b4a2a"/>
    <circle cx="80" cy="72" r="30" fill="#e0b48a"/>
    <path d="M50 60 Q80 20 110 60 Q108 40 80 34 Q52 40 50 60 Z" fill="#8a8a90"/>
    <path d="M52 66 Q80 96 108 66 L104 78 Q80 100 56 78 Z" fill="#c9a24b" opacity="0.3"/>
    <rect x="112" y="30" width="10" height="80" rx="3" fill="#c7ccd6" transform="rotate(28 117 70)"/>
    <rect x="108" y="24" width="18" height="14" rx="2" fill="#8a6a3a" transform="rotate(28 117 30)"/>
    <path d="M62 70 q18 14 36 0" stroke="#5a3a20" stroke-width="2" fill="none"/>
  `),
  mage: frame(['#5a6adf', '#2a1a5a'], `
    <path d="M30 160 Q80 90 130 160 Z" fill="#2c2a52"/>
    <circle cx="80" cy="74" r="27" fill="#e6c9a8"/>
    <path d="M40 66 Q80 -6 120 66 Q112 50 80 46 Q48 50 40 66 Z" fill="#4a3a8a"/>
    <circle cx="80" cy="20" r="6" fill="#c9a24b"/>
    <path d="M56 78 q24 16 48 0" stroke="#3a2a1a" stroke-width="2" fill="none"/>
    <rect x="118" y="40" width="8" height="96" rx="3" fill="#8a6a3a" transform="rotate(18 122 88)"/>
    <circle cx="127" cy="36" r="9" fill="#8ad0ff" opacity="0.85"/>
  `),
  cleric: frame(['#e0c060', '#5a4a1a'], `
    <path d="M36 160 Q80 96 124 160 Z" fill="#d9d0b0"/>
    <circle cx="80" cy="72" r="29" fill="#e6c9a8"/>
    <path d="M46 62 Q80 22 114 62 Q106 44 80 40 Q54 44 46 62 Z" fill="#c9a24b"/>
    <rect x="72" y="26" width="16" height="40" fill="#e8dcc0"/>
    <rect x="60" y="38" width="40" height="16" fill="#e8dcc0"/>
    <path d="M58 76 q22 14 44 0" stroke="#5a3a20" stroke-width="2" fill="none"/>
  `),
  rogue: frame(['#5a5a6a', '#1a1a20'], `
    <path d="M34 160 Q80 100 126 160 Z" fill="#26262c"/>
    <circle cx="80" cy="74" r="28" fill="#c9a888"/>
    <path d="M44 70 Q80 26 116 70 Q112 50 80 44 Q48 50 44 70 Z" fill="#1c1c22"/>
    <path d="M44 68 Q80 88 116 68 L116 60 Q80 78 44 60 Z" fill="#1c1c22"/>
    <path d="M60 80 q20 12 40 0" stroke="#3a2818" stroke-width="2" fill="none"/>
    <rect x="30" y="86" width="10" height="60" rx="3" fill="#9aa0aa" transform="rotate(-20 35 116)"/>
  `),
};

// ---------------- Monster ----------------

const MONSTER_PORTRAITS: Record<string, string> = {
  giant_rat: frame(['#8a6a4a', '#3a2a1a'], `
    <ellipse cx="80" cy="96" rx="46" ry="30" fill="#6b5a44"/>
    <circle cx="80" cy="70" r="26" fill="#7a6850"/>
    <path d="M58 56 L46 34 L64 50 Z" fill="#7a6850"/>
    <path d="M102 56 L114 34 L96 50 Z" fill="#7a6850"/>
    <circle cx="70" cy="68" r="4" fill="#e04040"/>
    <circle cx="90" cy="68" r="4" fill="#e04040"/>
    <path d="M74 80 L86 80 L80 88 Z" fill="#3a2a1a"/>
    <path d="M120 100 Q150 100 150 130" stroke="#6b5a44" stroke-width="6" fill="none"/>
  `),
  kobold: frame(['#4a9a4a', '#1a3a1a'], `
    <circle cx="80" cy="78" r="32" fill="#4a7a4a"/>
    <path d="M52 62 L36 40 L58 54 Z" fill="#3a6a3a"/>
    <path d="M108 62 L124 40 L102 54 Z" fill="#3a6a3a"/>
    <circle cx="68" cy="76" r="5" fill="#ffe45a"/>
    <circle cx="92" cy="76" r="5" fill="#ffe45a"/>
    <path d="M64 96 Q80 106 96 96" stroke="#183018" stroke-width="3" fill="none"/>
    <path d="M70 98 l-4 8 M90 98 l4 8" stroke="#e8e8e8" stroke-width="2"/>
  `),
  cave_bat: frame(['#6a4a8a', '#2a1a3a'], `
    <path d="M10 90 Q50 60 78 88 Q106 60 150 90 Q110 96 90 84 Q100 110 90 130 Q84 108 78 100 Q72 108 66 130 Q56 110 66 84 Q46 96 10 90 Z" fill="#4a3a5a"/>
    <circle cx="78" cy="86" r="16" fill="#5a4a6a"/>
    <circle cx="73" cy="84" r="2.5" fill="#e04040"/>
    <circle cx="83" cy="84" r="2.5" fill="#e04040"/>
  `),
  goblin: frame(['#6ab04a', '#1a3a0a'], `
    <circle cx="80" cy="82" r="34" fill="#5a8a3a"/>
    <path d="M50 66 L30 44 L56 58 Z" fill="#4a7a2a"/>
    <path d="M110 66 L130 44 L104 58 Z" fill="#4a7a2a"/>
    <circle cx="66" cy="80" r="6" fill="#ffe45a"/>
    <circle cx="94" cy="80" r="6" fill="#ffe45a"/>
    <path d="M62 102 Q80 114 98 102" stroke="#12220a" stroke-width="3" fill="none"/>
    <path d="M70 104 l-3 8 M90 104 l3 8" stroke="#e8e8e8" stroke-width="2"/>
    <rect x="118" y="60" width="8" height="60" fill="#8a6a3a" transform="rotate(30 122 90)"/>
  `),
  skeleton: frame(['#a8a290', '#3a3630'], `
    <ellipse cx="80" cy="80" rx="30" ry="34" fill="#dcd6c4"/>
    <circle cx="68" cy="72" r="8" fill="#1a1610"/>
    <circle cx="92" cy="72" r="8" fill="#1a1610"/>
    <path d="M74 92 L86 92 M70 88 L60 88 M90 88 L100 88" stroke="#1a1610" stroke-width="3"/>
    <path d="M70 100 h20 M66 108 h28" stroke="#c8c2b0" stroke-width="4"/>
    <rect x="30" y="120" width="100" height="14" fill="#c8c2b0"/>
  `),
  skeleton_archer: frame(['#8a9678', '#2a3020'], `
    <ellipse cx="70" cy="80" rx="26" ry="30" fill="#dcd6c4"/>
    <circle cx="60" cy="74" r="6" fill="#1a1610"/>
    <circle cx="80" cy="74" r="6" fill="#1a1610"/>
    <path d="M64 92 L76 92" stroke="#1a1610" stroke-width="3"/>
    <path d="M120 40 Q150 80 120 130" stroke="#8a6a3a" stroke-width="5" fill="none"/>
    <path d="M120 40 L120 130" stroke="#e8e0c8" stroke-width="1.5"/>
    <path d="M118 82 L150 82" stroke="#c8c2b0" stroke-width="3"/>
  `),
  giant_spider: frame(['#5a2a5a', '#1a0a1a'], `
    <ellipse cx="80" cy="90" rx="26" ry="22" fill="#241826"/>
    <circle cx="80" cy="62" r="18" fill="#2e1e30"/>
    <circle cx="73" cy="60" r="3" fill="#e04040"/>
    <circle cx="87" cy="60" r="3" fill="#e04040"/>
    <circle cx="73" cy="68" r="2.5" fill="#e04040"/>
    <circle cx="87" cy="68" r="2.5" fill="#e04040"/>
    <path d="M56 80 L20 60 M56 90 L14 90 M56 100 L20 120 M104 80 L140 60 M104 90 L146 90 M104 100 L140 120" stroke="#241826" stroke-width="5" fill="none"/>
  `),
  orc: frame(['#5a9a4a', '#1a3a1a'], `
    <ellipse cx="80" cy="86" rx="34" ry="36" fill="#5a8555"/>
    <path d="M52 108 L44 122 L58 116 Z" fill="#e8e0c8"/>
    <path d="M108 108 L116 122 L102 116 Z" fill="#e8e0c8"/>
    <circle cx="67" cy="78" r="6" fill="#ffce45"/>
    <circle cx="93" cy="78" r="6" fill="#ffce45"/>
    <path d="M60 100 Q80 110 100 100" stroke="#12220a" stroke-width="3" fill="none"/>
    <path d="M56 60 Q80 44 104 60" stroke="#12220a" stroke-width="6" fill="none"/>
  `),
  bandit: frame(['#8a6a3a', '#3a2a18'], `
    <circle cx="80" cy="78" r="30" fill="#d0a878"/>
    <path d="M50 76 Q80 96 110 76 L108 84 Q80 100 52 84 Z" fill="#2a2420"/>
    <path d="M46 70 Q80 30 114 70 Q106 54 80 50 Q54 54 46 70 Z" fill="#5a4a3a"/>
    <circle cx="68" cy="76" r="4" fill="#1a1410"/>
    <circle cx="92" cy="76" r="4" fill="#1a1410"/>
  `),
  zombie: frame(['#5a8a5a', '#1a3a1a'], `
    <ellipse cx="80" cy="82" rx="30" ry="34" fill="#7a9a72"/>
    <circle cx="68" cy="76" r="5" fill="#1a1a10"/>
    <circle cx="94" cy="80" r="4" fill="#1a1a10"/>
    <path d="M60 100 Q80 96 100 106" stroke="#1a2a1a" stroke-width="3" fill="none"/>
    <path d="M50 58 L70 66 M110 58 L92 68" stroke="#3a2a1a" stroke-width="3"/>
  `),
  wraith: frame(['#4a2a8a', '#140a2a'], `
    <path d="M40 140 Q30 80 80 30 Q130 80 120 140 Q100 110 80 130 Q60 110 40 140 Z" fill="#3a2a5a" opacity="0.9"/>
    <circle cx="68" cy="70" r="6" fill="#8ad0ff"/>
    <circle cx="92" cy="70" r="6" fill="#8ad0ff"/>
  `),
  ogre: frame(['#a08a4a', '#3a2c10'], `
    <ellipse cx="80" cy="88" rx="38" ry="38" fill="#8a7a4a"/>
    <circle cx="64" cy="80" r="7" fill="#241a08"/>
    <circle cx="96" cy="80" r="7" fill="#241a08"/>
    <path d="M56 106 Q80 118 104 106" stroke="#241a08" stroke-width="4" fill="none"/>
    <path d="M60 104 l4 10 M100 104 l-4 10" stroke="#e8e0c8" stroke-width="3"/>
    <rect x="18" y="40" width="14" height="90" fill="#6a5636" transform="rotate(-14 25 85)"/>
  `),
  dark_cultist: frame(['#7a1a4a', '#2a0a1a'], `
    <path d="M40 150 Q80 90 120 150 Z" fill="#3a1428"/>
    <circle cx="80" cy="76" r="26" fill="#c9a888"/>
    <path d="M44 70 Q80 24 116 70 Q106 50 80 46 Q54 50 44 70 Z" fill="#1a0c14"/>
    <circle cx="80" cy="30" r="6" fill="#c02020"/>
    <circle cx="70" cy="78" r="4" fill="#c02020"/>
    <circle cx="90" cy="78" r="4" fill="#c02020"/>
  `),
  troll: frame(['#3a8a3a', '#0f2a0f'], `
    <ellipse cx="80" cy="90" rx="36" ry="42" fill="#5a8a5a"/>
    <path d="M56 76 L40 60 L58 68 Z" fill="#3a6a3a"/>
    <path d="M104 76 L120 60 L102 68 Z" fill="#3a6a3a"/>
    <circle cx="66" cy="84" r="5" fill="#ffe45a"/>
    <circle cx="94" cy="84" r="5" fill="#ffe45a"/>
    <path d="M62 108 Q80 100 98 108" stroke="#0a1a0a" stroke-width="3" fill="none"/>
    <path d="M66 110 l-4 10 M94 110 l4 10" stroke="#e8e0c8" stroke-width="3"/>
  `),
  young_dragon: frame(['#c92a2a', '#3a0a0a'], `
    <path d="M30 120 Q50 60 80 50 Q110 60 130 120 Q100 100 80 116 Q60 100 30 120 Z" fill="#7a2020"/>
    <path d="M40 70 L20 40 L54 58 Z" fill="#5a1414"/>
    <path d="M120 70 L140 40 L106 58 Z" fill="#5a1414"/>
    <circle cx="66" cy="82" r="6" fill="#ffce20"/>
    <circle cx="94" cy="82" r="6" fill="#ffce20"/>
    <path d="M62 100 Q80 112 98 100" stroke="#1a0505" stroke-width="4" fill="none"/>
    <path d="M70 104 l-6 12 M90 104 l6 12" stroke="#f0e8d0" stroke-width="3"/>
  `),
  bone_lord: frame(['#8a7ad0', '#241a4a'], `
    <path d="M30 150 Q80 100 130 150 Z" fill="#3a2a5a"/>
    <ellipse cx="80" cy="82" rx="32" ry="36" fill="#e8e2d0"/>
    <path d="M50 66 Q80 20 110 66" stroke="#c9a24b" stroke-width="6" fill="none"/>
    <circle cx="62" cy="34" r="5" fill="#c9a24b"/>
    <circle cx="98" cy="34" r="5" fill="#c9a24b"/>
    <circle cx="68" cy="80" r="8" fill="#3a0a0a"/>
    <circle cx="92" cy="80" r="8" fill="#3a0a0a"/>
    <circle cx="68" cy="80" r="4" fill="#ff3030"/>
    <circle cx="92" cy="80" r="4" fill="#ff3030"/>
    <path d="M72 100 L88 100 M66 96 L56 96 M94 96 L104 96" stroke="#1a1610" stroke-width="3"/>
    <path d="M70 108 h20 M64 116 h32" stroke="#c8c2b0" stroke-width="4"/>
  `, '#8a7ad0'),
  orc_warchief: frame(['#7ad04a', '#1a3a0a'], `
    <ellipse cx="80" cy="90" rx="40" ry="42" fill="#4a7a3a"/>
    <path d="M48 112 L36 130 L54 122 Z" fill="#e8e0c8"/>
    <path d="M112 112 L124 130 L106 122 Z" fill="#e8e0c8"/>
    <path d="M50 66 Q80 34 110 66" stroke="#c9a24b" stroke-width="8" fill="none"/>
    <circle cx="64" cy="82" r="7" fill="#ffce20"/>
    <circle cx="96" cy="82" r="7" fill="#ffce20"/>
    <path d="M56 106 Q80 120 104 106" stroke="#0a1a06" stroke-width="4" fill="none"/>
    <path d="M60 104 l4 10 M100 104 l-4 10" stroke="#f0e8d0" stroke-width="3"/>
    <rect x="12" y="30" width="16" height="100" fill="#7a6a4a" transform="rotate(-16 20 80)"/>
    <rect x="4" y="24" width="30" height="16" fill="#9aa0aa" transform="rotate(-16 20 32)"/>
  `, '#7ad04a'),
  ash_high_priest: frame(['#ff8a30', '#3a0a0a'], `
    <path d="M28 155 Q80 90 132 155 Z" fill="#1a0a08"/>
    <circle cx="80" cy="78" r="30" fill="#c9a888"/>
    <path d="M42 70 Q80 18 118 70 Q108 48 80 44 Q52 48 42 70 Z" fill="#0c0605"/>
    <path d="M80 18 L86 4 L92 18 Z" fill="#ff8a30"/>
    <circle cx="68" cy="80" r="5" fill="#ff3010"/>
    <circle cx="92" cy="80" r="5" fill="#ff3010"/>
    <path d="M60 102 Q80 112 100 102" stroke="#1a0505" stroke-width="3" fill="none"/>
    <path d="M50 130 q30 -18 60 0" stroke="#ff8a30" stroke-width="3" fill="none" opacity="0.8"/>
  `, '#ff8a30'),
};

const FALLBACK_PORTRAIT = frame(['#4a4a4a', '#101010'], `
  <circle cx="80" cy="80" r="30" fill="#8a8a8a"/>
  <text x="80" y="92" font-size="40" text-anchor="middle" fill="#2a2a2a">?</text>
`);

export function getClassPortrait(classId: string): string {
  return CLASS_PORTRAITS[classId] ?? FALLBACK_PORTRAIT;
}

export function getMonsterPortrait(monsterId: string): string {
  return MONSTER_PORTRAITS[monsterId] ?? FALLBACK_PORTRAIT;
}
