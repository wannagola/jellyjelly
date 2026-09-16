import type { Jelly } from "../data/types";
import { JELLY_COLORS, JELLY_TINTS } from "../lib/jelly";
import { usePhotoUrl } from "../lib/photo";
import { Jelly as JellyShapeIcon, Pouch } from "./Jelly";

/**
 * 젤리의 얼굴. 봉지 사진이 있으면 사진, 없으면 모양+색.
 * 어느 쪽이든 같은 크기 같은 모서리라 목록이 흐트러지지 않는다.
 */
export function JellyFace({
  jelly,
  size = 44,
  radius = 14,
  className = "",
}: {
  jelly: Pick<Jelly, "name" | "shape" | "color" | "photo">;
  size?: number;
  radius?: number;
  className?: string;
}) {
  const url = usePhotoUrl(jelly.photo);
  const style = { width: size, height: size, borderRadius: radius } as const;

  if (url) {
    return (
      <img
        src={url}
        alt={jelly.name}
        className={`flex-none bg-white object-cover shadow-[inset_0_0_0_1px_var(--line)] ${className}`}
        style={style}
      />
    );
  }

  return (
    <div
      className={`grid flex-none place-items-center ${className}`}
      style={{ ...style, background: JELLY_TINTS[jelly.color] }}
    >
      <JellyShapeIcon shape={jelly.shape} color={jelly.color} size={Math.round(size * 0.62)} />
    </div>
  );
}

/** 아직 사진도 모양도 없는 자리 (새 젤리 만들 때의 미리보기) */
export function EmptyFace({ size = 44, radius = 14 }: { size?: number; radius?: number }) {
  return (
    <div
      className="grid flex-none place-items-center bg-white shadow-[inset_0_0_0_1px_var(--line)]"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <Pouch color={JELLY_COLORS.peach} size={Math.round(size * 0.55)} />
    </div>
  );
}
