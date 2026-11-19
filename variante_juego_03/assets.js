(() => {
  'use strict';

  function buildSpriteCanvas(grid, palette, scale = 3, glowColor = null, glowBlur = 0) {
    const rows = grid.length;
    const cols = Math.max(...grid.map((r) => r.length));
    const pad = glowBlur ? Math.ceil(glowBlur * 1.3) : 0;
    const off = document.createElement('canvas');
    off.width = cols * scale + pad * 2;
    off.height = rows * scale + pad * 2;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    if (glowColor && glowBlur > 0) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glowBlur;
    }

    for (let y = 0; y < rows; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch !== '.' && ch !== ' ' && palette[ch]) {
          ctx.fillStyle = palette[ch];
          ctx.fillRect(pad + x * scale, pad + y * scale, scale, scale);
        }
      }
    }
    return off;
  }

  // =========================================================================
  // 1. 3 BRAND-NEW TACTICAL STARSHIPS + ESCORT DRONE + HOMING MISSILE
  // =========================================================================
  const SHIP_DEFS = {
    falcon: {
      id: 'falcon',
      name: 'HALCÓN MK-IV',
      role: 'TÁCTICO',
      abilityName: 'PULSO PEM',
      desc: 'Equilibrado. Su Pulso PEM [E] borra proyectiles cercanos y frena enemigos.',
      stats: { speed: 4, power: 4, armor: 3 },
      speed: 355,
      lives: 3,
      fireCd: 0.165,
      dmgMult: 1.0,
      bulletStyle: 'pulse',
      accent: '#38bdf8',
      palette: {
        W: '#f8fafc', L: '#cbd5e1', M: '#64748b', D: '#334155',
        R: '#ef4444', K: '#991b1b', C: '#38bdf8', E: '#e0f2fe', Y: '#facc15'
      },
      grid: [
        '........WW........',
        '.......WLLW.......',
        '..R...WLEELW...R..',
        '..R...WLCCLW...R..',
        '.RR...WLCCLW...RR.',
        '.RK..WWLMMMWW..KR.',
        '.RKW.WLLMMLLW.WKR.',
        'RRKWWWLLMMLLWWWKRR',
        'RRKWWLLMMMMLLWWKRR',
        '.RKWWLDDYYDDLWWKR.',
        '..R.WDDMMMMDDW.R..',
        '....DD.M..M.DD....',
        '....CC......CC....'
      ]
    },
    bastion: {
      id: 'bastion',
      name: 'BASTIÓN TITÁN',
      role: 'ACORAZADO',
      abilityName: 'ESCUDO AEGIS',
      desc: 'Cañón de plasma pesado perforante. Activa Escudo Aegis [E] por 3.5s.',
      stats: { speed: 3, power: 5, armor: 5 },
      speed: 300,
      lives: 4,
      fireCd: 0.215,
      dmgMult: 1.45,
      bulletStyle: 'heavy',
      accent: '#34d399',
      palette: {
        G: '#10b981', L: '#6ee7b7', D: '#065f46', K: '#022c22',
        Y: '#facc15', O: '#d97706', S: '#cbd5e1', M: '#475569', C: '#67e8f9', W: '#ffffff'
      },
      grid: [
        '...SS........SS...',
        '..SGGS..YY..SGGS..',
        '..SGGS.YWWY.SGGS..',
        '.SGLGGYCCCCYGGLGS.',
        '.SGLGGGCCCCCGGGLGS',
        'SSGLGGGGKKGGGGLGSS',
        'SMGDDGGGSSGGGDDGMS',
        'SMGDDGGSMMSGGDDGMS',
        'SMDDDDGSMMSGDDDDMS',
        '.MMDDDGDDDDGDDDMM.',
        '..D..OO....OO..D..',
        '.....YY....YY.....'
      ]
    },
    hummingbird: {
      id: 'hummingbird',
      name: 'COLIBRÍ NEÓN',
      role: 'RECON VELOZ',
      abilityName: 'SALTO FASE',
      desc: 'Velocidad extrema y disparo rápido. Salto de Fase [E] da invulnerabilidad.',
      stats: { speed: 5, power: 3, armor: 3 },
      speed: 425,
      lives: 3,
      fireCd: 0.13,
      dmgMult: 0.85,
      bulletStyle: 'neon',
      accent: '#f472b6',
      palette: {
        W: '#fdf4ff', P: '#f472b6', M: '#db2777', V: '#7e22ce',
        D: '#1e1b4b', Y: '#fde047', O: '#fb923c', C: '#22d3ee'
      },
      grid: [
        '.......WW.......',
        '......WPPW......',
        '......WCCW......',
        '.....WPCCPW.....',
        '.....WPMMPW.....',
        '...Y.WPMMPW.Y...',
        '..OYWPPVVPPWYO..',
        '.OYYPPVVVVPPYYO.',
        'OO.PPVDDDDVPP.OO',
        '...PVD.YY.DVP...',
        '..PPD..OO..DPP..',
        '..M..........M..'
      ]
    }
  };

  const TACTICAL_DRONE_GRID = [
    '..YY..',
    '.YCCY.',
    'SMWWMS',
    '.SGGS.',
    '..OO..'
  ];
  const TACTICAL_DRONE_PAL = {
    Y: '#fde047', C: '#22d3ee', S: '#cbd5e1', M: '#475569', W: '#ffffff', G: '#10b981', O: '#fb923c'
  };

  const MISSILE_GRID = [
    '..W..',
    '.RRR.',
    '.SWS.',
    'RSSSR',
    '.OYO.'
  ];
  const MISSILE_PAL = { W: '#ffffff', R: '#f43f5e', S: '#cbd5e1', O: '#f97316', Y: '#fde047' };

  // =========================================================================
  // 2. 7 BRAND-NEW ENEMY CLASSES (2-FRAME ANIMATED WHERE APPLICABLE)
  // =========================================================================
  const ENEMY_PALS = {
    waspScout: { Y: '#facc15', O: '#ea580c', K: '#1e293b', C: '#38bdf8', W: '#ffffff' },
    crabGuard: { R: '#f43f5e', O: '#fb923c', D: '#881337', Y: '#fde047', W: '#ffffff' },
    voidSquid: { T: '#2dd4bf', C: '#0ea5e9', D: '#1e3a8a', P: '#f472b6', W: '#ffffff' },
    hexTurret: { B: '#d97706', Y: '#fde047', M: '#64748b', D: '#1e293b', C: '#22d3ee', R: '#ef4444' },
    hornetBomber: { V: '#a855f7', P: '#e879f9', D: '#3b0764', Y: '#facc15', R: '#f43f5e', L: '#cbd5e1' },
    wraithBlade: { K: '#0f172a', D: '#334155', M: '#64748b', P: '#f472b6', E: '#fbcfe8', C: '#38bdf8' },
    miniCarrier: { S: '#cbd5e1', M: '#64748b', D: '#1e293b', G: '#10b981', C: '#22d3ee', Y: '#facc15', R: '#f43f5e' }
  };

  const ENEMY_GRIDS = {
    // 1. Wasp Scout (Wave 1+)
    waspScout0: [
      '..C......C..',
      '.CC.YYYY.CC.',
      '..CYYKKYYC..',
      '...YWWWWY...',
      '..OYKKKKYO..',
      '...OYYYYO...',
      '....OKKO....',
      '.....OO.....'
    ],
    waspScout1: [
      '............',
      '.CC.YYYY.CC.',
      'CCCYYKKYYCCC',
      '...YWWWWY...',
      '..OYKKKKYO..',
      '...OYYYYO...',
      '....OKKO....',
      '.....YY.....'
    ],
    // 2. Armored Space Crab (Wave 1+)
    crabGuard0: [
      '.OO......OO.',
      'OOR......ROO',
      'OR..RRRR..RO',
      '.RRRRRRRRRR.',
      '.RRWWDDWWRR.',
      'RRRRRRRRRRRR',
      'R.RRYYYYRR.R',
      'R..DDDDDD..R',
      '...R....R...'
    ],
    crabGuard1: [
      '..OO....OO..',
      '.OOR....ROO.',
      '.OR.RRRR.RO.',
      '.RRRRRRRRRR.',
      '.RRWWDDWWRR.',
      'RRRRRRRRRRRR',
      '.RRRYYYYRRR.',
      '..RDDDDDDR..',
      '..R......R..'
    ],
    // 3. Bioluminescent Void Squid (Wave 2+)
    voidSquid0: [
      '....TTTT....',
      '..TTCCCCTT..',
      '.TTCCWWCCTT.',
      '.TCWPDDPWCT.',
      '.TTCCWWCCTT.',
      '..TTDDDDTT..',
      '..T.C..C.T..',
      '.T..C..C..T.',
      'T...P..P...T'
    ],
    voidSquid1: [
      '....TTTT....',
      '..TTCCCCTT..',
      '.TTCCWWCCTT.',
      '.TCWPPPWCT..'.slice(0, 12),
      '.TTCCWWCCTT.',
      '..TTDDDDTT..',
      '...TC..CT...',
      '..T.C..C.T..',
      '..P......P..'
    ],
    // 4. Orbital Hex Turret (Wave 3+)
    hexTurret0: [
      '....BBBB....',
      '..BBMMMMBB..',
      '.BMMDDDDMMB.',
      'BMDCCCCCCMD' + 'B',
      'BMDCYYYYCDMB',
      'BMDCYRRCDMB.',
      'BMDCCCCCCMDB',
      '.BMMDDDDMMB.',
      '..BBMMMMBB..',
      '...R.BB.R...'
    ].map((r) => r.padEnd(12, '.').slice(0, 12)),
    hexTurret1: [
      '....YYYY....',
      '..BBMMMMBB..',
      '.BMMDDDDMMB.',
      'BMDCCCCCCMDB',
      'BMDCYRRCDMB.',
      'BMDCYYYYCDMB',
      'BMDCCCCCCMDB',
      '.BMMDDDDMMB.',
      '..BBMMMMBB..',
      '..R..BB..R..'
    ].map((r) => r.padEnd(12, '.').slice(0, 12)),
    // 5. Heavy Hornet Bomber (Wave 4+)
    hornetBomber0: [
      '.....LLLL.....',
      '...LLVVVVLL...',
      '..LVVPPPPVVLL.'.slice(0, 14),
      '.VVPPYYYYPPVV.',
      'VVDDVYRRYVDDVV',
      'VVDDVYRRYVDDVV',
      '.VVDDVVVVDDVV.',
      '..D..VYYV..D..',
      '.....R..R.....'
    ],
    hornetBomber1: [
      '.....LLLL.....',
      '...LLVVVVLL...',
      '..LVVPPPPVVLL.'.slice(0, 14),
      '.VVPPYYYYPPVV.',
      'VVDDVRYYRVDDVV',
      'VVDDVRYYRVDDVV',
      '.VVDDVVVVDDVV.',
      '.D...VYYV...D.',
      '....R....R....'
    ],
    // 6. Wraith Blade Dive Fighter (Wave 6+)
    wraithBlade0: [
      'P....KK....P',
      'PP..KDDK..PP',
      'PEP.KMMK.PEP',
      '.PEPKCCKPEP.',
      '..PPKCCKPP..',
      '...PKDDKP...',
      '....KPPK....',
      '.....PP.....'
    ],
    wraithBlade1: [
      'E....KK....E',
      'PP..KDDK..PP',
      'PCP.KMMK.PCP',
      '.PEPKCCKPEP.',
      '..PPKCCKPP..',
      '...PKDDKP...',
      '....KCCK....',
      '.....EE.....'
    ],
    // 7. Mini Carrier Escort Cruiser (Wave 7+)
    miniCarrier: [
      '....SSSSSSSS....',
      '..SSMMMMMMMMSS..',
      '.SMMGGCCCCGGMMS.',
      'SMDDGGYYYYGGDDMS',
      'SMDDGGRYYRGGDDMS',
      'SMDDGGYYYYGGDDMS',
      '.SMMGGCCCCGGMMS.',
      '..SSDDDDDDDDSS..',
      '..RR..SSSS..RR..',
      '..YY........YY..'
    ]
  };

  // =========================================================================
  // 3. 3 BRAND-NEW MEGA-BOSSES
  // =========================================================================
  // Boss 1: ARCA SOLAR "SOLARIS-IX" (Wave 4)
  const BOSS_SOLARIS_PAL = {
    W: '#fffbeb', Y: '#facc15', G: '#d97706', O: '#ea580c',
    K: '#1e1b4b', D: '#334155', M: '#64748b', C: '#22d3ee', E: '#cffafe', R: '#f43f5e'
  };
  const BOSS_SOLARIS_GRID = [
    '............WWWW............',
    '..........WWYYYYWW..........',
    '....GG...WYYGGGGYYW...GG....',
    '..GGYYG..YGGKKKKGGY..GYYGG..',
    '.GYGGGGGGYGKECCEKGYGGGGGGYG.',
    'GYGDDDDGGYGKCEECKGYYGGDDDDGY',
    'GYDMMMMGGYGKCEECKGYGGMMMMDYG',
    'GGDMMCCGGYGGKKKKGGYGGCCMMDGG',
    '.GGDDDDGGYYGGGGGGYYGGDDDDGG.',
    '..GG..OOGGYYYYYYYYGGOO..GG..',
    '......OROGGGMMMMGGGORO......',
    '......ORR..DDDDDD..RRO......',
    '...........C.RR.C...........'
  ];

  // Boss 2: LEVIATÁN MECÁNICO "KRAKEN-0" (Wave 8)
  const BOSS_KRAKEN_PAL = {
    L: '#cbd5e1', M: '#64748b', D: '#334155', K: '#0f172a',
    V: '#8b5cf6', P: '#f472b6', C: '#22d3ee', Y: '#fde047', R: '#ef4444'
  };
  const BOSS_KRAKEN_GRID = [
    '.........LLLLLLLL.........',
    '......LLLMMMMMMMMLLL......',
    '....LLMMVVVVVVVVMMLL......',
    '...LMVVVVDDDDDDVVVVML.....',
    '..LMVVDDKPPPPPPKDDVVML....',
    '..LMVVDKPPYYYYPPKDVVML....',
    '..LMVVDKPPYRRPPPKDVVML....',
    '...LMVVDDKPPPPKDDVVML.....',
    '....LLMMDDCCCCDDMMLL......',
    '..MM..LLDDDDDDDDLL..MM....',
    '.MVVM.MLLMM..MMLLM.MVVM...',
    'MV..VM.MLM....MLM.MV..VM..',
    'M....C..MC....CM..C....M..',
    '........P......P..........'
  ];

  // Boss 3: NÚCLEO SINGULARIDAD "OMEGA-PRIME" (Wave 12+)
  const BOSS_OMEGA_PAL = {
    W: '#ffffff', C: '#22d3ee', V: '#a855f7', P: '#f472b6',
    Y: '#facc15', O: '#f97316', D: '#1e1b4b', K: '#030712', S: '#94a3b8'
  };
  const BOSS_OMEGA_GRID = [
    '............CC............',
    '..........CCWWCC..........',
    '....VV...CVVYYVVC...VV....',
    '..VVPPV.CVYKKKKYVC.VPPVV..',
    '.VPSSPPVVYKKKKKKYVVPPSSPV.',
    'VPSSDDPVYKKWWWWKKYVPPDDSPV',
    'VPSSDDPVYKKWCCWKKYVPPDDSPV',
    'VPSSDDPVYKKWWWWKKYVPPDDSPV',
    '.VPSSPPVVYKKKKKKYVVPPSSPV.',
    '..VVPPV.CVYKKKKYVC.VPPVV..',
    '....VV...CVVYYVVC...VV....',
    '.........OO.CC.OO.........',
    '........O........O........'
  ];

  // =========================================================================
  // 4. BRAND-NEW COSMIC PIXEL-ART BACKGROUNDS (PLANETS, BLACK HOLE, STATIONS, ROBOTS)
  // =========================================================================
  function createCustomPlanet(radiusPx, step, cfg) {
    const extraX = cfg.ring ? radiusPx * 1.0 : 14;
    const extraY = cfg.ring ? radiusPx * 0.45 : 14;
    const w = Math.ceil((radiusPx + extraX) * 2);
    const h = Math.ceil((radiusPx + extraY) * 2);
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    const bayer = [[0, 2], [3, 1]];

    const drawRings = (front) => {
      if (!cfg.ring) return;
      const tilt = cfg.ringTilt || 0.2;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      const rxMax = radiusPx * 1.85;
      const ryMax = radiusPx * 0.42;
      for (let y = -radiusPx; y <= radiusPx; y += step) {
        for (let x = -rxMax; x <= rxMax; x += step) {
          const rx = x * cosT + y * sinT;
          const ry = -x * sinT + y * cosT;
          const d = (rx * rx) / (rxMax * rxMax) + (ry * ry) / (ryMax * ryMax);
          const inBand = (d >= 0.52 && d <= 0.72) || (d >= 0.8 && d <= 1.0);
          if (inBand && (front ? ry >= 0 : ry < 0)) {
            ctx.fillStyle = d > 0.8 ? cfg.ring[0] : cfg.ring[1];
            ctx.fillRect(Math.round(cx + x), Math.round(cy + y), step, step);
          }
        }
      }
    };

    if (cfg.glow) {
      const g = ctx.createRadialGradient(cx, cy, radiusPx * 0.65, cx, cy, radiusPx + 20);
      g.addColorStop(0, cfg.glow);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    drawRings(false);

    for (let y = -radiusPx; y <= radiusPx; y += step) {
      for (let x = -radiusPx; x <= radiusPx; x += step) {
        const dist = Math.hypot(x, y);
        if (dist > radiusPx) continue;

        // Fractured planet gap
        if (cfg.mode === 'fractured') {
          const crack = Math.abs(x - y * 0.65 - Math.sin(y * 0.14) * 6);
          if (crack < 4) {
            ctx.fillStyle = dist < radiusPx * 0.55 ? '#facc15' : '#f472b6';
            ctx.fillRect(Math.round(cx + x), Math.round(cy + y), step, step);
            continue;
          }
        }

        const gx = Math.floor((x + 500) / step);
        const gy = Math.floor((y + 500) / step);
        const light = (-x * 0.65 - y * 0.7) / radiusPx;
        const thresh = (bayer[gy & 1][gx & 1] / 4) - 0.35;

        let col = cfg.colors[1];
        if (light + thresh > 0.3) col = cfg.colors[0];
        else if (light + thresh < -0.22) col = cfg.colors[2];
        if (cfg.colors[3] && light + thresh < -0.58) col = cfg.colors[3];

        if (cfg.mode === 'aurora') {
          const wave = Math.sin(x * 0.15 + y * 0.08);
          if (Math.abs(y + radiusPx * 0.55 - wave * 5) < 6) col = '#67e8f9';
          else if (Math.abs(y - radiusPx * 0.45 + wave * 4) < 5) col = '#a7f3d0';
        } else if (cfg.mode === 'ecumenopolis') {
          // Dark metal planet with golden glowing city lights on night side & grid lines
          const city = ((gx * 7 + gy * 13) % 11 === 0) || (gy % 5 === 0 && gx % 2 === 0);
          if (city && light < 0.15) col = ((gx + gy) % 3 === 0) ? '#38bdf8' : '#facc15';
        } else if (cfg.mode === 'jungle') {
          const cont = Math.sin(x * 0.1 + y * 0.07) + Math.cos(y * 0.12 - x * 0.08);
          if (cont > 0.45) col = light > 0 ? '#a855f7' : '#581c87';
          else if (cont > 0.1) col = light > -0.2 ? '#34d399' : '#065f46';
        }

        ctx.fillStyle = col;
        ctx.fillRect(Math.round(cx + x), Math.round(cy + y), step, step);
      }
    }

    drawRings(true);

    // Floating shards around fractured planet
    if (cfg.mode === 'fractured') {
      const shards = [
        [radiusPx + 10, -14, 10, 8],
        [radiusPx + 18, 4, 8, 6],
        [-radiusPx - 14, 10, 9, 7]
      ];
      for (const [sx, sy, sw, sh] of shards) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx + sx, cy + sy, sw, sh);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(cx + sx + 2, cy + sy + 2, 4, 3);
      }
    }

    return off;
  }

  // Pixel-Art Black Hole with luminous accretion disk!
  function createBlackHole() {
    const w = 220;
    const h = 156;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const cx = w / 2;
    const cy = h / 2;
    const p = 4;

    // Outer violet/amber gravitational glow
    const grad = ctx.createRadialGradient(cx, cy, 18, cx, cy, 86);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.5)');
    grad.addColorStop(0.45, 'rgba(168, 85, 247, 0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Back accretion halo (lensing arch above & below)
    for (let y = -48; y <= 48; y += p) {
      for (let x = -48; x <= 48; x += p) {
        const d = Math.hypot(x, y);
        if (d >= 26 && d <= 42) {
          ctx.fillStyle = d < 32 ? '#fef08a' : (d < 37 ? '#fb923c' : '#9333ea');
          ctx.fillRect(Math.round(cx + x), Math.round(cy + y), p, p);
        }
      }
    }

    // Event horizon void
    for (let y = -28; y <= 28; y += p) {
      for (let x = -28; x <= 28; x += p) {
        if (Math.hypot(x, y) <= 27) {
          ctx.fillStyle = '#02040a';
          ctx.fillRect(Math.round(cx + x), Math.round(cy + y), p, p);
        }
      }
    }

    // Bright front horizontal accretion disk
    for (let y = -16; y <= 16; y += p) {
      for (let x = -96; x <= 96; x += p) {
        const d = (x * x) / (94 * 94) + (y * y) / (15 * 15);
        if (d <= 1.0 && d >= 0.12) {
          if (y < 0 && Math.abs(x) < 26) continue; // hidden behind event horizon
          ctx.fillStyle = d < 0.35 ? '#ffffff' : (d < 0.6 ? '#facc15' : (d < 0.82 ? '#f97316' : '#a855f7'));
          ctx.fillRect(Math.round(cx + x), Math.round(cy + y), p, p);
        }
      }
    }
    return off;
  }

  // Pixel-Art White Dwarf / Radiant Star
  function createStarAsset(radiusPx, core, mid, outer, glow) {
    const size = (radiusPx + 42) * 2;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const cx = size / 2;
    const cy = size / 2;
    const p = 4;

    const g = ctx.createRadialGradient(cx, cy, radiusPx * 0.4, cx, cy, radiusPx + 40);
    g.addColorStop(0, glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    // Crisp cross lens flares
    ctx.fillStyle = mid;
    ctx.fillRect(cx - radiusPx - 32, cy - 2, (radiusPx + 32) * 2, 4);
    ctx.fillRect(cx - 2, cy - radiusPx - 32, 4, (radiusPx + 32) * 2);

    for (let y = -radiusPx; y <= radiusPx; y += p) {
      for (let x = -radiusPx; x <= radiusPx; x += p) {
        const d = Math.hypot(x, y) / radiusPx;
        if (d > 1) continue;
        ctx.fillStyle = d < 0.55 ? core : (d < 0.84 ? mid : outer);
        ctx.fillRect(Math.round(cx + x), Math.round(cy + y), p, p);
      }
    }
    return off;
  }

  // NEW Space Station 1: Orbital Mining Refinery Rig
  function createMiningStation() {
    const off = document.createElement('canvas');
    off.width = 168;
    off.height = 112;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const p = 4;
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * p, y * p, w * p, h * p); };
    // Industrial trusses
    r(4, 11, 34, 4, '#475569');
    r(4, 12, 34, 2, '#94a3b8');
    // Fuel silos
    r(6, 5, 6, 16, '#334155');
    r(7, 6, 4, 14, '#fb923c');
    r(30, 5, 6, 16, '#334155');
    r(31, 6, 4, 14, '#fb923c');
    // Central refinery furnace tower
    r(15, 3, 12, 22, '#334155');
    r(16, 4, 10, 20, '#64748b');
    r(18, 7, 6, 8, '#0f172a');
    r(19, 8, 4, 6, '#facc15');
    r(20, 9, 2, 4, '#ffffff');
    // Chimney & docking lights
    r(20, 0, 2, 4, '#cbd5e1');
    r(18, 25, 2, 2, '#38bdf8');
    r(22, 25, 2, 2, '#38bdf8');
    return off;
  }

  // NEW Space Station 2: Giant Drydock Shipyard Gantry
  function createShipyardStation() {
    const off = document.createElement('canvas');
    off.width = 188;
    off.height = 116;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const p = 4;
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * p, y * p, w * p, h * p); };
    // Top & bottom gantry arms
    r(3, 3, 41, 4, '#475569');
    r(3, 4, 41, 2, '#94a3b8');
    r(3, 22, 41, 4, '#475569');
    r(3, 23, 41, 2, '#94a3b8');
    // Vertical support pillars
    r(5, 7, 4, 15, '#334155');
    r(38, 7, 4, 15, '#334155');
    // Half-built dreadnought hull suspended in drydock
    r(13, 10, 21, 9, '#1e293b');
    r(15, 11, 17, 7, '#64748b');
    r(17, 13, 12, 3, '#cbd5e1');
    // Welding lights & beacons
    r(12, 7, 2, 3, '#facc15');
    r(26, 19, 2, 3, '#38bdf8');
    r(34, 7, 2, 3, '#f43f5e');
    return off;
  }

  // NEW Space Station 3: Ancient Orbital Obelisk Sanctuary
  function createAncientMonolithStation() {
    const off = document.createElement('canvas');
    off.width = 136;
    off.height = 148;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const p = 4;
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * p, y * p, w * p, h * p); };
    // Floating outer rune pillars
    r(3, 10, 4, 18, '#334155');
    r(4, 12, 2, 14, '#2dd4bf');
    r(27, 10, 4, 18, '#334155');
    r(28, 12, 2, 14, '#2dd4bf');
    // Central carved obelisk
    r(13, 2, 8, 32, '#1e293b');
    r(14, 4, 6, 28, '#475569');
    r(16, 7, 2, 20, '#34d399');
    r(15, 14, 4, 4, '#facc15');
    // Energy connectors
    r(7, 18, 6, 2, '#67e8f9');
    r(21, 18, 6, 2, '#67e8f9');
    return off;
  }

  // NEW Cosmic Robot 1: Industrial Constructor Mech
  const CONSTRUCTOR_BOT_PAL = {
    Y: '#facc15', O: '#d97706', D: '#334155', M: '#64748b', L: '#cbd5e1', K: '#0f172a', C: '#38bdf8', W: '#ffffff'
  };
  const CONSTRUCTOR_BOT_GRID = [
    '.......CC.......',
    '.....YYYYYY.....',
    '....YKKKKKKY....',
    '....YKCCWWKY....',
    '....YOOOOOOY....',
    '..OO.DDDDDD.OO..',
    '.OYODDLLLLDDOYO.',
    'OYYD.DLCCLD.DYYO',
    'O.MD.DLLLLD.DM.O',
    'C.MD..DYYD..DM.C',
    '..L...DMMD...L..',
    '.....DM..MD.....',
    '.....DO..OD.....',
    '.....CC..CC.....'
  ];

  // NEW Cosmic Robot 2: Ancient Jade Guardian Sentinel
  const JADE_TITAN_PAL = {
    S: '#94a3b8', M: '#475569', D: '#1e293b', G: '#34d399', E: '#a7f3d0', Y: '#facc15', O: '#b45309'
  };
  const JADE_TITAN_GRID = [
    '.......YY.......',
    '.....YYGGYY.....',
    '....YSSMMSSY....',
    '....SMDDDDMS....',
    '....SDGEGEDS....',
    '....SMDDDDMS....',
    '..YY.SSMMSS.YY..',
    '.YSSYSMGGMSYSSY.',
    'YSMMDSMEEMDSMMSY',
    'YS.MD.SMMS.DM.SY',
    '.D.MD.SYYSD.D.D.',
    '......SMMS......',
    '.....SM..MS.....',
    '.....GG..GG.....'
  ];

  function createNebula(w, h, cols) {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const step = 6;
    const bayer = [[0, 2], [3, 1]];
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const nx = (x - w / 2) / (w * 0.45);
        const ny = (y - h / 2) / (h * 0.45);
        const warp = Math.sin(nx * 2.5 + ny * 1.4) * 0.25 + Math.cos(ny * 2.6 - nx * 1.5) * 0.22;
        const d = Math.hypot(nx, ny) + warp;
        const th = bayer[(y / step) & 1][(x / step) & 1] * 0.14;
        if (d + th < 0.92) {
          ctx.fillStyle = d < 0.35 ? cols[0] : (d < 0.65 ? cols[1] : cols[2]);
          ctx.fillRect(x, y, step, step);
        }
      }
    }
    return off;
  }

  // =========================================================================
  // 5. ASSEMBLE & EXPORT
  // =========================================================================
  const SHIPS = {};
  for (const k of Object.keys(SHIP_DEFS)) {
    const def = SHIP_DEFS[k];
    SHIPS[k] = {
      ...def,
      sprite: buildSpriteCanvas(def.grid, def.palette, 3, def.accent, 6)
    };
  }

  const SPRITES = {
    drone: buildSpriteCanvas(TACTICAL_DRONE_GRID, TACTICAL_DRONE_PAL, 3, '#22d3ee', 5),
    missile: buildSpriteCanvas(MISSILE_GRID, MISSILE_PAL, 2, '#f97316', 5),
    waspScout0: buildSpriteCanvas(ENEMY_GRIDS.waspScout0, ENEMY_PALS.waspScout, 3),
    waspScout1: buildSpriteCanvas(ENEMY_GRIDS.waspScout1, ENEMY_PALS.waspScout, 3),
    crabGuard0: buildSpriteCanvas(ENEMY_GRIDS.crabGuard0, ENEMY_PALS.crabGuard, 3),
    crabGuard1: buildSpriteCanvas(ENEMY_GRIDS.crabGuard1, ENEMY_PALS.crabGuard, 3),
    voidSquid0: buildSpriteCanvas(ENEMY_GRIDS.voidSquid0, ENEMY_PALS.voidSquid, 3),
    voidSquid1: buildSpriteCanvas(ENEMY_GRIDS.voidSquid1, ENEMY_PALS.voidSquid, 3),
    hexTurret0: buildSpriteCanvas(ENEMY_GRIDS.hexTurret0, ENEMY_PALS.hexTurret, 3),
    hexTurret1: buildSpriteCanvas(ENEMY_GRIDS.hexTurret1, ENEMY_PALS.hexTurret, 3),
    hornetBomber0: buildSpriteCanvas(ENEMY_GRIDS.hornetBomber0, ENEMY_PALS.hornetBomber, 3),
    hornetBomber1: buildSpriteCanvas(ENEMY_GRIDS.hornetBomber1, ENEMY_PALS.hornetBomber, 3),
    wraithBlade0: buildSpriteCanvas(ENEMY_GRIDS.wraithBlade0, ENEMY_PALS.wraithBlade, 3),
    wraithBlade1: buildSpriteCanvas(ENEMY_GRIDS.wraithBlade1, ENEMY_PALS.wraithBlade, 3),
    miniCarrier: buildSpriteCanvas(ENEMY_GRIDS.miniCarrier, ENEMY_PALS.miniCarrier, 3),
    bossSolaris: buildSpriteCanvas(BOSS_SOLARIS_GRID, BOSS_SOLARIS_PAL, 5, 'rgba(250,204,21,0.55)', 10),
    bossKraken: buildSpriteCanvas(BOSS_KRAKEN_GRID, BOSS_KRAKEN_PAL, 5, 'rgba(244,114,182,0.6)', 10),
    bossOmega: buildSpriteCanvas(BOSS_OMEGA_GRID, BOSS_OMEGA_PAL, 5, 'rgba(168,85,247,0.65)', 12)
  };

  const PLANETS = [
    {
      name: 'PLANETA AURORA HELADA',
      canvas: createCustomPlanet(46, 4, {
        colors: ['#bae6fd', '#38bdf8', '#0369a1', '#0c4a6e'],
        mode: 'aurora',
        ring: ['#a5f3fc', '#0284c7'],
        ringTilt: 0.25,
        glow: 'rgba(56, 189, 248, 0.32)'
      })
    },
    {
      name: 'ECUMENÓPOLIS DORADA',
      canvas: createCustomPlanet(50, 4, {
        colors: ['#475569', '#334155', '#1e293b', '#0f172a'],
        mode: 'ecumenopolis',
        glow: 'rgba(250, 204, 21, 0.28)'
      })
    },
    {
      name: 'MUNDO SELVA NEBULA',
      canvas: createCustomPlanet(46, 4, {
        colors: ['#2dd4bf', '#0d9488', '#115e59', '#042f2e'],
        mode: 'jungle',
        ring: ['#f9a8d4', '#a855f7'],
        ringTilt: -0.22,
        glow: 'rgba(45, 212, 191, 0.3)'
      })
    },
    {
      name: 'PLANETA FRACTURADO',
      canvas: createCustomPlanet(42, 4, {
        colors: ['#64748b', '#475569', '#1e293b', '#0f172a'],
        mode: 'fractured',
        glow: 'rgba(244, 114, 182, 0.32)'
      })
    }
  ];

  const CELESTIALS = [
    { name: 'ENANA BLANCA CRISTAL', canvas: createStarAsset(36, '#ffffff', '#bae6fd', '#38bdf8', 'rgba(186,230,253,0.55)') },
    { name: 'GIGANTE ÁMBAR', canvas: createStarAsset(44, '#fef9c3', '#fb923c', '#c2410c', 'rgba(251,146,60,0.48)') },
    { name: 'AGUJERO NEGRO SINGULARIDAD', canvas: createBlackHole() }
  ];

  const STATIONS = [
    { name: 'REFINERÍA MINERA ORBITAL', canvas: createMiningStation() },
    { name: 'ASTILLERO DEL COLOSO', canvas: createShipyardStation() },
    { name: 'SANTUARIO MONOLITO', canvas: createAncientMonolithStation() }
  ];

  const ROBOTS = [
    { name: 'MECH CONSTRUCTOR CÓSMICO', canvas: buildSpriteCanvas(CONSTRUCTOR_BOT_GRID, CONSTRUCTOR_BOT_PAL, 4, 'rgba(250,204,21,0.38)', 8) },
    { name: 'GUARDIÁN DE JADE ANTIGUO', canvas: buildSpriteCanvas(JADE_TITAN_GRID, JADE_TITAN_PAL, 5, 'rgba(52,211,153,0.42)', 10) }
  ];

  const NEBULAE = [
    createNebula(340, 210, ['rgba(56,189,248,0.2)', 'rgba(14,165,233,0.12)', 'rgba(30,58,138,0.07)']),
    createNebula(350, 220, ['rgba(16,185,129,0.2)', 'rgba(168,85,247,0.13)', 'rgba(15,118,110,0.07)']),
    createNebula(350, 220, ['rgba(244,63,94,0.19)', 'rgba(168,85,247,0.13)', 'rgba(88,28,135,0.08)'])
  ];

  window.NEBULA_ASSETS = {
    SHIPS,
    SPRITES,
    PLANETS,
    CELESTIALS,
    STATIONS,
    ROBOTS,
    NEBULAE
  };
})();
