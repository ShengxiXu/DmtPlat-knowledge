import './MediaPlayer.css';

/**
 * MediaPlayer - 音乐/视频播放预览组件
 *
 * 两种模式：
 * 1. 真实媒体：result.videoUrl / result.audioUrl 存在时，使用原生 <video>/<audio> 播放
 * 2. 模拟播放：无真实媒体时，基于脚本/乐谱生成动态预览
 *    - 视频：按分镜时间轴切换画面描述 + 字幕 + 渐变背景动画
 *    - 音乐：Web Audio API 按曲风/节奏生成旋律 + 频谱可视化 + 歌词同步
 *
 * 用法：
 *   const player = new MediaPlayer(container, descriptor);
 *   player.init();
 *   player.destroy(); // 销毁释放资源
 */
export class MediaPlayer {
  constructor(container, descriptor) {
    if (!container || !descriptor) {
      throw new Error('MediaPlayer: container and descriptor are required');
    }
    this.container = container;
    this.descriptor = descriptor;
    this.type = descriptor.type || 'video'; // 'video' | 'music'
    this.color = descriptor.color || '0E9F6E';
    this.duration = Math.max(1, parseFloat(descriptor.duration) || 10);

    // 真实媒体 URL
    this.url = descriptor.url || '';

    // 模拟数据
    this.scenes = descriptor.scenes || [];
    this.sections = descriptor.sections || [];
    this.lyrics = descriptor.lyrics || '';
    this.tempo = descriptor.tempo || '100 BPM';
    this.genre = descriptor.genre || '流行';
    this.mood = descriptor.mood || '';

    // 状态
    this.isPlaying = false;
    this.currentTime = 0;
    this.rafId = null;
    this.lastTick = 0;

    // Web Audio
    this.audioCtx = null;
    this.masterGain = null;
    this.oscillators = [];
    this.analyser = null;
    this.spectrumData = null;

    // 真实媒体元素
    this.mediaEl = null;

    // DOM
    this.els = {};

    // 歌词行
    this.lyricLines = [];
    this.activeLyricIndex = -1;

    // 频谱 RAF
    this.spectrumRafId = null;

    // 事件处理器引用
    this._handlers = {};
  }

  init() {
    this.buildDOM();
    this.bindEvents();
    this.render();
    this.drawSpectrum(); // 静态频谱
  }

  // ===================== DOM 构建 =====================

  buildDOM() {
    const isReal = !!this.url;
    this.container.innerHTML = `
      <div class="wa-mp wa-mp-${this.type} ${isReal ? 'wa-mp-real' : 'wa-mp-sim'}">
        <div class="wa-mp-stage">
          ${
            isReal
              ? this.buildRealMediaHTML()
              : this.type === 'video'
                ? this.buildSimVideoHTML()
                : this.buildSimMusicHTML()
          }
        </div>
        <div class="wa-mp-controls">
          <button type="button" class="wa-mp-play-btn" title="播放/暂停">
            <i class="fa-solid fa-play wa-mp-icon-play"></i>
            <i class="fa-solid fa-pause wa-mp-icon-pause" style="display:none"></i>
          </button>
          <span class="wa-mp-time wa-mp-current">0:00</span>
          <div class="wa-mp-progress" title="点击/拖动跳转">
            <div class="wa-mp-progress-buffered" style="width:0%"></div>
            <div class="wa-mp-progress-played" style="width:0%"></div>
            <div class="wa-mp-progress-thumb" style="left:0%"></div>
          </div>
          <span class="wa-mp-time wa-mp-total">${this.formatTime(this.duration)}</span>
          <div class="wa-mp-volume">
            <button type="button" class="wa-mp-mute-btn" title="静音/取消静音">
              <i class="fa-solid fa-volume-high wa-mp-icon-vol"></i>
              <i class="fa-solid fa-volume-xmark wa-mp-icon-mute" style="display:none"></i>
            </button>
            <input type="range" class="wa-mp-volume-slider" min="0" max="1" step="0.05" value="0.8" />
          </div>
        </div>
        <div class="wa-mp-info"></div>
      </div>
    `;

    const root = this.container.querySelector('.wa-mp');
    this.els = {
      root,
      stage: root.querySelector('.wa-mp-stage'),
      playBtn: root.querySelector('.wa-mp-play-btn'),
      iconPlay: root.querySelector('.wa-mp-icon-play'),
      iconPause: root.querySelector('.wa-mp-icon-pause'),
      current: root.querySelector('.wa-mp-current'),
      total: root.querySelector('.wa-mp-total'),
      progress: root.querySelector('.wa-mp-progress'),
      played: root.querySelector('.wa-mp-progress-played'),
      buffered: root.querySelector('.wa-mp-progress-buffered'),
      thumb: root.querySelector('.wa-mp-progress-thumb'),
      volume: root.querySelector('.wa-mp-volume'),
      muteBtn: root.querySelector('.wa-mp-mute-btn'),
      iconVol: root.querySelector('.wa-mp-icon-vol'),
      iconMute: root.querySelector('.wa-mp-icon-mute'),
      volumeSlider: root.querySelector('.wa-mp-volume-slider'),
      info: root.querySelector('.wa-mp-info'),
    };

    // 真实媒体元素引用
    if (isReal) {
      this.mediaEl =
        this.type === 'video'
          ? root.querySelector('video')
          : root.querySelector('audio');
    }

    // 模拟场景容器
    this.els.simVideo = root.querySelector('.wa-mp-sim-video');
    this.els.simMusic = root.querySelector('.wa-mp-sim-music');
    this.els.canvas = root.querySelector('.wa-mp-canvas');
    this.els.lyrics = root.querySelector('.wa-mp-lyrics');
  }

