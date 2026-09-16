/**
 * 병 흔드는 소리를 합성한다. 음원 파일은 쓰지 않는다.
 *
 * 젤리 소리의 정체는 두 가지다.
 * 끈적함은 낮은 기음과 길게 늘어지는 꼬리에서 오고,
 * 통통 튀는 느낌은 음높이가 순간적으로 뚝 떨어지는 데서 온다.
 * 잡음만 뿌리면 사각사각 부딪히는 소리가 되지 젤리가 되지 않는다.
 */

import { audio, noiseBuffer } from "./audio";

interface Bounce {
  at: number;
  /** 기음. 낮을수록 크고 무른 젤리로 들린다 */
  freq: number;
  peak: number;
  /** 꼬리 길이. 길수록 끈적하다 */
  decay: number;
}

/**
 * 젤리 한 알이 튀는 소리.
 * 음높이를 2.4배에서 시작해 40밀리초 만에 기음까지 떨어뜨리는 게 '통' 소리의 정체다.
 */
function bounce(ac: BaseAudioContext, out: AudioNode, { at, freq, peak, decay }: Bounce) {
  const body = ac.createOscillator();
  body.type = "sine";
  body.frequency.setValueAtTime(freq * 2.4, at);
  body.frequency.exponentialRampToValueAtTime(freq, at + 0.042);

  // 반음 아래 사인을 하나 더 겹치면 소리가 물러지고 두툼해진다
  const under = ac.createOscillator();
  under.type = "sine";
  under.frequency.setValueAtTime(freq * 1.18, at);
  under.frequency.exponentialRampToValueAtTime(freq * 0.5, at + 0.055);

  const soft = ac.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.setValueAtTime(freq * 6, at);
  soft.frequency.exponentialRampToValueAtTime(freq * 1.6, at + decay);
  soft.Q.value = 0.7;

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(peak, at + 0.007);
  env.gain.exponentialRampToValueAtTime(0.0001, at + decay);

  const underGain = ac.createGain();
  underGain.gain.value = 0.55;

  body.connect(soft);
  under.connect(underGain).connect(soft);
  soft.connect(env).connect(out);

  body.start(at);
  under.start(at);
  body.stop(at + decay + 0.05);
  under.stop(at + decay + 0.05);

  // 닿는 순간의 아주 작은 기척. 이게 없으면 그냥 전자음이 된다.
  const tick = ac.createBufferSource();
  tick.buffer = noiseBuffer(ac);
  const tickLow = ac.createBiquadFilter();
  tickLow.type = "lowpass";
  tickLow.frequency.value = 800;
  const tickEnv = ac.createGain();
  tickEnv.gain.setValueAtTime(peak * 0.28, at);
  tickEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.02);
  tick.connect(tickLow).connect(tickEnv).connect(out);
  tick.start(at);
  tick.stop(at + 0.05);
}

/** 여러 알이 한꺼번에 울릴 때 소리가 깨지지 않도록 눌러준다 */
function bus(ac: BaseAudioContext, destination: AudioNode): GainNode {
  const squash = ac.createDynamicsCompressor();
  squash.threshold.value = -20;
  squash.ratio.value = 7;
  squash.attack.value = 0.003;
  squash.release.value = 0.18;

  const level = ac.createGain();
  level.gain.value = 0.9;
  level.connect(squash).connect(destination);
  return level;
}

/**
 * 병을 흔든 소리. 처음에 우르르 쏟아지고 뒤로 잦아든다.
 * 오프라인 컨텍스트로도 그릴 수 있게 분리해 뒀다 - 그래야 소리를 재볼 수 있다.
 */
export function renderShake(ac: BaseAudioContext, destination: AudioNode, count: number, at = 0) {
  const out = bus(ac, destination);

  // 유리 몸통이 한 번 둔하게 울린다
  bounce(ac, out, { at: at + 0.005, freq: 86, peak: 0.16, decay: 0.34 });

  const grains = Math.min(20, 6 + Math.round(count * 0.5));
  for (let i = 0; i < grains; i += 1) {
    bounce(ac, out, {
      at: at + 0.02 + Math.random() ** 1.7 * 0.46,
      freq: 145 + Math.random() * 235,
      peak: 0.07 + Math.random() * 0.07,
      decay: 0.13 + Math.random() * 0.11,
    });
  }
}

export function playShake(jellyCount: number): void {
  const ac = audio();
  if (!ac || jellyCount === 0) return;
  renderShake(ac, ac.destination, jellyCount, ac.currentTime);
}

/** 젤리 한 알이 병 바닥에 떨어지는 소리. 크게 한 번, 작게 한 번. */
export function renderDrop(ac: BaseAudioContext, destination: AudioNode, at = 0) {
  const out = bus(ac, destination);
  bounce(ac, out, { at: at + 0.005, freq: 190, peak: 0.24, decay: 0.24 });
  bounce(ac, out, { at: at + 0.13, freq: 250, peak: 0.1, decay: 0.16 });
}

export function playDrop(): void {
  const ac = audio();
  if (!ac) return;
  renderDrop(ac, ac.destination, ac.currentTime);
}
