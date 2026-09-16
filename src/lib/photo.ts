import { useEffect, useState } from "react";

/**
 * 봉지 사진을 긴 변 640px WebP로 줄여 담는다.
 * 원본을 그대로 넣으면 기기 저장소가 금방 차고, 목록 스크롤이 버벅인다.
 * 장당 40~60KB면 300개를 모아도 20MB 안쪽이다.
 */
export async function compressPhoto(file: File, maxSide = 640, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스를 열지 못했습니다");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return canvas.convertToBlob({ type: "image/webp", quality });
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 열지 못했습니다");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("사진을 변환하지 못했습니다"))),
      "image/webp",
      quality,
    );
  });
}

/**
 * Blob을 <img src>로 쓸 수 있게. 바뀌거나 사라질 때 URL을 되돌려준다.
 *
 * 만드는 것과 되돌리는 것이 반드시 같은 effect 안에 있어야 한다.
 * useMemo 로 만들고 effect 로 되돌리면, StrictMode 가 effect 를 두 번 돌릴 때
 * 첫 정리에서 URL 을 회수해버리고 useMemo 는 값이 안 바뀌었으니 다시 만들지 않는다.
 * 그러면 img 가 이미 죽은 주소를 붙들고 깨진 채로 남는다.
 */
export function usePhotoUrl(photo?: Blob | null): string | undefined {
  const [url, setUrl] = useState<string>();

  // set-state-in-effect 규칙이 말하는 "외부 시스템과의 동기화"가 바로 이 경우다.
  // 브라우저의 URL 레지스트리에 등록하고 그 주소를 화면에 돌려주는 것이라
  // 렌더 중에 만들어낼 수가 없다.
  /* oxlint-disable react/set-state-in-effect */
  useEffect(() => {
    if (!photo) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(photo);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo]);
  /* oxlint-enable react/set-state-in-effect */

  return url;
}
