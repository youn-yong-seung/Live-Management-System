import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

export default function AuthCallback() {
  const { loading, user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate("/");
      return;
    }
    const timer = setTimeout(() => navigate("/login"), 2000);
    return () => clearTimeout(timer);
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 hero-bg relative overflow-hidden">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-2 border-[#CC9965] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#484d57] text-sm">
          {loading ? "로그인 처리 중..." : user ? "환영합니다! 홈으로 이동합니다." : "로그인 정보를 확인할 수 없습니다. 다시 시도해주세요."}
        </p>
      </div>
    </div>
  );
}
