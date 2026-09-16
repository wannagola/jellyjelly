/**
 * 병 흔드는 소리를 합성한다.
 *
 * 음원 파일을 가져다 쓰면 저작권을 따져야 하고 용량도 는다. 젤리가 부딪히는 소리는
 * 짧게 걸러낸 잡음 알갱이를 여러 개 흩뿌리면 꽤 그럴듯해진다. 젤리는 단단하지 않아서
 * 고음이 거의 없다 - 대역을 낮게 잡는 게 '유리구슬'이 아니라 '젤리'로 들리는 요령이다.
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
    // 사파리는 사용자가 건드리기 전까지 재워둔다
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return undefined;
  }
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (noise) return noise;
  const length = Math.floor(ac.sampleRate * 0.3);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noise = buffer;
  return buffer;
}

/** 잡음 알갱이 하나. 젤리 한 알이 어딘가에 부딪히는 소리. */
function grain(
  ac: AudioContext,
  out: GainNode,
  at: number,
  { freq, q, peak, decay, rate }: { freq: number; q: number; peak: number; decay: number; rate: number },
) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  src.playbackRate.value = rate;

  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = freq;
  band.Q.value = q;

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(peak, at + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, at + decay);

  src.connect(band).connect(env).connect(out);
  src.start(at);
  src.stop(at + decay + 0.05);
}

/**
 * 병을 흔든 소리. 젤리가 많을수록 소리가 두툼해진다.
 * 알갱이 시각을 제곱으로 당겨서 처음에 우르르 쏟아지고 뒤로 잦아들게 한다.
 */
export function playShake(jellyCount: number): void {
  const ac = audio();
  if (!ac || jellyCount === 0) return;

  const now = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = 0.85;
  out.connect(ac.destination);

  // 유리 몸통이 한 번 둔하게 울린다
  const body = ac.createBufferSource();
  body.buffer = noiseBuffer(ac);
  const low = ac.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 190;
  const bodyEnv = ac.createGain();
  bodyEnv.gain.setValueAtTime(0.0001, now);
  bodyEnv.gain.exponentialRampToValueAtTime(0.07, now + 0.012);
  bodyEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  body.connect(low).connect(bodyEnv).connect(out);
  body.start(now);
  body.stop(now + 0.35);

  const grains = Math.min(24, 7 + Math.round(jellyCount * 0.55));
  for (let i = 0; i < grains; i += 1) {
    grain(ac, out, now + 0.012 + Math.random() ** 1.5 * 0.4, {
      freq: 240 + Math.random() * 1000,
      q: 0.9 + Math.random() * 1.7,
      peak: 0.02 + Math.random() * 0.05,
      decay: 0.045 + Math.random() * 0.06,
      rate: 0.65 + Math.random() * 0.9,
    });
  }
}

/** 젤리 한 알이 병 바닥에 떨어지는 소리 */
export function playDrop(): void {
  const ac = audio();
  if (!ac) return;

  const now = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = 0.9;
  out.connect(ac.destination);

  grain(ac, out, now + 0.01, { freq: 320, q: 1.1, peak: 0.09, decay: 0.09, rate: 0.8 });
  grain(ac, out, now + 0.05, { freq: 620, q: 1.8, peak: 0.035, decay: 0.05, rate: 1.1 });
}
