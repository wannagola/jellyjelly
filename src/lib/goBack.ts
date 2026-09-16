import { useCallback } from "react";
import { useNavigate } from "react-router";

/**
 * 뒤로가기. 홈 화면에 띄운 앱은 브라우저 뒤로가기 버튼이 없고,
 * 앱을 다시 열면 히스토리가 비어 있을 수 있다. 그때 navigate(-1)은
 * 아무 일도 하지 않아서 화면에 갇힌다. 갈 곳이 없으면 정해둔 데로 보낸다.
 */
export function useGoBack(fallback = "/") {
  const navigate = useNavigate();
  return useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
