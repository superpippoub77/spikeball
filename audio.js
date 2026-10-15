// ============================================================
//  Effetti sonori sintetizzati (WebAudio) — nessun file audio
// ============================================================
const SFX = {
  ctx: null, master: null, muted: false,
  init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  ok() { return this.ctx && !this.muted; },
  tone(freq, dur, type = 'square', vol = 0.15, slide = 0, delay = 0) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq = 1000, q = 1, attack = 0.005) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  bump() { this.noise(0.07, 0.35, 900, 1.5); this.tone(160, 0.08, 'triangle', 0.25, -60); },
  set() { this.noise(0.05, 0.25, 1600, 2); this.tone(260, 0.05, 'triangle', 0.18); },
  spike() { this.noise(0.12, 0.6, 2200, 0.8); this.tone(120, 0.12, 'sawtooth', 0.25, -70); },
  block() { this.noise(0.1, 0.5, 700, 1); this.tone(90, 0.15, 'square', 0.2, -40); },
  floor() { this.noise(0.08, 0.4, 500, 1); this.tone(70, 0.1, 'sine', 0.3, -30); },
  whistle() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = 2650; lfo.frequency.value = 38; lg.gain.value = 140;
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.18, t + 0.02);
    g.gain.setValueAtTime(0.18, t + 0.45); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    o.connect(g); g.connect(this.master); o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
  },
  cheer(big) { this.noise(big ? 2.0 : 1.2, big ? 0.22 : 0.12, 1100, 0.4, 0.25); },
  coin() { this.tone(988, 0.07, 'square', 0.12); this.tone(1319, 0.2, 'square', 0.12, 0, 0.07); },
  jingle() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'square', 0.1, 0, i * 0.12)); },
  sad() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.15, 0, i * 0.2)); },
  blip() { this.tone(880, 0.06, 'square', 0.1); },
  select() { this.tone(660, 0.06, 'square', 0.1); this.tone(990, 0.08, 'square', 0.1, 0, 0.06); }
};
