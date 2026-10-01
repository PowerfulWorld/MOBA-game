/**
 * High-performance Web Audio API Sound & Music Synthesizer
 * Provides crisp MOBA sound effects, dynamic battle BGM, and Announcer voice
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isMuted: boolean = false;
  private sfxVolume: number = 0.7;
  private musicVolume: number = 0.25;
  private bgmInterval: number | null = null;
  private isPlayingBgm: boolean = false;
  private currentStep: number = 0;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.isMuted ? 0 : this.sfxVolume;
      this.sfxGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.isMuted ? 0 : this.musicVolume;
      this.musicGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.sfxGain) {
      this.sfxGain.gain.value = mute ? 0 : this.sfxVolume;
    }
    if (this.musicGain) {
      this.musicGain.gain.value = mute ? 0 : this.musicVolume;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(sfx: number, music: number) {
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    this.musicVolume = Math.max(0, Math.min(1, music));
    if (!this.isMuted) {
      if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
      if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
    }
  }

  public startMusic() {
    this.initCtx();
    if (this.isPlayingBgm || !this.ctx || !this.musicGain) return;
    this.isPlayingBgm = true;

    // Procedural MOBA background groove (epic rhythm + bass arpeggio)
    const bpm = 122;
    const stepDuration = (60 / bpm) / 4; // 16th notes
    const bassline = [110, 110, 130.81, 110, 146.83, 110, 130.81, 164.81];

    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.isMuted) return;
      
      const now = this.ctx.currentTime;
      const step = this.currentStep % 16;
      this.currentStep++;

      // Bass drum on beats 0, 4, 8, 12
      if (step % 4 === 0) {
        this.playDrum(now, 110, 40, 0.15, 'sine');
      }

      // Snare / clap on beats 4, 12
      if (step === 4 || step === 12) {
        this.playSnare(now);
      }

      // Synth bass note
      if (step % 2 === 0) {
        const freq = bassline[(step / 2) % bassline.length];
        this.playBassNote(now, freq, 0.1);
      }

      // Hi-hat tick
      if (step % 2 === 1) {
        this.playHiHat(now);
      }
    }, stepDuration * 1000);
  }

  public stopMusic() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.isPlayingBgm = false;
  }

  private playDrum(time: number, startFreq: number, endFreq: number, dur: number, type: OscillatorType) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + dur);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + dur);
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.musicGain) return;
    // Noise buffer
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
  }

  private playHiHat(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
  }

  private playBassNote(time: number, freq: number, dur: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, time);
    filter.frequency.exponentialRampToValueAtTime(150, time + dur);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + dur);
  }

  // SOUND EFFECTS
  public playAttack(heroRole: string = 'fighter') {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (heroRole === 'marksman') {
      // Arrow thwip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.09);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    } else if (heroRole === 'mage') {
      // Spark whoosh
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.linearRampToValueAtTime(750, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    } else {
      // Blade slash / punch
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playSkill(skillNum: number) {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (skillNum === 1) {
      // Dash / Quick strike
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    } else if (skillNum === 2) {
      // AoE burst / Stomp
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    } else if (skillNum === 3) {
      // Buff / Shield chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(660, now + 0.08);
      osc.frequency.setValueAtTime(880, now + 0.16);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    } else {
      // ULTIMATE: Powerful sweeping chord
      this.playChord([220, 330, 440, 660], 0.6, 0.45);
      return;
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playTowerShoot() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playHit() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playLevelUp() {
    this.playChord([440, 554.37, 659.25, 880], 0.5, 0.35);
  }

  public playBuyItem() {
    this.playChord([523.25, 659.25, 783.99], 0.25, 0.3);
  }

  public playVictory() {
    this.playChord([392, 523.25, 659.25, 783.99, 1046.5], 1.5, 0.5);
    this.announce("Victory!");
  }

  public playDefeat() {
    this.playChord([349.23, 311.13, 261.63, 196.0], 1.5, 0.5);
    this.announce("Defeat!");
  }

  private playChord(frequencies: number[], duration: number, volume: number) {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    frequencies.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(volume / frequencies.length, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + i * 0.05);
      osc.stop(now + duration + 0.1);
    });
  }

  // Voice announcer
  public announce(text: string) {
    if (this.isMuted) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 0.95;
        utterance.volume = this.sfxVolume;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Fallback gracefully
      }
    }
  }
}

export const soundManager = new SoundManager();
