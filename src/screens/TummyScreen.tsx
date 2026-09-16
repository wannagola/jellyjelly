import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { playHit, playPuu, playTrumpet } from "../lib/drum";
import { JELLY_COLORS } from "../lib/jelly";
import type { JellyColor } from "../data/types";
import { useSettings } from "../lib/settings";
import { type TrunkPoint, drawFloorJelly, drawTrunk, trunkHit } from "../lib/elephant";
import { SquishVoice } from "../lib/squish";
import { type Squish, blobRadius, hold, pressAt, relax, restingSquish } from "../lib/waxball";

interface Ripple {
  x: number;
  y: number;
  r: number;
  strength: number;
}

interface FloorJelly {
  id: number;
  /** 배 중심을 기준으로 한 자리 (반지름을 1로 둔 단위계) */
  x: number;
  y: number;
  color: JellyColor;
  kind: "bear" | "cube" | "ring";
  /** 떨어지는 중이면 0보다 크다 */
  drop: number;
}

/** 젤리를 줍는 동작. 뻗고, 올리고, 먹고, 외친다. */
interface Eating {
  phase: "reach" | "lift" | "cheer";
  t: number;
  jelly: FloorJelly;
}

/** 손으로 잡은 코. 뿌리에서 본 각도와 길이로만 들고 있으면 놓았을 때 되돌리기 쉽다. */
interface Pull {
  ang: number;
  len: number;
  vAng: number;
  vLen: number;
  held: boolean;
}

/** 쓰다듬을 때 머리 위로 떠오르는 하트 */
interface Heart {
  x: number;
  y: number;
  t: number;
  drift: number;
}

const SKIN = "#b9aec4";
const SKIN_DARK = "#8f8299";
const BELLY = "#cfc4d6";
const EAR_INNER = "#c8b9cf";
const COLORS: JellyColor[] = ["grape", "berry", "green", "orange", "lemon", "soda", "peach", "cola"];
const KINDS: FloorJelly["kind"][] = ["bear", "cube", "ring"];
/** 배가 늘어나도 화면 밖으로 안 나가게 */
const MAX_REACH = 1.5;
const FLOOR_COUNT = 4;

