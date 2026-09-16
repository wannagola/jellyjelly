/**
 * 소리를 내는 파일들이 같이 쓰는 바닥.
 *
 * 처음엔 파일마다 AudioContext 를 하나씩 만들었다. 셋이 되자 사파리가 위험해졌다 -
 * 문서 하나가 열어둘 수 있는 AudioContext 개수에 한계가 있어서, 장난감을 차례로
 * 들르기만 해도 마지막 하나가 조용히 안 열린다. 그래서 하나만 만들어 나눠 쓴다.
 *
 * 잡음 버퍼도 마찬가지다. 같은 난수 2초치를 파일마다 따로 만들 이유가 없다.
 */

let ctx: AudioContext | undefined;
let noise: AudioBuffer | undefined;

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

export function audio(): AudioContext | undefined {
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

/** 이미 만들어 둔 컨텍스트. 소리를 새로 깨우지 않고 볼 때 쓴다. */
export function audioIfAwake(): AudioContext | undefined {
  return ctx;
}

/** 2초치 흰 잡음. 깨짐·바스락·손바닥 기척이 전부 여기서 나온다. */
export function noiseBuffer(ac: BaseAudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ac.sampleRate) return noise;
  const length = Math.floor(ac.sampleRate * 2);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noise = buffer;
  return buffer;
}
