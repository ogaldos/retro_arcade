(() => {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width;  // 960
  const H = canvas.height; // 600

  // DOM HUD elements
  const hudScore = document.getElementById('hud-score');
  const hudHigh = document.getElementById('hud-high');
  const hudWave = document.getElementById('hud-wave');
  const hudCombo = document.getElementById('hud-combo');
  const hudLives = document.getElementById('hud-lives');
  const hudBombs = document.getElementById('hud-bombs');
  const bossHud = document.getElementById('boss-hud');
  const bossNameEl = document.getElementById('boss-name');
  const bossHpText = document.getElementById('boss-hp-text');
  const bossBarFill = document.getElementById('boss-bar-fill');
  const weaponBadge = document.getElementById('weapon-badge');
  const shieldBadge = document.getElementById('shield-badge');
  const overdriveBadge = document.getElementById('overdrive-badge');

  const overlayStart = document.getElementById('overlay-start');
  const overlayPause = document.getElementById('overlay-pause');
  const overlayGameOver = document.getElementById('overlay-gameover');
  const finalScoreEl = document.getElementById('final-score');
  const finalWaveEl = document.getElementById('final-wave');
  const finalHighEl = document.getElementById('final-high');
  const newRecordMsg = document.getElementById('new-record-msg');

  const btnStart = document.getElementById('btn-start');
  const btnResume = document.getElementById('btn-resume');
  const btnRestartPause = document.getElementById('btn-restart-pause');
  const btnRetry = document.getElementById('btn-retry');
  const btnAutofire = document.getElementById('btn-autofire');
  const btnCrt = document.getElementById('btn-crt');
  const btnSound = document.getElementById('btn-sound');
  const btnPause = document.getElementById('btn-pause');
  const btnTouchBomb = document.getElementById('btn-touch-bomb');
  const crtOverlay = document.getElementById('crt-overlay');

  const STORAGE_KEY = 'astro_pixel_storm_highscore_v1';

  // =========================================================================
  // 1. PROCEDURAL RETRO CHIPTUNE AUDIO ENGINE
  // =========================================================================
  class RetroAudio {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.bgmTimer = 0;
      this.bgmStep = 0;
    }

    unlock() {
      if (!this.enabled) return;
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    tone(freq, endFreq, dur, type = 'square', gainVal = 0.08, delay = 0) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq !== freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + dur);
      }
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.01);
    }

    noise(dur = 0.2, gainVal = 0.1) {
      if (!this.enabled || !this.ctx) return;
      const sampleRate = this.ctx.sampleRate;
      const length = Math.floor(sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
    }

    shoot(level = 1) {
      this.tone(680 + level * 70, 220, 0.09, 'square', 0.045);
    }

    hit() {
      this.tone(320, 140, 0.05, 'triangle', 0.05);
    }

    explode(big = false) {
      this.noise(big ? 0.45 : 0.18, big ? 0.18 : 0.09);
      this.tone(big ? 160 : 240, 45, big ? 0.4 : 0.16, 'sawtooth', big ? 0.1 : 0.06);
    }

    powerup() {
      const notes = [440, 554, 659, 880];
      notes.forEach((n, i) => this.tone(n, n * 1.02, 0.08, 'square', 0.06, i * 0.055));
    }

    bomb() {
      this.noise(0.6, 0.22);
      this.tone(520, 50, 0.55, 'sawtooth', 0.12);
      this.tone(880, 110, 0.45, 'square', 0.08, 0.06);
    }

    bossAlert() {
      for (let i = 0; i < 3; i++) {
        this.tone(240, 480, 0.16, 'sawtooth', 0.08, i * 0.22);
      }
    }

    playerHit() {
      this.noise(0.32, 0.16);
      this.tone(220, 65, 0.3, 'sawtooth', 0.1);
    }

    stepBgm(dt, active) {
      if (!active || !this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      this.bgmTimer += dt;
      const beat = 0.18;
      if (this.bgmTimer >= beat) {
        this.bgmTimer -= beat;
        const bassPattern = [110, 110, 130.8, 146.8, 110, 110, 164.8, 146.8];
        const arpPattern = [440, 523.2, 659.2, 523.2, 440, 587.3, 659.2, 784];
        const idx = this.bgmStep % bassPattern.length;
        this.tone(bassPattern[idx], bassPattern[idx], 0.12, 'triangle', 0.028);
        if (this.bgmStep % 2 === 0) {
          this.tone(arpPattern[idx], arpPattern[idx], 0.07, 'square', 0.012);
        }
        this.bgmStep++;
      }
    }
  }

  const audio = new RetroAudio();

  // =========================================================================
  // 2. PIXEL ART SPRITE DEFINITIONS & RENDERER
  // =========================================================================
  const PALETTES = {
    player: {
      'W': '#f8fafc', // bright white hull
      'L': '#cbd5e1', // light silver
      'M': '#94a3b8', // mid grey
      'D': '#475569', // dark slate
      'K': '#1e293b', // deep visor/cockpit
      'C': '#38bdf8', // cyan trim
      'G': '#64748b'  // gun barrel
    },
    redJelly: {
      'R': '#f43f3f', // bright red body (Image 2)
      'D': '#b91c1c', // dark red shadow/collar
      'P': '#ff9ebb', // pink eye oval
      'Y': '#ffd43b'  // yellow pupil
    },
    goldJelly: {
      'Y': '#ffd43b', // bright gold body (Image 2)
      'O': '#f97316', // orange collar
      'B': '#1d70e8', // deep blue eye ring
      'W': '#ffffff'  // white pupil
    },
    ufo: {
      'C': '#38bdf8', // cyan dome
      'E': '#e0f2fe', // dome highlight
      'S': '#64748b', // hull silver
      'D': '#334155', // hull dark
      'P': '#ff6b9d', // pink light
      'Y': '#ffd13b'  // gold light
    },
    interceptor: {
      'D': '#334155', // dark steel
      'M': '#64748b', // metallic trim
      'R': '#ff3b4e', // crimson wings
      'P': '#ff8fb1', // glow core
      'Y': '#ffd13b'  // cockpit
    },
    stationPod: {
      'L': '#cbd5e1',
      'M': '#64748b',
      'D': '#1e293b',
      'C': '#38bdf8',
      'O': '#ff9f1c',
      'R': '#ff3b4e',
      'Y': '#ffd13b'
    }
  };

  // Sprite grids (exact pixel art matching the user's supplied images)
  const GRIDS = {
    // Player white/silver shuttle with twin wing cannons (inspired by Image 1)
    player: [
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
    ],

    // Red Jellyfish Alien (Image 2) - Frame 0 & 1
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

    // Yellow/Gold Jellyfish Alien (Image 2) - Frame 0 & 1
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

    // Sentinel UFO
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

    // Crimson Interceptor Fighter
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

    // Mini Orbital Space Station Icon / Enemy Pod
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
    ]
  };

  function buildSpriteCanvas(grid, palette, scale = 3) {
    const rows = grid.length;
    const cols = grid[0].length;
    const off = document.createElement('canvas');
    off.width = cols * scale;
    off.height = rows * scale;
    const octx = off.getContext('2d');
    octx.imageSmoothingEnabled = false;
    for (let y = 0; y < rows; y++) {
      const row = grid[y];
      for (let x = 0; x < cols; x++) {
        const ch = row[x];
        if (ch !== '.' && palette[ch]) {
          octx.fillStyle = palette[ch];
          octx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    return off;
  }

  const SPRITES = {
    player: buildSpriteCanvas(GRIDS.player, PALETTES.player, 3),
    redJelly0: buildSpriteCanvas(GRIDS.redJelly0, PALETTES.redJelly, 3),
    redJelly1: buildSpriteCanvas(GRIDS.redJelly1, PALETTES.redJelly, 3),
    goldJelly0: buildSpriteCanvas(GRIDS.goldJelly0, PALETTES.goldJelly, 3),
    goldJelly1: buildSpriteCanvas(GRIDS.goldJelly1, PALETTES.goldJelly, 3),
    ufo: buildSpriteCanvas(GRIDS.ufo, PALETTES.ufo, 3),
    interceptor: buildSpriteCanvas(GRIDS.interceptor, PALETTES.interceptor, 3),
    stationMini: buildSpriteCanvas(GRIDS.stationMini, PALETTES.stationPod, 3)
  };

  // Render mini-sprites inside the start screen showcase
  function renderShowcaseSprites() {
    const map = {
      player: SPRITES.player,
      redJelly: SPRITES.redJelly0,
      goldJelly: SPRITES.goldJelly0,
      ufo: SPRITES.ufo,
      stationMini: SPRITES.stationMini
    };
    document.querySelectorAll('.mini-sprite').forEach((el) => {
      const key = el.dataset.sprite;
      const src = map[key];
      if (!src) return;
      const sctx = el.getContext('2d');
      sctx.imageSmoothingEnabled = false;
      sctx.clearRect(0, 0, el.width, el.height);
      const ratio = Math.min((el.width - 4) / src.width, (el.height - 4) / src.height);
      const dw = Math.floor(src.width * ratio);
      const dh = Math.floor(src.height * ratio);
      sctx.drawImage(src, Math.floor((el.width - dw) / 2), Math.floor((el.height - dh) / 2), dw, dh);
    });
  }

  // =========================================================================
  // 3. PIXEL-ART PLANETS & BACKGROUND SPACE STATIONS
  // =========================================================================
  function createPixelPlanet(radiusPx, pixelStep, theme) {
    const size = radiusPx * 2 + 24;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const pctx = off.getContext('2d');
    pctx.imageSmoothingEnabled = false;
    const cx = size / 2;
    const cy = size / 2;

    // Optional ring behind planet
    if (theme.ring) {
      for (let rx = -radiusPx - 26; rx <= radiusPx + 26; rx += pixelStep) {
        for (let ry = -14; ry <= 14; ry += pixelStep) {
          const nx = rx / (radiusPx + 24);
          const ny = ry / 12;
          const d = nx * nx + ny * ny;
          if (d > 0.52 && d < 1.0 && ry < 2) {
            pctx.fillStyle = d > 0.78 ? theme.ring[0] : theme.ring[1];
            pctx.fillRect(Math.round(cx + rx), Math.round(cy + ry), pixelStep, pixelStep);
          }
        }
      }
    }

    // Dithered shaded pixel sphere (matching Image 1 blue planet)
    for (let y = -radiusPx; y <= radiusPx; y += pixelStep) {
      for (let x = -radiusPx; x <= radiusPx; x += pixelStep) {
        const dist = Math.hypot(x, y);
        if (dist <= radiusPx) {
          // Light source top-left
          const light = (-x * 0.65 - y * 0.75) / radiusPx;
          const checker = ((Math.floor(x / pixelStep) + Math.floor(y / pixelStep)) & 1) === 0;
          let colorIdx = 1;
          if (light > 0.35) colorIdx = 0;
          else if (light > 0.05) colorIdx = checker ? 0 : 1;
          else if (light > -0.28) colorIdx = 1;
          else if (light > -0.52) colorIdx = checker ? 1 : 2;
          else colorIdx = 2;

          // Surface bands or craters
          if (theme.craters) {
            for (const c of theme.craters) {
              const cd = Math.hypot(x - c.x, y - c.y);
              if (cd < c.r) {
                colorIdx = cd < c.r * 0.6 ? 2 : 1;
              }
            }
          } else if (theme.bands) {
            const band = Math.sin(y * 0.16);
            if (band > 0.45 && colorIdx < 2) colorIdx = 0;
            else if (band < -0.5) colorIdx = 2;
          }

          pctx.fillStyle = theme.colors[colorIdx];
          pctx.fillRect(Math.round(cx + x), Math.round(cy + y), pixelStep, pixelStep);
        }
      }
    }

    // Ring front half
    if (theme.ring) {
      for (let rx = -radiusPx - 26; rx <= radiusPx + 26; rx += pixelStep) {
        for (let ry = 0; ry <= 14; ry += pixelStep) {
          const nx = rx / (radiusPx + 24);
          const ny = ry / 12;
          const d = nx * nx + ny * ny;
          if (d > 0.52 && d < 1.0) {
            pctx.fillStyle = d > 0.78 ? theme.ring[0] : theme.ring[1];
            pctx.fillRect(Math.round(cx + rx), Math.round(cy + ry), pixelStep, pixelStep);
          }
        }
      }
    }

    // Optional playful signpost homage from Image 1 on the blue planet
    if (theme.signpost) {
      pctx.fillStyle = '#e2e8f0';
      pctx.fillRect(cx - 14, cy - radiusPx - 14, 3, 18);
      pctx.fillRect(cx + 10, cy - radiusPx - 18, 3, 22);
      pctx.fillStyle = '#f8fafc';
      pctx.fillRect(cx - 34, cy - radiusPx - 20, 28, 10);
      pctx.fillStyle = '#ffd13b';
      pctx.fillRect(cx + 6, cy - radiusPx - 25, 32, 11);
      pctx.fillStyle = '#1e293b';
      pctx.fillRect(cx - 28, cy - radiusPx - 16, 16, 2);
      pctx.fillRect(cx + 11, cy - radiusPx - 20, 20, 2);
    }

    return off;
  }

  const PLANET_CANVASES = [
    // 1. Blue cratered planet with retro beacons (homage to Image 1)
    createPixelPlanet(48, 4, {
      colors: ['#60a5fa', '#3b82f6', '#1e3a8a'],
      craters: [
        { x: -16, y: 12, r: 9 },
        { x: 18, y: -10, r: 7 },
        { x: 6, y: 20, r: 6 },
        { x: -12, y: -18, r: 5 }
      ],
      signpost: true
    }),
    // 2. Ringed Golden/Violet Gas Giant
    createPixelPlanet(44, 4, {
      colors: ['#fbbf24', '#d97706', '#78350f'],
      bands: true,
      ring: ['#fde68a', '#f59e0b']
    }),
    // 3. Crimson Volcanic Moon
    createPixelPlanet(34, 4, {
      colors: ['#fb7185', '#e11d48', '#881337'],
      craters: [
        { x: -8, y: -6, r: 8 },
        { x: 12, y: 10, r: 6 }
      ]
    }),
    // 4. Emerald Cyan Ice Planet
    createPixelPlanet(40, 4, {
      colors: ['#5eead4', '#0d9488', '#134e4a'],
      bands: true,
      ring: ['#99f6e4', '#2dd4bf']
    })
  ];

  // Background detailed orbital station canvas
  function createBgStationCanvas() {
    const off = document.createElement('canvas');
    off.width = 160;
    off.height = 96;
    const sctx = off.getContext('2d');
    sctx.imageSmoothingEnabled = false;
    const p = 4;
    const drawRect = (gx, gy, gw, gh, col) => {
      sctx.fillStyle = col;
      sctx.fillRect(gx * p, gy * p, gw * p, gh * p);
    };
    // Solar wing panels
    drawRect(1, 5, 10, 14, '#1e3a8a');
    drawRect(2, 6, 8, 12, '#2563eb');
    drawRect(29, 5, 10, 14, '#1e3a8a');
    drawRect(30, 6, 8, 12, '#2563eb');
    // Solar grid lines
    for (let y = 8; y <= 16; y += 3) {
      drawRect(2, y, 8, 1, '#60a5fa');
      drawRect(30, y, 8, 1, '#60a5fa');
    }
    // Cross truss
    drawRect(11, 10, 18, 4, '#64748b');
    drawRect(11, 11, 18, 2, '#94a3b8');
    // Central Habitat Ring & Tower
    drawRect(15, 2, 10, 20, '#475569');
    drawRect(16, 4, 8, 16, '#cbd5e1');
    drawRect(17, 7, 6, 10, '#1e293b');
    // Glowing reactor core
    drawRect(18, 9, 4, 6, '#38bdf8');
    drawRect(19, 10, 2, 4, '#fef08a');
    // Docking spire & antenna
    drawRect(19, 0, 2, 3, '#e2e8f0');
    drawRect(19, 22, 2, 2, '#ff9f1c');
    return off;
  }

  const BG_STATION_CANVAS = createBgStationCanvas();

  // =========================================================================
  // 4. GAME STATE & ENTITIES
  // =========================================================================
  const keys = {};
  const pointer = { active: false, x: W / 2, y: H - 80 };

  const state = {
    mode: 'start', // 'start' | 'playing' | 'paused' | 'gameover'
    score: 0,
    highScore: Number(localStorage.getItem(STORAGE_KEY) || 0),
    wave: 1,
    combo: 1,
    comboTimer: 0,
    lives: 3,
    bombs: 2,
    autoFire: true,
    crtOn: true,
    shake: 0,
    flashAlpha: 0,
    flashColor: '#ffffff',
    waveBannerTimer: 0,
    waveBannerTitle: '',
    waveBannerSub: '',
    waveClearDelay: 0,
    time: 0
  };

  const player = {
    x: W / 2,
    y: H - 72,
    w: 44,
    h: 40,
    speed: 360,
    weaponLevel: 1, // 1=Doble, 2=Triple, 3=Abanico 5x, 4=Hiper-Prisma
    fireCooldown: 0,
    invulnTimer: 0,
    shield: false,
    overdriveTimer: 0
  };

  let bullets = [];
  let enemyBullets = [];
  let enemies = [];
  let powerups = [];
  let particles = [];
  let sparkles = [];
  let floatingTexts = [];
  let boss = null;

  // Parallax cosmic scenery
  const stars = [];
  const bgPlanets = [];
  const bgStations = [];

  function initCosmos() {
    stars.length = 0;
    for (let i = 0; i < 110; i++) {
      const r = Math.random();
      let kind = 'dot';
      if (r < 0.08) kind = 'pinkCross';      // Image 1 pink +
      else if (r < 0.14) kind = 'coralStar'; // Image 1 coral diamond
      else if (r < 0.19) kind = 'ringBurst'; // Image 2 multi-color pixel ring
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 14 + Math.random() * 52,
        size: kind === 'dot' ? (Math.random() < 0.3 ? 3 : 2) : 3,
        kind,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.65 ? '#cbd5e1' : (Math.random() < 0.5 ? '#93c5fd' : '#f59e0b')
      });
    }

    bgPlanets.length = 0;
    bgPlanets.push(
      { x: 170, y: 120, speed: 9, idx: 0, alpha: 0.92 },
      { x: 790, y: -160, speed: 7, idx: 1, alpha: 0.78 },
      { x: 460, y: -420, speed: 8, idx: 3, alpha: 0.74 },
      { x: 240, y: -680, speed: 10, idx: 2, alpha: 0.82 }
    );

    bgStations.length = 0;
    bgStations.push(
      { x: 760, y: 140, speed: 12, bob: 0, alpha: 0.58 },
      { x: 140, y: -260, speed: 11, bob: 2.1, alpha: 0.48 }
    );
  }

  // =========================================================================
  // 5. SPAWNERS: WAVES, ENEMIES, BOSS SPACE STATION, POWERUPS
  // =========================================================================
  const WEAPON_NAMES = [
    '',
    'LÁSER DOBLE',
    'TRIPLE IMPULSO',
    'ABANICO CÓSMICO',
    'HIPER-PRISMA X5'
  ];

  function showWaveBanner(title, sub, duration = 2.2) {
    state.waveBannerTitle = title;
    state.waveBannerSub = sub;
    state.waveBannerTimer = duration;
  }

  function spawnWave(waveNum) {
    enemies = [];
    boss = null;
    bossHud.classList.add('hidden');

    // Every 3rd wave is a Space Station Boss Fight!
    if (waveNum % 3 === 0) {
      const tier = Math.floor(waveNum / 3);
      const maxHp = 85 + tier * 55;
      boss = {
        x: W / 2,
        y: -110,
        targetY: 115,
        w: 220,
        h: 116,
        hp: maxHp,
        maxHp,
        vx: 95 + tier * 15,
        phaseTimer: 0,
        fireTimer: 0.8,
        minionTimer: 4.5,
        hitFlash: 0,
        shieldPulse: 0,
        name: tier === 1 ? 'ESTACIÓN ORBITAL KRONOS' : `FORTALEZA NEBULA MK-${tier}`
      };
      bossNameEl.textContent = boss.name;
      bossHud.classList.remove('hidden');
      audio.bossAlert();
      showWaveBanner(`¡ALERTA! SECTOR ${String(waveNum).padStart(2, '0')}`, boss.name, 2.8);
      return;
    }

    showWaveBanner(
      `SECTOR ${String(waveNum).padStart(2, '0')}`,
      waveNum === 1 ? '¡INVASIÓN DE MEDUSAS CÓSMICAS!' : '¡OLEADA ENEMIGA EN CAMINO!'
    );

    const rows = Math.min(4, 2 + Math.floor((waveNum + 1) / 2));
    const cols = Math.min(9, 6 + Math.floor(waveNum / 2));
    const startX = (W - (cols - 1) * 76) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type = 'redJelly';
        if (r === 0 && waveNum >= 2 && c % 2 === 1) type = 'ufo';
        else if (r === 1 || (r === 0 && c % 2 === 0)) type = 'goldJelly';
        else if (r >= 2 && waveNum >= 4 && (c === 0 || c === cols - 1)) type = 'interceptor';

        const stats = {
          redJelly:    { hp: 1 + Math.floor(waveNum / 5), score: 100, w: 36, h: 38, glow: 'rgba(244,63,63,0.75)' },
          goldJelly:   { hp: 2 + Math.floor(waveNum / 4), score: 180, w: 36, h: 38, glow: 'rgba(255,212,59,0.75)' },
          ufo:         { hp: 3 + Math.floor(waveNum / 3), score: 250, w: 42, h: 26, glow: 'rgba(56,189,248,0.8)' },
          interceptor: { hp: 2 + Math.floor(waveNum / 4), score: 220, w: 36, h: 28, glow: 'rgba(255,59,78,0.75)' }
        }[type];

        enemies.push({
          type,
          baseX: startX + c * 76,
          baseY: 78 + r * 54,
          x: startX + c * 76,
          y: -60 - r * 55 - c * 10,
          entering: true,
          w: stats.w,
          h: stats.h,
          hp: stats.hp,
          maxHp: stats.hp,
          score: stats.score,
          glow: stats.glow,
          phase: c * 0.55 + r * 0.7,
          fireCooldown: 1.2 + Math.random() * 2.8,
          diveState: null, // for interceptor swoops
          hitFlash: 0
        });
      }
    }
  }

  function spawnPowerup(x, y, forceType = null) {
    const roll = Math.random();
    let kind = forceType;
    if (!kind) {
      if (roll < 0.36) kind = 'weapon';
      else if (roll < 0.62) kind = 'shield';
      else if (roll < 0.82) kind = 'overdrive';
      else if (roll < 0.94) kind = 'bomb';
      else kind = 'life';
    }
    powerups.push({
      x,
      y,
      vy: 95,
      kind,
      phase: 0
    });
  }

  function spawnFireworkExplosion(x, y, mainColor, count = 18) {
    // Pixel debris particles
    const palette = [mainColor, '#ffd13b', '#ff6b9d', '#48dbfb', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = 65 + Math.random() * 200;
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.75,
        size: Math.random() < 0.45 ? 5 : 3,
        color: palette[Math.floor(Math.random() * palette.length)]
      });
    }

    // 8-pixel burst ring (directly inspired by Image 2!)
    sparkles.push({
      x,
      y,
      radius: 4,
      maxRadius: 24 + Math.random() * 12,
      life: 0.45,
      maxLife: 0.45
    });
  }

  function addFloatingText(x, y, text, color = '#ffd13b') {
    floatingTexts.push({ x, y, text, color, life: 0.85, maxLife: 0.85 });
  }

  // =========================================================================
  // 6. GAME CONTROL & ACTIONS
  // =========================================================================
  function updateHud() {
    hudScore.textContent = String(state.score).padStart(6, '0');
    hudHigh.textContent = String(state.highScore).padStart(6, '0');
    hudWave.textContent = String(state.wave).padStart(2, '0');
    hudCombo.textContent = `x${state.combo}`;

    // Lives pips
    hudLives.innerHTML = '';
    for (let i = 0; i < Math.max(0, state.lives); i++) {
      const pip = document.createElement('span');
      pip.className = 'life-pip';
      hudLives.appendChild(pip);
    }

    // Bomb pips
    hudBombs.innerHTML = '';
    for (let i = 0; i < Math.max(0, state.bombs); i++) {
      const pip = document.createElement('span');
      pip.className = 'bomb-pip';
      hudBombs.appendChild(pip);
    }

    weaponBadge.textContent = WEAPON_NAMES[player.weaponLevel] || 'LÁSER';
    shieldBadge.classList.toggle('hidden', !player.shield);
    overdriveBadge.classList.toggle('hidden', player.overdriveTimer <= 0);

    if (boss) {
      const pct = Math.max(0, Math.ceil((boss.hp / boss.maxHp) * 100));
      bossHpText.textContent = `${pct}%`;
      bossBarFill.style.width = `${pct}%`;
    }
  }

  function startNewGame() {
    audio.unlock();
    state.mode = 'playing';
    state.score = 0;
    state.wave = 1;
    state.combo = 1;
    state.comboTimer = 0;
    state.lives = 3;
    state.bombs = 2;
    state.shake = 0;
    state.flashAlpha = 0;
    state.waveClearDelay = 0;

    player.x = W / 2;
    player.y = H - 72;
    player.weaponLevel = 1;
    player.fireCooldown = 0;
    player.invulnTimer = 1.6;
    player.shield = false;
    player.overdriveTimer = 0;

    bullets = [];
    enemyBullets = [];
    powerups = [];
    particles = [];
    sparkles = [];
    floatingTexts = [];

    overlayStart.classList.add('hidden');
    overlayPause.classList.add('hidden');
    overlayGameOver.classList.add('hidden');

    spawnWave(1);
    updateHud();
  }

  function togglePause() {
    if (state.mode === 'playing') {
      state.mode = 'paused';
      overlayPause.classList.remove('hidden');
    } else if (state.mode === 'paused') {
      state.mode = 'playing';
      overlayPause.classList.add('hidden');
    }
  }

  function triggerGameOver() {
    state.mode = 'gameover';
    bossHud.classList.add('hidden');
    let isNewRecord = false;
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem(STORAGE_KEY, String(state.highScore));
      isNewRecord = true;
    }
    finalScoreEl.textContent = state.score.toLocaleString('es-ES');
    finalWaveEl.textContent = state.wave;
    finalHighEl.textContent = state.highScore.toLocaleString('es-ES');
    newRecordMsg.classList.toggle('hidden', !isNewRecord);
    overlayGameOver.classList.remove('hidden');
    updateHud();
  }

  function firePlayerWeapons() {
    const lvl = player.weaponLevel;
    const isOver = player.overdriveTimer > 0;
    const baseCd = isOver ? 0.085 : 0.145;
    player.fireCooldown = baseCd;
    audio.shoot(lvl);

    const addBolt = (ox, oy, vx, vy, dmg = 1) => {
      bullets.push({ x: player.x + ox, y: player.y + oy, vx, vy, dmg });
    };

    if (lvl === 1) {
      // Twin wingtip cannons (matching Image 1!)
      addBolt(-13, -10, 0, -640);
      addBolt(13, -10, 0, -640);
    } else if (lvl === 2) {
      addBolt(-14, -8, 0, -660);
      addBolt(0, -20, 0, -680);
      addBolt(14, -8, 0, -660);
    } else if (lvl === 3) {
      addBolt(-14, -8, -95, -640);
      addBolt(-7, -14, 0, -680);
      addBolt(7, -14, 0, -680);
      addBolt(14, -8, 95, -640);
    } else {
      addBolt(-16, -6, -165, -620);
      addBolt(-9, -12, -55, -670);
      addBolt(0, -22, 0, -700, 1.4);
      addBolt(9, -12, 55, -670);
      addBolt(16, -6, 165, -620);
    }
  }

  function triggerNovaBomb() {
    if (state.mode !== 'playing' || state.bombs <= 0) return;
    state.bombs--;
    state.shake = 16;
    state.flashAlpha = 0.72;
    state.flashColor = '#ffd13b';
    audio.bomb();

    // Clear all enemy projectiles
    enemyBullets = [];

    // Huge multi-ring fireworks across the screen
    for (let i = 0; i < 6; i++) {
      spawnFireworkExplosion(
        140 + Math.random() * (W - 280),
        100 + Math.random() * (H - 220),
        i % 2 === 0 ? '#ffd13b' : '#48dbfb',
        16
      );
    }

    // Damage all enemies heavily
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.hp -= 5;
      e.hitFlash = 0.2;
      if (e.hp <= 0) {
        destroyEnemy(i, false);
      }
    }

    if (boss) {
      boss.hp -= 18;
      boss.hitFlash = 0.25;
      addFloatingText(boss.x, boss.y + 30, '¡IMPACTO NOVA!', '#ffd13b');
      if (boss.hp <= 0) {
        destroyBoss();
      }
    }

    updateHud();
  }

  function damagePlayer() {
    if (player.invulnTimer > 0) return;

    if (player.shield) {
      player.shield = false;
      player.invulnTimer = 1.4;
      state.shake = 10;
      enemyBullets = [];
      spawnFireworkExplosion(player.x, player.y, '#60a5fa', 22);
      addFloatingText(player.x, player.y - 26, '¡ESCUDO ROTO!', '#93c5fd');
      audio.playerHit();
      updateHud();
      return;
    }

    state.lives--;
    state.combo = 1;
    state.comboTimer = 0;
    state.shake = 14;
    state.flashAlpha = 0.45;
    state.flashColor = '#ff3b4e';
    player.invulnTimer = 2.2;
    if (player.weaponLevel > 1) player.weaponLevel--;
    spawnFireworkExplosion(player.x, player.y, '#ff3b4e', 26);
    audio.playerHit();
    updateHud();

    if (state.lives <= 0) {
      triggerGameOver();
    }
  }

  function registerHitScore(baseScore, x, y, color = '#ffd13b') {
    state.comboTimer = 2.6;
    const gained = baseScore * state.combo;
    state.score += gained;
    if (state.score > state.highScore) {
      state.highScore = state.score;
    }
    addFloatingText(x, y, `+${gained}${state.combo > 1 ? ` x${state.combo}` : ''}`, color);
    if (state.combo < 5) {
      state.combo++;
    }
  }

  function destroyEnemy(index, allowDrop = true) {
    const e = enemies[index];
    enemies.splice(index, 1);
    const col = e.type === 'redJelly' ? '#ff3b4e' : (e.type === 'goldJelly' ? '#ffd13b' : '#48dbfb');
    spawnFireworkExplosion(e.x, e.y, col, 18);
    registerHitScore(e.score, e.x, e.y - 10, col);
    audio.explode(false);

    if (allowDrop && Math.random() < 0.14) {
      spawnPowerup(e.x, e.y);
    }
    updateHud();
  }

  function destroyBoss() {
    const bx = boss.x;
    const by = boss.y;
    boss = null;
    bossHud.classList.add('hidden');
    state.shake = 22;
    state.flashAlpha = 0.7;
    state.flashColor = '#ff9f1c';
    audio.explode(true);

    for (let i = 0; i < 7; i++) {
      spawnFireworkExplosion(
        bx + (Math.random() - 0.5) * 160,
        by + (Math.random() - 0.5) * 90,
        i % 2 === 0 ? '#ff9f1c' : '#48dbfb',
        20
      );
    }

    registerHitScore(2500, bx, by, '#ffd13b');
    spawnPowerup(bx - 30, by, 'weapon');
    spawnPowerup(bx + 30, by, 'bomb');
    enemyBullets = [];
    updateHud();
  }

  // =========================================================================
  // 7. UPDATE LOOP
  // =========================================================================
  function updateCosmos(dt) {
    for (const s of stars) {
      s.y += s.speed * dt;
      s.phase += dt * 3.2;
      if (s.y > H + 12) {
        s.y = -12;
        s.x = Math.random() * W;
      }
    }

    for (const p of bgPlanets) {
      p.y += p.speed * dt;
      if (p.y > H + 120) {
        p.y = -140 - Math.random() * 140;
        p.x = 80 + Math.random() * (W - 160);
      }
    }

    for (const st of bgStations) {
      st.y += st.speed * dt;
      st.bob += dt * 1.4;
      if (st.y > H + 100) {
        st.y = -130 - Math.random() * 160;
        st.x = 100 + Math.random() * (W - 200);
      }
    }
  }

  function update(dt) {
    state.time += dt;
    updateCosmos(dt);

    if (state.mode !== 'playing') return;

    audio.stepBgm(dt, true);

    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 32);
    if (state.flashAlpha > 0) state.flashAlpha = Math.max(0, state.flashAlpha - dt * 1.8);
    if (state.waveBannerTimer > 0) state.waveBannerTimer = Math.max(0, state.waveBannerTimer - dt);

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0 && state.combo > 1) {
        state.combo = 1;
        updateHud();
      }
    }

    // Player movement (Keyboard + smooth Pointer)
    let dx = 0;
    let dy = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
    if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
    if (keys['ArrowDown'] || keys['KeyS']) dy += 1;

    if (dx !== 0 || dy !== 0) {
      pointer.active = false;
      const len = Math.hypot(dx, dy);
      player.x += (dx / len) * player.speed * dt;
      player.y += (dy / len) * player.speed * dt;
    } else if (pointer.active) {
      const diffX = pointer.x - player.x;
      const diffY = pointer.y - player.y;
      player.x += diffX * Math.min(1, dt * 16);
      player.y += diffY * Math.min(1, dt * 16);
    }

    player.x = Math.max(28, Math.min(W - 28, player.x));
    player.y = Math.max(60, Math.min(H - 34, player.y));

    if (player.invulnTimer > 0) player.invulnTimer -= dt;
    if (player.overdriveTimer > 0) {
      player.overdriveTimer -= dt;
      if (player.overdriveTimer <= 0) updateHud();
    }

    // Shooting
    if (player.fireCooldown > 0) player.fireCooldown -= dt;
    const wantsFire = state.autoFire || keys['Space'] || keys['KeyZ'];
    if (wantsFire && player.fireCooldown <= 0) {
      firePlayerWeapons();
    }

    // Player Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -30 || b.x < -20 || b.x > W + 20) {
        bullets.splice(i, 1);
      }
    }

    // Enemy Bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];
      if (!eb) continue;
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (eb.y > H + 20 || eb.y < -20 || eb.x < -20 || eb.x > W + 20) {
        enemyBullets.splice(i, 1);
        continue;
      }
      if (Math.hypot(eb.x - player.x, eb.y - player.y) < 16) {
        enemyBullets.splice(i, 1);
        damagePlayer();
        break;
      }
    }
    if (state.mode !== 'playing') return;

    // Update Formation Enemies
    const formationSway = Math.sin(state.time * 1.4) * 38;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.phase += dt * 3.5;
      if (e.hitFlash > 0) e.hitFlash -= dt;

      if (e.entering) {
        e.y += 220 * dt;
        e.x = e.baseX + formationSway;
        if (e.y >= e.baseY) {
          e.y = e.baseY;
          e.entering = false;
        }
      } else if (e.diveState) {
        e.diveState.t += dt;
        e.x += e.diveState.vx * dt;
        e.y += e.diveState.vy * dt;
        if (e.y > H + 40) {
          e.y = -40;
          e.diveState = null;
          e.entering = true;
        }
      } else {
        e.x = e.baseX + formationSway;
        e.y = e.baseY + Math.sin(e.phase) * 7;

        // Occasional interceptor or jellyfish dive
        if ((e.type === 'interceptor' || (state.wave >= 2 && e.type === 'goldJelly')) && Math.random() < 0.08 * dt) {
          e.diveState = {
            t: 0,
            vx: (player.x - e.x) * 0.55,
            vy: 210 + state.wave * 10
          };
        }
      }

      // Enemy firing
      e.fireCooldown -= dt;
      if (e.fireCooldown <= 0 && !e.entering) {
        e.fireCooldown = Math.max(1.3, 3.6 - state.wave * 0.16) + Math.random() * 2.2;
        if (enemies.length <= 16 || Math.random() < 0.45) {
          if (e.type === 'ufo') {
            enemyBullets.push({ x: e.x - 10, y: e.y + 12, vx: -55, vy: 240, color: '#38bdf8' });
            enemyBullets.push({ x: e.x + 10, y: e.y + 12, vx: 55, vy: 240, color: '#38bdf8' });
          } else {
            const ang = Math.atan2(player.y - e.y, player.x - e.x);
            const spd = 210 + Math.min(130, state.wave * 12);
            const aim = e.type === 'interceptor' ? ang : Math.PI / 2 + (Math.random() - 0.5) * 0.25;
            enemyBullets.push({
              x: e.x,
              y: e.y + 14,
              vx: Math.cos(aim) * spd,
              vy: Math.sin(aim) * spd,
              color: e.type === 'goldJelly' ? '#ffd13b' : '#ff6b9d'
            });
          }
        }
      }

      // Collision with player
      if (Math.abs(e.x - player.x) < 26 && Math.abs(e.y - player.y) < 26) {
        destroyEnemy(i, false);
        damagePlayer();
        continue;
      }

      // Collision with player bullets
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.abs(b.x - e.x) < e.w * 0.55 && Math.abs(b.y - e.y) < e.h * 0.55) {
          bullets.splice(j, 1);
          e.hp -= b.dmg;
          e.hitFlash = 0.08;
          if (e.hp <= 0) {
            destroyEnemy(i, true);
          } else {
            audio.hit();
            particles.push({
              x: b.x, y: b.y,
              vx: (Math.random() - 0.5) * 90, vy: 50,
              life: 0.2, maxLife: 0.2, size: 3, color: '#ffffff'
            });
          }
          break;
        }
      }
    }

    // Update Boss Space Station
    if (boss) {
      if (boss.y < boss.targetY) {
        boss.y += 85 * dt;
      } else {
        boss.x += boss.vx * dt;
        if (boss.x < 140) { boss.x = 140; boss.vx = Math.abs(boss.vx); }
        if (boss.x > W - 140) { boss.x = W - 140; boss.vx = -Math.abs(boss.vx); }
      }
      boss.phaseTimer += dt;
      boss.shieldPulse += dt * 4;
      if (boss.hitFlash > 0) boss.hitFlash -= dt;

      // Boss attacks
      boss.fireTimer -= dt;
      if (boss.fireTimer <= 0 && boss.y >= boss.targetY - 5) {
        boss.fireTimer = 1.05;
        // Twin wing laser pods
        enemyBullets.push({ x: boss.x - 68, y: boss.y + 38, vx: -25, vy: 280, color: '#ff9f1c' });
        enemyBullets.push({ x: boss.x + 68, y: boss.y + 38, vx: 25, vy: 280, color: '#ff9f1c' });
        // Central radial burst every second volley
        if (Math.floor(boss.phaseTimer) % 2 === 0) {
          for (let k = -2; k <= 2; k++) {
            const a = Math.PI / 2 + k * 0.24;
            enemyBullets.push({
              x: boss.x,
              y: boss.y + 42,
              vx: Math.cos(a) * 235,
              vy: Math.sin(a) * 235,
              color: '#ff3b4e'
            });
          }
        }
      }

      // Boss deploys jellyfish escorts
      boss.minionTimer -= dt;
      if (boss.minionTimer <= 0 && enemies.length < 4) {
        boss.minionTimer = 5.5;
        const mType = Math.random() < 0.5 ? 'redJelly' : 'goldJelly';
        enemies.push({
          type: mType,
          baseX: boss.x + (Math.random() < 0.5 ? -80 : 80),
          baseY: 190,
          x: boss.x,
          y: boss.y + 30,
          entering: true,
          w: 36,
          h: 38,
          hp: 2,
          maxHp: 2,
          score: 140,
          glow: 'rgba(255,212,59,0.75)',
          phase: 0,
          fireCooldown: 1.5,
          diveState: null,
          hitFlash: 0
        });
      }

      // Player bullets hitting boss
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.abs(b.x - boss.x) < boss.w * 0.48 && Math.abs(b.y - boss.y) < boss.h * 0.46) {
          bullets.splice(j, 1);
          boss.hp -= b.dmg;
          boss.hitFlash = 0.06;
          audio.hit();
          particles.push({
            x: b.x, y: b.y,
            vx: (Math.random() - 0.5) * 140, vy: 80,
            life: 0.25, maxLife: 0.25, size: 4, color: '#ffd13b'
          });
          updateHud();
          if (boss.hp <= 0) {
            destroyBoss();
            break;
          }
        }
      }
    }

    // Powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.y += pu.vy * dt;
      pu.phase += dt * 5;
      if (pu.y > H + 30) {
        powerups.splice(i, 1);
        continue;
      }
      if (Math.hypot(pu.x - player.x, pu.y - player.y) < 30) {
        powerups.splice(i, 1);
        audio.powerup();
        if (pu.kind === 'weapon') {
          if (player.weaponLevel < 4) {
            player.weaponLevel++;
            addFloatingText(player.x, player.y - 26, WEAPON_NAMES[player.weaponLevel], '#48dbfb');
          } else {
            state.score += 500;
            addFloatingText(player.x, player.y - 26, '+500 ARMA MÁX', '#48dbfb');
          }
        } else if (pu.kind === 'shield') {
          player.shield = true;
          addFloatingText(player.x, player.y - 26, '¡ESCUDO ACTIVADO!', '#93c5fd');
        } else if (pu.kind === 'overdrive') {
          player.overdriveTimer = 9;
          addFloatingText(player.x, player.y - 26, '¡TURBO LÁSER!', '#ffd13b');
        } else if (pu.kind === 'bomb') {
          state.bombs = Math.min(4, state.bombs + 1);
          addFloatingText(player.x, player.y - 26, '+1 BOMBA NOVA', '#ff9f1c');
        } else if (pu.kind === 'life') {
          state.lives = Math.min(5, state.lives + 1);
          addFloatingText(player.x, player.y - 26, '+1 NAVE EXTRA', '#ff6b9d');
        }
        updateHud();
      }
    }

    // Particles, 8-pixel burst rings & floating texts
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
      const sp = sparkles[i];
      sp.life -= dt;
      sp.radius = sp.maxRadius * (1 - sp.life / sp.maxLife);
      if (sp.life <= 0) sparkles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 36 * dt;
      ft.life -= dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // Next Wave progression
    if (!boss && enemies.length === 0) {
      state.waveClearDelay += dt;
      if (state.waveClearDelay >= 1.4) {
        state.waveClearDelay = 0;
        state.wave++;
        updateHud();
        spawnWave(state.wave);
      }
    }
  }

  // =========================================================================
  // 8. RENDERING (PIXEL ART + SOFT ARCADE BLOOM)
  // =========================================================================
  function drawBackground() {
    // Deep navy-to-charcoal space gradient (matching Image 1 & 2)
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#09152b');
    grad.addColorStop(0.55, '#111a2c');
    grad.addColorStop(1, '#1c2026');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars & Pixel Crosses / Sparkle Rings
    for (const s of stars) {
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      const twinkle = 0.55 + 0.45 * Math.sin(s.phase);
      ctx.save();
      ctx.globalAlpha = twinkle;

      if (s.kind === 'dot') {
        ctx.fillStyle = s.color;
        ctx.fillRect(x, y, s.size, s.size);
      } else if (s.kind === 'pinkCross') {
        // Pink pixel plus-cross from Image 1
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(x - 2, y - 2, 4, 4);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(x - 6, y - 2, 4, 4);
        ctx.fillRect(x + 2, y - 2, 4, 4);
        ctx.fillRect(x - 2, y - 6, 4, 4);
        ctx.fillRect(x - 2, y + 2, 4, 4);
      } else if (s.kind === 'coralStar') {
        // Coral 4-point diamond star from Image 1
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(x - 2, y - 2, 4, 4);
        ctx.fillRect(x - 6, y - 1, 12, 2);
        ctx.fillRect(x - 1, y - 6, 2, 12);
      } else if (s.kind === 'ringBurst') {
        // 8-pixel multi-color ring from Image 2
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(x - 5, y - 5, 3, 3);
        ctx.fillRect(x + 3, y + 3, 3, 3);
        ctx.fillRect(x - 5, y + 3, 3, 3);
        ctx.fillRect(x + 3, y - 5, 3, 3);
        ctx.fillStyle = '#ffd13b';
        ctx.fillRect(x - 1, y - 6, 3, 3);
        ctx.fillRect(x - 1, y + 4, 3, 3);
        ctx.fillRect(x - 6, y - 1, 3, 3);
        ctx.fillRect(x + 4, y - 1, 3, 3);
      }
      ctx.restore();
    }

    // Parallax Shaded Pixel Planets
    for (const p of bgPlanets) {
      const sprite = PLANET_CANVASES[p.idx];
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.drawImage(sprite, Math.round(p.x - sprite.width / 2), Math.round(p.y - sprite.height / 2));
      ctx.restore();
    }

    // Parallax Orbital Space Stations with blinking lights
    for (const st of bgStations) {
      const sy = Math.round(st.y + Math.sin(st.bob) * 6);
      const sx = Math.round(st.x);
      ctx.save();
      ctx.globalAlpha = st.alpha;
      ctx.drawImage(BG_STATION_CANVAS, sx - BG_STATION_CANVAS.width / 2, sy - BG_STATION_CANVAS.height / 2);
      // Blinking beacon on top spire
      if (Math.sin(state.time * 5 + st.bob) > 0) {
        ctx.fillStyle = '#ff3b4e';
        ctx.fillRect(sx - 2, sy - BG_STATION_CANVAS.height / 2 - 4, 4, 4);
      }
      ctx.restore();
    }
  }

  function drawThrusterFlames(x, y, golden = false) {
    const flicker = Math.floor(state.time * 24) % 3;
    const outer = golden ? '#fef08a' : '#ff5900';
    const mid = golden ? '#ffffff' : '#ffaa00';
    const core = '#fffbeb';

    const drawPlume = (px, py, len) => {
      ctx.fillStyle = outer;
      ctx.fillRect(px - 3, py, 6, len);
      ctx.fillStyle = mid;
      ctx.fillRect(px - 2, py, 4, Math.max(4, len - 4));
      ctx.fillStyle = core;
      ctx.fillRect(px - 1, py, 2, Math.max(2, len - 8));
    };

    // Center main plume + twin side plumes (exact style from Image 1)
    drawPlume(Math.round(x), Math.round(y + 18), 14 + flicker * 3);
    drawPlume(Math.round(x - 14), Math.round(y + 15), 10 + ((flicker + 1) % 3) * 2);
    drawPlume(Math.round(x + 14), Math.round(y + 15), 10 + ((flicker + 2) % 3) * 2);
  }

  function drawPlayer() {
    if (state.mode === 'gameover') return;
    if (player.invulnTimer > 0 && Math.floor(state.time * 16) % 2 === 0) return;

    const px = Math.round(player.x);
    const py = Math.round(player.y);

    drawThrusterFlames(px, py, player.overdriveTimer > 0);

    ctx.save();
    if (player.overdriveTimer > 0) {
      ctx.shadowColor = '#ffd13b';
      ctx.shadowBlur = 14;
    } else {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
    }
    const spr = SPRITES.player;
    ctx.drawImage(spr, px - Math.floor(spr.width / 2), py - Math.floor(spr.height / 2));
    ctx.restore();

    // Glowing cyan pixel shield ring
    if (player.shield) {
      ctx.save();
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.85)';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(px, py, 29 + Math.sin(state.time * 7) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSegmentedLaser(b) {
    // Segmented blue plasma bolts from Image 1
    const bx = Math.round(b.x);
    const by = Math.round(b.y);
    ctx.save();
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(bx - 2, by - 10, 4, 5);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(bx - 2, by - 4, 4, 6);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(bx - 1, by + 3, 2, 6);
    ctx.restore();
  }

  function drawBossStation() {
    if (!boss) return;
    const bx = Math.round(boss.x);
    const by = Math.round(boss.y);
    const p = 4; // pixel block size

    ctx.save();
    ctx.shadowColor = boss.hitFlash > 0 ? '#ffffff' : '#ff9f1c';
    ctx.shadowBlur = boss.hitFlash > 0 ? 22 : 16;

    const drawBlock = (ox, oy, w, h, col) => {
      ctx.fillStyle = boss.hitFlash > 0 ? '#ffffff' : col;
      ctx.fillRect(bx + ox * p, by + oy * p, w * p, h * p);
    };

    // Giant Pixel Space Station Fortress
    // Outer Solar Wings
    drawBlock(-26, -7, 10, 14, '#1e3a8a');
    drawBlock(-25, -5, 8, 10, '#2563eb');
    drawBlock(16, -7, 10, 14, '#1e3a8a');
    drawBlock(17, -5, 8, 10, '#2563eb');
    // Truss arms
    drawBlock(-16, -2, 32, 4, '#64748b');
    drawBlock(-16, -1, 32, 2, '#94a3b8');
    // Twin Laser Turret Pods
    drawBlock(-19, 3, 5, 7, '#475569');
    drawBlock(-18, 10, 3, 3, '#ff9f1c');
    drawBlock(14, 3, 5, 7, '#475569');
    drawBlock(15, 10, 3, 3, '#ff9f1c');
    // Main Armored Core
    drawBlock(-10, -12, 20, 24, '#334155');
    drawBlock(-8, -10, 16, 20, '#cbd5e1');
    drawBlock(-6, -8, 12, 16, '#1e293b');
    // Pulsing Reactor Eye
    const pulse = Math.sin(boss.shieldPulse) > 0;
    drawBlock(-4, -5, 8, 10, '#ff3b4e');
    drawBlock(-2, -3, 4, 6, pulse ? '#ffd13b' : '#ffffff');
    // Top Radar Spire
    drawBlock(-1, -16, 2, 4, '#e2e8f0');
    drawBlock(-2, -17, 4, 2, pulse ? '#48dbfb' : '#ff9f1c');

    ctx.restore();
  }

  function drawEnemies() {
    const frame = Math.floor(state.time * 4.5) % 2;

    for (const e of enemies) {
      let spr = SPRITES.ufo;
      if (e.type === 'redJelly') spr = frame === 0 ? SPRITES.redJelly0 : SPRITES.redJelly1;
      else if (e.type === 'goldJelly') spr = frame === 0 ? SPRITES.goldJelly0 : SPRITES.goldJelly1;
      else if (e.type === 'interceptor') spr = SPRITES.interceptor;

      ctx.save();
      ctx.shadowColor = e.hitFlash > 0 ? '#ffffff' : e.glow;
      ctx.shadowBlur = e.hitFlash > 0 ? 18 : 13;

      if (e.hitFlash > 0) {
        ctx.filter = 'brightness(2.2)';
      }

      ctx.drawImage(
        spr,
        Math.round(e.x - spr.width / 2),
        Math.round(e.y - spr.height / 2)
      );
      ctx.restore();
    }
  }

  function drawPowerups() {
    const cfg = {
      weapon:    { label: 'P', bg: '#0ea5e9', border: '#e0f2fe' },
      shield:    { label: 'S', bg: '#3b82f6', border: '#93c5fd' },
      overdrive: { label: 'T', bg: '#f59e0b', border: '#fef08a' },
      bomb:      { label: 'B', bg: '#ec4899', border: '#fbcfe8' },
      life:      { label: '+', bg: '#ef4444', border: '#fecdd3' }
    };

    for (const pu of powerups) {
      const c = cfg[pu.kind];
      const px = Math.round(pu.x);
      const py = Math.round(pu.y + Math.sin(pu.phase) * 2);
      ctx.save();
      ctx.shadowColor = c.bg;
      ctx.shadowBlur = 12;
      ctx.fillStyle = c.bg;
      ctx.fillRect(px - 11, py - 11, 22, 22);
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 11, py - 11, 22, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.label, px, py + 1);
      ctx.restore();
    }
  }

  function drawEffects() {
    // Enemy Bullets
    for (const eb of enemyBullets) {
      ctx.save();
      ctx.shadowColor = eb.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = eb.color;
      ctx.fillRect(Math.round(eb.x - 4), Math.round(eb.y - 4), 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(eb.x - 2), Math.round(eb.y - 2), 4, 4);
      ctx.restore();
    }

    // Player Bullets
    for (const b of bullets) {
      drawSegmentedLaser(b);
    }

    // Pixel Explosion Particles
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      ctx.restore();
    }

    // 8-pixel burst rings (Image 2 style)
    for (const sp of sparkles) {
      const alpha = Math.max(0, sp.life / sp.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      for (let k = 0; k < 8; k++) {
        const ang = (Math.PI * 2 * k) / 8;
        const sx = Math.round(sp.x + Math.cos(ang) * sp.radius);
        const sy = Math.round(sp.y + Math.sin(ang) * sp.radius);
        ctx.fillStyle = k % 2 === 0 ? '#f472b6' : '#ffd13b';
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      }
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(Math.round(sp.x - 2), Math.round(sp.y - 2), 4, 4);
      ctx.restore();
    }

    // Floating Score / Status Text
    for (const ft of floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, ft.life / ft.maxLife);
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
      ctx.restore();
    }

    // Wave Banner
    if (state.waveBannerTimer > 0) {
      const alpha = Math.min(1, state.waveBannerTimer * 1.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(7, 13, 27, 0.78)';
      ctx.fillRect(W / 2 - 260, H / 2 - 54, 520, 88);
      ctx.strokeStyle = '#ff9f1c';
      ctx.lineWidth = 3;
      ctx.strokeRect(W / 2 - 260, H / 2 - 54, 520, 88);

      ctx.textAlign = 'center';
      ctx.font = '18px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffd13b';
      ctx.fillText(state.waveBannerTitle, W / 2, H / 2 - 14);

      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#48dbfb';
      ctx.fillText(state.waveBannerSub, W / 2, H / 2 + 18);
      ctx.restore();
    }
  }

  function drawAttractDemo() {
    // Gentle patrol ships & aliens behind Start Screen
    const frame = Math.floor(state.time * 4) % 2;
    const j1 = frame === 0 ? SPRITES.redJelly0 : SPRITES.redJelly1;
    const j2 = frame === 0 ? SPRITES.goldJelly0 : SPRITES.goldJelly1;
    const bob1 = Math.sin(state.time * 2) * 14;
    const bob2 = Math.cos(state.time * 2.2) * 14;

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.shadowColor = 'rgba(244,63,63,0.75)';
    ctx.shadowBlur = 12;
    ctx.drawImage(j1, 110, 95 + bob1);
    ctx.drawImage(j1, 800, 115 - bob1);

    ctx.shadowColor = 'rgba(255,212,59,0.75)';
    ctx.drawImage(j2, 460, 75 + bob2);

    // Demo flying shuttle
    const sx = W / 2 + Math.sin(state.time * 0.9) * 240;
    const sy = H - 90 + Math.cos(state.time * 1.8) * 12;
    drawThrusterFlames(sx, sy, false);
    ctx.shadowColor = '#38bdf8';
    ctx.drawImage(SPRITES.player, Math.round(sx - SPRITES.player.width / 2), Math.round(sy - SPRITES.player.height / 2));
    ctx.restore();
  }

  function render() {
    ctx.save();
    if (state.shake > 0.2) {
      const sx = (Math.random() - 0.5) * state.shake;
      const sy = (Math.random() - 0.5) * state.shake;
      ctx.translate(sx, sy);
    }

    drawBackground();

    if (state.mode === 'start') {
      drawAttractDemo();
    } else {
      drawPowerups();
      drawEnemies();
      drawBossStation();
      drawPlayer();
      drawEffects();
    }

    if (state.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = state.flashAlpha;
      ctx.fillStyle = state.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    ctx.restore();
  }

  // =========================================================================
  // 9. INPUT & UI BINDINGS
  // =========================================================================
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === 'Space') {
      if (state.mode === 'start' || state.mode === 'gameover') {
        startNewGame();
      }
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      if (state.mode === 'playing' || state.mode === 'paused') togglePause();
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') {
      triggerNovaBomb();
    } else if (e.code === 'KeyF') {
      toggleAutoFire();
    } else if (e.code === 'KeyC') {
      toggleCrt();
    } else if (e.code === 'KeyM') {
      toggleSound();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  function updatePointerPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    pointer.x = (clientX - rect.left) * scaleX;
    pointer.y = (clientY - rect.top) * scaleY;
    pointer.active = true;
  }

  canvas.addEventListener('mousemove', (e) => {
    if (state.mode === 'playing') {
      updatePointerPos(e.clientX, e.clientY);
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    audio.unlock();
    if (state.mode !== 'playing') return;
    if (e.button === 2) {
      triggerNovaBomb();
    } else {
      updatePointerPos(e.clientX, e.clientY);
      if (player.fireCooldown <= 0) firePlayerWeapons();
    }
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('touchstart', (e) => {
    audio.unlock();
    if (state.mode === 'playing' && e.touches[0]) {
      updatePointerPos(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (state.mode === 'playing' && e.touches[0]) {
      updatePointerPos(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  function toggleAutoFire() {
    state.autoFire = !state.autoFire;
    btnAutofire.textContent = `AUTO: ${state.autoFire ? 'ON' : 'OFF'}`;
    btnAutofire.classList.toggle('active', state.autoFire);
  }

  function toggleCrt() {
    state.crtOn = !state.crtOn;
    crtOverlay.classList.toggle('off', !state.crtOn);
    btnCrt.classList.toggle('active', state.crtOn);
  }

  function toggleSound() {
    audio.enabled = !audio.enabled;
    if (audio.enabled) audio.unlock();
    btnSound.textContent = audio.enabled ? 'SFX' : 'MUTE';
    btnSound.classList.toggle('active', audio.enabled);
  }

  btnStart.addEventListener('click', startNewGame);
  btnRetry.addEventListener('click', startNewGame);
  btnResume.addEventListener('click', togglePause);
  btnRestartPause.addEventListener('click', startNewGame);
  btnPause.addEventListener('click', togglePause);
  btnAutofire.addEventListener('click', toggleAutoFire);
  btnCrt.addEventListener('click', toggleCrt);
  btnSound.addEventListener('click', toggleSound);
  btnTouchBomb.addEventListener('click', triggerNovaBomb);

  // =========================================================================
  // 10. MAIN ANIMATION LOOP
  // =========================================================================
  initCosmos();
  renderShowcaseSprites();
  updateHud();

  let lastTime = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    try {
      update(dt);
      render();
    } catch (err) {
      console.error('Error en el bucle del juego:', err);
    }
  }

  requestAnimationFrame(loop);
})();
