import { NavLink, useLocation, useNavigate } from "react-router";

const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;

const ICONS = {
  jar: (
    <svg viewBox="0 0 24 24" {...s} strokeLinejoin="round">
      <path d="M7.5 3h9v2.2a3 3 0 0 0 .9 2.1A4 4 0 0 1 18.6 10v8.2A2.8 2.8 0 0 1 15.8 21H8.2a2.8 2.8 0 0 1-2.8-2.8V10a4 4 0 0 1 1.2-2.7 3 3 0 0 0 .9-2.1V3Z" />
      <path d="M5.4 13.6h13.2" />
    </svg>
  ),
  cal: (
    <svg viewBox="0 0 24 24" {...s} strokeLinecap="round">
      <rect x="3.4" y="5" width="17.2" height="15.6" rx="3" />
      <path d="M3.4 9.8h17.2M8 3v3.4M16 3v3.4" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" {...s} strokeLinejoin="round">
      <path d="M4 4.6A1.6 1.6 0 0 1 5.6 3H18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5.6A1.6 1.6 0 0 1 4 19.4V4.6Z" />
      <path d="M8 3v18" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" {...s} strokeLinejoin="round">
      <path d="M12 2.8c0 4.3 2.4 6.7 6.7 6.7-4.3 0-6.7 2.4-6.7 6.7 0-4.3-2.4-6.7-6.7-6.7 4.3 0 6.7-2.4 6.7-6.7Z" />
      <path d="M18 15.4c0 2-1.1 3.1-3.1 3.1 2 0 3.1 1.1 3.1 3.1 0-2 1.1-3.1 3.1-3.1-2 0-3.1-1.1-3.1-3.1Z" />
    </svg>
  ),
};

/** 탭은 넷까지다. 다섯을 넘으면 손가락이 헤맨다.
    설정은 자주 갈 일이 없어서 보관함 오른쪽 위로 뺐다. */
const TABS = [
  { to: "/", icon: ICONS.jar, label: "보관함" },
  { to: "/calendar", icon: ICONS.cal, label: "달력" },
  { to: "/dex", icon: ICONS.book, label: "도감" },
  { to: "/recommend", icon: ICONS.spark, label: "추천" },
] as const;

export function TabBar() {
  const navigate = useNavigate();
  // 선반은 보관함에서 펼쳐 보는 화면이라 탭도 보관함에 머문다
  const onShelf = useLocation().pathname.startsWith("/jars");

  return (
    <nav className="relative flex-none border-t border-line bg-surface safe-b">
      <div className="grid grid-cols-4 items-center px-1.5 pt-2 pb-1.5">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 text-[10px] transition-colors ${
                isActive || (onShelf && t.to === "/") ? "text-accent" : "text-ink-faint"
              }`
            }
          >
            <span className="block size-[22px]">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate("/record")}
        aria-label="젤리 기록하기"
        className="absolute left-1/2 -top-6 grid size-14 -translate-x-1/2 place-items-center rounded-full border-4 border-bg bg-accent text-white shadow-[0_6px_16px_rgba(224,86,140,.45)] active:scale-95 transition-transform"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M12 5.6v12.8M5.6 12h12.8" />
        </svg>
      </button>
    </nav>
  );
}
