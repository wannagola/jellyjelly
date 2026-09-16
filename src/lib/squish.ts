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
 * 왁스 깨지는 소리 - 파삭.
 *
 * 처음엔 짧은 딱 소리를 6~20ms 간격으로 여섯 번 겹쳤더니 드릴이 됐다.
 * 그 간격이 문제였다. 10ms 간격으로 반복되는 소리는 귀에 100Hz 짜리 음으로
 * 들린다. 반복이 음이 되지 않으려면 붙여서 하나로 뭉개거나(3ms 이내),
 * 따로따로 들릴 만큼 떼어놔야(25ms 이상) 한다. 그 사이가 기계 소리다.
 *
 * 그래서 한 방으로 바꿨다. 마른 껍질이 갈라지는 '파'(넓은 고음 한 방)와
 * 부스러기가 흩어지는 '삭'(그보다 높고 짧은 꼬리), 그리고 갈라지는
 * 순간의 음정 하나. 조각이 많을 때만 늦은 잔조각을 한둘 더 던진다.
 */
export function renderCrack(ac: BaseAudioContext, destination: AudioNode, shards: number, at = 0) {
  const out = ac.createGain();
  out.gain.value = 0.9;
  out.connect(destination);

  /**
   * 부스러지는 한 방.
   *
   * 대역을 넓게 열되 위도 막아야 한다. 고역만 잘라내고 두면 잡음의 힘이
   * 10kHz 위에 쏠려서 마른 껍질이 아니라 치익 하는 바람 소리가 된다.
   */
  const burst = (t: number, peak: number, decay: number, lo: number, hi: number) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac);
    src.playbackRate.value = 0.85 + Math.random() * 0.7;

    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = lo;
    hp.Q.value = 0.7;

    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = hi;
    lp.Q.value = 0.9;

    const env = ac.createGain();
    env.gain.setValueAtTime(peak, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    src.connect(hp).connect(lp).connect(env).connect(out);
    src.start(t);
    src.stop(t + decay + 0.02);
  };

  // 파 - 갈라지는 순간
  burst(at, 0.3, 0.017, 1400, 5200);
  // 삭 - 부스러기가 흩어지는 꼬리. 조금 늦게, 더 높게, 더 작게.
  burst(at + 0.007, 0.08, 0.055, 2800, 9000);

  // 마른 껍질이 갈라질 때 나는 음정. 짧게 미끄러져 내려야 '파삭' 이 된다.
  const snap = ac.createOscillator();
  snap.type = "triangle";
  const base = 1250 + Math.random() * 600;
  snap.frequency.setValueAtTime(base, at);
  snap.frequency.exponentialRampToValueAtTime(base * 0.38, at + 0.028);
  const snapEnv = ac.createGain();
  snapEnv.gain.setValueAtTime(0.085, at);
  snapEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.032);
  snap.connect(snapEnv).connect(out);
  snap.start(at);
  snap.stop(at + 0.06);

  // 크게 떨어져 나갔으면 잔조각 한둘이 뒤늦게 튄다.
  // 서로도 25ms 넘게 떨어뜨린다. 둘이 붙으면 그 둘만으로도 기계 소리가 난다.
  const extra = shards > 3 ? 1 + Math.round(Math.random()) : 0;
  for (let i = 0; i < extra; i += 1) {
    burst(at + 0.03 + i * 0.032 + Math.random() * 0.014, 0.055, 0.02, 1800, 6500);
  }

  // 껍질이 통째로 울리는 낮은 기척. 크면 소리가 탁해져서 아주 살짝만.
  const thud = ac.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(180, at);
  thud.frequency.exponentialRampToValueAtTime(84, at + 0.06);
  const thudEnv = ac.createGain();
  thudEnv.gain.setValueAtTime(0.0001, at);
  thudEnv.gain.exponentialRampToValueAtTime(0.038, at + 0.004);
  thudEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.085);
  thud.connect(thudEnv).connect(out);
  thud.start(at);
  thud.stop(at + 0.12);
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
