(() => {
  'use strict';

  const A = window.NEBULA_ASSETS;
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
  const hudSkills = document.getElementById('hud-skills');
  const hudBombs = document.getElementById('hud-bombs');

  const bossHud = document.getElementById('boss-hud');
  const bossNameEl = document.getElementById('boss-name');
  const bossHpText = document.getElementById('boss-hp-text');
  const bossBarFill = document.getElementById('boss-bar-fill');

  const sectorBadge = document.getElementById('sector-badge');
  const tierBadge = document.getElementById('tier-badge');
  const weaponBadge = document.getElementById('weapon-badge');
  const droneBadge = document.getElementById('drone-badge');
  const shieldBadge = document.getElementById('shield-badge');

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
  const btnSector = document.getElementById('btn-sector');
  const btnAutofire = document.getElementById('btn-autofire');
  const btnCrt = document.getElementById('btn-crt');
  const btnSound = document.getElementById('btn-sound');
  const btnPause = document.getElementById('btn-pause');
  const btnTouchSkill = document.getElementById('btn-touch-skill');
  const btnTouchBomb = document.getElementById('btn-touch-bomb');
  const crtOverlay = document.getElementById('crt-overlay');

  const STORAGE_KEY = 'nebula_citadel_zero_highscore_v4';

  // =========================================================================
  // 1. RETRO TACTICAL CHIPTUNE SYNTH (CLEAN NODE LIFECYCLE + THROTTLED)
  // =========================================================================
  class TacticalAudio {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.bgmTimer = 0;
      this.bgmStep = 0;
      this._lastHit = 0;
      this._lastExplode = 0;
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

    tone(freq, endFreq, dur, type = 'square', gainVal = 0.06, delay = 0) {
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
      osc.onended = () => {
        try { osc.disconnect(); gain.disconnect(); } catch (_) {}
      };
      osc.start(now);
      osc.stop(now + dur + 0.01);
    }

    noise(dur = 0.2, gainVal = 0.09) {
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
      filter.frequency.setValueAtTime(920, this.ctx.currentTime);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.onended = () => {
        try { src.disconnect(); filter.disconnect(); gain.disconnect(); } catch (_) {}
      };
      src.start();
    }

    shoot(style) {
      if (style === 'heavy') this.tone(420, 140, 0.11, 'sawtooth', 0.045);
      else if (style === 'neon') this.tone(860, 290, 0.065, 'square', 0.032);
      else this.tone(660, 220, 0.08, 'square', 0.036);
    }

    hit() {
      const now = performance.now();
      if (now - this._lastHit < 40) return;
      this._lastHit = now;
      this.tone(360, 160, 0.045, 'triangle', 0.042);
    }

    explode(big = false) {
      const now = performance.now();
      if (!big && now - this._lastExplode < 45) return;
      this._lastExplode = now;
      this.noise(big ? 0.5 : 0.18, big ? 0.16 : 0.085);
      this.tone(big ? 145 : 235, 38, big ? 0.45 : 0.15, 'sawtooth', big ? 0.09 : 0.05);
    }

    powerup() {
      [523, 659, 784, 1046].forEach((n, i) => this.tone(n, n * 1.02, 0.075, 'triangle', 0.06, i * 0.05));
    }

    skill() {
      [330, 494, 659, 988].forEach((n, i) => this.tone(n, n * 1.08, 0.1, 'square', 0.055, i * 0.045));
    }

    missile() {
      this.tone(280, 740, 0.12, 'sawtooth', 0.05);
    }

    bomb() {
      this.noise(0.62, 0.2);
      this.tone(480, 42, 0.56, 'sawtooth', 0.11);
      this.tone(820, 110, 0.42, 'square', 0.07, 0.05);
    }

    bossAlert() {
      for (let i = 0; i < 3; i++) {
        this.tone(200, 440, 0.18, 'sawtooth', 0.07, i * 0.24);
      }
    }

    playerHit() {
      this.noise(0.3, 0.15);
      this.tone(195, 58, 0.28, 'sawtooth', 0.095);
    }

    stepBgm(dt, active, isBoss) {
      if (!active || !this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      this.bgmTimer += dt;
      const beat = isBoss ? 0.15 : 0.19;
      if (this.bgmTimer >= beat) {
        this.bgmTimer -= beat;
        const bass = isBoss
          ? [82.4, 82.4, 98, 110, 82.4, 123.5, 110, 98]
          : [98, 98, 116.5, 130.8, 98, 130.8, 146.8, 130.8];
        const arp = isBoss
          ? [329.6, 392, 493.8, 392, 329.6, 440, 493.8, 523.2]
          : [392, 466.2, 587.3, 466.2, 392, 523.2, 587.3, 698.5];
        const idx = this.bgmStep % bass.length;
        this.tone(bass[idx], bass[idx], 0.12, 'triangle', 0.022);
        if (this.bgmStep % 2 === 0) {
          this.tone(arp[idx], arp[idx], 0.06, 'square', 0.01);
        }
        this.bgmStep++;
      }
    }
  }

  const audio = new TacticalAudio();

  // =========================================================================
  // 2. 4 BRAND-NEW COSMIC SECTORS (BACKGROUND SCENERY)
  // =========================================================================
  const SECTORS = [
    {
      name: 'CINTURÓN DE CRISTAL',
      sky: ['#050d21', '#0b1e36', '#0e1726'],
      horizon: 'rgba(56, 189, 248, 0.15)',
      nebulaIdx: 0,
      celestialIdx: 0,
      planetIndices: [0],
      stationIndices: [0],
      robotIndices: [0]
    },
    {
      name: 'ASTILLERO DEL COLOSO',
      sky: ['#09101f', '#141c30', '#1c1824'],
      horizon: 'rgba(250, 204, 21, 0.14)',
      nebulaIdx: 2,
      celestialIdx: 1,
      planetIndices: [1],
      stationIndices: [1],
      robotIndices: [0]
    },
    {
      name: 'SANTUARIO ESMERALDA',
      sky: ['#041418', '#0a222b', '#121329'],
      horizon: 'rgba(45, 212, 191, 0.16)',
      nebulaIdx: 1,
      celestialIdx: 0,
      planetIndices: [2],
      stationIndices: [2],
      robotIndices: [1]
    },
    {
      name: 'HORIZONTE SINGULARIDAD',
      sky: ['#090414', '#180926', '#160a1d'],
      horizon: 'rgba(244, 114, 182, 0.18)',
      nebulaIdx: 2,
      celestialIdx: 2, // Pixel Black Hole!
      planetIndices: [3],
      stationIndices: [2, 0],
      robotIndices: [1]
    }
  ];

  // =========================================================================
  // 3. STATE & ENTITIES
  // =========================================================================
  const keys = {};
  const pointer = { active: false, x: W / 2, y: H - 80 };

  const state = {
    mode: 'start',
    selectedShipId: 'falcon',
    sectorIndex: 0,
    manualSector: false,
    score: 0,
    highScore: Number(localStorage.getItem(STORAGE_KEY) || 0),
    wave: 1,
    combo: 1,
    comboTimer: 0,
    lives: 3,
    skillCharges: 1, // max 2
    skillKillCounter: 0,
    bombs: 1,        // max 2 (limited & tactical!)
    empSlowTimer: 0,
    dropCooldown: 4, // prevents early/back-to-back spam
    noDropTimer: 0,  // gentle pity guarantee after 24s
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
    speed: 355,
    weaponLevel: 1, // 1..4 (capped at 4 for clean tactical balance)
    fireCooldown: 0,
    invulnTimer: 0,
    shield: false,
    aegisTimer: 0,
    phaseTimer: 0,
    droneTimer: 0,
    droneAngle: 0
  };

  let bullets = [];
  let missiles = [];
  let enemyBullets = [];
  let enemies = [];
  let powerups = [];
  let particles = [];
  let shockwaves = [];
  let afterimages = [];
  let floatingTexts = [];
  let boss = null;

  // Background Scenery
  const stars = [];
  const bgNebulae = [];
  const bgCelestials = [];
  const bgPlanets = [];
  const bgStations = [];
  const bgRobots = [];

  function populateSector(idx) {
    const s = SECTORS[idx % SECTORS.length];
    sectorBadge.textContent = s.name;

    bgNebulae.length = 0;
    bgNebulae.push(
      { img: A.NEBULAE[s.nebulaIdx], x: 260, y: 170, speed: 4.5, alpha: 0.78 },
      { img: A.NEBULAE[(s.nebulaIdx + 1) % A.NEBULAE.length], x: 780, y: 470, speed: 5.5, alpha: 0.65 }
    );

    bgCelestials.length = 0;
    bgCelestials.push({
      img: A.CELESTIALS[s.celestialIdx].canvas,
      x: 820,
      y: 150,
      speed: 2.2,
      pulse: 0
    });

    bgPlanets.length = 0;
    s.planetIndices.forEach((pi, i) => {
      bgPlanets.push({
        img: A.PLANETS[pi].canvas,
        x: 175 + i * 320,
        y: 185 - i * 260,
        speed: 7.5 + i * 2,
        alpha: 0.9
      });
    });

    bgStations.length = 0;
    s.stationIndices.forEach((sti, i) => {
      bgStations.push({
        img: A.STATIONS[sti].canvas,
        x: i === 0 ? 790 : 210,
        y: 380 - i * 360,
        speed: 11 + i * 2,
        bob: i * 1.7,
        alpha: 0.72
      });
    });

    bgRobots.length = 0;
    s.robotIndices.forEach((ri, i) => {
      bgRobots.push({
        img: A.ROBOTS[ri].canvas,
        x: 160 + i * 640,
        y: 440 - i * 260,
        vx: i % 2 === 0 ? 8 : -9,
        speed: 12.5,
        bob: i * 2.1,
        alpha: 0.7
      });
    });
  }

  function initCosmos() {
    stars.length = 0;
    for (let i = 0; i < 125; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 10 + Math.random() * 54,
        size: Math.random() < 0.25 ? 3 : 2,
        cross: Math.random() < 0.08,
        phase: Math.random() * 6.28,
        color: ['#ffffff', '#cbd5e1', '#7dd3fc', '#fde047', '#99f6e4', '#f9a8d4'][Math.floor(Math.random() * 6)]
      });
    }
    populateSector(state.sectorIndex);
  }

  // =========================================================================
  // 4. HANGAR & ASSET GALLERY UI
  // =========================================================================
  function renderShipHangar() {
    shipGridEl.innerHTML = '';
    Object.values(A.SHIPS).forEach((ship) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `ship-card ${state.selectedShipId === ship.id ? 'selected' : ''}`;
      card.dataset.ship = ship.id;

      const makePips = (val) => {
        let html = '<div class="pips">';
        for (let i = 1; i <= 5; i++) html += `<span class="pip ${i <= val ? 'on' : ''}"></span>`;
        return html + '</div>';
      };

      card.innerHTML = `
        <span class="ship-role">${ship.role}</span>
        <canvas width="66" height="58"></canvas>
        <div class="ship-name">${ship.name}</div>
        <div class="ship-ability">[E] ${ship.abilityName}</div>
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
      const ratio = Math.min((c.width - 6) / src.width, (c.height - 6) / src.height);
      const dw = Math.floor(src.width * ratio);
      const dh = Math.floor(src.height * ratio);
      sctx.drawImage(src, Math.floor((c.width - dw) / 2), Math.floor((c.height - dh) / 2), dw, dh);

      card.addEventListener('click', () => {
        state.selectedShipId = ship.id;
        document.querySelectorAll('.ship-card').forEach((el) => {
          el.classList.toggle('selected', el.dataset.ship === ship.id);
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
        title: 'NUEVAS NAVES TÁCTICAS & ARMAMENTO',
        items: [
          ...Object.values(A.SHIPS).map((s) => ({ name: `${s.name} (${s.role})`, canvas: s.sprite })),
          { name: 'DRON TÁCTICO', canvas: A.SPRITES.drone },
          { name: 'MISIL TELEDIRIGIDO', canvas: A.SPRITES.missile }
        ]
      },
      {
        title: '7 NUEVOS ENEMIGOS & 3 NUEVOS MEGAJEFES',
        items: [
          { name: 'EXPLORADOR ABEJA', canvas: A.SPRITES.waspScout0 },
          { name: 'CANGREJO ACORAZADO', canvas: A.SPRITES.crabGuard0 },
          { name: 'CALAMAR ESPECTRAL', canvas: A.SPRITES.voidSquid0 },
          { name: 'TORRETA HEXAGONAL', canvas: A.SPRITES.hexTurret0 },
          { name: 'BOMBARDERO AVISPÓN', canvas: A.SPRITES.hornetBomber0 },
          { name: 'CAZA ESPECTRO', canvas: A.SPRITES.wraithBlade0 },
          { name: 'CRUCERO PORTANAVES', canvas: A.SPRITES.miniCarrier },
          { name: 'JEFE SOLARIS-IX', canvas: A.SPRITES.bossSolaris },
          { name: 'JEFE KRAKEN-0', canvas: A.SPRITES.bossKraken },
          { name: 'JEFE OMEGA-PRIME', canvas: A.SPRITES.bossOmega }
        ]
      },
      {
        title: 'NUEVOS FONDOS: AGUJERO NEGRO, PLANETAS, ESTACIONES & ROBOTS',
        items: [
          ...A.CELESTIALS.map((c) => ({ name: c.name, canvas: c.canvas })),
          ...A.PLANETS.map((p) => ({ name: p.name, canvas: p.canvas })),
          ...A.STATIONS.map((s) => ({ name: s.name, canvas: s.canvas })),
          ...A.ROBOTS.map((r) => ({ name: r.name, canvas: r.canvas }))
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
  // 5. GRADUAL WAVE DIFFICULTY CURVE & 3 BOSSES (EVERY 4TH WAVE)
  // =========================================================================
  function getDifficultyProfile(waveNum) {
    // Carefully tuned gradual escalation
    const tierName =
      waveNum <= 2 ? 'AMENAZA: BAJA' :
      waveNum <= 5 ? 'AMENAZA: MEDIA' :
      waveNum <= 8 ? 'AMENAZA: ALTA' : 'AMENAZA: CRÍTICA';

    return {
      tierName,
      bulletSpeed: Math.min(265, 145 + waveNum * 11),
      maxEnemyBullets: Math.min(24, 3 + waveNum * 2),
      fireIntervalBase: Math.max(1.45, 3.85 - waveNum * 0.2),
      diveRate: waveNum < 5 ? 0 : Math.min(0.11, 0.025 + (waveNum - 5) * 0.014),
      swaySpeed: Math.min(2.1, 1.05 + waveNum * 0.08),
      swayAmp: Math.min(54, 28 + waveNum * 2.5)
    };
  }

  function showWaveBanner(title, sub, duration = 2.3) {
    state.waveBannerTitle = title;
    state.waveBannerSub = sub;
    state.waveBannerTimer = duration;
  }

  function spawnWave(waveNum) {
    enemies = [];
    boss = null;
    bossHud.classList.add('hidden');

    const diff = getDifficultyProfile(waveNum);
    tierBadge.textContent = diff.tierName;

    // Smoothly transition cosmic sector every 4 waves
    if (!state.manualSector) {
      const nextSector = Math.floor((waveNum - 1) / 4) % SECTORS.length;
      if (nextSector !== state.sectorIndex) {
        state.sectorIndex = nextSector;
        populateSector(state.sectorIndex);
      }
    }

    // Every 4th wave is a Mega-Boss! (Waves 4, 8, 12, 16...)
    if (waveNum % 4 === 0) {
      const tier = Math.floor(waveNum / 4);
      const idx = (tier - 1) % 3;
      const defs = [
        { kind: 'solaris', name: `ARCA SOLAR SOLARIS-IX${tier > 3 ? ` MK-${tier}` : ''}`, w: 160, h: 90, hp: 105 + tier * 40 },
        { kind: 'kraken', name: `LEVIATÁN MECÁNICO KRAKEN-0${tier > 3 ? ` MK-${tier}` : ''}`, w: 155, h: 96, hp: 130 + tier * 48 },
        { kind: 'omega', name: `NÚCLEO SINGULARIDAD OMEGA${tier > 3 ? ` MK-${tier}` : ''}`, w: 155, h: 92, hp: 160 + tier * 55 }
      ];
      const cfg = defs[idx];
      boss = {
        kind: cfg.kind,
        name: cfg.name,
        x: W / 2,
        y: -115,
        targetY: 118,
        w: cfg.w,
        h: cfg.h,
        hp: cfg.hp,
        maxHp: cfg.hp,
        vx: 78 + tier * 14,
        phase2: false,
        phaseTimer: 0,
        fireTimer: 1.2,
        escortTimer: 6.5,
        hitFlash: 0
      };
      bossNameEl.textContent = boss.name;
      bossHud.classList.remove('hidden');
      audio.bossAlert();
      showWaveBanner(`¡ALERTA JEFE! OLEADA ${String(waveNum).padStart(2, '0')}`, boss.name, 2.9);
      return;
    }

    // Progressive Formation Sizing & Enemy Unlocking
    const waveSubs = {
      1: 'PATRULLA INICIAL — EXPLORADORES',
      2: 'CALAMARES ESPECTRALES DETECTADOS',
      3: 'TORRETAS HEXAGONALES EN ÓRBITA',
      5: 'BOMBARDEROS AVISPÓN EN CAMINO',
      6: 'CAZAS ESPECTRO — CUIDADO CON PICADOS',
      7: 'CRUCEROS PORTANAVES EN RETAGUARDIA'
    };
    showWaveBanner(
      `OLEADA ${String(waveNum).padStart(2, '0')} • ${SECTORS[state.sectorIndex].name}`,
      waveSubs[waveNum] || `ESCALADA TÁCTICA — ${diff.tierName}`
    );

    const rows = waveNum <= 2 ? 2 : (waveNum <= 8 ? 3 : 4);
    const cols = Math.min(8, 4 + Math.ceil(waveNum / 2));
    const spacing = Math.min(86, (W - 180) / Math.max(1, cols - 1));
    const startX = (W - (cols - 1) * spacing) / 2;

    const statsTable = {
      waspScout:    { hp: 1, score: 90,  w: 34, h: 28, glow: 'rgba(250,204,21,0.7)' },
      crabGuard:    { hp: 2, score: 130, w: 38, h: 30, glow: 'rgba(244,63,94,0.75)' },
      voidSquid:    { hp: 2, score: 170, w: 36, h: 32, glow: 'rgba(45,212,191,0.75)' },
      hexTurret:    { hp: 4, score: 240, w: 38, h: 34, glow: 'rgba(251,146,60,0.8)' },
      hornetBomber: { hp: 5, score: 290, w: 42, h: 32, glow: 'rgba(168,85,247,0.8)' },
      wraithBlade:  { hp: 3, score: 260, w: 36, h: 28, glow: 'rgba(244,114,182,0.85)' },
      miniCarrier:  { hp: 8, score: 450, w: 48, h: 34, glow: 'rgba(16,185,129,0.85)', guaranteedDrop: true }
    };

    const hpBonus = Math.floor((waveNum - 1) / 6);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type = 'waspScout';
        if (waveNum === 1) {
          type = r === 0 ? 'crabGuard' : 'waspScout';
        } else if (waveNum === 2) {
          type = r === 0 ? (c % 2 === 0 ? 'voidSquid' : 'crabGuard') : 'waspScout';
        } else if (waveNum === 3) {
          if (r === 0 && (c === 1 || c === cols - 2)) type = 'hexTurret';
          else if (r === 0) type = 'voidSquid';
          else if (r === 1) type = 'crabGuard';
          else type = 'waspScout';
        } else if (waveNum === 5) {
          if (r === 0 && c % 2 === 1) type = 'hornetBomber';
          else if (r === 0) type = 'hexTurret';
          else if (r === 1) type = 'voidSquid';
          else type = 'crabGuard';
        } else if (waveNum === 6) {
          if (r === 0 && (c === 0 || c === cols - 1)) type = 'wraithBlade';
          else if (r === 0) type = 'hornetBomber';
          else if (r === 1) type = c % 2 === 0 ? 'hexTurret' : 'voidSquid';
          else type = 'crabGuard';
        } else {
          // Wave 7+
          if (r === 0 && (c === 1 || c === cols - 2)) type = 'miniCarrier';
          else if (r === 0) type = 'hornetBomber';
          else if (r === 1) type = c % 2 === 0 ? 'wraithBlade' : 'hexTurret';
          else if (r === 2) type = c % 2 === 0 ? 'voidSquid' : 'crabGuard';
          else type = 'waspScout';
        }

        const st = statsTable[type];
        enemies.push({
          type,
          baseX: startX + c * spacing,
          baseY: 78 + r * 58,
          x: startX + c * spacing,
          y: -58 - r * 56 - c * 8,
          entering: true,
          w: st.w,
          h: st.h,
          hp: st.hp + hpBonus,
          maxHp: st.hp + hpBonus,
          score: st.score,
          glow: st.glow,
          guaranteedDrop: Boolean(st.guaranteedDrop),
          phase: c * 0.55 + r * 0.8,
          fireCooldown: diff.fireIntervalBase * (0.65 + Math.random() * 0.9),
          diveWarn: 0,
          diveState: null,
          hitFlash: 0
        });
      }
    }
  }

  // =========================================================================
  // 6. SCARCE, VARIED & HIGHLY TACTICAL POWER-UPS
  // =========================================================================
  function spawnPowerup(x, y, forceKind = null) {
    let kind = forceKind;
    if (!kind) {
      // Weighted tactical distribution (adapts subtly to player needs!)
      const r = Math.random();
      if (player.weaponLevel < 4 && r < 0.28) kind = 'weapon';
      else if (r < 0.46) kind = 'missiles';
      else if (r < 0.63) kind = 'skill';
      else if (r < 0.78) kind = 'shield';
      else if (r < 0.91) kind = 'drone';
      else kind = 'repair';
    }
    powerups.push({ x, y, vy: 82, kind, phase: 0 });
    state.dropCooldown = 9.0; // Limited drops: at least 9s between random pickups!
    state.noDropTimer = 0;
  }

  function spawnExplosion(x, y, mainColor, count = 16, big = false) {
    const pal = [mainColor, '#facc15', '#2dd4bf', '#f472b6', '#ffffff'];
    const allowed = Math.max(0, Math.min(count, 200 - particles.length));
    for (let i = 0; i < allowed; i++) {
      const ang = (Math.PI * 2 * i) / Math.max(1, allowed) + (Math.random() - 0.5) * 0.45;
      const spd = (big ? 85 : 55) + Math.random() * (big ? 190 : 145);
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.32 + Math.random() * 0.36,
        maxLife: 0.68,
        size: big ? (Math.random() < 0.5 ? 5 : 4) : (Math.random() < 0.4 ? 4 : 3),
        color: pal[Math.floor(Math.random() * pal.length)]
      });
    }
    if (shockwaves.length < 18) {
      shockwaves.push({
        x, y, r: 5, maxR: big ? 48 : 26, color: mainColor,
        life: big ? 0.42 : 0.28, maxLife: big ? 0.42 : 0.28
      });
    }
  }

  function addFloatingText(x, y, text, color = '#facc15') {
    floatingTexts.push({ x, y, text, color, life: 0.95, maxLife: 0.95 });
  }

  function launchHomingMissiles(count = 4) {
    audio.missile();
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.45;
      missiles.push({
        x: player.x + (i - (count - 1) / 2) * 12,
        y: player.y - 10,
        vx: Math.sin(spread) * 200,
        vy: -260,
        speed: 480,
        dmg: 4.5,
        life: 4.0
      });
    }
  }

  // =========================================================================
  // 7. PLAYER ACTIONS, TACTICAL SKILLS & HUD
  // =========================================================================
  function updateHud() {
    hudScore.textContent = String(state.score).padStart(6, '0');
    hudHigh.textContent = String(state.highScore).padStart(6, '0');
    hudWave.textContent = String(state.wave).padStart(2, '0');
    hudCombo.textContent = `x${state.combo}`;

    hudLives.innerHTML = '';
    for (let i = 0; i < Math.max(0, state.lives); i++) {
      const pip = document.createElement('span');
      pip.className = 'life-pip';
      hudLives.appendChild(pip);
    }

    hudSkills.innerHTML = '';
    for (let i = 0; i < Math.max(0, state.skillCharges); i++) {
      const pip = document.createElement('span');
      pip.className = 'skill-pip';
      hudSkills.appendChild(pip);
    }

    hudBombs.innerHTML = '';
    for (let i = 0; i < Math.max(0, state.bombs); i++) {
      const pip = document.createElement('span');
      pip.className = 'bomb-pip';
      hudBombs.appendChild(pip);
    }

    weaponBadge.textContent = `ARMA NV.${player.weaponLevel}`;
    shieldBadge.classList.toggle('hidden', !(player.shield || player.aegisTimer > 0));
    shieldBadge.textContent = player.aegisTimer > 0 ? `AEGIS ${Math.ceil(player.aegisTimer)}s` : 'ESCUDO';
    droneBadge.classList.toggle('hidden', player.droneTimer <= 0);
    if (player.droneTimer > 0) droneBadge.textContent = `DRON ${Math.ceil(player.droneTimer)}s`;

    if (boss) {
      const pct = Math.max(0, Math.ceil((boss.hp / boss.maxHp) * 100));
      bossHpText.textContent = `${pct}%`;
      bossBarFill.style.width = `${pct}%`;
    }
  }

  function startNewGame() {
    audio.unlock();
    const shipCfg = A.SHIPS[state.selectedShipId] || A.SHIPS.falcon;

    state.mode = 'playing';
    state.score = 0;
    state.wave = 1;
    state.combo = 1;
    state.comboTimer = 0;
    state.lives = shipCfg.lives;
    state.skillCharges = 1;
    state.skillKillCounter = 0;
    state.bombs = 1;
    state.empSlowTimer = 0;
    state.dropCooldown = 4.0;
    state.noDropTimer = 0;
    state.shake = 0;
    state.flashAlpha = 0;
    state.waveClearDelay = 0;

    player.x = W / 2;
    player.y = H - 76;
    player.speed = shipCfg.speed;
    player.weaponLevel = 1;
    player.fireCooldown = 0;
    player.invulnTimer = 1.5;
    player.shield = false;
    player.aegisTimer = 0;
    player.phaseTimer = 0;
    player.droneTimer = 0;

    bullets = [];
    missiles = [];
    enemyBullets = [];
    powerups = [];
    particles = [];
    shockwaves = [];
    afterimages = [];
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
    const shipCfg = A.SHIPS[state.selectedShipId] || A.SHIPS.falcon;
    const lvl = player.weaponLevel;
    player.fireCooldown = shipCfg.fireCd;
    audio.shoot(shipCfg.bulletStyle);

    const dmg = shipCfg.dmgMult;
    const style = shipCfg.bulletStyle;
    const pierce = style === 'heavy' && lvl >= 3;
    const addBolt = (ox, oy, vx, vy, m = 1) => {
      bullets.push({ x: player.x + ox, y: player.y + oy, vx, vy, dmg: dmg * m, style, pierce });
    };

    if (lvl === 1) {
      addBolt(-13, -10, 0, -640);
      addBolt(13, -10, 0, -640);
    } else if (lvl === 2) {
      addBolt(-15, -8, -22, -650);
      addBolt(0, -20, 0, -690, 1.15);
      addBolt(15, -8, 22, -650);
    } else if (lvl === 3) {
      addBolt(-17, -6, -75, -640);
      addBolt(-6, -16, 0, -690);
      addBolt(6, -16, 0, -690);
      addBolt(17, -6, 75, -640);
    } else {
      addBolt(-19, -4, -125, -630);
      addBolt(-9, -14, -32, -680);
      addBolt(0, -22, 0, -720, 1.25);
      addBolt(9, -14, 32, -680);
      addBolt(19, -4, 125, -630);
    }

    if (player.droneTimer > 0) {
      const dx = Math.cos(player.droneAngle) * 44;
      const dy = Math.sin(player.droneAngle) * 18;
      bullets.push({
        x: player.x + dx, y: player.y + dy - 12,
        vx: 0, vy: -700, dmg: 0.9, style: 'pulse', pierce: false
      });
    }
  }

  function triggerTacticalSkill() {
    if (state.mode !== 'playing' || state.skillCharges <= 0) return;
    const shipCfg = A.SHIPS[state.selectedShipId] || A.SHIPS.falcon;
    state.skillCharges--;
    audio.skill();

    if (shipCfg.id === 'falcon') {
      // EMP Pulse: clears nearby enemy bullets + slows enemies for 4s
      state.empSlowTimer = 4.0;
      state.shake = 8;
      shockwaves.push({ x: player.x, y: player.y, r: 12, maxR: 250, color: '#38bdf8', life: 0.45, maxLife: 0.45 });
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        if (Math.hypot(enemyBullets[i].x - player.x, enemyBullets[i].y - player.y) < 255) {
          enemyBullets.splice(i, 1);
        }
      }
      addFloatingText(player.x, player.y - 32, '¡PULSO PEM ACTIVO!', '#38bdf8');
    } else if (shipCfg.id === 'bastion') {
      // Aegis Barrier: 3.5s invulnerable golden-emerald barrier
      player.aegisTimer = 3.5;
      state.shake = 7;
      shockwaves.push({ x: player.x, y: player.y, r: 10, maxR: 120, color: '#34d399', life: 0.35, maxLife: 0.35 });
      addFloatingText(player.x, player.y - 32, '¡ESCUDO AEGIS 3.5s!', '#34d399');
    } else {
      // Phase Shift Dash + 2 bonus homing missiles
      player.phaseTimer = 1.6;
      player.invulnTimer = Math.max(player.invulnTimer, 1.6);
      launchHomingMissiles(2);
      addFloatingText(player.x, player.y - 32, '¡SALTO DE FASE!', '#f472b6');
    }
    updateHud();
  }

  function triggerNovaBomb() {
    if (state.mode !== 'playing' || state.bombs <= 0) return;
    state.bombs--;
    state.shake = 16;
    state.flashAlpha = 0.65;
    state.flashColor = '#facc15';
    audio.bomb();
    enemyBullets = [];

    for (let i = 0; i < 5; i++) {
      spawnExplosion(160 + Math.random() * (W - 320), 100 + Math.random() * (H - 220), '#facc15', 16, true);
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      enemies[i].hp -= 6;
      enemies[i].hitFlash = 0.2;
      if (enemies[i].hp <= 0) destroyEnemy(i, false);
    }
    if (boss) {
      boss.hp -= 18;
      boss.hitFlash = 0.22;
      addFloatingText(boss.x, boss.y + 30, '¡IMPACTO NOVA!', '#facc15');
      if (boss.hp <= 0) destroyBoss();
    }
    updateHud();
  }

  function damagePlayer() {
    if (player.invulnTimer > 0 || player.aegisTimer > 0) return;

    if (player.shield) {
      player.shield = false;
      player.invulnTimer = 1.45;
      state.shake = 9;
      // Clear bullets in safe 180px radius around player
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        if (Math.hypot(enemyBullets[i].x - player.x, enemyBullets[i].y - player.y) < 185) {
          enemyBullets.splice(i, 1);
        }
      }
      shockwaves.push({ x: player.x, y: player.y, r: 12, maxR: 185, color: '#60a5fa', life: 0.35, maxLife: 0.35 });
      addFloatingText(player.x, player.y - 28, '¡ESCUDO ABSORBIÓ IMPACTO!', '#93c5fd');
      audio.playerHit();
      updateHud();
      return;
    }

    state.lives--;
    state.combo = 1;
    state.comboTimer = 0;
    state.shake = 14;
    state.flashAlpha = 0.42;
    state.flashColor = '#f43f5e';
    player.invulnTimer = 2.1;
    if (player.weaponLevel > 1) player.weaponLevel--;
    spawnExplosion(player.x, player.y, '#f43f5e', 24, true);
    audio.playerHit();
    updateHud();

    if (state.lives <= 0) triggerGameOver();
  }

  function registerScore(baseScore, x, y, color) {
    state.comboTimer = 2.8;
    const gained = baseScore * state.combo;
    state.score += gained;
    if (state.score > state.highScore) state.highScore = state.score;
    addFloatingText(x, y, `+${gained}${state.combo > 1 ? ` x${state.combo}` : ''}`, color);
    if (state.combo < 5) state.combo++;

    // Slowly recharge tactical skill every 18 kills (max 2)
    state.skillKillCounter++;
    if (state.skillKillCounter >= 18) {
      state.skillKillCounter = 0;
      if (state.skillCharges < 2) {
        state.skillCharges++;
        addFloatingText(player.x, player.y - 36, '+1 CARGA TÁCTICA [E]', '#38bdf8');
      }
    }
  }

  function destroyEnemy(index, allowDrop = true) {
    const e = enemies[index];
    if (!e) return;
    enemies.splice(index, 1);
    const colMap = {
      waspScout: '#facc15', crabGuard: '#f43f5e', voidSquid: '#2dd4bf',
      hexTurret: '#fb923c', hornetBomber: '#a855f7', wraithBlade: '#f472b6', miniCarrier: '#10b981'
    };
    const col = colMap[e.type] || '#38bdf8';
    spawnExplosion(e.x, e.y, col, e.type === 'miniCarrier' ? 24 : 15, e.type === 'miniCarrier');
    registerScore(e.score, e.x, e.y - 10, col);
    audio.explode(e.type === 'miniCarrier');

    if (allowDrop) {
      const pityTriggered = state.noDropTimer >= 24;
      if (e.guaranteedDrop || pityTriggered || (state.dropCooldown <= 0 && Math.random() < 0.075)) {
        spawnPowerup(e.x, e.y);
      }
    }
    updateHud();
  }

  function destroyBoss() {
    const bx = boss.x;
    const by = boss.y;
    boss = null;
    bossHud.classList.add('hidden');
    state.shake = 22;
    state.flashAlpha = 0.72;
    state.flashColor = '#2dd4bf';
    audio.explode(true);

    for (let i = 0; i < 8; i++) {
      spawnExplosion(bx + (Math.random() - 0.5) * 160, by + (Math.random() - 0.5) * 90, i % 2 === 0 ? '#facc15' : '#2dd4bf', 20, true);
    }

    registerScore(2500 + state.wave * 250, bx, by, '#facc15');
    // Meaningful, bounded boss reward: 1 upgrade + 1 Nova Bomb replenishment (if <2)
    spawnPowerup(bx - 28, by, player.weaponLevel < 4 ? 'weapon' : 'missiles');
    if (state.bombs < 2) {
      state.bombs++;
      addFloatingText(bx + 28, by - 16, '+1 BOMBA NOVA', '#fb923c');
    } else {
      spawnPowerup(bx + 28, by, 'skill');
    }
    enemyBullets = [];
    updateHud();
  }

  // =========================================================================
  // 8. UPDATE LOOP
  // =========================================================================
  function updateCosmos(dt) {
    for (const s of stars) {
      s.y += s.speed * dt;
      s.phase += dt * 3;
      if (s.y > H + 10) { s.y = -10; s.x = Math.random() * W; }
    }
    for (const nb of bgNebulae) {
      nb.y += nb.speed * dt;
      if (nb.y > H + nb.img.height) { nb.y = -nb.img.height; nb.x = 120 + Math.random() * (W - 240); }
    }
    for (const cel of bgCelestials) {
      cel.pulse += dt * 2;
      cel.y += cel.speed * dt;
      if (cel.y > H + 160) { cel.y = -160; cel.x = 160 + Math.random() * (W - 320); }
    }
    for (const p of bgPlanets) {
      p.y += p.speed * dt;
      if (p.y > H + 150) { p.y = -160; p.x = 100 + Math.random() * (W - 200); }
    }
    for (const st of bgStations) {
      st.y += st.speed * dt;
      st.bob += dt * 1.2;
      if (st.y > H + 140) { st.y = -150; st.x = 110 + Math.random() * (W - 220); }
    }
    for (const rb of bgRobots) {
      rb.y += rb.speed * dt;
      rb.x += rb.vx * dt;
      rb.bob += dt * 1.6;
      if (rb.x < 75 || rb.x > W - 75) rb.vx *= -1;
      if (rb.y > H + 160) { rb.y = -170; rb.x = 120 + Math.random() * (W - 240); }
    }
  }

  function update(dt) {
    state.time += dt;
    updateCosmos(dt);

    if (state.mode !== 'playing') return;

    audio.stepBgm(dt, true, Boolean(boss));

    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
    if (state.flashAlpha > 0) state.flashAlpha = Math.max(0, state.flashAlpha - dt * 1.8);
    if (state.waveBannerTimer > 0) state.waveBannerTimer = Math.max(0, state.waveBannerTimer - dt);
    if (state.empSlowTimer > 0) state.empSlowTimer = Math.max(0, state.empSlowTimer - dt);
    if (state.dropCooldown > 0) state.dropCooldown = Math.max(0, state.dropCooldown - dt);
    state.noDropTimer += dt;

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0 && state.combo > 1) {
        state.combo = 1;
        updateHud();
      }
    }

    // Player Movement
    let dx = 0;
    let dy = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
    if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
    if (keys['ArrowDown'] || keys['KeyS']) dy += 1;

    const speedMult = player.phaseTimer > 0 ? 1.45 : 1.0;
    if (dx !== 0 || dy !== 0) {
      pointer.active = false;
      const len = Math.hypot(dx, dy);
      player.x += (dx / len) * player.speed * speedMult * dt;
      player.y += (dy / len) * player.speed * speedMult * dt;
    } else if (pointer.active) {
      player.x += (pointer.x - player.x) * Math.min(1, dt * 15);
      player.y += (pointer.y - player.y) * Math.min(1, dt * 15);
    }

    player.x = Math.max(30, Math.min(W - 30, player.x));
    player.y = Math.max(66, Math.min(H - 36, player.y));
    player.droneAngle += dt * 3.0;

    if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    if (player.aegisTimer > 0) {
      const prev = Math.ceil(player.aegisTimer);
      player.aegisTimer = Math.max(0, player.aegisTimer - dt);
      if (Math.ceil(player.aegisTimer) !== prev) updateHud();
    }
    if (player.phaseTimer > 0) {
      player.phaseTimer = Math.max(0, player.phaseTimer - dt);
      if (afterimages.length < 12 && Math.floor(state.time * 30) % 2 === 0) {
        afterimages.push({ x: player.x, y: player.y, life: 0.25, maxLife: 0.25 });
      }
    }
    if (player.droneTimer > 0) {
      const prev = Math.ceil(player.droneTimer);
      player.droneTimer = Math.max(0, player.droneTimer - dt);
      if (Math.ceil(player.droneTimer) !== prev) updateHud();
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

    // Homing Missiles
    for (let i = missiles.length - 1; i >= 0; i--) {
      const m = missiles[i];
      m.life -= dt;
      // Pick nearest target (boss or highest-HP enemy)
      let target = boss;
      if (!target && enemies.length > 0) {
        let bestDist = Infinity;
        for (const e of enemies) {
          const d = Math.hypot(e.x - m.x, e.y - m.y);
          if (d < bestDist) { bestDist = d; target = e; }
        }
      }
      if (target) {
        const desired = Math.atan2(target.y - m.y, target.x - m.x);
        const cur = Math.atan2(m.vy, m.vx);
        let diffAng = desired - cur;
        while (diffAng > Math.PI) diffAng -= Math.PI * 2;
        while (diffAng < -Math.PI) diffAng += Math.PI * 2;
        const newAng = cur + Math.max(-6.5 * dt, Math.min(6.5 * dt, diffAng));
        m.vx = Math.cos(newAng) * m.speed;
        m.vy = Math.sin(newAng) * m.speed;
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      let hit = false;
      if (boss && Math.abs(m.x - boss.x) < boss.w * 0.5 && Math.abs(m.y - boss.y) < boss.h * 0.5) {
        boss.hp -= m.dmg;
        boss.hitFlash = 0.08;
        spawnExplosion(m.x, m.y, '#fb923c', 10);
        updateHud();
        if (boss.hp <= 0) destroyBoss();
        hit = true;
      } else {
        for (let k = enemies.length - 1; k >= 0; k--) {
          const e = enemies[k];
          if (Math.abs(m.x - e.x) < e.w * 0.6 && Math.abs(m.y - e.y) < e.h * 0.6) {
            e.hp -= m.dmg;
            e.hitFlash = 0.1;
            if (e.hp <= 0) destroyEnemy(k, true);
            else spawnExplosion(m.x, m.y, '#fb923c', 8);
            hit = true;
            break;
          }
        }
      }
      if (hit || m.life <= 0 || m.y < -40 || m.y > H + 40) missiles.splice(i, 1);
    }

    // Enemy Bullets (safe break on player hit!)
    const enemyTimeScale = state.empSlowTimer > 0 ? 0.52 : 1.0;
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];
      if (!eb) continue;
      eb.x += eb.vx * dt * enemyTimeScale;
      eb.y += eb.vy * dt * enemyTimeScale;
      if (eb.y > H + 24 || eb.y < -24 || eb.x < -24 || eb.x > W + 24) {
        enemyBullets.splice(i, 1);
        continue;
      }
      if (Math.hypot(eb.x - player.x, eb.y - player.y) < 16) {
        enemyBullets.splice(i, 1);
        if (player.aegisTimer > 0) {
          audio.hit();
          spawnExplosion(eb.x, eb.y, '#34d399', 6);
        } else {
          damagePlayer();
          break;
        }
      }
    }
    if (state.mode !== 'playing') return;

    // Enemies Update
    const diff = getDifficultyProfile(state.wave);
    const sway = Math.sin(state.time * diff.swaySpeed) * diff.swayAmp;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e) continue;
      e.phase += dt * 3.0 * enemyTimeScale;
      if (e.hitFlash > 0) e.hitFlash -= dt;

      if (e.entering) {
        e.y += 205 * dt;
        e.x = e.baseX + sway;
        if (e.y >= e.baseY) { e.y = e.baseY; e.entering = false; }
      } else if (e.diveWarn > 0) {
        e.diveWarn -= dt;
        e.x = e.baseX + sway + (Math.random() - 0.5) * 4;
        if (e.diveWarn <= 0) {
          e.diveState = {
            vx: (player.x - e.x) * 0.52,
            vy: 210 + Math.min(90, state.wave * 9)
          };
        }
      } else if (e.diveState) {
        e.x += e.diveState.vx * dt * enemyTimeScale;
        e.y += e.diveState.vy * dt * enemyTimeScale;
        if (e.y > H + 40) {
          e.y = -40;
          e.diveState = null;
          e.entering = true;
        }
      } else {
        e.x = e.baseX + sway;
        e.y = e.baseY + Math.sin(e.phase) * (e.type === 'voidSquid' ? 12 : 7);

        if ((e.type === 'wraithBlade' || e.type === 'waspScout') && diff.diveRate > 0 && Math.random() < diff.diveRate * dt) {
          e.diveWarn = 0.65; // Fair visual warning before diving!
        }
      }

      // Controlled Enemy Firing (respects wave bullet cap!)
      e.fireCooldown -= dt * enemyTimeScale;
      if (e.fireCooldown <= 0 && !e.entering) {
        e.fireCooldown = diff.fireIntervalBase * (0.75 + Math.random() * 0.9);
        if (enemyBullets.length < diff.maxEnemyBullets) {
          const spd = diff.bulletSpeed;
          if (e.type === 'hexTurret') {
            enemyBullets.push({ x: e.x - 10, y: e.y + 14, vx: -42, vy: spd, color: '#fb923c' });
            enemyBullets.push({ x: e.x + 10, y: e.y + 14, vx: 42, vy: spd, color: '#fb923c' });
          } else if (e.type === 'miniCarrier') {
            for (let k = -1; k <= 1; k++) {
              enemyBullets.push({ x: e.x + k * 12, y: e.y + 16, vx: k * 65, vy: spd, color: '#34d399' });
            }
          } else if (e.type === 'hornetBomber') {
            enemyBullets.push({ x: e.x, y: e.y + 16, vx: -36, vy: spd * 0.88, color: '#a855f7' });
            enemyBullets.push({ x: e.x, y: e.y + 16, vx: 36, vy: spd * 0.88, color: '#a855f7' });
          } else if (e.type === 'voidSquid' || e.type === 'wraithBlade') {
            const ang = Math.atan2(player.y - e.y, player.x - e.x);
            enemyBullets.push({
              x: e.x, y: e.y + 14,
              vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
              color: e.type === 'voidSquid' ? '#2dd4bf' : '#f472b6'
            });
          } else {
            enemyBullets.push({
              x: e.x, y: e.y + 14,
              vx: (Math.random() - 0.5) * 26, vy: spd,
              color: e.type === 'waspScout' ? '#facc15' : '#f43f5e'
            });
          }
        }
      }

      // Collision with Player
      if (Math.abs(e.x - player.x) < 28 && Math.abs(e.y - player.y) < 28) {
        destroyEnemy(i, false);
        damagePlayer();
        if (state.mode !== 'playing') return;
        continue;
      }

      // Collision with Player Bullets
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.abs(b.x - e.x) < e.w * 0.56 && Math.abs(b.y - e.y) < e.h * 0.56) {
          if (!b.pierce) bullets.splice(j, 1);
          else b.pierce = false; // pierces 1 enemy cleanly!
          e.hp -= b.dmg;
          e.hitFlash = 0.08;
          if (e.hp <= 0) {
            destroyEnemy(i, true);
            break;
          } else {
            audio.hit();
            if (particles.length < 200) {
              particles.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 80, vy: 50, life: 0.18, maxLife: 0.18, size: 3, color: '#ffffff' });
            }
          }
        }
      }
    }

    // Mega Boss Update (2 Phases!)
    if (boss) {
      if (boss.y < boss.targetY) {
        boss.y += 82 * dt;
      } else {
        boss.x += boss.vx * dt * enemyTimeScale;
        if (boss.x < 140) { boss.x = 140; boss.vx = Math.abs(boss.vx); }
        if (boss.x > W - 140) { boss.x = W - 140; boss.vx = -Math.abs(boss.vx); }
      }
      if (!boss.phase2 && boss.hp <= boss.maxHp * 0.5) {
        boss.phase2 = true;
        boss.vx *= 1.25;
        state.shake = 10;
        addFloatingText(boss.x, boss.y + 42, '¡FASE 2 — SOBRECARGA!', '#f43f5e');
      }
      boss.phaseTimer += dt;
      if (boss.hitFlash > 0) boss.hitFlash -= dt;

      boss.fireTimer -= dt * enemyTimeScale;
      if (boss.fireTimer <= 0 && boss.y >= boss.targetY - 6) {
        const bSpd = boss.phase2 ? 235 : 195;
        if (boss.kind === 'solaris') {
          boss.fireTimer = boss.phase2 ? 1.05 : 1.3;
          enemyBullets.push({ x: boss.x - 58, y: boss.y + 32, vx: -20, vy: bSpd + 30, color: '#facc15' });
          enemyBullets.push({ x: boss.x + 58, y: boss.y + 32, vx: 20, vy: bSpd + 30, color: '#facc15' });
          const spread = boss.phase2 ? 2 : 1;
          for (let k = -spread; k <= spread; k++) {
            const a = Math.PI / 2 + k * 0.25;
            enemyBullets.push({ x: boss.x, y: boss.y + 36, vx: Math.cos(a) * bSpd, vy: Math.sin(a) * bSpd, color: '#22d3ee' });
          }
        } else if (boss.kind === 'kraken') {
          boss.fireTimer = boss.phase2 ? 0.98 : 1.25;
          const cnt = boss.phase2 ? 7 : 5;
          const offset = Math.sin(boss.phaseTimer * 2) * 0.25;
          for (let k = 0; k < cnt; k++) {
            const a = Math.PI * 0.22 + offset + (Math.PI * 0.56 * k) / (cnt - 1);
            enemyBullets.push({
              x: boss.x, y: boss.y + 34,
              vx: Math.cos(a) * bSpd, vy: Math.sin(a) * bSpd,
              color: k % 2 === 0 ? '#f472b6' : '#a855f7'
            });
          }
        } else {
          boss.fireTimer = boss.phase2 ? 0.92 : 1.18;
          const cnt = boss.phase2 ? 8 : 6;
          for (let k = 0; k < cnt; k++) {
            const a = (boss.phaseTimer * 1.4) + (Math.PI * 2 * k) / cnt;
            if (Math.sin(a) > 0.08) {
              enemyBullets.push({
                x: boss.x, y: boss.y + 22,
                vx: Math.cos(a) * bSpd, vy: Math.sin(a) * bSpd,
                color: k % 2 === 0 ? '#22d3ee' : '#facc15'
              });
            }
          }
        }
      }

      // Modest Boss Escorts in Phase 2
      boss.escortTimer -= dt;
      if (boss.phase2 && boss.escortTimer <= 0 && enemies.length < 2) {
        boss.escortTimer = 7.0;
        enemies.push({
          type: 'waspScout',
          baseX: boss.x + (Math.random() < 0.5 ? -100 : 100),
          baseY: 200,
          x: boss.x, y: boss.y + 28,
          entering: true, w: 34, h: 28, hp: 2, maxHp: 2, score: 120,
          glow: 'rgba(250,204,21,0.7)', guaranteedDrop: false,
          phase: 0, fireCooldown: 2.0, diveWarn: 0, diveState: null, hitFlash: 0
        });
      }

      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.abs(b.x - boss.x) < boss.w * 0.48 && Math.abs(b.y - boss.y) < boss.h * 0.48) {
          bullets.splice(j, 1);
          boss.hp -= b.dmg;
          boss.hitFlash = 0.06;
          audio.hit();
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
      pu.phase += dt * 5;
      pu.y += pu.vy * dt;
      if (pu.y > H + 30) { powerups.splice(i, 1); continue; }
      if (Math.hypot(pu.x - player.x, pu.y - player.y) < 32) {
        powerups.splice(i, 1);
        audio.powerup();
        if (pu.kind === 'weapon') {
          if (player.weaponLevel < 4) {
            player.weaponLevel++;
            addFloatingText(player.x, player.y - 28, `¡ARMA NIVEL ${player.weaponLevel}!`, '#2dd4bf');
          } else {
            state.score += 500;
            addFloatingText(player.x, player.y - 28, '+500 ARMA MÁX', '#2dd4bf');
          }
        } else if (pu.kind === 'shield') {
          player.shield = true;
          addFloatingText(player.x, player.y - 28, '¡ESCUDO ENERGÉTICO!', '#93c5fd');
        } else if (pu.kind === 'skill') {
          if (state.skillCharges < 2) {
            state.skillCharges++;
            addFloatingText(player.x, player.y - 28, '+1 CARGA TÁCTICA [E]', '#38bdf8');
          } else {
            state.score += 400;
            addFloatingText(player.x, player.y - 28, '+400 CARGA LLENA', '#38bdf8');
          }
        } else if (pu.kind === 'drone') {
          player.droneTimer = Math.min(24, player.droneTimer + 18);
          addFloatingText(player.x, player.y - 28, '¡DRON ESCOLTA 18s!', '#facc15');
        } else if (pu.kind === 'missiles') {
          launchHomingMissiles(4);
          addFloatingText(player.x, player.y - 28, '¡SALVA DE 4 MISILES!', '#fb923c');
        } else if (pu.kind === 'repair') {
          if (state.lives < 4) {
            state.lives++;
            addFloatingText(player.x, player.y - 28, '+1 REPARACIÓN CASCO', '#4ade80');
          } else {
            state.score += 600;
            addFloatingText(player.x, player.y - 28, '+600 CASCO AL 100%', '#4ade80');
          }
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
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.life -= dt;
      sw.r = sw.maxR * (1 - sw.life / sw.maxLife);
      if (sw.life <= 0) shockwaves.splice(i, 1);
    }
    for (let i = afterimages.length - 1; i >= 0; i--) {
      afterimages[i].life -= dt;
      if (afterimages[i].life <= 0) afterimages.splice(i, 1);
    }
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 36 * dt;
      ft.life -= dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // Next Wave
    if (!boss && enemies.length === 0) {
      state.waveClearDelay += dt;
      if (state.waveClearDelay >= 1.5) {
        state.waveClearDelay = 0;
        state.wave++;
        updateHud();
        spawnWave(state.wave);
      }
    }
  }

  // =========================================================================
  // 9. RENDERING
  // =========================================================================
  function drawBackground() {
    const s = SECTORS[state.sectorIndex % SECTORS.length];
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, s.sky[0]);
    grad.addColorStop(0.55, s.sky[1]);
    grad.addColorStop(1, s.sky[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = s.horizon;
    ctx.fillRect(0, Math.floor(H * 0.25), W, 2);

    for (const nb of bgNebulae) {
      ctx.save();
      ctx.globalAlpha = nb.alpha;
      ctx.drawImage(nb.img, Math.round(nb.x - nb.img.width / 2), Math.round(nb.y - nb.img.height / 2));
      ctx.restore();
    }

    for (const cel of bgCelestials) {
      const sc = 1 + Math.sin(cel.pulse) * 0.025;
      ctx.save();
      ctx.translate(Math.round(cel.x), Math.round(cel.y));
      ctx.scale(sc, sc);
      ctx.drawImage(cel.img, -cel.img.width / 2, -cel.img.height / 2);
      ctx.restore();
    }

    for (const st of stars) {
      const x = Math.round(st.x);
      const y = Math.round(st.y);
      ctx.save();
      ctx.globalAlpha = 0.48 + 0.52 * Math.sin(st.phase);
      ctx.fillStyle = st.color;
      if (st.cross) {
        ctx.fillRect(x - 4, y - 1, 9, 3);
        ctx.fillRect(x - 1, y - 4, 3, 9);
      } else {
        ctx.fillRect(x, y, st.size, st.size);
      }
      ctx.restore();
    }

    for (const p of bgPlanets) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.drawImage(p.img, Math.round(p.x - p.img.width / 2), Math.round(p.y - p.img.height / 2));
      ctx.restore();
    }

    for (const st of bgStations) {
      const sx = Math.round(st.x);
      const sy = Math.round(st.y + Math.sin(st.bob) * 6);
      ctx.save();
      ctx.globalAlpha = st.alpha;
      ctx.drawImage(st.img, sx - Math.floor(st.img.width / 2), sy - Math.floor(st.img.height / 2));
      ctx.restore();
    }

    for (const rb of bgRobots) {
      const rx = Math.round(rb.x);
      const ry = Math.round(rb.y + Math.sin(rb.bob) * 8);
      ctx.save();
      ctx.globalAlpha = rb.alpha;
      ctx.drawImage(rb.img, rx - Math.floor(rb.img.width / 2), ry - Math.floor(rb.img.height / 2));
      ctx.restore();
    }
  }

  function drawPlayer() {
    if (state.mode === 'gameover') return;
    const shipCfg = A.SHIPS[state.selectedShipId] || A.SHIPS.falcon;

    // Phase-shift afterimages
    for (const ai of afterimages) {
      ctx.save();
      ctx.globalAlpha = (ai.life / ai.maxLife) * 0.45;
      ctx.drawImage(shipCfg.sprite, Math.round(ai.x - shipCfg.sprite.width / 2), Math.round(ai.y - shipCfg.sprite.height / 2));
      ctx.restore();
    }

    if (player.invulnTimer > 0 && player.aegisTimer <= 0 && Math.floor(state.time * 16) % 2 === 0) return;

    const px = Math.round(player.x);
    const py = Math.round(player.y);

    // Thrusters
    const fl = Math.floor(state.time * 24) % 3;
    ctx.fillStyle = shipCfg.accent;
    ctx.fillRect(px - 10, py + 17, 5, 10 + fl * 3);
    ctx.fillRect(px + 5, py + 17, 5, 10 + ((fl + 1) % 3) * 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 9, py + 17, 3, 5 + fl * 2);
    ctx.fillRect(px + 6, py + 17, 3, 5 + fl * 2);

    ctx.drawImage(shipCfg.sprite, px - Math.floor(shipCfg.sprite.width / 2), py - Math.floor(shipCfg.sprite.height / 2));

    if (player.droneTimer > 0) {
      const dx = Math.round(px + Math.cos(player.droneAngle) * 44);
      const dy = Math.round(py + Math.sin(player.droneAngle) * 18);
      ctx.drawImage(A.SPRITES.drone, dx - Math.floor(A.SPRITES.drone.width / 2), dy - Math.floor(A.SPRITES.drone.height / 2));
    }

    if (player.shield || player.aegisTimer > 0) {
      ctx.save();
      ctx.strokeStyle = player.aegisTimer > 0 ? '#34d399' : 'rgba(96, 165, 250, 0.88)';
      ctx.lineWidth = player.aegisTimer > 0 ? 4 : 3;
      ctx.shadowColor = player.aegisTimer > 0 ? '#34d399' : '#60a5fa';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(px, py, 32 + Math.sin(state.time * 8) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEnemiesAndBoss() {
    const f = Math.floor(state.time * 4.5) % 2;
    for (const e of enemies) {
      let spr = A.SPRITES.miniCarrier;
      if (e.type === 'waspScout') spr = f ? A.SPRITES.waspScout0 : A.SPRITES.waspScout1;
      else if (e.type === 'crabGuard') spr = f ? A.SPRITES.crabGuard0 : A.SPRITES.crabGuard1;
      else if (e.type === 'voidSquid') spr = f ? A.SPRITES.voidSquid0 : A.SPRITES.voidSquid1;
      else if (e.type === 'hexTurret') spr = f ? A.SPRITES.hexTurret0 : A.SPRITES.hexTurret1;
      else if (e.type === 'hornetBomber') spr = f ? A.SPRITES.hornetBomber0 : A.SPRITES.hornetBomber1;
      else if (e.type === 'wraithBlade') spr = f ? A.SPRITES.wraithBlade0 : A.SPRITES.wraithBlade1;

      ctx.save();
      if (e.diveWarn > 0) {
        // Clear amber warning ring before dive!
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(Math.round(e.x), Math.round(e.y), 24, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (e.hitFlash > 0) ctx.filter = 'brightness(2.2)';
      ctx.drawImage(spr, Math.round(e.x - spr.width / 2), Math.round(e.y - spr.height / 2));
      ctx.restore();
    }

    if (boss) {
      const spr = boss.kind === 'solaris' ? A.SPRITES.bossSolaris : (boss.kind === 'kraken' ? A.SPRITES.bossKraken : A.SPRITES.bossOmega);
      ctx.save();
      if (boss.hitFlash > 0) ctx.filter = 'brightness(2.2)';
      ctx.drawImage(spr, Math.round(boss.x - spr.width / 2), Math.round(boss.y - spr.height / 2));
      ctx.restore();
    }
  }

  function drawPowerupsAndEffects() {
    const cfg = {
      weapon:   { label: 'W', bg: '#0d9488', border: '#99f6e4' },
      shield:   { label: 'S', bg: '#2563eb', border: '#bfdbfe' },
      skill:    { label: 'E', bg: '#0284c7', border: '#bae6fd' },
      drone:    { label: 'D', bg: '#ca8a04', border: '#fef08a' },
      missiles: { label: 'M', bg: '#ea580c', border: '#fed7aa' },
      repair:   { label: 'R', bg: '#16a34a', border: '#bbf7d0' }
    };
    for (const pu of powerups) {
      const c = cfg[pu.kind];
      const px = Math.round(pu.x);
      const py = Math.round(pu.y + Math.sin(pu.phase) * 2.5);
      ctx.save();
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

    // Player Bullets
    for (const b of bullets) {
      const bx = Math.round(b.x);
      const by = Math.round(b.y);
      if (b.style === 'heavy') {
        ctx.fillStyle = '#a7f3d0';
        ctx.fillRect(bx - 3, by - 12, 6, 7);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(bx - 2, by - 5, 4, 9);
      } else if (b.style === 'neon') {
        ctx.fillStyle = '#fdf4ff';
        ctx.fillRect(bx - 2, by - 10, 4, 5);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(bx - 1, by - 5, 2, 8);
      } else {
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(bx - 2, by - 10, 4, 5);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(bx - 2, by - 5, 4, 7);
      }
    }

    // Homing Missiles
    for (const m of missiles) {
      ctx.save();
      ctx.translate(Math.round(m.x), Math.round(m.y));
      ctx.rotate(Math.atan2(m.vy, m.vx) + Math.PI / 2);
      ctx.drawImage(A.SPRITES.missile, -A.SPRITES.missile.width / 2, -A.SPRITES.missile.height / 2);
      ctx.restore();
    }

    // Enemy Bullets
    for (const eb of enemyBullets) {
      ctx.fillStyle = eb.color;
      ctx.fillRect(Math.round(eb.x - 4), Math.round(eb.y - 4), 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(eb.x - 2), Math.round(eb.y - 2), 4, 4);
    }

    // Shockwaves
    for (const sw of shockwaves) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sw.life / sw.maxLife);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(Math.round(sw.x), Math.round(sw.y), sw.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Particles
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      ctx.restore();
    }

    // Floating Texts
    for (const ft of floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, ft.life / ft.maxLife);
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
      ctx.restore();
    }

    // Wave Banner
    if (state.waveBannerTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.waveBannerTimer * 1.4);
      ctx.fillStyle = 'rgba(5, 11, 22, 0.84)';
      ctx.fillRect(W / 2 - 310, H / 2 - 52, 620, 88);
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 3;
      ctx.strokeRect(W / 2 - 310, H / 2 - 52, 620, 88);
      ctx.textAlign = 'center';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillStyle = '#facc15';
      ctx.fillText(state.waveBannerTitle, W / 2, H / 2 - 12);
      ctx.font = '9.5px "Press Start 2P", monospace';
      ctx.fillStyle = '#99f6e4';
      ctx.fillText(state.waveBannerSub, W / 2, H / 2 + 18);
      ctx.restore();
    }
  }

  function drawAttractDemo() {
    const f = Math.floor(state.time * 4) % 2;
    const shipCfg = A.SHIPS[state.selectedShipId] || A.SHIPS.falcon;
    const sx = W / 2 + Math.sin(state.time * 0.85) * 300;
    const sy = H - 72 + Math.cos(state.time * 1.5) * 10;
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.drawImage(f ? A.SPRITES.crabGuard0 : A.SPRITES.crabGuard1, 115, 92 + Math.sin(state.time * 2) * 12);
    ctx.drawImage(f ? A.SPRITES.voidSquid0 : A.SPRITES.voidSquid1, W - 160, 96 + Math.cos(state.time * 2) * 12);
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
      drawEnemiesAndBoss();
      drawPlayer();
      drawPowerupsAndEffects();
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
  // 10. INPUT & CONTROLS
  // =========================================================================
  function cycleSector() {
    state.manualSector = true;
    state.sectorIndex = (state.sectorIndex + 1) % SECTORS.length;
    populateSector(state.sectorIndex);
    if (state.mode === 'playing') {
      addFloatingText(W / 2, 92, `SECTOR: ${SECTORS[state.sectorIndex].name}`, '#99f6e4');
    }
  }

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
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
    } else if (e.code === 'KeyE' || e.code === 'KeyQ') {
      triggerTacticalSkill();
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') {
      triggerNovaBomb();
    } else if (e.code === 'KeyB') {
      cycleSector();
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
    if (e.button === 2) triggerTacticalSkill();
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
  btnSector.addEventListener('click', cycleSector);
  btnAutofire.addEventListener('click', toggleAutoFire);
  btnCrt.addEventListener('click', toggleCrt);
  btnSound.addEventListener('click', toggleSound);
  btnTouchSkill.addEventListener('click', triggerTacticalSkill);
  btnTouchBomb.addEventListener('click', triggerNovaBomb);
  btnGallery.addEventListener('click', () => overlayGallery.classList.remove('hidden'));
  btnCloseGallery.addEventListener('click', () => overlayGallery.classList.add('hidden'));

  // =========================================================================
  // 11. INIT & RESILIENT MAIN LOOP
  // =========================================================================
  initCosmos();
  renderShipHangar();
  renderAssetGallery();
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
      console.error('Error en Nebula Citadel Zero:', err);
    }
  }
  requestAnimationFrame(loop);
})();
