import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import { JellyFace } from "./JellyFace";
import { Stars } from "./Stars";
import { db, deleteEntry } from "../data/db";
import { usePhotoUrl } from "../lib/photo";

/**
 * 병에서 젤리 한 알을 눌렀을 때 뜨는 기록.
 * 병이 장식이 아니라 목차가 되는 지점이라, 여기서 바로 젤리로도 넘어갈 수 있어야 한다.
 */
export function EntrySheet({ entryId, onClose }: { entryId?: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      {entryId ? <Sheet key={entryId} entryId={entryId} onClose={onClose} /> : null}
    </AnimatePresence>
  );
}

function Sheet({ entryId, onClose }: { entryId: string; onClose: () => void }) {
  const [confirming, setConfirming] = useState(false);

  const data = useLiveQuery(async () => {
    const entry = await db.entries.get(entryId);
    if (!entry) return { entry: undefined, jelly: undefined, nth: 0 };
    const [jelly, before] = await Promise.all([
      db.jellies.get(entry.jellyId),
      db.entries
        .where("jellyId")
        .equals(entry.jellyId)
        .filter((e) => e.status === "done" && (e.finishedAt ?? 0) <= (entry.finishedAt ?? 0))
        .count(),
    ]);
    return { entry, jelly, nth: before };
  }, [entryId]);

  const photo = usePhotoUrl(data?.entry?.photo);
  const entry = data?.entry;
  const jelly = data?.jelly;

  return (
    <>
      <motion.button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-ink/30"
      />
      <motion.div
        role="dialog"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] rounded-t-3xl bg-surface px-5 pt-2.5 pb-7 shadow-[0_-8px_28px_rgba(59,36,48,.16)]"
      >
        <span className="mx-auto mb-3.5 block h-1 w-9 rounded-full bg-line" />

        {jelly && entry ? (
          <>
            {photo ? (
              <img
                src={photo}
                alt=""
                className="mx-auto mb-3.5 max-h-[34vh] max-w-full rounded-2xl"
              />
            ) : null}

            <div className="flex items-center gap-3">
              <JellyFace jelly={jelly} size={46} radius={15} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg">{jelly.name}</p>
                <p className="text-xs text-ink-soft">
                  {entry.finishedAt ? format(entry.finishedAt, "M월 d일") : "먹는 중"}
                  {jelly.brand ? ` · ${jelly.brand}` : ""}
                  {data.nth > 0 ? ` · ${data.nth}번째` : ""}
                </p>
              </div>
              {typeof entry.rating === "number" ? <Stars value={entry.rating} size={13} /> : null}
            </div>

            {entry.review ? (
              <p className="mt-3 rounded-2xl bg-bg px-3.5 py-2.5 text-sm leading-relaxed">
                {entry.review}
              </p>
            ) : null}

            <div className="mt-4 flex items-center gap-2">
              <Link
                to={`/jelly/${jelly.id}`}
                className="flex-1 rounded-2xl bg-accent-bg py-3 text-center text-base font-medium text-accent"
              >
                젤리 보기
              </Link>
              {confirming ? (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteEntry(entry.id);
                    onClose();
                  }}
                  className="rounded-2xl bg-accent px-4 py-3 text-base text-white"
                >
                  정말 지울까요
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="rounded-2xl px-4 py-3 text-base text-ink-faint"
                >
                  지우기
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-ink-soft">기록을 찾지 못했어요</p>
        )}
      </motion.div>
    </>
  );
}
