type EngineNodes = {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
};

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private engine: EngineNodes | null = null;
  private engineWanted = false;
  private mutedFlag = false;
  private unlockBound = false;

  setupGestureUnlock(): void {
    if (this.unlockBound) return;
    this.unlockBound = true;
    const unlock = () => {
      const ctx = this.ensure();
      if (ctx && ctx.state === 'suspended') void ctx.resume();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  get muted(): boolean {
    return this.mutedFlag;
  }

  toggleMute(): boolean {
    this.setMuted(!this.mutedFlag);
    return this.mutedFlag;
  }

  setMuted(muted: boolean): void {
    this.mutedFlag = muted;
    if (muted) {
      this.stopEngine();
    } else if (this.engineWanted) {
      this.startEngine();
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.mutedFlag ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise(this.ctx);
      return this.ctx;
    } catch {
      return null;
    }
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 1);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  startEngine(): void {
    this.engineWanted = true;
    if (this.mutedFlag) return;
    const ctx = this.ensure();
    if (!ctx || !this.master || this.engine) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.value = 58;
    osc2.frequency.value = 61;
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    gain.gain.value = 0.0;
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc1.start();
    osc2.start();
    gain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.15);
    this.engine = { osc1, osc2, filter, gain };
  }

  stopEngine(): void {
    this.engineWanted = false;
    const ctx = this.ctx;
    const nodes = this.engine;
    if (!ctx || !nodes) return;
    this.engine = null;
    try {
      nodes.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      nodes.osc1.stop(ctx.currentTime + 0.3);
      nodes.osc2.stop(ctx.currentTime + 0.3);
    } catch {
      /* already stopped */
    }
  }

  setEngineLoad(load: number): void {
    if (!this.engine || !this.ctx) return;
    const base = 58 + load * 26;
    this.engine.osc1.frequency.setTargetAtTime(base, this.ctx.currentTime, 0.08);
    this.engine.osc2.frequency.setTargetAtTime(base + 3, this.ctx.currentTime, 0.08);
    this.engine.filter.frequency.setTargetAtTime(380 + load * 500, this.ctx.currentTime, 0.1);
    this.engine.gain.gain.setTargetAtTime(0.04 + load * 0.035, this.ctx.currentTime, 0.1);
  }

  private blip(freqStart: number, freqEnd: number, dur: number, type: OscillatorType, vol: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.mutedFlag) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  fire(): void {
    this.blip(900, 220, 0.09, 'square', 0.09);
  }

  bomb(): void {
    this.blip(320, 120, 0.12, 'triangle', 0.07);
  }

  explosion(big = false): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noise || this.mutedFlag) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const dur = big ? 0.6 : 0.32;
    filter.frequency.setValueAtTime(big ? 1400 : 1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(big ? 0.5 : 0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    src.stop(ctx.currentTime + dur + 0.05);
  }

  board(): void {
    this.blip(520, 1040, 0.07, 'sine', 0.08);
  }

  rescue(): void {
    this.blip(660, 660, 0.09, 'sine', 0.09);
    window.setTimeout(() => this.blip(990, 990, 0.12, 'sine', 0.09), 90);
  }

  warn(): void {
    this.blip(440, 440, 0.12, 'square', 0.08);
    window.setTimeout(() => this.blip(660, 660, 0.14, 'square', 0.08), 130);
  }

  boomWarn(): void {
    this.blip(180, 90, 0.3, 'sawtooth', 0.08);
  }
}

export const audio = new AudioManager();
