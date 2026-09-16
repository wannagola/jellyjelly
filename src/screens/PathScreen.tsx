import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { db, writeSetting } from "../data/db";
import type { JellyColor } from "../data/types";
import { playClear, playNote, playWrong } from "../lib/chime";
import { drawFloorJelly } from "../lib/elephant";
import { JELLY_COLORS } from "../lib/jelly";
import { type Puzzle, adjacent, makePuzzle, stageOf } from "../lib/maze";
import { useSettings } from "../lib/settings";

const BEST_KEY = "pathBest";

/** 쌍마다 다른 색. 옆 칸끼리 헷갈리지 않게 먼 색끼리 늘어놓는다. */
const COLORS: JellyColor[] = ["grape", "orange", "soda", "berry", "green", "lemon", "cola"];
const KINDS = ["bear", "cube", "ring"] as const;

export function PathScreen() {
  const settings = useSettings();
  const best = useLiveQuery(async () => ((await db.meta.get(BEST_KEY))?.value as number) ?? 0, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [level, setLevel] = useState(1);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => {
    const { size, count } = stageOf(1);
    return makePuzzle(size, count, Math.floor(Math.random() * 1e9));
  });
  const [paths, setPaths] = useState<number[][]>(() => puzzle.pairs.map(() => []));

  const muted = Boolean(settings?.muted);
  /** 그리는 중인 쌍 */
  const drawing = useRef<number>(undefined);
  /** 방금까지 이어져 있던 쌍의 수. 새로 이어질 때만 소리를 낸다. */
  const rang = useRef(0);
  /** 이번 판을 이미 축하했나 */
  const cheered = useRef(false);

  const load = useCallback((next: number) => {
    rang.current = 0;
    cheered.current = false;
    const { size, count } = stageOf(next);
    const fresh = makePuzzle(size, count, Math.floor(Math.random() * 1e9));
    setLevel(next);
    setPuzzle(fresh);
    setPaths(fresh.pairs.map(() => []));
  }, []);

  /* ---------- 판 상태 ---------- */

  /** 칸마다 누구의 길인가. -1 은 빈 칸. */
  const ownerOf = useCallback(
    (list: number[][]) => {
      const owner = new Int8Array(puzzle.size * puzzle.size).fill(-1);
      list.forEach((path, i) => {
        for (const cell of path) owner[cell] = i;
      });
      return owner;
    },
    [puzzle.size],
  );

  const joined = useCallback(
    (path: number[], pair: { a: number; b: number }) =>
      path.length >= 2 &&
      ((path[0] === pair.a && path[path.length - 1] === pair.b) ||
        (path[0] === pair.b && path[path.length - 1] === pair.a)),
    [],
  );

  /* ---------- 다 풀었나 ---------- */

  const linked = paths.filter((path, i) => joined(path, puzzle.pairs[i])).length;
  const filled = paths.reduce((n, path) => n + path.length, 0);
  const total = puzzle.size * puzzle.size;
  // 다 풀었는지는 따로 들고 있을 게 아니라 판을 보면 안다. 상태로 두면
  // 길을 지웠을 때 같이 안 풀리는 것을 잊기 쉽다.
  const won = linked === puzzle.pairs.length && filled === total;

  /* ---------- 손가락 ---------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cellAt = (e: PointerEvent): number | undefined => {
      const box = canvas.getBoundingClientRect();
      const step = box.width / puzzle.size;
      const col = Math.floor((e.clientX - box.left) / step);
      const row = Math.floor((e.clientY - box.top) / step);
      if (col < 0 || row < 0 || col >= puzzle.size || row >= puzzle.size) return undefined;
      return row * puzzle.size + col;
    };

    const onDown = (e: PointerEvent) => {
      if (won) return;
      const cell = cellAt(e);
      if (cell === undefined) return;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // 이미 사라진 포인터면 그냥 넘어간다
      }

      // 젤리를 짚으면 거기서부터 새로 그린다
      const end = puzzle.pairs.findIndex((p) => p.a === cell || p.b === cell);
      if (end >= 0) {
        drawing.current = end;
        setPaths((prev) => prev.map((path, i) => (i === end ? [cell] : path)));
        return;
      }

      // 그려둔 길 위를 짚으면 거기서부터 고쳐 그린다
      const mine = paths.findIndex((path) => path.includes(cell));
      if (mine >= 0) {
        drawing.current = mine;
        setPaths((prev) =>
          prev.map((path, i) => (i === mine ? path.slice(0, path.indexOf(cell) + 1) : path)),
        );
      }
    };

    const onMove = (e: PointerEvent) => {
      const pair = drawing.current;
      if (pair === undefined || won) return;
      const cell = cellAt(e);
      if (cell === undefined) return;

      setPaths((prev) => {
        const path = prev[pair];
        const last = path[path.length - 1];
        if (last === undefined || cell === last) return prev;
        if (!adjacent(last, cell, puzzle.size)) return prev;

        // 내 길을 되짚으면 지운다
        const inMine = path.indexOf(cell);
        if (inMine >= 0) {
          return prev.map((p, i) => (i === pair ? p.slice(0, inMine + 1) : p));
        }

        // 남의 젤리는 밟고 지나갈 수 없다
        const endOf = puzzle.pairs.findIndex((p) => p.a === cell || p.b === cell);
        if (endOf >= 0 && endOf !== pair) return prev;

        // 이미 이은 길인데 더 뻗으려 하면 그냥 둔다
        if (joined(path, puzzle.pairs[pair])) return prev;

        // 남의 길을 밟으면 그 길은 거기서 끊긴다
        return prev.map((p, i) => {
          if (i === pair) return [...p, cell];
          const hit = p.indexOf(cell);
          return hit >= 0 ? p.slice(0, hit) : p;
        });
      });
    };

    const onUp = () => {
      drawing.current = undefined;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [puzzle, paths, won, joined]);

  // 한 쌍 이을 때마다 음이 한 계단 올라간다. 몇 쌍 남았는지가 귀로 들린다.
  useEffect(() => {
    if (linked > rang.current && !muted) playNote(Math.min(5, linked - 1), 0.32);
    rang.current = linked;
  }, [linked, muted]);

  useEffect(() => {
    if (!won) {
      cheered.current = false;
      return;
    }
    if (cheered.current) return;
    cheered.current = true;
    if (!muted) playClear();
    navigator.vibrate?.([12, 50, 18]);
    void db.meta.get(BEST_KEY).then((row) => {
      if (level > (((row?.value as number) ?? 0) as number)) void writeSetting(BEST_KEY, level);
    });
  }, [won, level, muted]);

  /* ---------- 그리기 ---------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const box = canvas.getBoundingClientRect();
    const side = box.width;
    canvas.width = Math.round(side * dpr);
    canvas.height = Math.round(side * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const step = side / puzzle.size;
    const mid = (cell: number) => ({
      x: (cell % puzzle.size) * step + step / 2,
      y: Math.floor(cell / puzzle.size) * step + step / 2,
    });

    ctx.clearRect(0, 0, side, side);

    // 빈 칸
    const owner = ownerOf(paths);
    for (let cell = 0; cell < total; cell += 1) {
      const { x, y } = mid(cell);
      ctx.fillStyle = owner[cell] >= 0 ? "transparent" : "rgba(255,255,255,.85)";
      ctx.beginPath();
      ctx.roundRect(x - step / 2 + 2, y - step / 2 + 2, step - 4, step - 4, step * 0.2);
      ctx.fill();
    }

    // 길. 굵고 둥글게 그어야 손가락으로 그린 자국처럼 보인다.
    paths.forEach((path, i) => {
      if (path.length === 0) return;
      const done = joined(path, puzzle.pairs[i]);
      ctx.strokeStyle = JELLY_COLORS[COLORS[i % COLORS.length]];
      ctx.globalAlpha = done ? 1 : 0.72;
      ctx.lineWidth = step * (done ? 0.44 : 0.36);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      path.forEach((cell, k) => {
        const { x, y } = mid(cell);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // 양 끝의 젤리. 길보다 위에 와야 어디가 끝인지 보인다.
    puzzle.pairs.forEach((pair, i) => {
      const color = JELLY_COLORS[COLORS[i % COLORS.length]];
      const kind = KINDS[i % KINDS.length];
      for (const cell of [pair.a, pair.b]) {
        const { x, y } = mid(cell);
        drawFloorJelly(ctx, x, y, step * 0.66, color, kind);
      }
    });
  }, [puzzle, paths, ownerOf, joined, total]);

  /* ---------- 화면 ---------- */

  const reset = () => {
    rang.current = 0;
    setPaths(puzzle.pairs.map(() => []));
    if (!muted) playWrong();
  };

  return (
    <>
      <header className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 pt-3 pb-2.5">
        <Link to="/" className="justify-self-start text-base text-ink-soft">
          ‹ 선반
        </Link>
        <h1 className="font-display text-lg">길 만들기</h1>
        <span className="justify-self-end text-xs text-ink-faint tabular-nums">
          {best ? `최고 ${best}판` : ""}
        </span>
      </header>

      <div className="flex flex-none items-baseline justify-between px-5 pb-2">
        <span className="font-display text-2xl tabular-nums">{level}판</span>
        <span className="text-xs text-ink-faint tabular-nums">
          이은 젤리 {linked}/{puzzle.pairs.length} · 채운 칸 {filled}/{total}
        </span>
      </div>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-4">
        <div className="w-full max-w-[380px] rounded-3xl bg-accent-bg p-2">
          <canvas ref={canvasRef} className="block aspect-square w-full touch-none select-none" />
        </div>

        <p className="mt-3 h-5 text-center text-sm text-ink-soft">
          {won ? "다 이었어요!" : "같은 젤리끼리 이어요 · 빈 칸이 없어야 해요"}
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl bg-surface px-5 py-2.5 text-sm font-medium text-ink-soft transition active:scale-95"
          >
            다시 그리기
          </button>
          <button
            type="button"
            onClick={() => load(won ? level + 1 : level)}
            className="rounded-2xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition active:scale-95"
          >
            {won ? "다음 판" : "다른 판"}
          </button>
        </div>
      </main>
    </>
  );
}
