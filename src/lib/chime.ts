import { audio } from "./audio";

/**
 * 순서 외우기에 쓰는 소리.
 *
 * 젤리마다 다른 음을 준다. 그래야 순서를 눈으로만이 아니라 귀로도 외운다.
 * 사실 이 게임은 소리를 끄면 훨씬 어려워진다 - 사람은 색 넷보다 가락 넷을
 * 훨씬 잘 외운다.
 *
 * 다섯 음 음계 안에서만 고른다. 아무 음이나 쓰면 어떤 순서가 나와도
 * 어색한 가락이 되고, 어색한 가락은 안 외워진다.
 */

/** 도-레-미-솔-라, 그리고 한 옥타브 위 도 */
const STEPS = [0, 2, 4, 7, 9, 12];
/** C4 */
const ROOT = 261.63;

export function noteCount(): number {
  return STEPS.length;
}

/** 젤리 하나의 음. 짧게 때리고 길게 울리는 마림바에 가깝다. */
export function playNote(index: number, len = 0.5): void {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime;
  const freq = ROOT * 2 ** (STEPS[index % STEPS.length] / 12);

  const out = ac.createGain();
  out.gain.value = 0.55;
  out.connect(ac.destination);

  // 기음과 그 위 배음 둘. 배음이 먼저 사그라들어야 나무 두드린 소리가 된다.
  for (const [ratio, gain, decay] of [
    [1, 1, 1],
    [4.0, 0.3, 0.3],
    [9.2, 0.12, 0.14],
  ] as const) {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(0.2 * gain, at + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, at + len * decay);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + len + 0.05);
  }
}

/** 틀렸을 때. 음정이 아래로 미끄러진다. */
export function playWrong(): void {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(320, at);
  osc.frequency.exponentialRampToValueAtTime(110, at + 0.42);

  const soft = ac.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = 1100;

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(0.16, at + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);

  osc.connect(soft).connect(env).connect(ac.destination);
  osc.start(at);
  osc.stop(at + 0.55);
}

/** 한 판을 다 맞혔을 때. 음계를 타고 올라간다. */
export function playClear(): void {
  const ac = audio();
  if (!ac) return;
  for (let i = 0; i < 3; i += 1) {
    window.setTimeout(() => playNote(i + 2, 0.3), i * 85);
  }
}
