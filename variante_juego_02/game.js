(() => {
  'use strict';

  const A = window.ASTRO_ASSETS;
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width;  // 1040
  const H = canvas.height; // 640

  // DOM References
  const hudScore = document.getElementById('hud-score');
  const hudHigh = document.getElementById('hud-high');
  const hudWave = document.getElementById('hud-wave');
  const hudCombo = document.getElementById('hud-combo');
  const hudLives = document.getElementById('hud-lives');
  const hudBombs = document.getElementById('hud-bombs');
  const hyperTrack = document.getElementById('hyper-track');
  const hyperFill = document.getElementById('hyper-fill');

  const bossHud = document.getElementById('boss-hud');
  const bossNameEl = document.getElementById('boss-name');
  const bossHpText = document.getElementById('boss-hp-text');
  const bossBarFill = document.getElementById('boss-bar-fill');

  const biomeBadge = document.getElementById('biome-badge');
  const weaponBadge = document.getElementById('weapon-badge');
  const dronesBadge = document.getElementById('drones-badge');
  const shieldBadge = document.getElementById('shield-badge');
  const overdriveBadge = document.getElementById('overdrive-badge');

  const overlayStart = document.getElementById('overlay-start');
  const overlayGallery = document.getElementById('overlay-gallery');
  const overlayPause = document.getElementById('overlay-pause');
  const overlayGameOver = document.getElementById('overlay-gameover');
  const shipGridEl = document.getElementById('ship-grid');
  const galleryContent = document.getElementById('gallery-content');

  const finalScoreEl = document.getElementById('final-score');
  const finalWaveEl = document.getElementById('final-wave');
  const finalHighEl = document.getElementById('final-high');
  const newRecordMsg = document.getElementById('new-record-msg');

  const btnStart = document.getElementById('btn-start');
  const btnGallery = document.getElementById('btn-gallery');
  const btnCloseGallery = document.getElementById('btn-close-gallery');
  const btnResume = document.getElementById('btn-resume');
  const btnRestartPause = document.getElementById('btn-restart-pause');
  const btnHangarPause = document.getElementById('btn-hangar-pause');
  const btnRetry = document.getElementById('btn-retry');
  const btnHangarOver = document.getElementById('btn-hangar-over');
  const btnBiome = document.getElementById('btn-biome');
  const btnAutofire = document.getElementById('btn-autofire');
  const btnCrt = document.getElementById('btn-crt');
  const btnSound = document.getElementById('btn-sound');
  const btnPause = document.getElementById('btn-pause');
  const btnTouchBomb = document.getElementById('btn-touch-bomb');
  const btnTouchHyper = document.getElementById('btn-touch-hyper');
  const crtOverlay = document.getElementById('crt-overlay');

  const STORAGE_KEY = 'astro_cosmos_ultra_highscore_v3';

  // =========================================================================
  // 1. ENHANCED RETRO CHIPTUNE AUDIO SYNTH
  // =========================================================================
  class CosmicAudio {
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
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    tone(freq, endFreq, dur, type = 'square', gainVal = 0.07, delay = 0) {
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
      const sr = this.ctx.sampleRate;
      const len = Math.floor(sr * dur);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(980, this.ctx.currentTime);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
    }

    shoot(lvl = 1, style = 'blue') {
      const base = style === 'solar' ? 540 : (style === 'quantum' ? 840 : 700);
      this.tone(base + lvl * 55, 200, 0.085, style === 'solar' ? 'sawtooth' : 'square', 0.038);
    }

    hit() {
      this.tone(350, 150, 0.045, 'triangle', 0.045);
    }

    explode(big = false) {
      this.noise(big ? 0.5 : 0.19, big ? 0.18 : 0.09);
      this.tone(big ? 150 : 250, 40, big ? 0.45 : 0.16, 'sawtooth', big ? 0.095 : 0.055);
    }

    powerup() {
      [440, 554, 659, 880].forEach((n, i) => this.tone(n, n * 1.03, 0.075, 'square', 0.055, i * 0.05));
    }

    hyper() {
      [330, 440, 660, 880, 1175].forEach((n, i) => this.tone(n, n * 1.06, 0.11, 'triangle', 0.07, i * 0.055));
    }

    bomb() {
      this.noise(0.65, 0.22);
      this.tone(540, 45, 0.58, 'sawtooth', 0.12);
      this.tone(920, 120, 0.45, 'square', 0.075, 0.06);
    }

    bossAlert() {
      for (let i = 0; i < 3; i++) {
        this.tone(220, 490, 0.16, 'sawtooth', 0.075, i * 0.22);
      }
    }

    playerHit() {
      this.noise(0.32, 0.16);
      this.tone(210, 60, 0.3, 'sawtooth', 0.1);
    }

    stepBgm(dt, active, isBoss) {
      if (!active || !this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      this.bgmTimer += dt;
      const beat = isBoss ? 0.145 : 0.175;
      if (this.bgmTimer >= beat) {
        this.bgmTimer -= beat;
        const bass = isBoss
          ? [98, 98, 116.5, 130.8, 98, 98, 146.8, 130.8]
          : [110, 110, 130.8, 146.8, 110, 130.8, 164.8, 146.8];
        const arp = isBoss
          ? [392, 466.2, 587.3, 466.2, 392, 523.2, 622.3, 587.3]
          : [440, 523.2, 659.2, 784, 659.2, 587.3, 523.2, 659.2];
        const idx = this.bgmStep % bass.length;
        this.tone(bass[idx], bass[idx], 0.11, 'triangle', 0.024);
        if (this.bgmStep % 2 === 0) {
          this.tone(arp[idx], arp[idx], 0.065, 'square', 0.011);
        }
        this.bgmStep++;
      }
    }
  }

  const audio = new CosmicAudio();

  // =========================================================================
  // 2. COSMIC BIOMES (PLANETS, SUNS, STATIONS, COSMIC ROBOTS, NEBULAE)
  // =========================================================================
  const BIOMES = [
    {
      name: 'NEBULOSA HELIOS',
      sky: ['#07122b', '#0f1838', '#1a1a32'],
      horizon: 'rgba(250, 204, 21, 0.14)',
      sunIndices: [0],
      nebulaIndices: [0, 3],
      planetIndices: [0, 1, 2, 7],
      stationIndices: [0, 2],
      robotIndices: [0, 1]
    },
    {
      name: 'SECTOR CYBER SIRIUS',
      sky: ['#050d24', '#0b1e3b', '#131630'],
      horizon: 'rgba(34, 211, 238, 0.16)',
      sunIndices: [1],
      nebulaIndices: [1, 3],
      planetIndices: [3, 5, 6, 0],
      stationIndices: [3, 1],
      robotIndices: [2, 0]
    },
    {
      name: 'HORIZONTE ECLIPSE',
      sky: ['#16091c', '#210e24', '#1a121d'],
      horizon: 'rgba(249, 115, 22, 0.16)',
      sunIndices: [2],
      nebulaIndices: [2, 0],
      planetIndices: [4, 8, 2, 7],
      stationIndices: [2, 0],
      robotIndices: [1, 2]
    },
    {
      name: 'CONVERGENCIA MULTIVERSO',
      sky: ['#090924', '#13133b', '#0c1c2e'],
      horizon: 'rgba(244, 114, 182, 0.18)',
      sunIndices: [0, 1],
      nebulaIndices: [0, 1, 2],
      planetIndices: [1, 3, 5, 4, 0],
      stationIndices: [3, 2, 1],
      robotIndices: [0, 1, 2]
    }
  ];

  // =========================================================================
  // 3. GAME STATE & ENTITIES
  // =========================================================================
  const keys = {};
  const pointer = { active: false, x: W / 2, y: H - 80 };

  const state = {
    mode: 'start', // 'start' | 'playing' | 'paused' | 'gameover'
    selectedShipId: 'valkyrie',
    biomeIndex: 0,
    manualBiome: false,
    score: 0,
    highScore: Number(localStorage.getItem(STORAGE_KEY) || 0),
    wave: 1,
    combo: 1,
    comboTimer: 0,
    hyperEnergy: 0, // 0..100
    lives: 3,
    bombs: 3,
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
    y: H - 76,
    w: 44,
    h: 42,
    speed: 360,
    weaponLevel: 1,
    fireCooldown: 0,
    invulnTimer: 0,
    shield: false,
    overdriveTimer: 0,
    drones: 0,
    droneAngle: 0
  };

  let bullets = [];
  let enemyBullets = [];
  let enemies = [];
  let powerups = [];
  let particles = [];
  let sparkles = [];
  let fireworks = [];
  let floatingTexts = [];
  let boss = null;

  // Parallax Cosmic Scenery Collections
  const stars = [];
  const comets = [];
  const bgNebulae = [];
  const bgGalaxies = [];
  const bgSuns = [];
  const bgPlanets = [];
  const bgStations = [];
  const bgRobots = [];
  const bgAsteroids = [];

  function populateBiomeScenery(biomeIdx) {
    const b = BIOMES[biomeIdx % BIOMES.length];
    biomeBadge.textContent = b.name;

    bgNebulae.length = 0;
    b.nebulaIndices.forEach((ni, i) => {
      bgNebulae.push({
        img: A.NEBULAE[ni],
        x: (i % 2 === 0 ? 220 : 780) + (Math.random() - 0.5) * 140,
        y: 120 + i * 260,
        speed: 4.5 + i * 1.5,
        alpha: 0.82
      });
    });

    bgGalaxies.length = 0;
    bgGalaxies.push(
      { x: 180 + Math.random() * 200, y: 110, speed: 3.5, alpha: 0.52 },
      { x: 740 + Math.random() * 180, y: -220, speed: 3.2, alpha: 0.48 }
    );

    bgSuns.length = 0;
    b.sunIndices.forEach((si, i) => {
      bgSuns.push({
        img: A.SUNS[si].canvas,
        x: i === 0 ? 840 : 190,
        y: i === 0 ? 145 : 230,
        speed: 2.2 + i * 1.2,
        pulse: i * 1.7
      });
    });

    bgPlanets.length = 0;
    b.planetIndices.forEach((pi, i) => {
      bgPlanets.push({
        img: A.PLANETS[pi].canvas,
        x: 110 + ((i * 270 + 70) % (W - 220)),
        y: 130 - i * 240,
        speed: 7.5 + (i % 3) * 2.2,
        alpha: 0.88,
        hasMoon: pi === 1 || pi === 3,
        moonPhase: i * 1.4
      });
    });

    bgStations.length = 0;
    b.stationIndices.forEach((sti, i) => {
      bgStations.push({
        img: A.STATIONS[sti].canvas,
        x: i % 2 === 0 ? 780 : 195,
        y: 260 - i * 330,
        speed: 11 + i * 1.8,
        bob: i * 1.9,
        alpha: 0.68
      });
    });

    bgRobots.length = 0;
    b.robotIndices.forEach((ri, i) => {
      bgRobots.push({
        img: A.COSMIC_ROBOTS[ri].canvas,
        x: i === 0 ? 150 : (i === 1 ? 860 : 510),
        y: i === 0 ? 410 : (i === 1 ? -90 : -340),
        vx: i % 2 === 0 ? 9 : -11,
        speed: 13 + i * 2.5,
        bob: i * 2.3,
        alpha: ri === 0 ? 0.66 : 0.78,
        isColossus: ri === 0
      });
    });
  }

  function initCosmos() {
    stars.length = 0;
    for (let i = 0; i < 145; i++) {
      const r = Math.random();
      let kind = 'dot';
      if (r < 0.06) kind = 'pinkCross';
      else if (r < 0.11) kind = 'coralStar';
      else if (r < 0.16) kind = 'ringBurst';
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 12 + Math.random() * 62,
        size: kind === 'dot' ? (Math.random() < 0.25 ? 3 : 2) : 3,
        kind,
        phase: Math.random() * Math.PI * 2,
        color: ['#ffffff', '#cbd5e1', '#93c5fd', '#fde047', '#f9a8d4', '#67e8f9'][Math.floor(Math.random() * 6)]
      });
    }

    bgAsteroids.length = 0;
    for (let i = 0; i < 6; i++) {
      bgAsteroids.push({
        img: i % 2 === 0 ? A.SPRITES.asteroid1 : A.SPRITES.asteroid2,
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 14,
        vy: 18 + Math.random() * 20,
        alpha: 0.45 + Math.random() * 0.25
      });
    }

    comets.length = 0;
    populateBiomeScenery(state.biomeIndex);
  }

  // =========================================================================
  // 4. HANGAR UI & COMPLETE ASSET GALLERY
  // =========================================================================
  function renderShipHangar() {
    shipGridEl.innerHTML = '';
    const shipKeys = Object.keys(A.SHIPS);
    shipKeys.forEach((key) => {
      const ship = A.SHIPS[key];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `ship-card ${state.selectedShipId === key ? 'selected' : ''}`;
      card.dataset.ship = key;

      const makePips = (val) => {
        let html = '<div class="pips">';
        for (let i = 1; i <= 5; i++) {
          html += `<span class="pip ${i <= val ? 'on' : ''}"></span>`;
        }
        return html + '</div>';
      };

      card.innerHTML = `
        <span class="ship-origin">${ship.origin}</span>
        <canvas width="64" height="58"></canvas>
        <div class="ship-name">${ship.name}</div>
        <div class="ship-stats">
          <div class="stat-row"><span>VEL</span>${makePips(ship.stats.speed)}</div>
          <div class="stat-row"><span>POD</span>${makePips(ship.stats.power)}</div>
          <div class="stat-row"><span>BLI</span>${makePips(ship.stats.armor)}</div>
        </div>
        <div class="ship-desc">${ship.desc}</div>
      `;

      const c = card.querySelector('canvas');
      const sctx = c.getContext('2d');
      sctx.imageSmoothingEnabled = false;
      const src = ship.sprite;
      const ratio = Math.min((c.width - 4) / src.width, (c.height - 4) / src.height);
      const dw = Math.floor(src.width * ratio);
      const dh = Math.floor(src.height * ratio);
      sctx.drawImage(src, Math.floor((c.width - dw) / 2), Math.floor((c.height - dh) / 2), dw, dh);

      card.addEventListener('click', () => {
        state.selectedShipId = key;
        document.querySelectorAll('.ship-card').forEach((el) => {
          el.classList.toggle('selected', el.dataset.ship === key);
        });
        audio.unlock();
        audio.hit();
      });

      shipGridEl.appendChild(card);
    });
  }

  function renderAssetGallery() {
    galleryContent.innerHTML = '';
    const sections = [
      {
        title: 'NAVES JUGABLES & DRON ESCOLTA (V1 + V2 + NUEVAS V3)',
        items: [
          ...Object.values(A.SHIPS).map((s) => ({ name: `${s.name} (${s.origin})`, canvas: s.sprite })),
          { name: 'DRON ESCOLTA (NUEVO)', canvas: A.SPRITES.wingman }
        ]
      },
      {
        title: 'ENEMIGOS & JEFES (V1 + V2 + NUEVOS V3)',
        items: [
          { name: 'MEDUSA ROJA (V1)', canvas: A.SPRITES.redJelly0 },
          { name: 'MEDUSA ÁUREA (V1)', canvas: A.SPRITES.goldJelly0 },
          { name: 'MEDUSA LARGA (V2)', canvas: A.SPRITES.v2Red0 },
          { name: 'CENTINELA OVNI (V1)', canvas: A.SPRITES.ufo },
          { name: 'INTERCEPTOR (V1)', canvas: A.SPRITES.interceptor },
          { name: 'DRON SATÉLITE (V2)', canvas: A.SPRITES.drone },
          { name: 'MEDUSA PLASMA (NUEVA)', canvas: A.SPRITES.plasmaJelly0 },
          { name: 'MECHA-BOT (NUEVO)', canvas: A.SPRITES.mechBot0 },
          { name: 'ACORAZADO (NUEVO)', canvas: A.SPRITES.beetleCruiser },
          { name: 'PRISMA CRISTAL (NUEVO)', canvas: A.SPRITES.prismWeaver0 },
          { name: 'JEFE DREADNOUGHT (V2)', canvas: A.SPRITES.bossDreadnought },
          { name: 'JEFE TITÁN HYPERION (NUEVO)', canvas: A.SPRITES.bossTitan }
        ]
      },
      {
        title: 'SOLES RADIANTES & ROBOTS CÓSMICOS DE FONDO',
        items: [
          ...A.SUNS.map((s) => ({ name: s.name, canvas: s.canvas })),
          ...A.COSMIC_ROBOTS.map((r) => ({ name: r.name, canvas: r.canvas })),
          { name: 'GALAXIA ESPIRAL (NUEVA)', canvas: A.GALAXY_SPIRAL }
        ]
      },
      {
        title: 'PLANETAS PIXEL-ART & ESTACIONES ESPACIALES',
        items: [
          ...A.PLANETS.map((p) => ({ name: p.name, canvas: p.canvas })),
          ...A.STATIONS.map((st) => ({ name: st.name, canvas: st.canvas }))
        ]
      }
    ];

    sections.forEach((sec) => {
      const h = document.createElement('div');
      h.className = 'gallery-section-title';
      h.textContent = sec.title;
      galleryContent.appendChild(h);

      const grid = document.createElement('div');
      grid.className = 'gallery-grid';
      sec.items.forEach((item) => {
        const box = document.createElement('div');
        box.className = 'gallery-item';
        const c = document.createElement('canvas');
        c.width = 96;
        c.height = 76;
        const gctx = c.getContext('2d');
        gctx.imageSmoothingEnabled = false;
        const src = item.canvas;
        const ratio = Math.min((c.width - 8) / src.width, (c.height - 8) / src.height);
        const dw = Math.max(1, Math.floor(src.width * ratio));
        const dh = Math.max(1, Math.floor(src.height * ratio));
        gctx.drawImage(src, Math.floor((c.width - dw) / 2), Math.floor((c.height - dh) / 2), dw, dh);
        const label = document.createElement('span');
        label.textContent = item.name;
        box.appendChild(c);
        box.appendChild(label);
        grid.appendChild(box);
      });
      galleryContent.appendChild(grid);
    });
  }

  // =========================================================================
  // 5. WAVES, ENEMIES & 3 ROTATING MEGA-BOSSES
  // =========================================================================
  const WEAPON_NAMES = [
    '',
    'LÁSER DOBLE',
    'TRIPLE IMPULSO',
    'CUÁDRUPLE NOVA',
    'ABANICO CÓSMICO X5',
    'TORMENTA PRISMA X6'
  ];

  function showWaveBanner(title, sub, duration = 2.3) {
    state.waveBannerTitle = title;
    state.waveBannerSub = sub;
    state.waveBannerTimer = duration;
  }

  function spawnWave(waveNum) {
    enemies = [];
    boss = null;
    bossHud.classList.add('hidden');

    // Automatically rotate cosmic biome every 2 sectors unless locked manually
    if (!state.manualBiome) {
      const targetBiome = Math.floor((waveNum - 1) / 2) % BIOMES.length;
      if (targetBiome !== state.biomeIndex) {
        state.biomeIndex = targetBiome;
        populateBiomeScenery(state.biomeIndex);
      }
    }

    // Every 3rd wave -> Mega Boss! (Kronos -> Dreadnought -> Cosmic Titan Hyperion)
    if (waveNum % 3 === 0) {
      const tier = Math.floor(waveNum / 3);
      const bossTypeIdx = (tier - 1) % 3;
      const bossTypes = [
        { kind: 'kronos', name: `ESTACIÓN ORBITAL KRONOS MK-${tier}`, w: 224, h: 118, hpBase: 110 },
        { kind: 'dreadnought', name: `ESTACIÓN DREADNOUGHT MK-${tier}`, w: 170, h: 96, hpBase: 145 },
        { kind: 'titan', name: `TITÁN CÓSMICO HYPERION MK-${tier}`, w: 184, h: 110, hpBase: 185 }
      ];
      const cfg = bossTypes[bossTypeIdx];
      const maxHp = cfg.hpBase + tier * 55;
      boss = {
        kind: cfg.kind,
        name: cfg.name,
        x: W / 2,
        y: -120,
        targetY: 122,
        w: cfg.w,
        h: cfg.h,
        hp: maxHp,
        maxHp,
        vx: 105 + tier * 16,
        phaseTimer: 0,
        fireTimer: 0.9,
        minionTimer: 4.2,
        hitFlash: 0,
        pulse: 0
      };
      bossNameEl.textContent = boss.name;
      bossHud.classList.remove('hidden');
      audio.bossAlert();
      showWaveBanner(`¡ALERTA JEFE! SECTOR ${String(waveNum).padStart(2, '0')}`, boss.name, 2.9);
      return;
    }

    showWaveBanner(
      `SECTOR ${String(waveNum).padStart(2, '0')} • ${BIOMES[state.biomeIndex].name}`,
      waveNum === 1 ? '¡FLOTA DEL MULTIVERSO DETECTADA!' : '¡NUEVA OLEADA EN CAMINO!'
    );

    const rows = Math.min(4, 2 + Math.floor((waveNum + 1) / 2));
    const cols = Math.min(10, 6 + Math.floor(waveNum / 2));
    const spacing = Math.min(82, (W - 140) / cols);
    const startX = (W - (cols - 1) * spacing) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type = 'redJelly';
        if (r === 0) {
          if (waveNum >= 4 && c % 3 === 1) type = 'beetleCruiser';
          else if (waveNum >= 2 && c % 2 === 0) type = 'mechBot';
          else type = c % 2 === 0 ? 'ufo' : 'drone';
        } else if (r === 1) {
          if (waveNum >= 2 && (c === 1 || c === cols - 2)) type = 'prismWeaver';
          else if (c % 2 === 0) type = 'plasmaJelly';
          else type = 'goldJelly';
        } else if (r === 2) {
          if (waveNum >= 3 && (c === 0 || c === cols - 1)) type = 'interceptor';
          else type = c % 2 === 0 ? 'v2Red' : 'goldJelly';
        } else {
          type = c % 2 === 0 ? 'redJelly' : 'plasmaJelly';
        }

        const statsTable = {
          redJelly:      { hp: 1 + Math.floor(waveNum / 5), score: 100, w: 36, h: 38, glow: 'rgba(244,63,63,0.75)' },
          v2Red:         { hp: 2 + Math.floor(waveNum / 5), score: 120, w: 38, h: 40, glow: 'rgba(239,68,68,0.75)' },
          goldJelly:     { hp: 2 + Math.floor(waveNum / 4), score: 180, w: 36, h: 38, glow: 'rgba(255,212,59,0.75)' },
          plasmaJelly:   { hp: 2 + Math.floor(waveNum / 3), score: 220, w: 38, h: 40, glow: 'rgba(168,85,247,0.85)' },
          ufo:           { hp: 3 + Math.floor(waveNum / 3), score: 250, w: 42, h: 26, glow: 'rgba(56,189,248,0.8)' },
          drone:         { hp: 3 + Math.floor(waveNum / 3), score: 240, w: 36, h: 30, glow: 'rgba(56,189,248,0.8)' },
          interceptor:   { hp: 2 + Math.floor(waveNum / 4), score: 230, w: 36, h: 28, glow: 'rgba(255,59,78,0.8)' },
          mechBot:       { hp: 4 + Math.floor(waveNum / 3), score: 320, w: 42, h: 38, glow: 'rgba(249,115,22,0.85)' },
          beetleCruiser: { hp: 5 + Math.floor(waveNum / 2), score: 400, w: 48, h: 36, glow: 'rgba(16,185,129,0.85)' },
          prismWeaver:   { hp: 3 + Math.floor(waveNum / 3), score: 300, w: 42, h: 34, glow: 'rgba(34,211,238,0.85)' }
        };
        const st = statsTable[type];

        enemies.push({
          type,
          baseX: startX + c * spacing,
          baseY: 78 + r * 56,
          x: startX + c * spacing,
          y: -60 - r * 56 - c * 10,
          entering: true,
          w: st.w,
          h: st.h,
          hp: st.hp,
          maxHp: st.hp,
          score: st.score,
          glow: st.glow,
          phase: c * 0.55 + r * 0.8,
          fireCooldown: 1.0 + Math.random() * 2.6,
          diveState: null,
          hitFlash: 0
        });
      }
    }
  }

  function spawnPowerup(x, y, forceKind = null) {
    let kind = forceKind;
    if (!kind) {
      const r = Math.random();
      if (r < 0.30) kind = 'weapon';
      else if (r < 0.50) kind = 'shield';
      else if (r < 0.68) kind = 'overdrive';
      else if (r < 0.83) kind = 'drone';
      else if (r < 0.94) kind = 'bomb';
      else kind = 'life';
    }
    powerups.push({ x, y, vy: 92, kind, phase: 0 });
  }

  function spawnExplosion(x, y, mainColor, count = 20, big = false) {
    const pal = [mainColor, '#facc15', '#f472b6', '#22d3ee', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const spd = (big ? 90 : 60) + Math.random() * (big ? 210 : 165);
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.75,
        size: big ? (Math.random() < 0.5 ? 6 : 4) : (Math.random() < 0.4 ? 5 : 3),
        color: pal[Math.floor(Math.random() * pal.length)]
      });
    }

    // V1 8-pixel burst ring
    sparkles.push({
      x, y,
      radius: 4,
      maxRadius: big ? 42 : 26,
      life: big ? 0.55 : 0.42,
      maxLife: big ? 0.55 : 0.42
    });

    // V2 firework sprite burst
    fireworks.push({
      x, y,
      scale: big ? 1.55 : 0.85,
      life: big ? 0.52 : 0.36,
      maxLife: big ? 0.52 : 0.36
    });
  }

  function addFloatingText(x, y, text, color = '#facc15') {
    floatingTexts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  // =========================================================================
  // 6. ACTIONS & HUD
  // =========================================================================
  function updateHud() {
    hudScore.textContent = String(state.score).padStart(6, '0');
    hudHigh.textContent = String(state.highScore).padStart(6, '0');
    hudWave.textContent = String(state.wave).padStart(2, '0');
    hudCombo.textContent = `x${state.combo}`;

    hyperFill.style.width = `${Math.min(100, Math.round(state.hyperEnergy))}%`;
    hyperTrack.classList.toggle('ready', state.hyperEnergy >= 100);

    hudLives.innerHTML = '';
    for (let i = 0; i < Math.max(0, state.lives); i++) {
      const pip = document.createElement('span');
      pip.className = 'life-pip';
      hudLives.appendChild(pip);
    }

    hudBombs.innerHTML = '';
    for (let i = 0; i < Math.max(0, state.bombs); i++) {
      const pip = document.createElement('span');
      pip.className = 'bomb-pip';
      hudBombs.appendChild(pip);
    }

    weaponBadge.textContent = WEAPON_NAMES[player.weaponLevel] || 'LÁSER';
    dronesBadge.classList.toggle('hidden', player.drones <= 0);
    dronesBadge.textContent = `DRONES x${player.drones}`;
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
    const shipCfg = A.SHIPS[state.selectedShipId] || A.SHIPS.valkyrie;

    state.mode = 'playing';
    state.score = 0;
    state.wave = 1;
    state.combo = 1;
    state.comboTimer = 0;
    state.hyperEnergy = 25;
    state.lives = shipCfg.lives;
    state.bombs = shipCfg.bombs;
    state.shake = 0;
    state.flashAlpha = 0;
    state.waveClearDelay = 0;

    player.x = W / 2;
    player.y = H - 76;
    player.speed = shipCfg.speed;
    player.weaponLevel = 1;
    player.fireCooldown = 0;
    player.invulnTimer = 1.6;
    player.shield = shipCfg.id === 'vanguard';
    player.overdriveTimer = 0;
    player.drones = shipCfg.startDrone ? 1 : 0;

    bullets = [];
    enemyBullets = [];
    powerups = [];
    particles = [];
    sparkles = [];
    fireworks = [];
    floatingTexts = [];

    overlayStart.classList.add('hidden');
    overlayGallery.classList.add('hidden');
    overlayPause.classList.add('hidden');
    overlayGameOver.classList.add('hidden');

    spawnWave(1);
    updateHud();
  }

  function openHangar() {
    state.mode = 'start';
    boss = null;
    bossHud.classList.add('hidden');
    overlayPause.classList.add('hidden');
    overlayGameOver.classList.add('hidden');
    overlayStart.classList.remove('hidden');
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
    let isNew = false;
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem(STORAGE_KEY, String(state.highScore));
      isNew = true;
    }
    finalScoreEl.textContent = state.score.toLocaleString('es-ES');
    finalWaveEl.textContent = state.wave;
    finalHighEl.textContent = state.highScore.toLocaleString('es-ES');
    newRecordMsg.classList.toggle('hidden', !isNew);
    overlayGameOver.classList.remove('hidden');
    updateHud();
  }

  function firePlayerWeapons() {
    const shipCfg = A.SHIPS[state.selectedShipId] || A.SHIPS.valkyrie;
    const lvl = player.weaponLevel;
    const isOver = player.overdriveTimer > 0;
    const baseCd = shipCfg.id === 'vanguard' ? 0.125 : (shipCfg.id === 'phantom' ? 0.13 : 0.145);
    player.fireCooldown = isOver ? baseCd * 0.58 : baseCd;
    audio.shoot(lvl, shipCfg.bulletColor);

    const dmgScale = (shipCfg.id === 'valkyrie' ? 1.25 : 1.0) * (isOver ? 1.2 : 1.0);
    const style = shipCfg.bulletColor;
    const addBolt = (ox, oy, vx, vy, mult = 1) => {
      bullets.push({ x: player.x + ox, y: player.y + oy, vx, vy, dmg: dmgScale * mult, style });
    };

    if (lvl === 1) {
      addBolt(-14, -10, 0, -660);
      addBolt(14, -10, 0, -660);
    } else if (lvl === 2) {
      addBolt(-15, -8, -28, -670);
      addBolt(0, -22, 0, -700, 1.15);
      addBolt(15, -8, 28, -670);
    } else if (lvl === 3) {
      addBolt(-18, -6, -95, -650);
      addBolt(-7, -16, 0, -700);
      addBolt(7, -16, 0, -700);
      addBolt(18, -6, 95, -650);
    } else if (lvl === 4) {
      addBolt(-20, -4, -160, -640);
      addBolt(-10, -14, -55, -690);
      addBolt(0, -24, 0, -730, 1.3);
      addBolt(10, -14, 55, -690);
      addBolt(20, -4, 160, -640);
    } else {
      addBolt(-22, -4, -195, -630);
      addBolt(-14, -10, -90, -680);
      addBolt(-5, -20, -18, -730, 1.15);
      addBolt(5, -20, 18, -730, 1.15);
      addBolt(14, -10, 90, -680);
      addBolt(22, -4, 195, -630);
    }

    // Orbiting Wingman Drones fire automatically!
    for (let d = 0; d < player.drones; d++) {
      const ang = player.droneAngle + d * Math.PI;
      const dx = Math.cos(ang) * 44;
      const dy = Math.sin(ang) * 20;
      bullets.push({
        x: player.x + dx,
        y: player.y + dy - 12,
        vx: 0,
        vy: -720,
        dmg: 0.85,
        style: 'cyan'
      });
    }
  }

  function triggerHyperCharge() {
    if (state.mode !== 'playing' || state.hyperEnergy < 100) return;
    state.hyperEnergy = 0;
    player.overdriveTimer = 8.5;
    player.invulnTimer = Math.max(player.invulnTimer, 2.0);
    state.shake = 12;
    state.flashAlpha = 0.5;
    state.flashColor = '#38bdf8';
    enemyBullets = [];
    audio.hyper();
    spawnExplosion(player.x, player.y, '#22d3ee', 28, true);
    addFloatingText(player.x, player.y - 34, '★ ¡HIPER-CARGA ACTIVADA! ★', '#facc15');
    updateHud();
  }

  function triggerNovaBomb() {
    if (state.mode !== 'playing' || state.bombs <= 0) return;
    state.bombs--;
    state.shake = 18;
    state.flashAlpha = 0.72;
    state.flashColor = '#facc15';
    audio.bomb();
    enemyBullets = [];

    for (let i = 0; i < 7; i++) {
      spawnExplosion(
        130 + Math.random() * (W - 260),
        90 + Math.random() * (H - 220),
        i % 2 === 0 ? '#facc15' : '#22d3ee',
        18,
        true
      );
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.hp -= 6;
      e.hitFlash = 0.2;
      if (e.hp <= 0) destroyEnemy(i, false);
    }

    if (boss) {
      boss.hp -= 22;
      boss.hitFlash = 0.25;
      addFloatingText(boss.x, boss.y + 30, '¡IMPACTO NOVA!', '#facc15');
      if (boss.hp <= 0) destroyBoss();
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
      spawnExplosion(player.x, player.y, '#60a5fa', 22);
      addFloatingText(player.x, player.y - 28, '¡ESCUDO ABSORBIÓ IMPACTO!', '#93c5fd');
      audio.playerHit();
      updateHud();
      return;
    }

    state.lives--;
    state.combo = 1;
    state.comboTimer = 0;
    state.shake = 15;
    state.flashAlpha = 0.45;
    state.flashColor = '#f43f5e';
    player.invulnTimer = 2.2;
    if (player.weaponLevel > 1) player.weaponLevel--;
    spawnExplosion(player.x, player.y, '#f43f5e', 28, true);
    audio.playerHit();
    updateHud();

    if (state.lives <= 0) triggerGameOver();
  }

  function registerScore(baseScore, x, y, color = '#facc15') {
    state.comboTimer = 2.8;
    const gained = baseScore * state.combo;
    state.score += gained;
    if (state.score > state.highScore) state.highScore = state.score;
    state.hyperEnergy = Math.min(100, state.hyperEnergy + 6.5);
    addFloatingText(x, y, `+${gained}${state.combo > 1 ? ` x${state.combo}` : ''}`, color);
    if (state.combo < 6) state.combo++;
  }

  function destroyEnemy(index, allowDrop = true) {
    const e = enemies[index];
    enemies.splice(index, 1);
    const colMap = {
      redJelly: '#f43f5e', v2Red: '#ef4444', goldJelly: '#facc15',
      plasmaJelly: '#c084fc', mechBot: '#fb923c', beetleCruiser: '#10b981',
      prismWeaver: '#22d3ee', interceptor: '#f43f5e'
    };
    const col = colMap[e.type] || '#38bdf8';
    spawnExplosion(e.x, e.y, col, 18);
    registerScore(e.score, e.x, e.y - 10, col);
    audio.explode(false);

    if (allowDrop && Math.random() < 0.16) {
      spawnPowerup(e.x, e.y);
    }
    updateHud();
  }

  function destroyBoss() {
    const bx = boss.x;
    const by = boss.y;
    boss = null;
    bossHud.classList.add('hidden');
    state.shake = 24;
    state.flashAlpha = 0.78;
    state.flashColor = '#f97316';
    audio.explode(true);

    for (let i = 0; i < 9; i++) {
      spawnExplosion(
        bx + (Math.random() - 0.5) * 180,
        by + (Math.random() - 0.5) * 100,
        i % 2 === 0 ? '#facc15' : '#22d3ee',
        24,
        true
      );
    }

    registerScore(3000 + state.wave * 250, bx, by, '#facc15');
    spawnPowerup(bx - 42, by, 'weapon');
    spawnPowerup(bx, by + 10, 'drone');
    spawnPowerup(bx + 42, by, 'bomb');
    enemyBullets = [];
    updateHud();
  }

  // =========================================================================
  // 7. UPDATE LOOP
  // =========================================================================
  function updateCosmos(dt) {
    for (const s of stars) {
      s.y += s.speed * dt;
      s.phase += dt * 3.4;
      if (s.y > H + 12) {
        s.y = -12;
        s.x = Math.random() * W;
      }
    }

    // Occasional pixel shooting comets
    if (Math.random() < 0.22 * dt && comets.length < 3) {
      const fromLeft = Math.random() < 0.5;
      comets.push({
        x: fromLeft ? -30 : W + 30,
        y: 30 + Math.random() * (H * 0.45),
        vx: (fromLeft ? 1 : -1) * (240 + Math.random() * 140),
        vy: 110 + Math.random() * 80,
        color: Math.random() < 0.5 ? '#67e8f9' : '#fde047',
        life: 3.5
      });
    }
    for (let i = comets.length - 1; i >= 0; i--) {
      const cm = comets[i];
      cm.x += cm.vx * dt;
      cm.y += cm.vy * dt;
      cm.life -= dt;
      if (cm.life <= 0 || cm.y > H + 60) comets.splice(i, 1);
    }

    for (const nb of bgNebulae) {
      nb.y += nb.speed * dt;
      if (nb.y > H + nb.img.height) {
        nb.y = -nb.img.height;
        nb.x = 120 + Math.random() * (W - 240);
      }
    }

    for (const gl of bgGalaxies) {
      gl.y += gl.speed * dt;
      if (gl.y > H + 120) {
        gl.y = -130;
        gl.x = 100 + Math.random() * (W - 200);
      }
    }

    for (const sun of bgSuns) {
      sun.pulse += dt * 2.2;
      sun.y += sun.speed * dt;
      if (sun.y > H + 180) {
        sun.y = -180;
        sun.x = 140 + Math.random() * (W - 280);
      }
    }

    for (const p of bgPlanets) {
      p.y += p.speed * dt;
      p.moonPhase += dt * 1.1;
      if (p.y > H + 150) {
        p.y = -160 - Math.random() * 140;
        p.x = 90 + Math.random() * (W - 180);
      }
    }

    for (const st of bgStations) {
      st.y += st.speed * dt;
      st.bob += dt * 1.3;
      if (st.y > H + 140) {
        st.y = -150 - Math.random() * 180;
        st.x = 110 + Math.random() * (W - 220);
      }
    }

    for (const rb of bgRobots) {
      rb.y += rb.speed * dt;
      rb.x += rb.vx * dt;
      rb.bob += dt * 1.8;
      if (rb.x < 70 || rb.x > W - 70) rb.vx *= -1;
      if (rb.y > H + 160) {
        rb.y = -170 - Math.random() * 180;
        rb.x = 120 + Math.random() * (W - 240);
      }
    }

    for (const ast of bgAsteroids) {
      ast.x += ast.vx * dt;
      ast.y += ast.vy * dt;
      if (ast.y > H + 40) {
        ast.y = -40;
        ast.x = Math.random() * W;
      }
    }
  }

  function update(dt) {
    state.time += dt;
    updateCosmos(dt);

    if (state.mode !== 'playing') return;

    audio.stepBgm(dt, true, Boolean(boss));

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

    // Player movement
    let dx = 0;
    let dy = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
    if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
    if (keys['ArrowDown'] || keys['KeyS']) dy += 1;

    if (dx !== 0 || dy !== 0) {
      pointer.active = false;
      const len = Math.hypot(dx, dy);
      const boost = player.overdriveTimer > 0 ? 1.2 : 1.0;
      player.x += (dx / len) * player.speed * boost * dt;
      player.y += (dy / len) * player.speed * boost * dt;
    } else if (pointer.active) {
      player.x += (pointer.x - player.x) * Math.min(1, dt * 16);
      player.y += (pointer.y - player.y) * Math.min(1, dt * 16);
    }

    player.x = Math.max(30, Math.min(W - 30, player.x));
    player.y = Math.max(64, Math.min(H - 36, player.y));
    player.droneAngle += dt * 3.1;

    if (player.invulnTimer > 0) player.invulnTimer -= dt;
    if (player.overdriveTimer > 0) {
      player.overdriveTimer -= dt;
      if (player.overdriveTimer <= 0) updateHud();
    }

    // Firing
    if (player.fireCooldown > 0) player.fireCooldown -= dt;
    if ((state.autoFire || keys['Space'] || keys['KeyZ']) && player.fireCooldown <= 0) {
      firePlayerWeapons();
    }

    // Player Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -30 || b.x < -30 || b.x > W + 30) bullets.splice(i, 1);
    }

    // Enemy Bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (eb.y > H + 24 || eb.y < -24 || eb.x < -24 || eb.x > W + 24) {
        enemyBullets.splice(i, 1);
        continue;
      }
      if (Math.hypot(eb.x - player.x, eb.y - player.y) < 16) {
        enemyBullets.splice(i, 1);
        damagePlayer();
      }
    }

    // Enemies Update
    const sway = Math.sin(state.time * 1.45) * 44;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.phase += dt * 3.4;
      if (e.hitFlash > 0) e.hitFlash -= dt;

      if (e.entering) {
        e.y += 235 * dt;
        e.x = e.baseX + sway;
        if (e.y >= e.baseY) {
          e.y = e.baseY;
          e.entering = false;
        }
      } else if (e.diveState) {
        e.diveState.t += dt;
        e.x += e.diveState.vx * dt;
        e.y += e.diveState.vy * dt;
        if (e.y > H + 42) {
          e.y = -42;
          e.diveState = null;
          e.entering = true;
        }
      } else {
        const extraX = e.type === 'prismWeaver' ? Math.cos(e.phase * 1.3) * 26 : 0;
        e.x = e.baseX + sway + extraX;
        e.y = e.baseY + Math.sin(e.phase) * (e.type === 'prismWeaver' ? 14 : 8);

        if ((e.type === 'interceptor' || e.type === 'goldJelly') && Math.random() < 0.085 * dt) {
          e.diveState = {
            t: 0,
            vx: (player.x - e.x) * 0.55,
            vy: 225 + state.wave * 10
          };
        }
      }

      // Enemy Firing Patterns
      e.fireCooldown -= dt;
      if (e.fireCooldown <= 0 && !e.entering) {
        e.fireCooldown = Math.max(1.25, 3.4 - state.wave * 0.14) + Math.random() * 2.1;
        if (enemies.length <= 18 || Math.random() < 0.42) {
          const spd = 215 + Math.min(130, state.wave * 11);
          if (e.type === 'ufo' || e.type === 'mechBot') {
            const col = e.type === 'mechBot' ? '#fb923c' : '#38bdf8';
            enemyBullets.push({ x: e.x - 11, y: e.y + 14, vx: -40, vy: spd, color: col });
            enemyBullets.push({ x: e.x + 11, y: e.y + 14, vx: 40, vy: spd, color: col });
          } else if (e.type === 'beetleCruiser') {
            for (let k = -1; k <= 1; k++) {
              enemyBullets.push({ x: e.x + k * 10, y: e.y + 16, vx: k * 75, vy: spd, color: '#4ade80' });
            }
          } else if (e.type === 'plasmaJelly' || e.type === 'prismWeaver') {
            const ang = Math.atan2(player.y - e.y, player.x - e.x);
            enemyBullets.push({ x: e.x, y: e.y + 12, vx: Math.cos(ang - 0.18) * spd, vy: Math.sin(ang - 0.18) * spd, color: '#e879f9' });
            enemyBullets.push({ x: e.x, y: e.y + 12, vx: Math.cos(ang + 0.18) * spd, vy: Math.sin(ang + 0.18) * spd, color: '#22d3ee' });
          } else {
            const ang = Math.atan2(player.y - e.y, player.x - e.x);
            const aim = (e.type === 'drone' || e.type === 'interceptor') ? ang : Math.PI / 2 + (Math.random() - 0.5) * 0.25;
            enemyBullets.push({
              x: e.x, y: e.y + 14,
              vx: Math.cos(aim) * spd, vy: Math.sin(aim) * spd,
              color: e.type === 'goldJelly' ? '#facc15' : '#f472b6'
            });
          }
        }
      }

      // Collision with Player
      if (Math.abs(e.x - player.x) < 28 && Math.abs(e.y - player.y) < 28) {
        destroyEnemy(i, false);
        damagePlayer();
        continue;
      }

      // Collision with Player Bullets
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.abs(b.x - e.x) < e.w * 0.56 && Math.abs(b.y - e.y) < e.h * 0.56) {
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

    // Mega Boss Update
    if (boss) {
      if (boss.y < boss.targetY) {
        boss.y += 88 * dt;
      } else {
        boss.x += boss.vx * dt;
        if (boss.x < 145) { boss.x = 145; boss.vx = Math.abs(boss.vx); }
        if (boss.x > W - 145) { boss.x = W - 145; boss.vx = -Math.abs(boss.vx); }
      }
      boss.phaseTimer += dt;
      boss.pulse += dt * 4.5;
      if (boss.hitFlash > 0) boss.hitFlash -= dt;

      boss.fireTimer -= dt;
      if (boss.fireTimer <= 0 && boss.y >= boss.targetY - 6) {
        if (boss.kind === 'titan') {
          boss.fireTimer = 0.88;
          // Twin shoulder railguns
          enemyBullets.push({ x: boss.x - 66, y: boss.y + 34, vx: -18, vy: 320, color: '#22d3ee' });
          enemyBullets.push({ x: boss.x + 66, y: boss.y + 34, vx: 18, vy: 320, color: '#22d3ee' });
          // Rotating arc reactor burst
          const sweep = Math.sin(boss.phaseTimer * 2.2) * 0.35;
          for (let k = -2; k <= 2; k++) {
            const a = Math.PI / 2 + sweep + k * 0.22;
            enemyBullets.push({
              x: boss.x, y: boss.y + 26,
              vx: Math.cos(a) * 250, vy: Math.sin(a) * 250,
              color: k % 2 === 0 ? '#facc15' : '#f472b6'
            });
          }
        } else if (boss.kind === 'dreadnought') {
          boss.fireTimer = 1.0;
          const cnt = 7;
          for (let k = 0; k < cnt; k++) {
            const a = Math.PI * 0.18 + (Math.PI * 0.64 * k) / (cnt - 1);
            enemyBullets.push({
              x: boss.x, y: boss.y + 32,
              vx: Math.cos(a) * 230, vy: Math.sin(a) * 230,
              color: k % 2 === 0 ? '#f472b6' : '#facc15'
            });
          }
        } else {
          boss.fireTimer = 1.02;
          enemyBullets.push({ x: boss.x - 68, y: boss.y + 38, vx: -25, vy: 285, color: '#ff9f1c' });
          enemyBullets.push({ x: boss.x + 68, y: boss.y + 38, vx: 25, vy: 285, color: '#ff9f1c' });
          if (Math.floor(boss.phaseTimer) % 2 === 0) {
            for (let k = -2; k <= 2; k++) {
              const a = Math.PI / 2 + k * 0.24;
              enemyBullets.push({ x: boss.x, y: boss.y + 42, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, color: '#ff3b4e' });
            }
          }
        }
      }

      // Boss Escorts
      boss.minionTimer -= dt;
      if (boss.minionTimer <= 0 && enemies.length < 4) {
        boss.minionTimer = 5.0;
        const mType = boss.kind === 'titan' ? 'mechBot' : (Math.random() < 0.5 ? 'plasmaJelly' : 'goldJelly');
        enemies.push({
          type: mType,
          baseX: boss.x + (Math.random() < 0.5 ? -95 : 95),
          baseY: 205,
          x: boss.x, y: boss.y + 30,
          entering: true,
          w: 38, h: 38, hp: 2, maxHp: 2, score: 180,
          glow: 'rgba(168,85,247,0.8)', phase: 0, fireCooldown: 1.5, diveState: null, hitFlash: 0
        });
      }

      // Player Bullets hitting Boss
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.abs(b.x - boss.x) < boss.w * 0.48 && Math.abs(b.y - boss.y) < boss.h * 0.48) {
          bullets.splice(j, 1);
          boss.hp -= b.dmg;
          boss.hitFlash = 0.06;
          audio.hit();
          particles.push({
            x: b.x, y: b.y,
            vx: (Math.random() - 0.5) * 140, vy: 80,
            life: 0.24, maxLife: 0.24, size: 4, color: '#facc15'
          });
          updateHud();
          if (boss.hp <= 0) {
            destroyBoss();
            break;
          }
        }
      }
    }

    // Powerups (with magnet during Hyper-Mode!)
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.phase += dt * 5.5;
      if (player.overdriveTimer > 0) {
        const ang = Math.atan2(player.y - pu.y, player.x - pu.x);
        pu.x += Math.cos(ang) * 280 * dt;
        pu.y += Math.sin(ang) * 280 * dt;
      } else {
        pu.y += pu.vy * dt;
      }
      if (pu.y > H + 32) {
        powerups.splice(i, 1);
        continue;
      }
      if (Math.hypot(pu.x - player.x, pu.y - player.y) < 32) {
        powerups.splice(i, 1);
        audio.powerup();
        if (pu.kind === 'weapon') {
          if (player.weaponLevel < 5) {
            player.weaponLevel++;
            addFloatingText(player.x, player.y - 28, WEAPON_NAMES[player.weaponLevel], '#22d3ee');
          } else {
            state.score += 600;
            addFloatingText(player.x, player.y - 28, '+600 ARMA MÁX', '#22d3ee');
          }
        } else if (pu.kind === 'shield') {
          player.shield = true;
          addFloatingText(player.x, player.y - 28, '¡ESCUDO ACTIVADO!', '#93c5fd');
        } else if (pu.kind === 'overdrive') {
          player.overdriveTimer = Math.max(player.overdriveTimer, 8.5);
          addFloatingText(player.x, player.y - 28, '¡HIPER-MODO!', '#facc15');
        } else if (pu.kind === 'drone') {
          if (player.drones < 2) {
            player.drones++;
            addFloatingText(player.x, player.y - 28, '+1 DRON ESCOLTA', '#4ade80');
          } else {
            state.score += 500;
            addFloatingText(player.x, player.y - 28, '+500 ESCUADRÓN MÁX', '#4ade80');
          }
        } else if (pu.kind === 'bomb') {
          state.bombs = Math.min(5, state.bombs + 1);
          addFloatingText(player.x, player.y - 28, '+1 BOMBA NOVA', '#fb923c');
        } else if (pu.kind === 'life') {
          state.lives = Math.min(6, state.lives + 1);
          addFloatingText(player.x, player.y - 28, '+1 NAVE EXTRA', '#f472b6');
        }
        updateHud();
      }
    }

    // FX
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
    for (let i = fireworks.length - 1; i >= 0; i--) {
      const fw = fireworks[i];
      fw.life -= dt;
      fw.scale += dt * 1.9;
      if (fw.life <= 0) fireworks.splice(i, 1);
    }
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 38 * dt;
      ft.life -= dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // Next Wave
    if (!boss && enemies.length === 0) {
      state.waveClearDelay += dt;
      if (state.waveClearDelay >= 1.35) {
        state.waveClearDelay = 0;
        state.wave++;
        updateHud();
        spawnWave(state.wave);
      }
    }
  }

  // =========================================================================
  // 8. RENDERING (5-LAYER COSMIC PANORAMA + ALL SPRITES)
  // =========================================================================
  function drawBackground() {
    const b = BIOMES[state.biomeIndex % BIOMES.length];
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, b.sky[0]);
    grad.addColorStop(0.55, b.sky[1]);
    grad.addColorStop(1, b.sky[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle retro horizon glow line
    ctx.fillStyle = b.horizon;
    ctx.fillRect(0, Math.floor(H * 0.26), W, 2);

    // Layer 0: Dithered Pixel Nebulae
    for (const nb of bgNebulae) {
      ctx.save();
      ctx.globalAlpha = nb.alpha;
      ctx.drawImage(nb.img, Math.round(nb.x - nb.img.width / 2), Math.round(nb.y - nb.img.height / 2));
      ctx.restore();
    }

    // Layer 0.5: Distant Spiral Galaxies
    for (const gl of bgGalaxies) {
      ctx.save();
      ctx.globalAlpha = gl.alpha;
      ctx.drawImage(A.GALAXY_SPIRAL, Math.round(gl.x - 70), Math.round(gl.y - 70));
      ctx.restore();
    }

    // Layer 1: Radiant Pixel Suns
    for (const sun of bgSuns) {
      const scale = 1 + Math.sin(sun.pulse) * 0.03;
      ctx.save();
      ctx.translate(Math.round(sun.x), Math.round(sun.y));
      ctx.scale(scale, scale);
      ctx.drawImage(sun.img, -sun.img.width / 2, -sun.img.height / 2);
      ctx.restore();
    }

    // Layer 2: Multi-Depth Starfield & Sparkles
    for (const s of stars) {
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      const twinkle = 0.5 + 0.5 * Math.sin(s.phase);
      ctx.save();
      ctx.globalAlpha = twinkle;
      if (s.kind === 'dot') {
        ctx.fillStyle = s.color;
        ctx.fillRect(x, y, s.size, s.size);
      } else if (s.kind === 'pinkCross') {
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(x - 2, y - 2, 4, 4);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(x - 6, y - 2, 4, 4);
        ctx.fillRect(x + 2, y - 2, 4, 4);
        ctx.fillRect(x - 2, y - 6, 4, 4);
        ctx.fillRect(x - 2, y + 2, 4, 4);
      } else if (s.kind === 'coralStar') {
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(x - 2, y - 2, 4, 4);
        ctx.fillRect(x - 6, y - 1, 12, 2);
        ctx.fillRect(x - 1, y - 6, 2, 12);
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(x - 5, y - 5, 3, 3);
        ctx.fillRect(x + 3, y + 3, 3, 3);
        ctx.fillRect(x - 5, y + 3, 3, 3);
        ctx.fillRect(x + 3, y - 5, 3, 3);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x - 1, y - 6, 3, 3);
        ctx.fillRect(x - 1, y + 4, 3, 3);
        ctx.fillRect(x - 6, y - 1, 3, 3);
        ctx.fillRect(x + 4, y - 1, 3, 3);
      }
      ctx.restore();
    }

    // Shooting Pixel Comets
    for (const cm of comets) {
      ctx.save();
      for (let t = 0; t < 7; t++) {
        ctx.globalAlpha = (1 - t / 7) * 0.85;
        ctx.fillStyle = t === 0 ? '#ffffff' : cm.color;
        const sz = Math.max(2, 6 - t);
        ctx.fillRect(Math.round(cm.x - cm.vx * t * 0.015), Math.round(cm.y - cm.vy * t * 0.015), sz, sz);
      }
      ctx.restore();
    }

    // Layer 3: Shaded Pixel Planets + Orbiting Mini Moons
    for (const p of bgPlanets) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.drawImage(p.img, Math.round(p.x - p.img.width / 2), Math.round(p.y - p.img.height / 2));
      if (p.hasMoon) {
        const mx = Math.round(p.x + Math.cos(p.moonPhase) * 74);
        const my = Math.round(p.y + Math.sin(p.moonPhase) * 28);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(mx - 5, my - 5, 10, 10);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(mx, my, 5, 5);
      }
      ctx.restore();
    }

    // Layer 4: Orbital Space Stations with Blinking Beacons
    for (const st of bgStations) {
      const sx = Math.round(st.x);
      const sy = Math.round(st.y + Math.sin(st.bob) * 7);
      ctx.save();
      ctx.globalAlpha = st.alpha;
      ctx.drawImage(st.img, sx - Math.floor(st.img.width / 2), sy - Math.floor(st.img.height / 2));
      if (Math.sin(state.time * 5 + st.bob) > 0) {
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(sx - 2, sy - Math.floor(st.img.height / 2) - 4, 4, 4);
      }
      ctx.restore();
    }

    // Layer 4.5: Majestic Cosmic Robots Drifting Through Space!
    for (const rb of bgRobots) {
      const rx = Math.round(rb.x);
      const ry = Math.round(rb.y + Math.sin(rb.bob) * 9);
      ctx.save();
      ctx.globalAlpha = rb.alpha;
      ctx.drawImage(rb.img, rx - Math.floor(rb.img.width / 2), ry - Math.floor(rb.img.height / 2));
      // Animated energy thruster / telemetry glint
      if (Math.sin(state.time * 8 + rb.bob) > -0.2) {
        ctx.fillStyle = rb.isColossus ? '#22d3ee' : '#facc15';
        ctx.fillRect(rx - 2, ry + Math.floor(rb.img.height / 2) - 6, 4, 6);
      }
      ctx.restore();
    }

    // Layer 5: Parallax Drifting Asteroids
    for (const ast of bgAsteroids) {
      ctx.save();
      ctx.globalAlpha = ast.alpha;
      ctx.drawImage(ast.img, Math.round(ast.x), Math.round(ast.y));
      ctx.restore();
    }
  }

  function drawThrusterFlames(x, y, golden = false, accent = '#ff5900') {
    const flicker = Math.floor(state.time * 24) % 3;
    const outer = golden ? '#fef08a' : accent;
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

    drawPlume(Math.round(x), Math.round(y + 19), 14 + flicker * 3);
    drawPlume(Math.round(x - 14), Math.round(y + 16), 10 + ((flicker + 1) % 3) * 2);
    drawPlume(Math.round(x + 14), Math.round(y + 16), 10 + ((flicker + 2) % 3) * 2);
  }

  function drawPlayer() {
    if (state.mode === 'gameover') return;
    if (player.invulnTimer > 0 && Math.floor(state.time * 16) % 2 === 0) return;

    const shipCfg = A.SHIPS[state.selectedShipId] || A.SHIPS.valkyrie;
    const px = Math.round(player.x);
    const py = Math.round(player.y);

    const flameCol = shipCfg.id === 'phantom' ? '#a855f7' : '#ff5900';
    drawThrusterFlames(px, py, player.overdriveTimer > 0, flameCol);

    ctx.save();
    ctx.shadowColor = player.overdriveTimer > 0 ? '#facc15' : shipCfg.accent;
    ctx.shadowBlur = player.overdriveTimer > 0 ? 18 : 10;
    const spr = shipCfg.sprite;
    ctx.drawImage(spr, px - Math.floor(spr.width / 2), py - Math.floor(spr.height / 2));
    ctx.restore();

    // Orbiting Wingman Drones
    for (let d = 0; d < player.drones; d++) {
      const ang = player.droneAngle + d * Math.PI;
      const dx = Math.round(px + Math.cos(ang) * 44);
      const dy = Math.round(py + Math.sin(ang) * 20);
      const dspr = A.SPRITES.wingman;
      ctx.drawImage(dspr, dx - Math.floor(dspr.width / 2), dy - Math.floor(dspr.height / 2));
    }

    // Shield Aura
    if (player.shield) {
      ctx.save();
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.88)';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(px, py, 32 + Math.sin(state.time * 7) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPlayerBullet(b) {
    const bx = Math.round(b.x);
    const by = Math.round(b.y);
    const schemes = {
      blue:    ['#e0f2fe', '#3b82f6', '#1d4ed8', '#60a5fa'],
      cyan:    ['#ecfeff', '#22d3ee', '#0284c7', '#38bdf8'],
      solar:   ['#fffbeb', '#facc15', '#ea580c', '#f59e0b'],
      quantum: ['#fdf4ff', '#e879f9', '#7c3aed', '#c084fc']
    };
    const [c0, c1, c2, glow] = schemes[b.style] || schemes.blue;
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 9;
    ctx.fillStyle = c0;
    ctx.fillRect(bx - 2, by - 11, 4, 5);
    ctx.fillStyle = c1;
    ctx.fillRect(bx - 2, by - 5, 4, 6);
    ctx.fillStyle = c2;
    ctx.fillRect(bx - 1, by + 2, 2, 6);
    ctx.restore();
  }

  function drawKronosBoss(bx, by) {
    const p = 4;
    const drawBlock = (ox, oy, w, h, col) => {
      ctx.fillStyle = boss.hitFlash > 0 ? '#ffffff' : col;
      ctx.fillRect(bx + ox * p, by + oy * p, w * p, h * p);
    };
    drawBlock(-26, -7, 10, 14, '#1e3a8a');
    drawBlock(-25, -5, 8, 10, '#2563eb');
    drawBlock(16, -7, 10, 14, '#1e3a8a');
    drawBlock(17, -5, 8, 10, '#2563eb');
    drawBlock(-16, -2, 32, 4, '#64748b');
    drawBlock(-16, -1, 32, 2, '#94a3b8');
    drawBlock(-19, 3, 5, 7, '#475569');
    drawBlock(-18, 10, 3, 3, '#ff9f1c');
    drawBlock(14, 3, 5, 7, '#475569');
    drawBlock(15, 10, 3, 3, '#ff9f1c');
    drawBlock(-10, -12, 20, 24, '#334155');
    drawBlock(-8, -10, 16, 20, '#cbd5e1');
    drawBlock(-6, -8, 12, 16, '#1e293b');
    const pulse = Math.sin(boss.pulse) > 0;
    drawBlock(-4, -5, 8, 10, '#ff3b4e');
    drawBlock(-2, -3, 4, 6, pulse ? '#ffd13b' : '#ffffff');
    drawBlock(-1, -16, 2, 4, '#e2e8f0');
    drawBlock(-2, -17, 4, 2, pulse ? '#48dbfb' : '#ff9f1c');
  }

  function drawBoss() {
    if (!boss) return;
    const bx = Math.round(boss.x);
    const by = Math.round(boss.y);
    ctx.save();
    ctx.shadowColor = boss.hitFlash > 0 ? '#ffffff' : (boss.kind === 'titan' ? '#22d3ee' : '#ff9f1c');
    ctx.shadowBlur = boss.hitFlash > 0 ? 24 : 16;

    if (boss.kind === 'kronos') {
      drawKronosBoss(bx, by);
    } else {
      const spr = boss.kind === 'titan' ? A.SPRITES.bossTitan : A.SPRITES.bossDreadnought;
      if (boss.hitFlash > 0) ctx.filter = 'brightness(2.3)';
      ctx.drawImage(spr, bx - Math.floor(spr.width / 2), by - Math.floor(spr.height / 2));
    }
    ctx.restore();
  }

  function drawEnemies() {
    const f = Math.floor(state.time * 4.8) % 2;
    for (const e of enemies) {
      let spr = A.SPRITES.ufo;
      if (e.type === 'redJelly') spr = f === 0 ? A.SPRITES.redJelly0 : A.SPRITES.redJelly1;
      else if (e.type === 'v2Red') spr = f === 0 ? A.SPRITES.v2Red0 : A.SPRITES.v2Red1;
      else if (e.type === 'goldJelly') spr = f === 0 ? A.SPRITES.goldJelly0 : A.SPRITES.goldJelly1;
      else if (e.type === 'plasmaJelly') spr = f === 0 ? A.SPRITES.plasmaJelly0 : A.SPRITES.plasmaJelly1;
      else if (e.type === 'mechBot') spr = f === 0 ? A.SPRITES.mechBot0 : A.SPRITES.mechBot1;
      else if (e.type === 'prismWeaver') spr = f === 0 ? A.SPRITES.prismWeaver0 : A.SPRITES.prismWeaver1;
      else if (e.type === 'beetleCruiser') spr = A.SPRITES.beetleCruiser;
      else if (e.type === 'drone') spr = A.SPRITES.drone;
      else if (e.type === 'interceptor') spr = A.SPRITES.interceptor;

      ctx.save();
      ctx.shadowColor = e.hitFlash > 0 ? '#ffffff' : e.glow;
      ctx.shadowBlur = e.hitFlash > 0 ? 18 : 12;
      if (e.hitFlash > 0) ctx.filter = 'brightness(2.2)';
      ctx.drawImage(spr, Math.round(e.x - spr.width / 2), Math.round(e.y - spr.height / 2));
      ctx.restore();
    }
  }

  function drawPowerups() {
    const cfg = {
      weapon:    { label: 'P', bg: '#0ea5e9', border: '#e0f2fe' },
      shield:    { label: 'S', bg: '#3b82f6', border: '#93c5fd' },
      overdrive: { label: 'T', bg: '#f59e0b', border: '#fef08a' },
      drone:     { label: 'D', bg: '#10b981', border: '#a7f3d0' },
      bomb:      { label: 'B', bg: '#ec4899', border: '#fbcfe8' },
      life:      { label: '+', bg: '#ef4444', border: '#fecdd3' }
    };
    for (const pu of powerups) {
      const c = cfg[pu.kind];
      const px = Math.round(pu.x);
      const py = Math.round(pu.y + Math.sin(pu.phase) * 2.5);
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

    for (const b of bullets) drawPlayerBullet(b);

    for (const fw of fireworks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, fw.life / fw.maxLife);
      ctx.translate(Math.round(fw.x), Math.round(fw.y));
      ctx.scale(fw.scale, fw.scale);
      ctx.drawImage(A.SPRITES.firework, -A.SPRITES.firework.width / 2, -A.SPRITES.firework.height / 2);
      ctx.restore();
    }

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      ctx.restore();
    }

    for (const sp of sparkles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
      for (let k = 0; k < 8; k++) {
        const ang = (Math.PI * 2 * k) / 8;
        ctx.fillStyle = k % 2 === 0 ? '#f472b6' : '#facc15';
        ctx.fillRect(Math.round(sp.x + Math.cos(ang) * sp.radius) - 2, Math.round(sp.y + Math.sin(ang) * sp.radius) - 2, 4, 4);
      }
      ctx.restore();
    }

    for (const ft of floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, ft.life / ft.maxLife);
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 7;
      ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
      ctx.restore();
    }

    if (state.waveBannerTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.waveBannerTimer * 1.4);
      ctx.fillStyle = 'rgba(7, 13, 27, 0.82)';
      ctx.fillRect(W / 2 - 300, H / 2 - 54, 600, 92);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.strokeRect(W / 2 - 300, H / 2 - 54, 600, 92);
      ctx.textAlign = 'center';
      ctx.font = '15px "Press Start 2P", monospace';
      ctx.fillStyle = '#facc15';
      ctx.fillText(state.waveBannerTitle, W / 2, H / 2 - 14);
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#22d3ee';
      ctx.fillText(state.waveBannerSub, W / 2, H / 2 + 18);
      ctx.restore();
    }
  }

  function drawAttractDemo() {
    const f = Math.floor(state.time * 4) % 2;
    const shipCfg = A.SHIPS[state.selectedShipId] || A.SHIPS.valkyrie;
    const sx = W / 2 + Math.sin(state.time * 0.85) * 320;
    const sy = H - 72 + Math.cos(state.time * 1.6) * 10;

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(f === 0 ? A.SPRITES.plasmaJelly0 : A.SPRITES.plasmaJelly1, 110, 88 + Math.sin(state.time * 2) * 14);
    ctx.drawImage(f === 0 ? A.SPRITES.mechBot0 : A.SPRITES.mechBot1, W - 165, 96 + Math.cos(state.time * 2.1) * 14);
    drawThrusterFlames(sx, sy, false, shipCfg.accent);
    ctx.drawImage(shipCfg.sprite, Math.round(sx - shipCfg.sprite.width / 2), Math.round(sy - shipCfg.sprite.height / 2));
    ctx.restore();
  }

  function render() {
    ctx.save();
    if (state.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground();
    if (state.mode === 'start') {
      drawAttractDemo();
    } else {
      drawPowerups();
      drawEnemies();
      drawBoss();
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
  // 9. INPUT & UI EVENTS
  // =========================================================================
  function cycleBiome() {
    state.manualBiome = true;
    state.biomeIndex = (state.biomeIndex + 1) % BIOMES.length;
    populateBiomeScenery(state.biomeIndex);
    if (state.mode === 'playing') {
      addFloatingText(W / 2, 92, `COSMOS: ${BIOMES[state.biomeIndex].name}`, '#e9d5ff');
    }
  }

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === 'Escape' && !overlayGallery.classList.contains('hidden')) {
      overlayGallery.classList.add('hidden');
      return;
    }

    if (e.code === 'Space') {
      if ((state.mode === 'start' && overlayGallery.classList.contains('hidden')) || state.mode === 'gameover') {
        startNewGame();
      }
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      if (state.mode === 'playing' || state.mode === 'paused') togglePause();
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') {
      triggerNovaBomb();
    } else if (e.code === 'KeyE' || e.code === 'KeyQ') {
      triggerHyperCharge();
    } else if (e.code === 'KeyB') {
      cycleBiome();
    } else if (e.code === 'KeyF') {
      toggleAutoFire();
    } else if (e.code === 'KeyC') {
      toggleCrt();
    } else if (e.code === 'KeyM') {
      toggleSound();
    }
  });

  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  function updatePointerPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * W;
    pointer.y = ((clientY - rect.top) / rect.height) * H;
    pointer.active = true;
  }

  canvas.addEventListener('mousemove', (e) => { if (state.mode === 'playing') updatePointerPos(e.clientX, e.clientY); });
  canvas.addEventListener('mousedown', (e) => {
    audio.unlock();
    if (state.mode !== 'playing') return;
    if (e.button === 2) triggerNovaBomb();
    else {
      updatePointerPos(e.clientX, e.clientY);
      if (player.fireCooldown <= 0) firePlayerWeapons();
    }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('touchstart', (e) => {
    audio.unlock();
    if (state.mode === 'playing' && e.touches[0]) updatePointerPos(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (state.mode === 'playing' && e.touches[0]) updatePointerPos(e.touches[0].clientX, e.touches[0].clientY);
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
  btnHangarPause.addEventListener('click', openHangar);
  btnHangarOver.addEventListener('click', openHangar);
  btnPause.addEventListener('click', togglePause);
  btnBiome.addEventListener('click', cycleBiome);
  btnAutofire.addEventListener('click', toggleAutoFire);
  btnCrt.addEventListener('click', toggleCrt);
  btnSound.addEventListener('click', toggleSound);
  btnTouchBomb.addEventListener('click', triggerNovaBomb);
  btnTouchHyper.addEventListener('click', triggerHyperCharge);

  btnGallery.addEventListener('click', () => overlayGallery.classList.remove('hidden'));
  btnCloseGallery.addEventListener('click', () => overlayGallery.classList.add('hidden'));

  // =========================================================================
  // 10. INIT & MAIN LOOP
  // =========================================================================
  initCosmos();
  renderShipHangar();
  renderAssetGallery();
  updateHud();

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
