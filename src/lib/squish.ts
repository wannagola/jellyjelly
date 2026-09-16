/**
 * 왁뿌볼 소리.
 *
 * 왁스가 깨지는 '뽀각'과 말랑이를 주무르는 '뿌직'은 정반대다.
 * 깨짐은 짧고 밝고 날카롭다. 주무름은 길고 낮고 뭉근하다.
 * 그래서 만드는 방식도 다르다 - 깨짐은 한 방 터뜨리고,
 * 주무름은 계속 울리는 소리를 손가락 속도에 맞춰 열고 닫는다.
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
  const length = Math.floor(ac.sampleRate * 2);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noise = buffer;
  return buffer;
}

/**
 * 왁스 깨지는 소리. 한 번에 여러 조각이 떨어질수록 두툼해진다.
 * 잘게 쪼갠 딱 소리를 몇 밀리초 간격으로 겹쳐야 '뽀각' 하고 갈라지는 느낌이 난다.
 */
export function renderCrack(ac: BaseAudioContext, destination: AudioNode, shards: number, at = 0) {
  const out = ac.createGain();
  out.gain.value = 0.9;
  out.connect(destination);

  const ticks = Math.min(6, 2 + Math.round(shards / 2));
  for (let i = 0; i < ticks; i += 1) {
    const t = at + i * (0.006 + Math.random() * 0.014);

    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac);
    src.playbackRate.value = 0.9 + Math.random() * 0.6;

    // 높고 좁은 대역이 '딱' 소리의 정체다
    const crack = ac.createBiquadFilter();
    crack.type = "bandpass";
    crack.frequency.value = 1900 + Math.random() * 2600;
    crack.Q.value = 2.4 + Math.random() * 3;

    const env = ac.createGain();
    const peak = (0.1 + Math.random() * 0.12) * (i === 0 ? 1.4 : 0.8);
    const decay = 0.012 + Math.random() * 0.03;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + 0.0016);
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    src.connect(crack).connect(env).connect(out);
    src.start(t);
    src.stop(t + decay + 0.03);
  }

  // 껍질이 통째로 울리는 낮은 기척
  const thud = ac.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(230, at);
  thud.frequency.exponentialRampToValueAtTime(90, at + 0.09);
  const thudEnv = ac.createGain();
  thudEnv.gain.setValueAtTime(0.0001, at);
  thudEnv.gain.exponentialRampToValueAtTime(0.07, at + 0.005);
  thudEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
  thud.connect(thudEnv).connect(out);
  thud.start(at);
  thud.stop(at + 0.18);
}

export function playCrack(shards: number): void {
  const ac = audio();
  if (!ac) return;
  renderCrack(ac, ac.destination, shards, ac.currentTime);
}

/**
 * 말랑이를 주무르는 소리.
 *
 * 처음엔 걸러낸 잡음을 계속 틀어놨더니 그냥 바람 소리였다.
 * 끈적한 소리는 이어지는 소리가 아니라 붙었다 떨어지기를 반복하는 소리다.
 * 고무가 살에 붙었다 떨어질 때마다 짧게 '뽀득' 하는 알갱이가 터진다.
 * 그래서 이어 틀지 않고, 손가락이 움직이는 동안 그 알갱이를 불규칙하게 뿌린다.
 */
export class SquishVoice {
  private bed?: { source: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode };
  private nextGrain = 0;
  private running = false;

  start(): void {
    const ac = audio();
    if (!ac || this.running) return;
    this.running = true;
    this.nextGrain = ac.currentTime;

    // 아주 낮게 깔리는 바닥. 이것만으론 소리가 안 나고 무게만 준다.
    const source = ac.createBufferSource();
    source.buffer = noiseBuffer(ac);
    source.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 140;
    filter.Q.value = 1.2;
    const gain = ac.createGain();
    gain.gain.value = 0.0001;
    source.connect(filter).connect(gain).connect(ac.destination);
    source.start();
    this.bed = { source, filter, gain };
  }

  /** speed 0~1: 빠를수록 알갱이가 촘촘하고 크게 터진다 */
  update(speed: number): void {
    const ac = ctx;
    if (!ac || !this.running) return;

    this.bed?.gain.gain.setTargetAtTime(Math.min(0.05, speed * 0.07), ac.currentTime, 0.08);

    const now = ac.currentTime;
    if (now < this.nextGrain) return;
    // 느리게 문지르면 드문드문, 빠르면 촘촘하게
    const gap = 0.16 - Math.min(0.13, speed * 0.14);
    this.nextGrain = now + gap * (0.5 + Math.random());
    this.grain(ac, now, speed);
  }

  /** 붙었다 떨어지는 한 번. 낮은 음이 짧게 미끄러져 내린다. */
  private grain(ac: AudioContext, at: number, speed: number) {
    const base = 95 + Math.random() * 130;
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(base * 1.9, at);
    osc.frequency.exponentialRampToValueAtTime(base * 0.75, at + 0.07);

    const soft = ac.createBiquadFilter();
    soft.type = "lowpass";
    soft.frequency.value = 520 + speed * 500;

    const env = ac.createGain();
    const peak = 0.05 + Math.random() * 0.07 + speed * 0.06;
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(peak, at + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.1 + Math.random() * 0.08);

    osc.connect(soft).connect(env).connect(ac.destination);
    osc.start(at);
    osc.stop(at + 0.25);

    // 떨어질 때 살짝 긁히는 기척
    const rub = ac.createBufferSource();
    rub.buffer = noiseBuffer(ac);
    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 380 + Math.random() * 320;
    band.Q.value = 1.6;
    const rubEnv = ac.createGain();
    rubEnv.gain.setValueAtTime(peak * 0.3, at);
    rubEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    rub.connect(band).connect(rubEnv).connect(ac.destination);
    rub.start(at);
    rub.stop(at + 0.12);
  }

  stop(): void {
    const ac = ctx;
    this.running = false;
    if (!ac || !this.bed) return;
    const { source, gain } = this.bed;
    gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05);
    setTimeout(() => {
      try {
        source.stop();
      } catch {
        // 이미 멎었으면 그만이다
      }
    }, 220);
    this.bed = undefined;
  }
}