/** 가만히 있을 때 코끝이 있는 자리 (머리 반지름 단위) */
const REST_ANG = Math.atan2(1.52, 0.68);
const REST_LEN = Math.hypot(0.68, 1.52);
/** 너무 당기면 코가 아니라 고무줄이 된다 */
const PULL_MIN = 0.85;
const PULL_MAX = 2.55;
/** 한 바퀴 돌리면 한 번 운다 */
const SPIN = Math.PI * 2;
/** 이만큼 쓰다듬으면 기분이 좋아진다 (머리 반지름 단위 거리) */
const PAT_FULL = 2.6;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** -π..π 로 접어서 한 바퀴를 두 바퀴로 세지 않게 */
function wrapAngle(a: number): number {
  let d = a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

let jellySeq = 0;
function spawnJelly(slot: number): FloorJelly {
  jellySeq += 1;
  return {
    id: jellySeq,
    x: -0.9 + slot * 0.6 + (Math.random() - 0.5) * 0.18,
    y: 1.28 + (Math.random() - 0.5) * 0.08,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    kind: KINDS[Math.floor(Math.random() * KINDS.length)],
    drop: 1,
  };
}

export function TummyScreen() {
  const settings = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hits, setHits] = useState(0);
  const [eaten, setEaten] = useState(0);

  const ripples = useRef<Ripple[]>([]);
  const squish = useRef<Squish>(restingSquish());
  const jellies = useRef<FloorJelly[]>(
    Array.from({ length: FLOOR_COUNT }, (_, i) => spawnJelly(i)),
  );
  const eating = useRef<Eating | undefined>(undefined);
  const cheer = useRef(0);
  /** 방금 먹은 젤리 색. 야르 글씨가 그 색으로 나온다. */
  const cheerColor = useRef(JELLY_COLORS.grape);
  const blink = useRef(0);
  const flap = useRef(0);
  const lastHitAt = useRef(0);
  const voice = useRef(new SquishVoice());
  const muted = useRef(false);
  const down = useRef(new Set<number>());
  const moved = useRef(0);

  /** 이번 프레임에 그린 코. 코를 잡으려면 어디 있는지 알아야 한다. */
  const spine = useRef<TrunkPoint[]>([]);
  const pull = useRef<Pull | undefined>(undefined);
  const pullId = useRef(-1);
  /** 잡고 돌린 각도의 합. 한 바퀴가 될 때마다 깎아낸다. */
  const whirl = useRef(0);
  const lastTurn = useRef({ at: 0, d: 0 });
  const patId = useRef(-1);
  const patAt = useRef({ x: 0, y: 0 });
  const pat = useRef(0);
  const patGlow = useRef(0);
  const hearts = useRef<Heart[]>([]);
  /** 뿌우 글씨 남은 시간 */
  const puu = useRef(0);

  useEffect(() => {
    muted.current = Boolean(settings?.muted);
  }, [settings?.muted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const stroke = voice.current;

    let raf = 0;
    let prev = performance.now();
    let w = 0;
    let h = 0;
    let bx = 0;
    let by = 0;
    let radius = 0;

    const fit = () => {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const box = canvas.getBoundingClientRect();
      w = box.width;
      h = box.height;
      bx = w / 2;
      by = h * 0.55;
      radius = Math.min(w / 2, h * 0.34) / MAX_REACH;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const onResize = () => fit();
    window.addEventListener("resize", onResize);

    const local = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      return { x: (e.clientX - box.left - bx) / radius, y: (e.clientY - box.top - by) / radius };
    };
    const px = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      return { x: e.clientX - box.left, y: e.clientY - box.top };
    };

    const headOf = () => ({ y: by - radius * 1.12, r: radius * 0.5 });
    const rootOf = () => {
      const head = headOf();
      return { x: bx, y: head.y + head.r * 0.04, r: head.r };
    };

    /** 기분 좋을 때 머리 위로 하트 몇 개 */
    const popHearts = (n: number) => {
      const head = headOf();
      for (let i = 0; i < n; i += 1) {
        hearts.current.push({
          x: bx + (Math.random() - 0.5) * head.r * 1.2,
          y: head.y - head.r * 0.5 - Math.random() * head.r * 0.3,
          t: 1,
          drift: (Math.random() - 0.5) * 0.9,
        });
      }
    };

    /** 코끼리가 기분 좋아서 우는 순간 */
    const trumpet = (power: number) => {
      puu.current = 1;
      flap.current = 1;
      blink.current = 1;
      popHearts(3);
      if (!muted.current) playPuu(power);
      navigator.vibrate?.([14, 50, 22]);
    };
    const mouthOf = () => {
      const head = headOf();
      return { x: bx + head.r * 0.5, y: head.y + head.r * 1.05 };
    };

    const onDown = (e: PointerEvent) => {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // 이미 사라진 포인터면 그냥 넘어간다
      }
      down.current.add(e.pointerId);
      moved.current = 0;

      const p = local(e);

      // 바닥 젤리가 먼저다. 배보다 아래에 있으니 헷갈릴 일도 없다.
      if (!eating.current) {
        const picked = jellies.current.find(
          (j) => j.drop <= 0 && Math.hypot(j.x - p.x, j.y - p.y) < 0.28,
        );
        if (picked) {
          eating.current = { phase: "reach", t: 0, jelly: picked };
          return;
        }
      }

      const c = px(e);
      const root = rootOf();

      // 코를 잡는다. 젤리를 줍는 중에는 못 잡는다 - 밥 먹을 땐 건드리지 말자.
      const face = { x: bx, y: headOf().y, r: root.r };
      if (!eating.current && pullId.current < 0 && trunkHit(spine.current, c.x, c.y, face)) {
        pullId.current = e.pointerId;
        whirl.current = 0;
        lastTurn.current = { at: performance.now(), d: 0 };
        pull.current = {
          ang: Math.atan2(c.y - root.y, c.x - root.x),
          len: clamp(Math.hypot(c.x - root.x, c.y - root.y) / root.r, PULL_MIN, PULL_MAX),
          vAng: 0,
          vLen: 0,
          held: true,
        };
        blink.current = 1;
        navigator.vibrate?.(8);
        return;
      }

      // 머리는 두드리는 데가 아니라 쓰다듬는 데다
      if (patId.current < 0 && Math.hypot(c.x - face.x, c.y - face.y) < face.r * 1.02) {
        patId.current = e.pointerId;
        patAt.current = c;
        blink.current = 1;
        return;
      }

      const reach = Math.hypot(p.x, p.y);
      if (reach > 1.06) return;

      // 연타하면 손이 덜 올라가서 약해지고, 쉬었다 치면 세진다
      const now = performance.now();
      const gap = (now - lastHitAt.current) / 1000;
      lastHitAt.current = now;
      const strength = 0.5 + Math.min(1, gap / 0.55) * 0.5;

      ripples.current.push({ x: p.x, y: p.y, r: 0, strength });
      const poke = pressAt(reach, 0.62 * strength);
      squish.current = hold(squish.current, {
        pressAngle: Math.atan2(p.y, p.x),
        pressDepth: poke.dent,
        squash: poke.squash,
      });
      blink.current = 1;
      flap.current = strength;

      if (!muted.current) playHit(Math.min(1, reach), strength);
      navigator.vibrate?.(Math.round(8 + strength * 14));
      setHits((n) => n + 1);
    };

    const onMove = (e: PointerEvent) => {
      if (!down.current.has(e.pointerId)) return;

      // 코를 잡고 있다 - 코끝이 손가락을 따라온다
      if (e.pointerId === pullId.current && pull.current) {
        const c = px(e);
        const root = rootOf();
        const ang = Math.atan2(c.y - root.y, c.x - root.x);
        const d = wrapAngle(ang - pull.current.ang);
        const now = performance.now();

        whirl.current += d;
        lastTurn.current = { at: now, d };
        pull.current.ang = ang;
        pull.current.len = clamp(Math.hypot(c.x - root.x, c.y - root.y) / root.r, PULL_MIN, PULL_MAX);
        // 코가 잡혀 있으면 눈을 질끈 감는다. 휘두른 코가 눈을 가리는 것도 이걸로 가려진다.
        blink.current = 1;

        // 한 바퀴 다 돌렸다
        while (Math.abs(whirl.current) >= SPIN) {
          whirl.current -= Math.sign(whirl.current) * SPIN;
          trumpet(0.9);
        }
        return;
      }

      // 머리를 쓰다듬는 중
      if (e.pointerId === patId.current) {
        const c = px(e);
        const head = headOf();
        const moveBy = Math.hypot(c.x - patAt.current.x, c.y - patAt.current.y) / head.r;
        patAt.current = c;
        // 손을 대고만 있는 건 쓰다듬는 게 아니다
        if (moveBy < 0.004) return;
        pat.current += moveBy;
        patGlow.current = 1;
        blink.current = 1;
        flap.current = Math.max(flap.current, 0.3);
        if (Math.random() < moveBy * 1.6) popHearts(1);
        if (pat.current >= PAT_FULL) {
          pat.current = 0;
          trumpet(0.45);
        }
        return;
      }

      const p = local(e);
      const reach = Math.hypot(p.x, p.y);
      moved.current += 1;
      if (reach > 1.06) return;

      // 문지르는 건 치는 게 아니다. 소리도 모양도 부드럽게만.
      if (moved.current > 2) {
        if (!muted.current) {
          stroke.start();
          stroke.update(0.35);
        }
        const rub = pressAt(reach, 0.3);
        squish.current = hold(squish.current, {
          pressAngle: Math.atan2(p.y, p.x),
          pressDepth: rub.dent,
          squash: rub.squash,
        });
      }
    };

    const onUp = (e: PointerEvent) => {
      down.current.delete(e.pointerId);

      if (e.pointerId === pullId.current) {
        pullId.current = -1;
        if (pull.current) {
          // 놓는 순간의 손목 속도를 그대로 넘겨준다. 휙 돌리다 놓으면 더 휘청인다.
          const gap = Math.max(0.016, (performance.now() - lastTurn.current.at) / 1000);
          pull.current.held = false;
          pull.current.vAng = gap < 0.12 ? clamp(lastTurn.current.d / gap, -14, 14) : 0;
        }
        whirl.current = 0;
      }
      if (e.pointerId === patId.current) {
        patId.current = -1;
        pat.current = 0;
      }
      if (down.current.size === 0) stroke.stop();
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    /* ---------- 먹는 동작 ---------- */

    const stepEating = (dt: number) => {
      const act = eating.current;
      if (!act) return;
      const speed = act.phase === "cheer" ? 1.1 : act.phase === "reach" ? 2.6 : 2.2;
      act.t += dt * speed;
      if (act.t < 1) return;

      if (act.phase === "reach") {
        eating.current = { ...act, phase: "lift", t: 0 };
        return;
      }
      if (act.phase === "lift") {
        eating.current = { ...act, phase: "cheer", t: 0 };
        cheer.current = 1;
        cheerColor.current = JELLY_COLORS[act.jelly.color];
        flap.current = 1;
        blink.current = 1;
        if (!muted.current) playTrumpet();
        navigator.vibrate?.([12, 40, 18]);
        setEaten((n) => n + 1);
        // 먹은 자리에 새 젤리가 떨어진다
        const slot = jellies.current.findIndex((j) => j.id === act.jelly.id);
        if (slot >= 0) jellies.current[slot] = spawnJelly(slot);
        return;
      }
      eating.current = undefined;
    };

    /* ---------- 그리기 ---------- */

    /**
     * 놓은 코가 제자리로 돌아간다. 감쇠를 임계 아래로 두어서
     * 한 번에 멈추지 않고 두어 번 흔들리게 한다. 그게 살아 있는 코처럼 보인다.
     */
    const relaxPull = (dt: number) => {
      const p = pull.current;
      if (!p || p.held) return;

      const K = 52;
      const C = 2 * 0.34 * Math.sqrt(K);
      // 각도는 가까운 쪽으로 돌아간다. 360도 반대로 도는 걸 막는다.
      const dAng = wrapAngle(p.ang - REST_ANG);
      p.vAng += (-dAng * K - p.vAng * C) * dt;
      p.vLen += (-(p.len - REST_LEN) * K * 1.4 - p.vLen * C * 1.2) * dt;
      p.ang += p.vAng * dt;
      p.len += p.vLen * dt;

      if (
        Math.abs(wrapAngle(p.ang - REST_ANG)) < 0.012 &&
        Math.abs(p.vAng) < 0.06 &&
        Math.abs(p.len - REST_LEN) < 0.012
      ) {
        pull.current = undefined;
      }
    };

    const bellyPath = () => {
      ctx.beginPath();
      const STEPS = 130;
      for (let i = 0; i <= STEPS; i += 1) {
        const a = (i / STEPS) * Math.PI * 2;
        const r = blobRadius(a, squish.current) * radius;
        const x = bx + Math.cos(a) * r;
        const y = by + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      if (down.current.size === 0) squish.current = relax(squish.current, dt);
      blink.current = Math.max(0, blink.current - dt * 3.2);
      flap.current = Math.max(0, flap.current - dt * 2.4);
      cheer.current = Math.max(0, cheer.current - dt * 0.85);
      puu.current = Math.max(0, puu.current - dt * 0.8);
      patGlow.current = Math.max(0, patGlow.current - dt * 1.6);
      // 손을 뗀 채 두면 쓰다듬던 기억도 천천히 식는다
      if (patId.current < 0) pat.current = Math.max(0, pat.current - dt * 0.9);
      relaxPull(dt);
      for (const heart of hearts.current) {
        heart.t -= dt * 0.9;
        heart.y -= dt * radius * 0.5;
        heart.x += heart.drift * dt * radius * 0.2;
      }
      hearts.current = hearts.current.filter((heart) => heart.t > 0);
      for (const jelly of jellies.current) jelly.drop = Math.max(0, jelly.drop - dt * 2.4);
      stepEating(dt);

      for (const wave of ripples.current) wave.r += dt * 2.1;
      ripples.current = ripples.current.filter((wave) => wave.r < 2.2);

      ctx.clearRect(0, 0, w, h);

      const head = headOf();
      const headY = head.y;
      const headR = head.r;
      const mouth = mouthOf();

      // 귀. 부채처럼 위가 넓고 아래가 좁아야 코끼리 귀로 보인다.
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(bx + side * headR * 0.92, headY - headR * 0.1);
        ctx.rotate(side * (0.22 + flap.current * 0.16));
        ctx.scale(side, 1);

        ctx.fillStyle = SKIN_DARK;
        ctx.beginPath();
        ctx.moveTo(0, -headR * 0.72);
        ctx.bezierCurveTo(headR * 1.1, -headR * 0.95, headR * 1.25, headR * 0.5, headR * 0.5, headR * 0.92);
        ctx.bezierCurveTo(headR * 0.2, headR * 1.05, -headR * 0.05, headR * 0.6, 0, -headR * 0.72);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = EAR_INNER;
        ctx.beginPath();
        ctx.moveTo(headR * 0.1, -headR * 0.42);
        ctx.bezierCurveTo(headR * 0.78, -headR * 0.55, headR * 0.86, headR * 0.35, headR * 0.42, headR * 0.6);
        ctx.bezierCurveTo(headR * 0.24, headR * 0.66, headR * 0.06, headR * 0.34, headR * 0.1, -headR * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 발
      ctx.fillStyle = SKIN_DARK;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(bx + side * radius * 0.56, by + radius * 0.95, radius * 0.26, radius * 0.17, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 배
      bellyPath();
      const skin = ctx.createRadialGradient(
        bx - radius * 0.3, by - radius * 0.35, radius * 0.1,
        bx, by, radius * 1.15,
      );
      skin.addColorStop(0, "#e5dced");
      skin.addColorStop(0.55, BELLY);
      skin.addColorStop(1, SKIN_DARK);
      ctx.fillStyle = skin;
      ctx.fill();

      ctx.save();
      bellyPath();
      ctx.clip();
      for (const wave of ripples.current) {
        const fade = Math.max(0, 1 - wave.r / 2.2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.72 * fade * fade * wave.strength})`;
        ctx.lineWidth = radius * 0.05 * fade + 1;
        ctx.beginPath();
        ctx.arc(bx + wave.x * radius, by + wave.y * radius, wave.r * radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(143, 130, 153, 0.35)";
      ctx.beginPath();
      ctx.ellipse(bx, by + radius * 0.1, radius * 0.07, radius * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const drawHead = () => {
        ctx.fillStyle = SKIN;
        ctx.beginPath();
        ctx.arc(bx, headY, headR, 0, Math.PI * 2);
        ctx.fill();
      };

      // 바닥 젤리
      const size = radius * 0.3;
      for (const jelly of jellies.current) {
        if (eating.current?.jelly.id === jelly.id) continue;
        const fall = jelly.drop ** 2 * radius * 0.9;
        drawFloorJelly(
          ctx,
          bx + jelly.x * radius,
          by + jelly.y * radius - fall,
          size,
          JELLY_COLORS[jelly.color],
          jelly.kind,
        );
      }

      // 코는 얼굴에 붙어 있다. 젤리를 주울 땐 코끝이 그리로 뻗는다.
      const swing = squish.current.pressDepth * 0.5 + Math.sin(now / 900) * 0.06;
      drawHead();
      let tip: { x: number; y: number } | undefined;
      const act = eating.current;
      if (act) {
        const from = { x: bx + act.jelly.x * radius, y: by + act.jelly.y * radius };
        if (act.phase === "reach") {
          const rest = { x: bx + headR * 0.68, y: headY + headR * 1.56 };
          const e = 1 - (1 - act.t) ** 2;
          tip = { x: rest.x + (from.x - rest.x) * e, y: rest.y + (from.y - rest.y) * e };
        } else if (act.phase === "lift") {
          const e = act.t * act.t * (3 - 2 * act.t);
          tip = { x: from.x + (mouth.x - from.x) * e, y: from.y + (mouth.y - from.y) * e };
        } else {
          tip = mouth;
        }
      }
      // 젤리를 줍는 중이 아니면 손이 이긴다
      const rootY = headY + headR * 0.04;
      let via: { x: number; y: number } | undefined;
      if (!act && pull.current) {
        const grip = pull.current;
        tip = {
          x: bx + Math.cos(grip.ang) * grip.len * headR,
          y: rootY + Math.sin(grip.ang) * grip.len * headR,
        };
        // 코가 곧은 막대처럼 돌면 안테나로 보인다. 늘 같은 쪽으로 한 번 휘게 해서
        // 휜 모양을 유지한 채 돌아가게 한다. 각도에 상수만 더하니 어디서도 안 튄다.
        const curl = grip.ang + 0.6;
        via = { x: bx + Math.cos(curl) * headR * 1.22, y: rootY + Math.sin(curl) * headR * 1.22 };
      }
      spine.current = drawTrunk(ctx, bx, rootY, headR, swing, tip, via);
      const trunkTip = spine.current[spine.current.length - 1];

      // 코끝에 매달린 젤리
      if (act && act.phase !== "cheer") {
        drawFloorJelly(ctx, trunkTip.x, trunkTip.y, size * 0.9, JELLY_COLORS[act.jelly.color], act.jelly.kind);
      }

      // 눈. 쓰다듬는 동안엔 계속 감고 웃는다.
      const lid = Math.max(blink.current, patGlow.current);
      for (const side of [-1, 1]) {
        const ex = bx + side * headR * 0.38;
        const ey = headY - headR * 0.14;
        if (lid > 0.45) {
          ctx.lineWidth = headR * 0.075;
          ctx.strokeStyle = "#3b2f45";
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(ex, ey + headR * 0.06, headR * 0.16, Math.PI * 1.12, Math.PI * 1.88);
          ctx.stroke();
        } else {
          ctx.fillStyle = "#3b2f45";
          ctx.beginPath();
          ctx.ellipse(ex, ey, headR * 0.125, headR * 0.155 * (1 - lid * 0.5), 0, 0, Math.PI * 2);
          ctx.fill();
          // 반짝이 두 점. 이게 있고 없고가 귀여움의 전부다.
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(ex - headR * 0.045, ey - headR * 0.055, headR * 0.045, headR * 0.05, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.arc(ex + headR * 0.05, ey + headR * 0.05, headR * 0.022, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // 볼
      ctx.fillStyle = "rgba(226, 150, 170, 0.3)";
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(bx + side * headR * 0.62, headY + headR * 0.22, headR * 0.16, headR * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 쓰다듬은 자리에 남는 온기
      if (patGlow.current > 0) {
        ctx.save();
        ctx.globalAlpha = patGlow.current * 0.5;
        // 그라디언트가 0 이 되는 자리보다 넓게 칠해야 테두리에서 뚝 끊기지 않는다
        const warm = ctx.createRadialGradient(bx, headY - headR * 0.4, 0, bx, headY, headR * 0.98);
        warm.addColorStop(0, "rgba(255, 190, 212, 0.85)");
        warm.addColorStop(1, "rgba(255, 190, 212, 0)");
        ctx.fillStyle = warm;
        ctx.beginPath();
        ctx.arc(bx, headY, headR * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 하트
      for (const heart of hearts.current) {
        const s = headR * 0.24 * (0.6 + heart.t * 0.6);
        ctx.save();
        ctx.globalAlpha = Math.min(1, heart.t * 1.6);
        ctx.translate(heart.x, heart.y);
        ctx.rotate(heart.drift * 0.3);
        ctx.fillStyle = "#EF5D7A";
        ctx.beginPath();
        ctx.moveTo(0, s * 0.72);
        ctx.bezierCurveTo(-s * 1.05, -s * 0.05, -s * 0.5, -s * 0.9, 0, -s * 0.28);
        ctx.bezierCurveTo(s * 0.5, -s * 0.9, s * 1.05, -s * 0.05, 0, s * 0.72);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 뿌우~
      if (puu.current > 0) {
        const pop = Math.min(1, (1 - puu.current) * 5);
        ctx.save();
        ctx.globalAlpha = Math.min(1, puu.current * 2.2);
        ctx.translate(bx - headR * 1.25, headY - headR * 0.95 - (1 - puu.current) * headR * 0.35);
        ctx.rotate(-0.1);
        ctx.scale(pop, pop);
        ctx.font = `700 ${headR * 0.5}px Jua, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = headR * 0.16;
        ctx.strokeStyle = "#fff";
        ctx.lineJoin = "round";
        ctx.strokeText("뿌우~", 0, 0);
        ctx.fillStyle = "#E0568C";
        ctx.fillText("뿌우~", 0, 0);
        ctx.restore();
      }

      // 야르!
      if (cheer.current > 0) {
        const pop = Math.min(1, (1 - cheer.current) * 5);
        ctx.save();
        ctx.globalAlpha = Math.min(1, cheer.current * 2.4);
        ctx.translate(bx + headR * 1.1, headY - headR * 1.0 - (1 - cheer.current) * headR * 0.3);
        ctx.scale(pop, pop);
        ctx.font = `700 ${headR * 0.52}px Jua, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = headR * 0.16;
        ctx.strokeStyle = "#fff";
        ctx.lineJoin = "round";
        ctx.strokeText("야르!", 0, 0);
        ctx.fillStyle = cheerColor.current;
        ctx.fillText("야르!", 0, 0);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      stroke.stop();
    };
  }, []);

  return (
    <>
      <header className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 pt-3 pb-2.5">
        <Link to="/" className="justify-self-start text-base text-ink-soft">
          ‹ 선반
        </Link>
        <h1 className="font-display text-lg">코끼리 배</h1>
        <span className="justify-self-end text-xs text-ink-faint tabular-nums">
          {eaten > 0 ? `젤리 ${eaten}개` : hits > 0 ? `${hits}번` : ""}
        </span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 pb-3">
        <canvas
          ref={canvasRef}
          className="aspect-[1/1.24] w-full max-w-[420px] touch-none select-none"
        />
        <p className="mt-1 text-center text-sm leading-snug text-ink-soft">
          배는 두드리고, 코는 잡아당기고, 머리는 쓰다듬어요
        </p>
      </main>
    </>
  );
}

