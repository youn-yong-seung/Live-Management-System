import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#0a1a1a] via-[#071515] to-[#050A0A]">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#CC9965]/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#005051]/40 rounded-full blur-[80px]" />

      <div className="relative glass-card-gold w-full max-w-md p-8 sm:p-10 rounded-3xl">
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-[#CC9965] tracking-tight mb-1">윤자동</div>
          <div className="text-xs font-semibold text-white/50 border border-white/15 rounded px-2 py-0.5 inline-block">클래스</div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white text-center mb-2">로그인 / 회원가입</h1>
        <p className="text-sm text-white/50 text-center mb-8 leading-relaxed">
          한 번의 로그인으로 라이브, 자료실, 커뮤니티까지 모두 이용하세요.
        </p>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold text-sm px-5 py-3.5 rounded-xl hover:bg-white/90 transition-all cursor-pointer disabled:opacity-50"
          data-testid="btn-login-google"
        >
          <GoogleIcon />
          Google 계정으로 시작하기
        </button>

        <p className="mt-8 text-[11px] text-white/30 text-center leading-relaxed">
          로그인 시 윤자동 클래스의 이용약관과 개인정보처리방침에 동의하는 것으로 간주합니다.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A9 9 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