  buildRealMediaHTML() {
    if (this.type === 'video') {
      return `<video class="wa-mp-video" src="${this.escapeAttr(this.url)}" preload="metadata" playsinline></video>`;
    }
    return `
      <div class="wa-mp-audio-cover" style="background:linear-gradient(135deg,#${this.color},#${this.color}88)">
        <i class="fa-solid fa-music"></i>
        <div class="wa-mp-audio-cover-pulse"></div>
      </div>
      <audio class="wa-mp-audio" src="${this.escapeAttr(this.url)}" preload="metadata"></audio>
    `;
  }

  buildSimVideoHTML() {
    return `
      <div class="wa-mp-sim-video">
        <div class="wa-mp-sim-bg" style="background:linear-gradient(135deg,#${this.color}33,#${this.color}11)"></div>
        <div class="wa-mp-sim-content"></div>
        <div class="wa-mp-sim-subtitle"></div>
        <div class="wa-mp-sim-badge"><i class="fa-solid fa-circle wa-mp-live-dot"></i> 模拟预览</div>
      </div>
    `;
  }

  buildSimMusicHTML() {
    return `
      <div class="wa-mp-sim-music">
        <div class="wa-mp-sim-bg" style="background:linear-gradient(135deg,#${this.color}22,#${this.color}08)"></div>
        <div class="wa-mp-sim-music-main">
          <div class="wa-mp-cover" style="background:linear-gradient(135deg,#${this.color},#${this.color}88)">
            <i class="fa-solid fa-music"></i>
            <div class="wa-mp-cover-vinyl"></div>
          </div>
          <div class="wa-mp-spectrum">
            <canvas class="wa-mp-canvas"></canvas>
          </div>
        </div>
        <div class="wa-mp-section-bar"></div>
        <div class="wa-mp-lyrics"></div>
        <div class="wa-mp-sim-badge"><i class="fa-solid fa-circle wa-mp-live-dot"></i> 模拟预览</div>
      </div>
    `;
  }

  // ===================== 事件绑定 =====================

