import { useEffect, useMemo } from "react";

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

/** Blob을 <img src>로 쓸 수 있게. 바뀌거나 사라질 때 URL을 되돌려준다. */
export function usePhotoUrl(photo?: Blob | null): string | undefined {
  const url = useMemo(() => (photo ? URL.createObjectURL(photo) : undefined), [photo]);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return url;
}
