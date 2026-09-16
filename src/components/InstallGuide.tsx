import { useState } from "react";
import { promptInstall, useInstallWay } from "../lib/install";

/**
 * 홈 화면에 추가하기.
 *
 * 아이폰에는 버튼을 못 만든다. 애플이 공유 시트를 여는 방법도, 홈 화면에
 * 무언가를 꽂는 방법도 웹에 안 열어줬다. 그래서 여기서는 눌러야 할 자리를
 * 그 자리에 있는 그림 그대로 짚어준다. 글로만 "공유를 누르세요" 하면
 * 사파리 아래쪽의 그 조그만 아이콘을 못 찾는다.
 */
export function InstallGuide() {
  const way = useInstallWay();
  const [result, setResult] = useState<string>();

  if (way === "installed") {
    return (
      <section className="rounded-2xl bg-accent-bg p-4">
        <p className="text-base font-medium text-accent">홈 화면 앱으로 열려 있어요</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          여기가 기록이 가장 안전하게 쌓이는 자리예요. 앞으로도 홈 화면 아이콘으로
          열어 주세요.
        </p>
      </section>
    );
  }

  // 안드로이드와 PC 크롬은 진짜 버튼이 된다
  if (way === "button") {
    return (
      <section className="rounded-2xl bg-surface p-4">
        <p className="text-sm leading-relaxed text-ink-soft">
          홈 화면에 아이콘을 만들어 두면 주소창 없이 앱처럼 열리고, 한동안 안
          열어도 기록이 지워지지 않아요.
        </p>
        <button
          type="button"
          onClick={async () => {
            const outcome = await promptInstall();
            if (outcome === "accepted") setResult("홈 화면에 추가했어요");
            else if (outcome === "dismissed") setResult("나중에 다시 눌러도 돼요");
            else setResult("지금은 설치 창을 띄울 수 없어요");
          }}
          className="mt-3 w-full rounded-xl bg-accent py-3 font-display text-base text-white transition active:scale-[.98]"
        >
          홈 화면에 추가
        </button>
        {result ? <p className="mt-2 text-center text-xs text-ink-soft">{result}</p> : null}
      </section>
    );
  }

  // 카카오톡·인스타그램 안에서 열린 창. 여기만 정말로 밖으로 나가야 한다.
  if (way === "ios-inapp") {
    return (
      <section className="rounded-2xl bg-surface p-4">
        <p className="text-sm leading-relaxed">
          지금은 <b className="font-medium">다른 앱 안에서 열린 창</b>이라 홈 화면에 추가할 수 없어요.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          오른쪽 아래(또는 위) 메뉴에서 <b className="font-medium text-ink">Safari로 열기</b> 나{" "}
          <b className="font-medium text-ink">다른 브라우저로 열기</b>를 누른 다음, 아래 순서대로
          하면 됩니다.
        </p>
        <IOSSteps where="사파리나 크롬의 공유 버튼" />
        <Caveat />
      </section>
    );
  }

  // iOS 의 크롬·엣지·파이어폭스. 사파리로 옮길 필요 없다.
  if (way === "ios-browser") {
    return (
      <section className="rounded-2xl bg-surface p-4">
        <p className="text-sm leading-relaxed">
          아이폰은 <b className="font-medium">버튼 하나로는 안 돼요.</b> 사파리든 크롬이든
          웹페이지에 그 권한을 안 줍니다. 대신 세 번만 누르면 됩니다.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          지금 쓰는 브라우저에서 그대로 하면 돼요. 사파리로 옮길 필요 없습니다.
        </p>
        <IOSSteps where="주소창 옆 공유 버튼 (없으면 ⋮ 메뉴 안의 공유)" />
        <Caveat />
      </section>
    );
  }

  // iOS 사파리, 그리고 정체를 모르겠는 나머지
  return (
    <section className="rounded-2xl bg-surface p-4">
      <p className="text-sm leading-relaxed">
        아이폰은 <b className="font-medium">버튼 하나로는 안 돼요.</b> 사파리가 웹페이지에
        그 권한을 안 줍니다. 대신 세 번만 누르면 됩니다.
      </p>
      <IOSSteps where="화면 아래 가운데의 공유 버튼" />
      <Caveat />
    </section>
  );
}

function IOSSteps({ where }: { where: string }) {
  return (
    <ol className="mt-3.5 flex flex-col gap-3">
      {/* 자리 이름이 브라우저마다 달라서 조사를 붙이면 '버튼를' 이 된다. 줄표로 끊는다. */}
      <Step n={1}>
        <b className="font-medium text-ink">{where}</b>
        <span className="mx-1.5 inline-flex translate-y-[3px]">
          <ShareIcon />
        </span>
        — 여기를 누르세요
      </Step>
      <Step n={2}>
        올라온 목록을 밀어 올려 <b className="font-medium text-ink">홈 화면에 추가</b>
        <span className="ml-1.5 inline-flex translate-y-[3px]">
          <PlusSquare />
        </span>
      </Step>
      <Step n={3}>
        오른쪽 위 <b className="font-medium text-ink">추가</b>를 누르면 끝
      </Step>
    </ol>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 grid size-[21px] flex-none place-items-center rounded-full bg-accent font-display text-tiny text-white">
        {n}
      </span>
      <span className="text-sm leading-relaxed text-ink-soft">{children}</span>
    </li>
  );
}

function Caveat() {
  return (
    <p className="mt-3.5 border-t border-line pt-3 text-tiny leading-relaxed text-ink-faint">
      추가한 뒤에는 <b className="font-medium text-ink-soft">그 아이콘으로만</b> 여세요.
      사파리 탭과 홈 화면 앱은 기록이 따로 쌓입니다. 지금 모은 젤리가 있다면
      옮기기 전에 백업 파일을 먼저 내려받으세요.
    </p>
  );
}

/** 사파리 공유 버튼 — 네모에서 화살표가 위로 빠져나오는 그림 */
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[17px] text-accent" aria-hidden>
      <path
        d="M12 3.2v10.6M12 3.2 8.6 6.7M12 3.2l3.4 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.6 9.8H6.2a1.8 1.8 0 0 0-1.8 1.8v7.4a1.8 1.8 0 0 0 1.8 1.8h11.6a1.8 1.8 0 0 0 1.8-1.8v-7.4a1.8 1.8 0 0 0-1.8-1.8h-1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 공유 시트의 '홈 화면에 추가' 옆 그림 */
function PlusSquare() {
  return (
    <svg viewBox="0 0 24 24" className="size-[17px] text-accent" aria-hidden>
      <rect
        x="3.4"
        y="3.4"
        width="17.2"
        height="17.2"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M12 8.2v7.6M8.2 12h7.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