  bindEvents() {
    this._handlers.play = () => this.togglePlay();
    this.els.playBtn.addEventListener('click', this._handlers.play);

    this._handlers.mute = () => this.toggleMute();
    this.els.muteBtn.addEventListener('click', this._handlers.mute);

    this._handlers.volume = (e) => this.setVolume(parseFloat(e.target.value));
    this.els.volumeSlider.addEventListener('input', this._handlers.volume);

    // 进度条拖拽
    this._handlers.progressDown = (e) => this.onProgressDown(e);
    this.els.progress.addEventListener(
      'mousedown',
      this._handlers.progressDown
    );
    this._handlers.progressMove = (e) => this.onProgressMove(e);
    this._handlers.progressUp = () => this.onProgressUp();
    document.addEventListener('mousemove', this._handlers.progressMove);
    document.addEventListener('mouseup', this._handlers.progressUp);

    this._isDraggingProgress = false;

    // 真实媒体事件
    if (this.mediaEl) {
      this._handlers.mediaTime = () => this.onMediaTimeUpdate();
      this.mediaEl.addEventListener('timeupdate', this._handlers.mediaTime);
      this._handlers.mediaLoaded = () => this.onMediaLoaded();
      this.mediaEl.addEventListener(
        'loadedmetadata',
        this._handlers.mediaLoaded
      );
      this._handlers.mediaEnd = () => this.onMediaEnded();
      this.mediaEl.addEventListener('ended', this._handlers.mediaEnd);
      this._handlers.mediaPlay = () => this.onMediaPlay();
      this.mediaEl.addEventListener('play', this._handlers.mediaPlay);
      this._handlers.mediaPause = () => this.onMediaPause();
      this.mediaEl.addEventListener('pause', this._handlers.mediaPause);
    }
  }

  // ===================== 播放控制 =====================

  togglePlay() {
    if (this.url) {
      if (this.mediaEl.paused) this.mediaEl.play();
      else this.mediaEl.pause();
    } else {
      if (this.isPlaying) this.pauseSim();
      else this.playSim();
    }
  }

  playSim() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.updatePlayIcon();
    this.lastTick = performance.now();

