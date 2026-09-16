import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

/** 메일로 여섯 자리 코드를 보낸다. 비밀번호는 쓰지 않는다. */
export async function sendCode(email: string): Promise<void> {
  if (!supabase) throw new Error("서버가 연결되어 있지 않아요");
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    // 가입을 잠가두면 없는 계정으로는 코드가 가지 않는다
    options: { shouldCreateUser: false },
  });
  if (error) throw new Error(codeMessage(error.message));
}

export async function verifyCode(email: string, token: string): Promise<void> {
  if (!supabase) throw new Error("서버가 연결되어 있지 않아요");
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "email",
  });
  if (error) throw new Error(codeMessage(error.message));
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

/** 영어로 된 오류를 사람이 읽을 말로 */
function codeMessage(raw: string): string {
  const text = raw.toLowerCase();
  if (text.includes("signups not allowed") || text.includes("not found")) {
    return "등록되지 않은 메일이에요";
  }
  if (text.includes("expired")) return "코드가 만료됐어요. 다시 받아주세요";
  if (text.includes("invalid")) return "코드가 맞지 않아요";
  if (text.includes("rate") || text.includes("too many")) return "잠시 뒤에 다시 시도해 주세요";
  return "로그인하지 못했어요";
}

/** 지금 로그인한 사람. 서버를 안 붙였으면 언제나 null 이다. */
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
