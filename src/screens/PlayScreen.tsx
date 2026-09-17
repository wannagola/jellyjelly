import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router";
import { AppBar } from "../components/AppBar";
import { db } from "../data/db";

interface Toy {
  to: string;
  icon: string;
  name: string;
  about: string;
  /** 최고 기록을 담아둔 자리. 없으면 기록이 안 남는 장난감이다. */
  bestKey?: string;
  bestUnit?: string;
}

/**
 * 만지작거리는 것과 머리 쓰는 것을 갈라 놓는다.
 *
 * 둘은 찾아오는 마음이 다르다. 멍하니 만지고 싶을 때와 한번 겨뤄보고 싶을 때가
 * 섞여 있으면 여덟 줄을 다 읽어야 고를 수 있다.
 */
const IDLE: Toy[] = [
  { to: "/tummy", icon: "🐘", name: "코끼리 배", about: "두드리고, 코 당기고, 쓰다듬어요" },
  { to: "/waxball", icon: "🥚", name: "젤리 왁뿌볼", about: "왁스를 다 부수면 말랑이가 나와요" },
];

const THINK: Toy[] = [
  {
    to: "/acorn",
    icon: "🐿️",
    name: "도토리 받기",
    about: "떨어지는 도토리를 받고 밤송이는 피해요",
    bestKey: "acornBest",
    bestUnit: "개",
  },
  {
    to: "/count",
    icon: "⚖️",
    name: "개수 비교",
    about: "젤리가 더 많은 쪽을 빠르게",
    bestKey: "countBest",
    bestUnit: "개",
  },
  {
    to: "/order",
    icon: "🎵",
    name: "순서 외우기",
    about: "반짝인 젤리를 그 순서대로",
    bestKey: "orderBest",
    bestUnit: "판",
  },
  {
    to: "/path",
    icon: "🧩",
    name: "길 만들기",
    about: "같은 젤리끼리 잇고 빈 칸은 남기지 않기",
    bestKey: "pathBest",
    bestUnit: "판",
  },
  {
    to: "/spin",
    icon: "🔄",
    name: "도형 회전하기",
    about: "돌린 것만 정답, 뒤집은 건 오답",
    bestKey: "spinBest",
    bestUnit: "개",
  },
  {
    to: "/fold",
    icon: "🎚️",
    name: "돌려 맞추기",
    about: "돌리고 뒤집어서, 가장 적은 횟수로",
    bestKey: "foldBest",
    bestUnit: "개",
  },
  {
    to: "/potion",
    icon: "🧪",
    name: "마법약 만들기",
    about: "섞어 보며 재료의 색을 알아내요",
    bestKey: "potionBest",
    bestUnit: "점",
  },
];

const KEYS = [...IDLE, ...THINK].map((t) => t.bestKey).filter(Boolean) as string[];

export function PlayScreen() {
  const bests = useLiveQuery(async () => {
    const rows = await db.meta.bulkGet(KEYS);
    const out: Record<string, number> = {};
    KEYS.forEach((key, i) => {
      const value = rows[i]?.value;
      if (typeof value === "number" && value > 0) out[key] = value;
    });
    return out;
  }, []);

  return (
    <>
      <AppBar title="PLAY GROUND" lead={<Link to="/">‹ 선반</Link>} />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
        <p className="mb-4 px-1 text-xs leading-relaxed text-ink-soft">
          기록과는 상관없는 것들이에요. 소리가 나니까 무음 모드는 풀고 해보세요.
        </p>

        <Group title="만지작거리기" toys={IDLE} bests={bests} />
        <Group title="머리 쓰기" toys={THINK} bests={bests} />
      </main>
    </>
  );
}

function Group({
  title,
  toys,
  bests,
}: {
  title: string;
  toys: Toy[];
  bests?: Record<string, number>;
}) {
  return (
    <>
      <h2 className="mt-5 mb-2 px-1 text-xs tracking-wide text-ink-soft first:mt-0">{title}</h2>
      <ul className="flex flex-col gap-2">
        {toys.map((toy) => {
          const best = toy.bestKey ? bests?.[toy.bestKey] : undefined;
          return (
            <li key={toy.to}>
              <Link
                to={toy.to}
                className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 transition active:scale-[.99]"
              >
                <span className="text-2xl leading-none">{toy.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base">{toy.name}</span>
                  <span className="block text-xs text-ink-soft">{toy.about}</span>
                </span>
                {/* 흩어져 있던 최고 기록을 여기 한 줄로 모은다 */}
                {best ? (
                  <span className="flex-none text-xs text-ink-faint tabular-nums">
                    최고 {best}
                    {toy.bestUnit}
                  </span>
                ) : null}
                <span className="text-lg text-ink-faint">›</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