    if (this.type === 'music') {
      this.startAudio();
    }
    this.tickSim();
  }

  pauseSim() {
    this.isPlaying = false;
    this.updatePlayIcon();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.type === 'music') {
      this.stopAudio();
    }
  }

  tickSim() {
    if (!this.isPlaying) return;
    const now = performance.now();
    const dt = (now - this.lastTick) / 1000;
    this.lastTick = now;
    this.currentTime += dt;

    if (this.currentTime >= this.duration) {
      this.currentTime = this.duration;
      this.pauseSim();
      this.currentTime = 0;
      this.render();
      return;
    }
    this.render();
    this.rafId = requestAnimationFrame(() => this.tickSim());
  }

  // ===================== 真实媒体事件 =====================

  onMediaLoaded() {
    if (this.mediaEl.duration && isFinite(this.mediaEl.duration)) {
      this.duration = this.mediaEl.duration;
      this.els.total.textContent = this.formatTime(this.duration);
    }
    this.setVolume(parseFloat(this.els.volumeSlider.value));
  }

  onMediaTimeUpdate() {
    this.currentTime = this.mediaEl.currentTime;
    this.updateProgress();
    this.updateTime();
  }

  onMediaEnded() {
    this.isPlaying = false;
    this.updatePlayIcon();
    this.currentTime = 0;
    this.updateProgress();
    this.updateTime();
  }

  onMediaPlay() {
    this.isPlaying = true;
    this.updatePlayIcon();
  }

  onMediaPause() {
    this.isPlaying = false;
    this.updatePlayIcon();
  }

  // ===================== 进度条交互 =====================

  onProgressDown(e) {
    this._isDraggingProgress = true;
    this.seekFromEvent(e);
  }

  onProgressMove(e) {
    if (!this._isDraggingProgress) return;
    this.seekFromEvent(e);
  }

  onProgressUp() {
    this._isDraggingProgress = false;
  }

  seekFromEvent(e) {
    const rect = this.els.progress.getBoundingClientRect();
    let ratio = (e.clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    const t = ratio * this.duration;
    this.seek(t);
  }

  seek(t) {
    this.currentTime = Math.max(0, Math.min(this.duration, t));
    if (this.url && this.mediaEl) {
      this.mediaEl.currentTime = this.currentTime;
    }
    this.render();
  }

  // ===================== 音量 =====================

  setVolume(v) {
    this.volume = v;
    if (this.mediaEl) this.mediaEl.volume = v;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(v, this.audioCtx.currentTime, 0.05);
    }
    this.els.volumeSlider.value = v;
    this.updateMuteIcon();
  }

  toggleMute() {
    if (this.volume > 0) {
      this._lastVolume = this.volume;
      this.setVolume(0);
    } else {
      this.setVolume(this._lastVolume || 0.8);
    }
  }

  updateMuteIcon() {
    const muted = (this.volume || 0) === 0;
    this.els.iconVol.style.display = muted ? 'none' : '';
    this.els.iconMute.style.display = muted ? '' : 'none';
  }

  // ===================== Web Audio 音乐合成 =====================

  ensureAudio() {
    if (this.audioCtx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.audioCtx = new AC();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = this.volume != null ? this.volume : 0.8;
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 128;
    this.spectrumData = new Uint8Array(this.analyser.frequencyBinCount);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
  }

  startAudio() {
    this.ensureAudio();
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    this.stopAudio();
    this.oscillators = [];

    const bpm = this.extractBPM();
    const beat = 60 / bpm;
    const scale = this.getScaleForGenre();
    const waves = this.getWaveForGenre();

    // 为整段时长调度音符
    let t = this.audioCtx.currentTime;
    const startOffset = this.currentTime;
    let beatIdx = 0;

    while (t < this.audioCtx.currentTime + (this.duration - startOffset)) {
      const sectionIdx = this.getSectionIndexAtTime(beatIdx * beat);
      const noteIdx = beatIdx % scale.length;
      const freq = this.noteToFreq(scale[noteIdx], 4); // 第 4 八度
      // 段落间略微变化音高
      const octaveShift = sectionIdx % 2 === 0 ? 0 : 12;
      const finalFreq = freq * Math.pow(2, octaveShift / 12);

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = waves[sectionIdx % waves.length];
      osc.frequency.value = finalFreq;

      // ADSR 包络（简化）
      const noteDur = beat * 0.9;
      const attack = 0.02;
      const decay = 0.1;
      const sustainLevel = 0.25;
      const release = 0.15;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + attack);
      gain.gain.linearRampToValueAtTime(sustainLevel, t + attack + decay);
      gain.gain.setValueAtTime(sustainLevel, t + noteDur - release);
      gain.gain.linearRampToValueAtTime(0, t + noteDur);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + noteDur);
      this.oscillators.push(osc);

      t += beat;
      beatIdx++;
      if (beatIdx * beat > this.duration) break;
    }

    // 启动频谱绘制
    this.drawSpectrum();
  }

  stopAudio() {
    this.oscillators.forEach((o) => {
      try {
        o.stop();
      } catch {
        // 已停止
      }
    });
    this.oscillators = [];
    if (this.spectrumRafId) {
      cancelAnimationFrame(this.spectrumRafId);
      this.spectrumRafId = null;
    }
  }

  extractBPM() {
    const m = String(this.tempo).match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 100;
  }

  getScaleForGenre() {
    // 音名 -> 半步偏移（相对于 C）
    const scales = {
      流行: [0, 2, 4, 5, 7, 9, 11], // C 大调
      轻音乐: [0, 2, 4, 5, 7, 9, 11],
      古典: [0, 2, 3, 5, 7, 8, 10], // C 小调
      电子: [0, 2, 4, 7, 9], // 五声音阶
      民谣: [0, 2, 4, 5, 7, 9, 11],
    };
    return scales[this.genre] || scales['流行'];
  }

  getWaveForGenre() {
    const waves = {
      流行: ['triangle', 'sine', 'triangle'],
      轻音乐: ['sine', 'triangle', 'sine'],
      古典: ['sine', 'sine', 'triangle'],
      电子: ['sawtooth', 'square', 'sawtooth'],
      民谣: ['triangle', 'sine', 'triangle'],
    };
    return waves[this.genre] || waves['流行'];
  }

  noteToFreq(semitoneFromC, octave) {
    // C4 = 261.63 Hz；A4 = 440
    const c4 = 261.63;
    const fromC4 = (octave - 4) * 12 + semitoneFromC;
    return c4 * Math.pow(2, fromC4 / 12);
  }

  getSectionIndexAtTime(t) {
    if (!this.sections || this.sections.length === 0) return 0;
    const segLen = this.duration / this.sections.length;
    return Math.min(this.sections.length - 1, Math.floor(t / segLen));
  }

  // ===================== 频谱可视化 =====================

  drawSpectrum() {
    if (!this.els.canvas) return;
    const canvas = this.els.canvas;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);
    const barCount = 32;
    const gap = 2;
    const barW = (w - gap * (barCount - 1)) / barCount;

    for (let i = 0; i < barCount; i++) {
      let value;
      if (this.analyser && this.isPlaying && this.type === 'music') {
        this.analyser.getByteFrequencyData(this.spectrumData);
        const idx = Math.floor((i / barCount) * this.spectrumData.length);
        value = this.spectrumData[idx] / 255;
      } else {
        // 静态/模拟波形
        value = this.isPlaying
          ? 0.2 +
            0.3 * Math.abs(Math.sin(Date.now() / 300 + i * 0.5)) +
            0.1 * Math.random()
          : 0.08;
      }
      const barH = Math.max(2, value * h * 0.9);
      const x = i * (barW + gap);
      const y = (h - barH) / 2;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, `#${this.color}`);
      grad.addColorStop(1, `#${this.color}44`);
      ctx.fillStyle = grad;
      const r = Math.min(barW / 2, 3);
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, r);
        ctx.fill();
      } else {
        // 兼容旧浏览器：圆角矩形 fallback
        ctx.fillRect(x, y, barW, barH);
      }
    }

    if (this.isPlaying || (this.analyser && this.type === 'music')) {
      this.spectrumRafId = requestAnimationFrame(() => this.drawSpectrum());
    } else if (!this.isPlaying) {
      // 静态一次
    }
  }

  // ===================== 渲染 =====================

  render() {
    this.updateProgress();
    this.updateTime();
    if (!this.url) {
      if (this.type === 'video') this.renderSimVideo();
      else this.renderSimMusic();
    }
    if (this.isPlaying && this.type === 'music' && !this.spectrumRafId) {
      this.drawSpectrum();
    }
  }

  updateProgress() {
    const ratio = this.duration > 0 ? this.currentTime / this.duration : 0;
    const pct = ratio * 100;
    this.els.played.style.width = `${pct}%`;
    this.els.thumb.style.left = `${pct}%`;
    if (this.url && this.mediaEl) {
      const buffered = this.mediaEl.buffered;
      if (buffered.length > 0) {
        const end = buffered.end(buffered.length - 1);
        this.els.buffered.style.width = `${Math.min(100, (end / this.duration) * 100)}%`;
      }
    }
  }

  updateTime() {
    this.els.current.textContent = this.formatTime(this.currentTime);
  }

  updatePlayIcon() {
    this.els.iconPlay.style.display = this.isPlaying ? 'none' : '';
    this.els.iconPause.style.display = this.isPlaying ? '' : 'none';
  }

  renderSimVideo() {
    if (!this.els.simVideo) return;
    const content = this.els.simVideo.querySelector('.wa-mp-sim-content');
    const subtitle = this.els.simVideo.querySelector('.wa-mp-sim-subtitle');
    const sceneIdx = this.getSceneIndexAtTime(this.currentTime);
    const scene = this.scenes[sceneIdx];

    if (scene && content) {
      const expected = `scene-${sceneIdx}`;
      if (content.dataset.idx !== expected) {
        content.dataset.idx = expected;
        content.innerHTML = `
          <div class="wa-mp-sim-shot">${this.escapeHtml(scene.shot || `镜头 ${sceneIdx + 1}`)}</div>
          <div class="wa-mp-sim-desc">${this.escapeHtml(scene.desc || '')}</div>
          <div class="wa-mp-sim-time">${this.escapeHtml(scene.time || '')}</div>
        `;
        content.classList.remove('wa-mp-fade-in');
        // 触发重排以重启动画
        void content.offsetWidth;
        content.classList.add('wa-mp-fade-in');
      }
      if (subtitle) {
        subtitle.textContent = scene.audio || '';
      }
    }
    this.renderInfoBar();
  }

  renderSimMusic() {
    if (!this.els.simMusic) return;
    const sectionIdx = this.getSectionIndexAtTime(this.currentTime);

    // 段落高亮
    const bar = this.els.simMusic.querySelector('.wa-mp-section-bar');
    if (bar) {
      const expected = `section-${sectionIdx}`;
      if (bar.dataset.idx !== expected) {
        bar.dataset.idx = expected;
        bar.innerHTML = (this.sections || [])
          .map(
            (s, i) =>
              `<span class="wa-mp-section-chip ${i === sectionIdx ? 'active' : ''}" data-i="${i}">${this.escapeHtml(s.label || `段落 ${i + 1}`)}</span>`
          )
          .join('');
      } else {
        bar.querySelectorAll('.wa-mp-section-chip').forEach((el, i) => {
          el.classList.toggle('active', i === sectionIdx);
        });
      }
    }

    // 歌词高亮
    this.renderLyrics(sectionIdx);
    this.renderInfoBar();

    // 唱片旋转
    const vinyl = this.els.simMusic.querySelector('.wa-mp-cover-vinyl');
    if (vinyl) {
      vinyl.style.animationPlayState = this.isPlaying ? 'running' : 'paused';
    }
  }

  renderLyrics(currentSectionIdx) {
    if (!this.els.lyrics) return;
    if (this.lyricLines.length === 0) {
      this.parseLyrics();
    }
    const expected = `lyric-${currentSectionIdx}`;
    if (this.els.lyrics.dataset.idx === expected) return;
    this.els.lyrics.dataset.idx = expected;

    // 按段落均分歌词行
    const linesPerSection = Math.ceil(
      this.lyricLines.length / Math.max(1, this.sections.length)
    );
    const startLine = currentSectionIdx * linesPerSection;
    const endLine = Math.min(
      this.lyricLines.length,
      startLine + linesPerSection
    );
    const visible = this.lyricLines.slice(startLine, endLine);

    this.els.lyrics.innerHTML =
      visible.length > 0
        ? visible
            .map(
              (line, i) =>
                `<div class="wa-mp-lyric-line ${i === 0 ? 'active' : ''}">${this.escapeHtml(line)}</div>`
            )
            .join('')
        : `<div class="wa-mp-lyric-empty">（暂无歌词）</div>`;
  }

  parseLyrics() {
    this.lyricLines = String(this.lyrics || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('（') && !l.startsWith('('));
    if (this.lyricLines.length === 0 && this.lyrics) {
      this.lyricLines = [this.lyrics];
    }
  }

  renderInfoBar() {
    if (!this.els.info) return;
    let html = '';
    if (this.type === 'video') {
      const idx = this.getSceneIndexAtTime(this.currentTime);
      const scene = this.scenes[idx];
      html = `
        <span class="wa-mp-info-item"><i class="fa-solid fa-film"></i> 分镜 ${idx + 1}/${this.scenes.length}</span>
        ${scene?.shot ? `<span class="wa-mp-info-item">${this.escapeHtml(scene.shot)}</span>` : ''}
      `;
    } else {
      const idx = this.getSectionIndexAtTime(this.currentTime);
      const section = this.sections[idx];
      html = `
        <span class="wa-mp-info-item"><i class="fa-solid fa-music"></i> ${idx + 1}/${this.sections.length} 段</span>
        ${section?.label ? `<span class="wa-mp-info-item">${this.escapeHtml(section.label)}</span>` : ''}
        ${this.tempo ? `<span class="wa-mp-info-item"><i class="fa-solid fa-gauge-high"></i> ${this.escapeHtml(this.tempo)}</span>` : ''}
      `;
    }
    this.els.info.innerHTML = html;
  }

  getSceneIndexAtTime(t) {
    if (!this.scenes || this.scenes.length === 0) return 0;
    const segLen = this.duration / this.scenes.length;
    return Math.min(this.scenes.length - 1, Math.floor(t / segLen));
  }

  // ===================== 工具方法 =====================

  formatTime(s) {
    if (!s || !isFinite(s)) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  escapeAttr(s) {
    return this.escapeHtml(s);
  }

  // ===================== 销毁 =====================

  destroy() {
    this.pauseSim();
    if (this.spectrumRafId) {
      cancelAnimationFrame(this.spectrumRafId);
      this.spectrumRafId = null;
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.mediaEl) {
      this.mediaEl.pause();
      this.mediaEl.src = '';
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {
        // ignore
      }
      this.audioCtx = null;
    }
    document.removeEventListener('mousemove', this._handlers.progressMove);
    document.removeEventListener('mouseup', this._handlers.progressUp);
    this.container.innerHTML = '';
    this.els = {};
  }
}
