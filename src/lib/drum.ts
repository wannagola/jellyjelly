/**
 * 코끼리 배를 칠 때 나는 소리.
 *
 * 북은 사인파 하나로는 안 된다. 북면은 현과 달리 배음이 정수배로 놓이지 않아서,
 * 1 : 1.59 : 2.14 처럼 어긋난 자리에 울림이 생긴다. 그 어긋남이 '통' 소리를 만든다.
 * 정수배로 쌓으면 북이 아니라 관악기가 된다.
 */

let ctx: AudioContext | undefined;
let noise: AudioBuffer | undefined;

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

function audio(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const Ctor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
  if (!Ctor) return undefined;
  try {
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return undefined;
  }
}

function noiseBuffer(ac: BaseAudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ac.sampleRate) return noise;
  const length = Math.floor(ac.sampleRate * 0.4);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noise = buffer;
  return buffer;
}

/**
 * 5음 음계. 아무 음이나 내면 소음이 되는데, 이 다섯 음 안에서만 고르면
 * 어디를 어떤 순서로 쳐도 음악처럼 들린다. 생각 없이 계속 두드리게 만드는 장치다.
 */
const PENTATONIC = [0, 2, 4, 7, 9];
/** 배 한복판의 기준 음 (C3) */
const ROOT = 130.81;

/**
 * 친 자리에서 음높이를 정한다.
 * 실제 북도 한복판은 낮고 둥글게, 가장자리는 팽팽해서 높게 운다.
 */
export function pitchAt(reach: number): number {
  const steps = Math.round(Math.min(1, Math.max(0, reach)) * 9);
  const octave = Math.floor(steps / PENTATONIC.length);
  const semitone = PENTATONIC[steps % PENTATONIC.length] + octave * 12;
  return ROOT * 2 ** (semitone / 12);
}

/** 북면의 울림 자리. 정수배가 아니라는 게 핵심이다. */
const MODES = [
  { ratio: 1, gain: 1, decay: 1 },
  { ratio: 1.59, gain: 0.42, decay: 0.55 },
  { ratio: 2.14, gain: 0.22, decay: 0.34 },
  { ratio: 2.92, gain: 0.1, decay: 0.2 },
];

export function renderHit(
  ac: BaseAudioContext,
  destination: AudioNode,
  freq: number,
  strength: number,
  at = 0,
) {
  const out = ac.createGain();
  out.gain.value = 0.85;
  out.connect(destination);

  // 낮은 음일수록 길게 운다
  const body = (0.9 - Math.min(0.5, freq / 900)) * (0.6 + strength * 0.6);

  for (const mode of MODES) {
    const osc = ac.createOscillator();
    osc.type = "sine";
    const f = freq * mode.ratio;
    // 치는 순간 살짝 높았다가 제자리로 내려온다. 이게 '통' 하는 맛이다.
    osc.frequency.setValueAtTime(f * (1 + 0.3 * strength), at);
    osc.frequency.exponentialRampToValueAtTime(f, at + 0.045);

    const env = ac.createGain();
    const peak = 0.16 * mode.gain * (0.45 + strength * 0.75);
    const decay = body * mode.decay;
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(peak, at + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, at + decay);

    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }

  // 손바닥이 닿는 기척
  const tick = ac.createBufferSource();
  tick.buffer = noiseBuffer(ac);
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 900 + freq * 1.4;
  band.Q.value = 0.9;
  const tickEnv = ac.createGain();
  tickEnv.gain.setValueAtTime(0.055 * (0.4 + strength), at);
  tickEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.035);
  tick.connect(band).connect(tickEnv).connect(out);
  tick.start(at);
  tick.stop(at + 0.08);
}

export function playHit(reach: number, strength: number): void {
  const ac = audio();
  if (!ac) return;
  renderHit(ac, ac.destination, pitchAt(reach), Math.min(1, Math.max(0, strength)), ac.currentTime);
}

/** 가끔 코끼리가 기분 좋아서 내는 소리 */
export function playTrumpet(): void {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime;

  const out = ac.createGain();
  out.gain.value = 0.5;
  out.connect(ac.destination);

  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(240, at);
  osc.frequency.exponentialRampToValueAtTime(430, at + 0.12);
  osc.frequency.setValueAtTime(430, at + 0.3);
  osc.frequency.exponentialRampToValueAtTime(300, at + 0.55);

  // 좁은 대역만 통과시키면 관을 통과한 소리가 된다
  const horn = ac.createBiquadFilter();
  horn.type = "bandpass";
  horn.frequency.value = 780;
  horn.Q.value = 3.2;

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(0.14, at + 0.05);
  env.gain.setValueAtTime(0.14, at + 0.32);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);

  osc.connect(horn).connect(env).connect(out);
  osc.start(at);
  osc.stop(at + 0.7);
}
