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
  // 1. PLAYER STARSHIPS (V1 + V2 + 2 BRAND-NEW SHIPS + WINGMAN DRONE)
  // =========================================================================
  const SHIP_DEFS = {
    interceptor: {
      id: 'interceptor',
      name: 'INTERCEPTOR V1',
      origin: 'Versión 1',
      desc: 'Caza equilibrado con láser plasma azul y Bomba Nova potenciada.',
      stats: { speed: 4, power: 4, armor: 3 },
      speed: 375,
      lives: 3,
      bombs: 3,
      bulletColor: 'blue',
      accent: '#38bdf8',
      palette: {
        W: '#f8fafc', L: '#cbd5e1', M: '#94a3b8', D: '#475569',
        K: '#1e293b', C: '#38bdf8', G: '#64748b'
      },
      grid: [
        '.......WW.......',
        '......WLLW......',
        '......WKKW......',
        '.....WLKKLW.....',
        '.....WLKKLW.....',
        '..G..WLLLLW..G..',
        '..G..WLLLLW..G..',
        '....WWLMMMWW....',
        '...WWLLMMLLWW...',
        '..WWLLLMMLLLWW..',
        '.WWLLLLMMLLLLWW.',
        'WWLLDMMMMMMDLLWW',
        'WWM.DDMMMMDD.MWW',
        '....DD.DD.DD....'
      ]
    },
    vanguard: {
      id: 'vanguard',
      name: 'VANGUARDIA V2',
      origin: 'Versión 2',
      desc: 'Alta cadencia de fuego cuádruple y escudo regenerativo rápido.',
      stats: { speed: 4, power: 4, armor: 4 },
      speed: 355,
      lives: 4,
      bombs: 2,
      bulletColor: 'cyan',
      accent: '#60a5fa',
      palette: {
        W: '#f8fafc', L: '#e2e8f0', M: '#94a3b8', D: '#64748b',
        K: '#334155', B: '#38bdf8'
      },
      grid: [
        '.......WW.......',
        '......WLLW......',
        '......WBBW......',
        '.....WLBBMW.....',
        '.....WLLMMW.....',
        '...M.WLLMMW.M...',
        '...M.WLLMMW.M...',
        '...D.WLLMMW.D...',
        '..WWLWLLMMWLWW..',
        '.WWWLWLLMMWLWWW.',
        'WWKKWWLLMMWWKKWW',
        'WWMMWWLLMMWWMMWW',
        'WWWWWWLLMMWWWWWW',
        'LLLLLLMMMMLLLLLL',
        'MMMM..MMMM..MMMM',
        '..KK..DDDD..KK..'
      ]
    },
    valkyrie: {
      id: 'valkyrie',
      name: 'VALQUIRIA SOLARIS',
      origin: 'Nueva V3',
      desc: 'Caza pesado solar: rayos dorados de alto daño + blindaje extra.',
      stats: { speed: 3, power: 5, armor: 5 },
      speed: 335,
      lives: 4,
      bombs: 3,
      bulletColor: 'solar',
      accent: '#facc15',
      palette: {
        Y: '#fde047', G: '#f59e0b', O: '#ea580c', R: '#ef4444',
        D: '#7c2d12', W: '#fffbeb', C: '#38bdf8', E: '#e0f2fe',
        S: '#cbd5e1', K: '#1e293b'
      },
      grid: [
        '........WW........',
        '.......WYYW.......',
        '.......YGGY.......',
        '......YGEEGY......',
        '..Y...YGCCGY...Y..',
        '..G..YYGCCGYY..G..',
        '..O..YGGKKGGY..O..',
        '.RO.YYGSSSSGYY.OR.',
        '.RRYGGSSYYSSGGYRR.',
        'RRYYGGOOYYOOGGYYRR',
        'RROOGGDRYYRDGGOORR',
        'DD.OGGDRRRYDGGO.DD',
        '...DGG.DDDD.GGD...',
        '....OO......OO....'
      ]
    },
    phantom: {
      id: 'phantom',
      name: 'ESPECTRO QUANTUM',
      origin: 'Nueva V3',
      desc: 'Velocidad máxima, láseres cuánticos y dron escolta inicial.',
      stats: { speed: 5, power: 4, armor: 3 },
      speed: 425,
      lives: 3,
      bombs: 2,
      startDrone: true,
      bulletColor: 'quantum',
      accent: '#c084fc',
      palette: {
        V: '#a855f7', P: '#e879f9', D: '#581c87', K: '#1e1b4b',
        C: '#2dd4bf', E: '#ccfbf1', W: '#f8fafc', M: '#64748b'
      },
      grid: [
        '...C..........C...',
        '...E..........E...',
        '..CV....WW....VC..',
        '..PV...WEEW...VP..',
        '..PV..WECCEW..VP..',
        '.PPVV.VCCCCV.VVPP.',
        '.PVVVVVKKKKVVVVVP.',
        'PPVVDDVKWWKVDDVVPP',
        'PVVDDVVWWWWVVDDVVP',
        'VVDD.VVPPPPVV.DDVV',
        'VD...DDVVVVDD...DV',
        'D.....DK..KD.....D',
        '.......C..C.......'
      ]
    }
  };

  const WINGMAN_GRID = [
    '..CC..',
    '.CEEC.',
    'SMWWMS',
    '.SMMS.',
    '..OO..'
  ];
  const WINGMAN_PAL = {
    C: '#38bdf8', E: '#e0f2fe', S: '#cbd5e1', M: '#475569', W: '#ffffff', O: '#facc15'
  };

  // =========================================================================
  // 2. ENEMY SPRITES (V1 + V2 + 4 NEW ENEMY CLASSES)
  // =========================================================================
  const ENEMY_PALETTES = {
    redJelly: { R: '#f43f3f', D: '#b91c1c', P: '#ff9ebb', Y: '#ffd43b' },
    goldJelly: { Y: '#ffd43b', O: '#f97316', B: '#1d70e8', W: '#ffffff' },
    v2Red: { R: '#ef4444', K: '#991b1b', P: '#f472b6', Y: '#fde047' },
    v2Gold: { Y: '#facc15', O: '#ea580c', B: '#2563eb', W: '#ffffff' },
    ufo: { C: '#38bdf8', E: '#e0f2fe', S: '#64748b', D: '#334155', P: '#ff6b9d', Y: '#ffd13b' },
    interceptor: { D: '#334155', M: '#64748b', R: '#ff3b4e', P: '#ff8fb1', Y: '#ffd13b' },
    drone: { S: '#cbd5e1', M: '#64748b', C: '#38bdf8', P: '#f472b6', D: '#1e293b' },
    // NEW enemies
    plasmaJelly: {
      V: '#a855f7', L: '#d8b4fe', D: '#581c87', C: '#22d3ee', W: '#ffffff', P: '#f472b6'
    },
    mechBot: {
      S: '#cbd5e1', M: '#64748b', D: '#334155', K: '#0f172a',
      R: '#ff3b4e', Y: '#facc15', C: '#38bdf8', O: '#f97316'
    },
    beetleCruiser: {
      G: '#10b981', L: '#6ee7b7', D: '#065f46', K: '#022c22',
      Y: '#facc15', O: '#f59e0b', R: '#f43f5e', W: '#ffffff'
    },
    prismWeaver: {
      C: '#22d3ee', E: '#cffafe', P: '#f472b6', M: '#db2777',
      V: '#7c3aed', W: '#ffffff', Y: '#fde047'
    },
    bossDreadnought: {
      W: '#f1f5f9', L: '#94a3b8', M: '#475569', D: '#1e293b',
      R: '#ef4444', P: '#f472b6', Y: '#facc15', C: '#38bdf8', O: '#f97316'
    },
    stationPod: {
      L: '#cbd5e1', M: '#64748b', D: '#1e293b', C: '#38bdf8',
      O: '#ff9f1c', R: '#ff3b4e', Y: '#ffd13b'
    },
    spark: { C: '#38bdf8', Y: '#facc15', P: '#f472b6' }
  };

  const ENEMY_GRIDS = {
    redJelly0: [
      '...RRRRRR...',
      '.RRRRRRRRRR.',
      'RRRRRRRRRRRR',
      'RRRRPPPPPRRR',
      'RRRPPYYPPPRR',
      'RRRPPYYPPPRR',
      'RRRRPPPPPRRR',
      'RRRRRRRRRRRR',
      '.RRRRRRRRRR.',
      '..DDDDDDDD..',
      '..RR.RR.RR..',
      '..RR.RR.RR..',
      '..RR.RR.RR..'
    ],
    redJelly1: [
      '...RRRRRR...',
      '.RRRRRRRRRR.',
      'RRRRRRRRRRRR',
      'RRRRPPPPPRRR',
      'RRRPPYYPPPRR',
      'RRRPPYYPPPRR',
      'RRRRPPPPPRRR',
      'RRRRRRRRRRRR',
      '.RRRRRRRRRR.',
      '..DDDDDDDD..',
      '.RR..RR..RR.',
      '..RR.RR.RR..',
      '...RRRRRR...'
    ],
    goldJelly0: [
      '...YYYYYY...',
      '.YYYYYYYYYY.',
      'YYYYBBBBYYYY',
      'YYYBBWWBBYYY',
      'YYYBWWWWBYYY',
      'YYYBWWWWBYYY',
      'YYYBBWWBBYYY',
      'YYYYBBBBYYYY',
      '.YYYYYYYYYY.',
      '..OOOOOOOO..',
      '..Y.Y..Y.Y..',
      '..Y.Y..Y.Y..',
      '..Y.Y..Y.Y..'
    ],
    goldJelly1: [
      '...YYYYYY...',
      '.YYYYYYYYYY.',
      'YYYYBBBBYYYY',
      'YYYBBWWBBYYY',
      'YYYBWWWWBYYY',
      'YYYBWWWWBYYY',
      'YYYBBWWBBYYY',
      'YYYYBBBBYYYY',
      '.YYYYYYYYYY.',
      '..OOOOOOOO..',
      '.Y..Y..Y..Y.',
      '..Y.Y..Y.Y..',
      '.Y..Y..Y..Y.'
    ],
    v2Red0: [
      '....RRRRR....',
      '..RRRRRRRRR..',
      '.RRRRRRRRRRR.',
      '.RRRPPPPPRRR.',
      '.RRRPPYPPPRR.',
      '.RRRPPYPPPRR.',
      '.RRRPPPPPRRR.',
      '.RRRRRRRRRRR.',
      '..RRRRRRRRR..',
      '....KKKKK....',
      '...R..R..R...',
      '...R..R..R...',
      '..R...R...R..',
      '..R...R...R..'
    ],
    v2Red1: [
      '....RRRRR....',
      '..RRRRRRRRR..',
      '.RRRRRRRRRRR.',
      '.RRRPPPPPRRR.',
      '.RRRPPYPPPRR.',
      '.RRRPPYPPPRR.',
      '.RRRPPPPPRRR.',
      '.RRRRRRRRRRR.',
      '..RRRRRRRRR..',
      '....KKKKK....',
      '..R...R...R..',
      '...R..R..R...',
      '...R..R..R...',
      '....R.R.R....'
    ],
    ufo: [
      '.....CCCC.....',
      '...CCEEEECC...',
      '..CCEEEEEECC..',
      '..CCCCCCCCCC..',
      '.SSSSSSSSSSSS.',
      'SSPSSYSSPSSYSS',
      'DDDDDDDDDDDDDD',
      '..DDD....DDD..'
    ],
    interceptor: [
      'R....DD....R',
      'R...DMMD...R',
      'RR..DYYD..RR',
      'RRR.DYYD.RRR',
      'RRRRDMMPDRRR',
      '.RRRDMMPDRR.',
      '..RRDDDDDR..',
      '...R.DD.R...',
      '.....RR.....'
    ],
    drone: [
      '....SSSS....',
      '..SSMMMMSS..',
      '.SMMCCCCMMS.',
      'SSMCPPPPCMSS',
      'SSMCPPPPCMSS',
      '.SMMCCCCMMS.',
      '..SSDDDDSS..',
      '.S..M..M..S.',
      'S...C..C...S'
    ],
    // NEW: Neon Violet Plasma Jellyfish
    plasmaJelly0: [
      '....LLLL....',
      '..LLVVVVLL..',
      '.LVVVVVVVVL.',
      '.VVCCWWCCVV.',
      'VVCWWPPWWCVV',
      'VVCWWPPWWCVV',
      '.VVCCWWCCVV.',
      '.VVVVVVVVVV.',
      '..DDDDDDDD..',
      '..C.V..V.C..',
      '.C..V..V..C.',
      '..P.C..C.P..',
      '...P....P...'
    ],
    plasmaJelly1: [
      '....LLLL....',
      '..LLVVVVLL..',
      '.LVVVVVVVVL.',
      '.VVCCWWCCVV.',
      'VVCWWPPWWCVV',
      'VVCWWPPWWCVV',
      '.VVCCWWCCVV.',
      '.VVVVVVVVVV.',
      '..DDDDDDDD..',
      '.C..V..V..C.',
      '..C.V..V.C..',
      '...PC..CP...',
      '..P......P..'
    ],
    // NEW: Armored Cosmic Mecha-Bot Enemy
    mechBot0: [
      '.....Y..Y.....',
      '....SMMMMS....',
      '...SMKKKKMS...',
      '...SKRRRRKS...',
      '....SMMMMS....',
      '.SS.SDCCDS.SS.',
      'SMMSSMCCMSSMMS',
      'SMM.SMYYMS.MMS',
      'SDD.SDDDDS.DDS',
      '.RR..SMMS..RR.',
      '.....SDDS.....',
      '....OO..OO....'
    ],
    mechBot1: [
      '.....C..C.....',
      '....SMMMMS....',
      '...SMKKKKMS...',
      '...SKRYYRKS...',
      '....SMMMMS....',
      'SS..SDCCDS..SS',
      'SMMSSMCCMSSMMS',
      'SMM.SMYYMS.MMS',
      'SDD.SDDDDS.DDS',
      'RR...SMMS...RR',
      '....SD..DS....',
      '...YY....YY...'
    ],
    // NEW: Heavy Emerald Beetle Cruiser
    beetleCruiser: [
      '....GG....GG....',
      '...GLLG..GLLG...',
      '..GLLGGYYGGLLG..',
      '.GLLGGOYYOGGLLG.',
      'GGDGGGRWWRGGGDGG',
      'GDKGGGRWWRGGGKDG',
      'GGDGGGYYYYGGGDGG',
      '.GGDDGGGGGGDDGG.',
      '..GDDGDDDDGDDG..',
      '...OO.G..G.OO...',
      '...RR......RR...'
    ],
    // NEW: Crystal Prism Weaver
    prismWeaver0: [
      '......CC......',
      '.....CEEC.....',
      '....CEWWEC....',
      '..P.CVYYVC.P..',
      '.PMMCVWWVCMMP.',
      'PMWWVVWWVVWWMP',
      '.PMMCVWWVCMMP.',
      '..P.CVYYVC.P..',
      '....CEWWEC....',
      '.....CEEC.....',
      '......CC......'
    ],
    prismWeaver1: [
      '......PP......',
      '.....PMMP.....',
      '....CEWWEC....',
      '..C.PVYYVP.C..',
      '.CEEPVWWVPEEC.',
      'CEWWVVYYVVWWEC',
      '.CEEPVWWVPEEC.',
      '..C.PVYYVP.C..',
      '....CEWWEC....',
      '.....PMMP.....',
      '......PP......'
    ],
    bossDreadnought: [
      '..........WWWWWWWW..........',
      '.......WWWLLLLLLLLWWW.......',
      '.....WWLLMMMMMMMMMMLLWW.....',
      '....WLLMMCCCCCCCCCCMMLLW....',
      '..WWLMDDCCCCCCCCCCCCDDMLWW..',
      '.WLLMDDCCCRRRRRRRRCCC.DMLLW.',
      'WLLMDDCCCRPPYYYYPPRCCCDDMLLW',
      'WLMDDCCCRPPYYYYYYPPRCCCDDMLW',
      'WLMDDCCCRPPYYYYYYPPRCCCDDMLW',
      'WLLMDDCCCRPPYYYYPPRCCCDDMLLW',
      '.WLLMDDCCCRRRRRRRRCCCDDMLLW.',
      '..WWLMDDDDCCCCCCCCDDDDMLWW..',
      '....WLLMMMMMMMMMMMMMMLLW....',
      '..OO..WLLDD..OO..DDLLW..OO..',
      '..RR...WW....RR....WW...RR..'
    ],
    stationMini: [
      '..OO....LL....OO..',
      '.OOOO..LDDL..OOOO.',
      '.OOOOLLCCCCLLOOOO.',
      '.OOOOLCCYYCCL.OOO.',
      'LLLLLCYYYYYYCLLLLL',
      'DDDDDCYYYYYYCDDDDD',
      '.OOOOLCCYYCCL.OOO.',
      '.OOOOLLCCCCLLOOOO.',
      '.OOOO..LDDL..OOOO.',
      '..OO....LL....OO..'
    ],
    spark: [
      '..Y..',
      '.P.P.',
      'Y.C.Y',
      '.P.P.',
      '..Y..'
    ]
  };

  // =========================================================================
  // 3. PIXEL-ART PLANETS (V1 + V2 + NEW TERRA, CYBER, MAGMA WORLDS)
  // =========================================================================
  function createPixelPlanet(radiusPx, pixelStep, theme) {
    const extraX = theme.ring ? radiusPx * 0.95 : (theme.signpost || theme.aimlSigns ? 26 : 10);
    const extraY = (theme.signpost || theme.aimlSigns) ? 30 : (theme.ring ? 18 : 10);
    const w = Math.ceil((radiusPx + extraX) * 2);
    const h = Math.ceil((radiusPx + extraY) * 2);
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2) + ((theme.signpost || theme.aimlSigns) ? 10 : 0);
    const bayer = [[0, 2], [3, 1]];

    const drawRingHalf = (isFront) => {
      if (!theme.ring) return;
      const tilt = theme.ringTilt || 0;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      const rxMax = radiusPx * 1.75;
      const ryMax = radiusPx * 0.42;
      for (let y = -radiusPx; y <= radiusPx; y += pixelStep) {
        for (let x = -rxMax; x <= rxMax; x += pixelStep) {
          const rx = x * cosT + y * sinT;
          const ry = -x * sinT + y * cosT;
          const d = (rx * rx) / (rxMax * rxMax) + (ry * ry) / (ryMax * ryMax);
          if (d >= 0.56 && d <= 1.0 && (isFront ? ry >= 0 : ry < 0)) {
            ctx.fillStyle = d > 0.8 ? theme.ring[0] : (d > 0.68 ? theme.ring[1] : (theme.ring[2] || theme.ring[1]));
            ctx.fillRect(Math.round(cx + x), Math.round(cy + y), pixelStep, pixelStep);
          }
        }
      }
    };

    // Subtle atmosphere halo
    if (theme.atmosphere) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = theme.atmosphere;
      for (let y = -radiusPx - pixelStep * 2; y <= radiusPx + pixelStep * 2; y += pixelStep) {
        for (let x = -radiusPx - pixelStep * 2; x <= radiusPx + pixelStep * 2; x += pixelStep) {
          const d = Math.hypot(x, y);
          if (d > radiusPx - pixelStep && d <= radiusPx + pixelStep * 2) {
            ctx.fillRect(Math.round(cx + x), Math.round(cy + y), pixelStep, pixelStep);
          }
        }
      }
      ctx.restore();
    }

    drawRingHalf(false);

    // Sphere with Bayer 2x2 dithering + custom surface modes
    for (let y = -radiusPx; y <= radiusPx; y += pixelStep) {
      for (let x = -radiusPx; x <= radiusPx; x += pixelStep) {
        const dist = Math.hypot(x, y);
        if (dist > radiusPx) continue;

        const gx = Math.floor((x + 500) / pixelStep);
        const gy = Math.floor((y + 500) / pixelStep);
        const light = (-x * 0.65 - y * 0.72) / radiusPx;
        const thresh = (bayer[gy & 1][gx & 1] / 4) - 0.35;

        let color = theme.colors[1];
        if (light + thresh > 0.32) color = theme.colors[0];
        else if (light + thresh < -0.25) color = theme.colors[2];
        if (theme.colors[3] && light + thresh < -0.6) color = theme.colors[3];

        if (theme.mode === 'terra') {
          // Continents + polar caps + swirling clouds
          const n = Math.sin(x * 0.11 + y * 0.05) + Math.cos(y * 0.13 - x * 0.06);
          const absY = Math.abs(y) / radiusPx;
          if (absY > 0.8) {
            color = light > -0.2 ? '#f8fafc' : '#cbd5e1';
          } else if (n > 0.38) {
            color = light > 0.15 ? '#4ade80' : (light > -0.35 ? '#16a34a' : '#14532d');
          }
          // Clouds
          const cl = Math.sin(x * 0.09 + y * 0.24);
          if (cl > 0.72 && light > -0.35) color = '#f1f5f9';
        } else if (theme.mode === 'cyber') {
          // Metallic techno-grid with glowing circuit lines
          const onGrid = (Math.abs(x) % (pixelStep * 4) === 0) || (Math.abs(y) % (pixelStep * 4) === 0);
          const node = (Math.abs(x) % (pixelStep * 4) === 0) && (Math.abs(y) % (pixelStep * 4) === 0);
          if (node && light > -0.45) color = '#f472b6';
          else if (onGrid && ((gx + gy) % 3 !== 0) && light > -0.5) color = '#22d3ee';
        } else if (theme.mode === 'magma') {
          // Dark basalt crust with glowing lava rivers
          const crack = Math.abs(Math.sin(x * 0.12 + Math.cos(y * 0.1) * 2.2) + Math.cos(y * 0.14 - x * 0.07));
          if (crack < 0.22) color = '#fef08a';
          else if (crack < 0.38) color = '#f97316';
          else if (crack < 0.5) color = '#dc2626';
        } else if (theme.craters) {
          for (const c of theme.craters) {
            const cd = Math.hypot(x - c.x, y - c.y);
            if (cd < c.r) {
              color = cd < c.r * 0.6 ? (theme.colors[3] || theme.colors[2]) : theme.colors[2];
            }
          }
        } else if (theme.bands) {
          const band = Math.sin(y * 0.16);
          if (band > 0.45 && light > -0.4) color = theme.colors[0];
          else if (band < -0.5) color = theme.colors[2];
        }

        ctx.fillStyle = color;
        ctx.fillRect(Math.round(cx + x), Math.round(cy + y), pixelStep, pixelStep);
      }
    }

    drawRingHalf(true);

    // V1 retro signpost
    if (theme.signpost) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(cx - 14, cy - radiusPx - 14, 3, 18);
      ctx.fillRect(cx + 10, cy - radiusPx - 18, 3, 22);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 34, cy - radiusPx - 20, 28, 10);
      ctx.fillStyle = '#ffd13b';
      ctx.fillRect(cx + 6, cy - radiusPx - 25, 32, 11);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 28, cy - radiusPx - 16, 16, 2);
      ctx.fillRect(cx + 11, cy - radiusPx - 20, 20, 2);
    }

    // V2 iconic AI/ML & GEN AI signs
    if (theme.aimlSigns) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(cx - 14, cy - radiusPx - 20, 3, 24);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 46, cy - radiusPx - 28, 42, 16);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx - 46, cy - radiusPx - 14, 42, 2);

      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(cx + 14, cy - radiusPx - 22, 3, 26);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx + 4, cy - radiusPx - 32, 48, 16);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(cx + 4, cy - radiusPx - 18, 48, 2);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('AI/ML', cx - 40, cy - radiusPx - 17);
      ctx.fillText('GEN AI', cx + 10, cy - radiusPx - 21);
    }

    return off;
  }

  // =========================================================================
  // 4. RADIANT PIXEL SUNS & BINARY STARS (BRAND-NEW!)
  // =========================================================================
  function createPixelSun(radiusPx, pixelStep, style) {
    const pad = radiusPx + 36;
    const size = (radiusPx + pad) * 2;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const cx = size / 2;
    const cy = size / 2;

    // Soft layered pixel halo
    const grad = ctx.createRadialGradient(cx, cy, radiusPx * 0.5, cx, cy, radiusPx + 42);
    grad.addColorStop(0, style.glowInner);
    grad.addColorStop(0.5, style.glowMid);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Pixel diffraction rays / spikes
    if (style.spikes) {
      ctx.fillStyle = style.spikeColor;
      const len = radiusPx + 34;
      ctx.fillRect(cx - len, cy - pixelStep, len * 2, pixelStep * 2);
      ctx.fillRect(cx - pixelStep, cy - len, pixelStep * 2, len * 2);
      // Diagonal shorter spikes
      for (let d = -radiusPx - 16; d <= radiusPx + 16; d += pixelStep) {
        ctx.fillRect(Math.round(cx + d * 0.72), Math.round(cy + d * 0.72), pixelStep, pixelStep);
        ctx.fillRect(Math.round(cx + d * 0.72), Math.round(cy - d * 0.72), pixelStep, pixelStep);
      }
    }

    // Corona flare pixels around circumference
    for (let a = 0; a < 24; a++) {
      const ang = (Math.PI * 2 * a) / 24;
      const flareLen = radiusPx + pixelStep * (2 + (a % 3) * 2);
      for (let r = radiusPx; r <= flareLen; r += pixelStep) {
        const fx = Math.round((cx + Math.cos(ang) * r) / pixelStep) * pixelStep;
        const fy = Math.round((cy + Math.sin(ang) * r) / pixelStep) * pixelStep;
        ctx.fillStyle = r > radiusPx + pixelStep * 2 ? style.outer : style.mid;
        ctx.fillRect(fx, fy, pixelStep, pixelStep);
      }
    }

    // Sun surface with granulated plasma texture
    for (let y = -radiusPx; y <= radiusPx; y += pixelStep) {
      for (let x = -radiusPx; x <= radiusPx; x += pixelStep) {
        const dist = Math.hypot(x, y);
        if (dist > radiusPx) continue;
        const rn = dist / radiusPx;
        const grain = Math.sin(x * 0.18 + y * 0.12) * Math.cos(x * 0.1 - y * 0.21);

        let col = style.core;
        if (style.eclipse && rn < 0.74) {
          col = rn < 0.6 ? '#070b18' : '#1e1b4b';
        } else if (rn > 0.82) {
          col = style.outer;
        } else if (rn > 0.56) {
          col = grain > 0.2 ? style.core : style.mid;
        } else if (grain < -0.35) {
          col = style.mid;
        }
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(cx + x), Math.round(cy + y), pixelStep, pixelStep);
      }
    }
    return off;
  }

  // =========================================================================
  // 5. PIXEL-DITHERED NEBULA CLOUDS & SPIRAL GALAXIES
  // =========================================================================
  function createNebulaCloud(w, h, colors) {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const step = 6;
    const bayer = [[0, 2], [3, 1]];
    const cx = w / 2;
    const cy = h / 2;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const nx = (x - cx) / (w * 0.45);
        const ny = (y - cy) / (h * 0.45);
        const warp = Math.sin(nx * 2.4 + ny * 1.5) * 0.28 + Math.cos(ny * 2.8 - nx * 1.3) * 0.22;
        const d = Math.hypot(nx, ny) + warp;
        const thresh = bayer[(y / step) & 1][(x / step) & 1] * 0.14;
        if (d + thresh < 0.92) {
          ctx.fillStyle = d < 0.36 ? colors[0] : (d < 0.64 ? colors[1] : colors[2]);
          ctx.fillRect(x, y, step, step);
        }
      }
    }
    return off;
  }

  function createSpiralGalaxy() {
    const size = 140;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const cx = size / 2;
    const cy = size / 2;
    const p = 3;
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 95; i++) {
        const t = i / 95;
        const ang = arm * Math.PI + t * 4.4;
        const r = t * 54;
        const gx = Math.cos(ang) * r;
        const gy = Math.sin(ang) * r * 0.52;
        // Tilt slightly
        const rx = gx * 0.88 - gy * 0.45;
        const ry = gx * 0.45 + gy * 0.88;
        const jitterX = (Math.sin(i * 12.7 + arm) * 3);
        const jitterY = (Math.cos(i * 9.3 + arm) * 3);
        ctx.fillStyle = t < 0.22 ? '#fef08a' : (t < 0.55 ? '#c084fc' : '#38bdf8');
        ctx.globalAlpha = 1 - t * 0.72;
        ctx.fillRect(Math.round((cx + rx + jitterX) / p) * p, Math.round((cy + ry + jitterY) / p) * p, p, p);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 4, cy - 4, 8, 8);
    return off;
  }

  // =========================================================================
  // 6. SPACE STATIONS (V1 + V2 + NEW HALO RING CITADEL & WARP GATE)
  // =========================================================================
  function createV1Station() {
    const off = document.createElement('canvas');
    off.width = 160;
    off.height = 96;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const p = 4;
    const r = (gx, gy, gw, gh, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(gx * p, gy * p, gw * p, gh * p);
    };
    r(1, 5, 10, 14, '#1e3a8a');
    r(2, 6, 8, 12, '#2563eb');
    r(29, 5, 10, 14, '#1e3a8a');
    r(30, 6, 8, 12, '#2563eb');
    for (let y = 8; y <= 16; y += 3) {
      r(2, y, 8, 1, '#60a5fa');
      r(30, y, 8, 1, '#60a5fa');
    }
    r(11, 10, 18, 4, '#64748b');
    r(11, 11, 18, 2, '#94a3b8');
    r(15, 2, 10, 20, '#475569');
    r(16, 4, 8, 16, '#cbd5e1');
    r(17, 7, 6, 10, '#1e293b');
    r(18, 9, 4, 6, '#38bdf8');
    r(19, 10, 2, 4, '#fef08a');
    r(19, 0, 2, 3, '#e2e8f0');
    r(19, 22, 2, 2, '#ff9f1c');
    return off;
  }

  const V2_STATION_GRID = [
    'BBBBBB.......WW.......BBBBBB',
    'BCCCCB......WMMW......BCCCCB',
    'BBBBBB.....WMMMMW.....BBBBBB',
    '..MM......WMMYYMMW......MM..',
    'WWWWWWWWWWWMMCCMMWWWWWWWWWWW',
    '..MM......WMMYYMMW......MM..',
    'BBBBBB.....WMMMMW.....BBBBBB',
    'BCCCCB......WDDW......BCCCCB',
    'BBBBBB.......RR.......BBBBBB'
  ];
  const V2_STATION_PAL = {
    B: '#1d4ed8', C: '#38bdf8', W: '#e2e8f0', M: '#64748b', D: '#334155', Y: '#facc15', R: '#ef4444'
  };

  // NEW: Giant Ring Citadel Space Station (Toroidal Megastructure)
  function createRingCitadelStation() {
    const w = 196;
    const h = 152;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const cx = w / 2;
    const cy = h / 2;
    const p = 4;

    // Outer habitat ring
    for (let y = -56; y <= 56; y += p) {
      for (let x = -76; x <= 76; x += p) {
        const d = (x * x) / (72 * 72) + (y * y) / (44 * 44);
        if (d >= 0.58 && d <= 1.0) {
          let col = '#64748b';
          if (y < -12) col = '#cbd5e1';
          else if (y > 16) col = '#334155';
          // Illuminated city windows along the ring
          if (d > 0.72 && d < 0.86 && ((Math.abs(x) + Math.abs(y)) % (p * 3) === 0)) {
            col = ((x + y) & 4) ? '#facc15' : '#38bdf8';
          }
          ctx.fillStyle = col;
          ctx.fillRect(Math.round(cx + x), Math.round(cy + y), p, p);
        }
      }
    }

    // 4 Radial spokes connecting to central core
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx - 60, cy - 4, 120, 8);
    ctx.fillRect(cx - 4, cy - 38, 8, 76);

    // Central Command Spire & Glowing Reactor
    ctx.fillStyle = '#475569';
    ctx.fillRect(cx - 18, cy - 26, 36, 52);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx - 14, cy - 22, 28, 44);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 10, cy - 12, 20, 24);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(cx - 6, cy - 8, 12, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2, cy - 4, 4, 8);

    // Top & bottom communication antennas
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - 2, cy - 66, 4, 40);
    ctx.fillRect(cx - 2, cy + 26, 4, 34);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(cx - 4, cy - 70, 8, 6);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 12, cy - 52, 24, 4);
    return off;
  }

  // NEW: Galactic Warp Gate Station
  function createWarpGateStation() {
    const size = 152;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const cx = size / 2;
    const cy = size / 2;
    const p = 4;

    // Swirling energy portal inside
    for (let y = -44; y <= 44; y += p) {
      for (let x = -44; x <= 44; x += p) {
        const d = Math.hypot(x, y);
        if (d < 42) {
          const ang = Math.atan2(y, x);
          const swirl = Math.sin(d * 0.25 + ang * 3);
          ctx.fillStyle = d < 14 ? '#e0f2fe' : (swirl > 0.2 ? '#38bdf8' : (swirl > -0.3 ? '#818cf8' : '#312e81'));
          ctx.fillRect(Math.round(cx + x), Math.round(cy + y), p, p);
        }
      }
    }

    // Armored metallic outer gate ring
    for (let y = -58; y <= 58; y += p) {
      for (let x = -58; x <= 58; x += p) {
        const d = Math.hypot(x, y);
        if (d >= 42 && d <= 56) {
          ctx.fillStyle = d > 51 ? '#334155' : (y < 0 ? '#cbd5e1' : '#64748b');
          ctx.fillRect(Math.round(cx + x), Math.round(cy + y), p, p);
        }
      }
    }

    // 4 Cardinal Pylons with glowing gold/magenta nodes
    const pylons = [
      [cx - 8, cy - 70, 16, 20],
      [cx - 8, cy + 50, 16, 20],
      [cx - 70, cy - 8, 20, 16],
      [cx + 50, cy - 8, 20, 16]
    ];
    for (const [px, py, pw, ph] of pylons) {
      ctx.fillStyle = '#475569';
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(px + 4, py + 4, pw - 8, ph - 8);
    }
    return off;
  }

  // =========================================================================
  // 7. COSMIC ROBOTS FOR BACKGROUND & BOSS ("robots cosmicos")
  // =========================================================================
  // 7A. Giant Astral Colossus Robot (Majestic Cosmic Mech drifting in space!)
  const COLOSSUS_ROBOT_PAL = {
    W: '#e2e8f0', L: '#94a3b8', M: '#475569', D: '#1e293b', K: '#0f172a',
    G: '#facc15', O: '#f59e0b', C: '#22d3ee', E: '#cffafe',
    V: '#8b5cf6', P: '#f472b6', B: '#2563eb'
  };
  const COLOSSUS_ROBOT_GRID = [
    '............GG............',
    '..........GGCCGG..........',
    '.........G.LLLL.G.........',
    '..........LMMMMLL.........',
    '.........LMKKKKML.........',
    '.........LKCEECKL.........',
    '.........LMKKKKML.........',
    '.....GG...LMMMMLL...GG....',
    '...GGWWG.LLMMMMLL.GWWGG...',
    '..GWWLLWGLMMCCMMGLWLLWWG..',
    '.GWWLLMMWLMEEEEMLWMMLLWWG.',
    '.GWLLMMDMMLMCCMMLMDMMLLWG.',
    'GWLLMD.DMMMGGGGMMMD.DMLLWG',
    'GWLMD..DMMMVPPVMMMD..DMLWG',
    'GLLD...DMMMMMMMMMMD...DLLG',
    '.DD.....DMMGGGGMMD.....DD.',
    '........DMLMMMMMD.........',
    '.......DMMLL..LLMMD.......',
    '.......DMMMD..DMMMD.......',
    '......DMMMD....DMMMD......',
    '......DGGD......DGGD......',
    '......CC..........CC......',
    '......B............B......'
  ];

  // 7B. Astro-Droid Explorer Bot (Retro friendly space-robot patrolling orbit)
  const EXPLORER_ROBOT_PAL = {
    W: '#f8fafc', L: '#cbd5e1', M: '#64748b', D: '#334155', K: '#0f172a',
    O: '#fb923c', Y: '#fde047', C: '#38bdf8', E: '#e0f2fe', R: '#f43f5e'
  };
  const EXPLORER_ROBOT_GRID = [
    '.......R.......',
    '.......M.......',
    '.....WWWWW.....',
    '....WLLLLLW....',
    '....WKKKKKW....',
    '....WKCECKW....',
    '....WKKKKKW....',
    '..O..WWWWW..O..',
    '.OWWWWWWWWWWW0.'.replace('0', 'O'),
    '.OWWWLOOOLWWWO.',
    '.M.WWLCOYLWW.M.',
    '.M.WWLLLLLWW.M.',
    '...DDWWWWWDD...',
    '....WW...WW....',
    '....DD...DD....',
    '....OO...OO....',
    '....YY...YY....'
  ];

  // 7C. Spherical Cyber-Sentinel Robot (Floating orb-bot with articulated arms)
  const SPHERE_ROBOT_PAL = {
    L: '#cbd5e1', M: '#64748b', D: '#334155', K: '#0f172a',
    C: '#22d3ee', Y: '#facc15', P: '#f472b6', W: '#ffffff'
  };
  const SPHERE_ROBOT_GRID = [
    '......CC......',
    '.....LMMLL....',
    '...LLMMMMLL...',
    '..LMMKKKKMML..',
    'C.LMKYYYYKML.C',
    'MLLMKYWWYKMLMM',
    'D.LMKYYYYKML.D',
    '..LMMKKKKMML..',
    '...LLMMMMLL...',
    '..M..DDDD..M..',
    '.M..P....P..M.',
    'C............C'
  ];

  // 7D. BOSS #3: TITAN ROBÓTICO CÓSMICO "HYPERION"
  const TITAN_BOSS_PAL = {
    W: '#f8fafc', L: '#cbd5e1', M: '#64748b', D: '#334155', K: '#0f172a',
    G: '#facc15', O: '#f97316', R: '#ef4444', P: '#f472b6',
    C: '#22d3ee', E: '#e0f2fe', V: '#7c3aed'
  };
  const TITAN_BOSS_GRID = [
    '..............GG..............',
    '............GGCCGG............',
    '....OO.....GLLMMLLG.....OO....',
    '...ORRO...GLLMKKMLLG...ORRO...',
    '..OMMMMO..LLKRRRRKLL..OMMMMO..',
    '.OMLLLLMO.LLKREERKLL.OMLLLLMO.',
    'OMLGGGGMLMMLMKKKKMLMMLMGGGGLMO',
    'OMLGVVGLMMLLMMMMMMLLMMLLGVGLMO',
    'OMLLMMLLMMLLMMCCMMLLMMLLMMLLMO',
    '.OMDDDDMMMLMMEEEEMMLMMMDDDDMO.',
    '..ODDD.MMLMMCEWWECMMLMM.DDDO..',
    '..OMMO.MMLMMCEWWECMMLMM.OMMO..',
    '..ORRO..MMLLMMCCMMLLMM..ORRO..',
    '..OYYO...MLLGGGGGGLLM...OYYO..',
    '...RR.....MMDDDDDDMM.....RR...',
    '..........DD..PP..DD..........'
  ].map((row) => row.replace(/Y/g, 'G'));

  // Asteroids
  const ASTEROID_PAL = { L: '#94a3b8', M: '#64748b', D: '#334155', K: '#1e293b', C: '#38bdf8', G: '#facc15' };
  const ASTEROID_1 = [
    '...LLLL...',
    '.LLMMMMLL.',
    'LMMLDDMMML',
    'LMMDDDDGML',
    'MMDDDDKKMM',
    '.MMKKKKMM.',
    '..DDDDDD..'
  ];
  const ASTEROID_2 = [
    '..LLL....',
    '.LMMML...',
    'LMDCMMLL.',
    'MMDDKKMML',
    '.MDDKKKM.',
    '..DDDDD..'
  ];

  // =========================================================================
  // 8. ASSEMBLE & EXPORT ALL ASSETS
  // =========================================================================
  const SHIPS = {};
  for (const key of Object.keys(SHIP_DEFS)) {
    const def = SHIP_DEFS[key];
    SHIPS[key] = {
      ...def,
      sprite: buildSpriteCanvas(def.grid, def.palette, 3, def.accent, 6)
    };
  }

  const SPRITES = {
    wingman: buildSpriteCanvas(WINGMAN_GRID, WINGMAN_PAL, 3, '#38bdf8', 5),
    redJelly0: buildSpriteCanvas(ENEMY_GRIDS.redJelly0, ENEMY_PALETTES.redJelly, 3),
    redJelly1: buildSpriteCanvas(ENEMY_GRIDS.redJelly1, ENEMY_PALETTES.redJelly, 3),
    goldJelly0: buildSpriteCanvas(ENEMY_GRIDS.goldJelly0, ENEMY_PALETTES.goldJelly, 3),
    goldJelly1: buildSpriteCanvas(ENEMY_GRIDS.goldJelly1, ENEMY_PALETTES.goldJelly, 3),
    v2Red0: buildSpriteCanvas(ENEMY_GRIDS.v2Red0, ENEMY_PALETTES.v2Red, 3),
    v2Red1: buildSpriteCanvas(ENEMY_GRIDS.v2Red1, ENEMY_PALETTES.v2Red, 3),
    ufo: buildSpriteCanvas(ENEMY_GRIDS.ufo, ENEMY_PALETTES.ufo, 3),
    interceptor: buildSpriteCanvas(ENEMY_GRIDS.interceptor, ENEMY_PALETTES.interceptor, 3),
    drone: buildSpriteCanvas(ENEMY_GRIDS.drone, ENEMY_PALETTES.drone, 3),
    plasmaJelly0: buildSpriteCanvas(ENEMY_GRIDS.plasmaJelly0, ENEMY_PALETTES.plasmaJelly, 3),
    plasmaJelly1: buildSpriteCanvas(ENEMY_GRIDS.plasmaJelly1, ENEMY_PALETTES.plasmaJelly, 3),
    mechBot0: buildSpriteCanvas(ENEMY_GRIDS.mechBot0, ENEMY_PALETTES.mechBot, 3),
    mechBot1: buildSpriteCanvas(ENEMY_GRIDS.mechBot1, ENEMY_PALETTES.mechBot, 3),
    beetleCruiser: buildSpriteCanvas(ENEMY_GRIDS.beetleCruiser, ENEMY_PALETTES.beetleCruiser, 3),
    prismWeaver0: buildSpriteCanvas(ENEMY_GRIDS.prismWeaver0, ENEMY_PALETTES.prismWeaver, 3),
    prismWeaver1: buildSpriteCanvas(ENEMY_GRIDS.prismWeaver1, ENEMY_PALETTES.prismWeaver, 3),
    bossDreadnought: buildSpriteCanvas(ENEMY_GRIDS.bossDreadnought, ENEMY_PALETTES.bossDreadnought, 5, 'rgba(244,63,94,0.65)', 10),
    bossTitan: buildSpriteCanvas(TITAN_BOSS_GRID, TITAN_BOSS_PAL, 5, 'rgba(34,211,238,0.65)', 12),
    stationMini: buildSpriteCanvas(ENEMY_GRIDS.stationMini, ENEMY_PALETTES.stationPod, 3),
    firework: buildSpriteCanvas(ENEMY_GRIDS.spark, ENEMY_PALETTES.spark, 4, 'rgba(250,204,21,0.75)', 6),
    asteroid1: buildSpriteCanvas(ASTEROID_1, ASTEROID_PAL, 3),
    asteroid2: buildSpriteCanvas(ASTEROID_2, ASTEROID_PAL, 3)
  };

  const SUNS = [
    {
      name: 'SOL DORADO HELIOS',
      canvas: createPixelSun(48, 4, {
        core: '#fef9c3', mid: '#facc15', outer: '#ea580c',
        glowInner: 'rgba(254, 240, 138, 0.52)', glowMid: 'rgba(249, 115, 22, 0.22)',
        spikes: true, spikeColor: 'rgba(254, 240, 138, 0.5)'
      })
    },
    {
      name: 'SUPERGIGANTE AZUL SIRIUS',
      canvas: createPixelSun(42, 4, {
        core: '#ffffff', mid: '#7dd3fc', outer: '#0284c7',
        glowInner: 'rgba(186, 230, 253, 0.55)', glowMid: 'rgba(56, 189, 248, 0.22)',
        spikes: true, spikeColor: 'rgba(186, 230, 253, 0.6)'
      })
    },
    {
      name: 'SOL ECLIPSE CARMESÍ',
      canvas: createPixelSun(46, 4, {
        core: '#fde047', mid: '#f97316', outer: '#dc2626',
        glowInner: 'rgba(251, 146, 60, 0.5)', glowMid: 'rgba(220, 38, 38, 0.25)',
        eclipse: true, spikes: false
      })
    }
  ];

  const PLANETS = [
    {
      name: 'PLANETA AI/ML (V2)',
      canvas: createPixelPlanet(46, 3, {
        colors: ['#60a5fa', '#3b82f6', '#2563eb', '#1e3a8a'],
        craters: [{ x: -16, y: -10, r: 9 }, { x: -10, y: 14, r: 10 }, { x: 14, y: -8, r: 7 }],
        aimlSigns: true,
        atmosphere: '#60a5fa'
      })
    },
    {
      name: 'TERRA OCÉANO (NUEVO)',
      canvas: createPixelPlanet(52, 4, {
        colors: ['#38bdf8', '#0284c7', '#1e3a8a', '#0f172a'],
        mode: 'terra',
        atmosphere: '#38bdf8'
      })
    },
    {
      name: 'SATURNO DORADO (V1)',
      canvas: createPixelPlanet(44, 4, {
        colors: ['#fde68a', '#f59e0b', '#b45309', '#78350f'],
        bands: true,
        ring: ['#fef08a', '#f59e0b', '#d97706'],
        ringTilt: 0.22
      })
    },
    {
      name: 'MUNDO CYBER-GRID (NUEVO)',
      canvas: createPixelPlanet(46, 4, {
        colors: ['#475569', '#334155', '#1e293b', '#0f172a'],
        mode: 'cyber',
        ring: ['#22d3ee', '#818cf8'],
        ringTilt: -0.25,
        atmosphere: '#22d3ee'
      })
    },
    {
      name: 'EXOPLANETA MAGMA (NUEVO)',
      canvas: createPixelPlanet(40, 4, {
        colors: ['#44403c', '#292524', '#1c1917', '#0c0a09'],
        mode: 'magma',
        atmosphere: '#f97316'
      })
    },
    {
      name: 'NEBULA ANILLADA (V2)',
      canvas: createPixelPlanet(40, 3, {
        colors: ['#f472b6', '#c084fc', '#7e22ce', '#4c1d95'],
        craters: [{ x: -12, y: 8, r: 8 }, { x: 10, y: -10, r: 6 }],
        ring: ['#fde047', '#f59e0b'],
        ringTilt: 0.34
      })
    },
    {
      name: 'MUNDO ESMERALDA (V1)',
      canvas: createPixelPlanet(42, 4, {
        colors: ['#5eead4', '#0d9488', '#115e59', '#042f2e'],
        bands: true,
        ring: ['#99f6e4', '#2dd4bf'],
        ringTilt: -0.15
      })
    },
    {
      name: 'PLANETA BALIZA AZUL (V1)',
      canvas: createPixelPlanet(44, 4, {
        colors: ['#60a5fa', '#3b82f6', '#1e3a8a'],
        craters: [{ x: -14, y: 10, r: 8 }, { x: 16, y: -8, r: 7 }],
        signpost: true
      })
    },
    {
      name: 'MARTE VOLCÁNICO (V1/V2)',
      canvas: createPixelPlanet(36, 4, {
        colors: ['#fb923c', '#ea580c', '#9a3412', '#431407'],
        craters: [{ x: -8, y: -6, r: 8 }, { x: 12, y: 10, r: 6 }]
      })
    }
  ];

  const STATIONS = [
    { name: 'ESTACIÓN SOLAR (V1)', canvas: createV1Station() },
    { name: 'SATÉLITE CRUZ (V2)', canvas: buildSpriteCanvas(V2_STATION_GRID, V2_STATION_PAL, 4, 'rgba(56,189,248,0.35)', 6) },
    { name: 'CIUDADELA ANILLO (NUEVA)', canvas: createRingCitadelStation() },
    { name: 'PORTAL WARP (NUEVA)', canvas: createWarpGateStation() }
  ];

  const COSMIC_ROBOTS = [
    {
      name: 'COLOSO ASTRAL (NUEVO)',
      canvas: buildSpriteCanvas(COLOSSUS_ROBOT_GRID, COLOSSUS_ROBOT_PAL, 5, 'rgba(34,211,238,0.45)', 10)
    },
    {
      name: 'ANDROIDE EXPLORADOR (NUEVO)',
      canvas: buildSpriteCanvas(EXPLORER_ROBOT_GRID, EXPLORER_ROBOT_PAL, 4, 'rgba(251,146,60,0.4)', 8)
    },
    {
      name: 'GUARDIÁN ESFERA-BOT (NUEVO)',
      canvas: buildSpriteCanvas(SPHERE_ROBOT_GRID, SPHERE_ROBOT_PAL, 4, 'rgba(250,204,21,0.4)', 8)
    }
  ];

  const NEBULAE = [
    createNebulaCloud(340, 220, ['rgba(168,85,247,0.22)', 'rgba(236,72,153,0.14)', 'rgba(59,130,246,0.08)']),
    createNebulaCloud(360, 230, ['rgba(34,211,238,0.2)', 'rgba(16,185,129,0.13)', 'rgba(30,64,175,0.08)']),
    createNebulaCloud(350, 220, ['rgba(249,115,22,0.2)', 'rgba(239,68,68,0.13)', 'rgba(124,45,18,0.08)']),
    createNebulaCloud(320, 210, ['rgba(99,102,241,0.22)', 'rgba(56,189,248,0.13)', 'rgba(139,92,246,0.08)'])
  ];

  const GALAXY_SPIRAL = createSpiralGalaxy();

  window.ASTRO_ASSETS = {
    SHIPS,
    SPRITES,
    SUNS,
    PLANETS,
    STATIONS,
    COSMIC_ROBOTS,
    NEBULAE,
    GALAXY_SPIRAL
  };
})();
