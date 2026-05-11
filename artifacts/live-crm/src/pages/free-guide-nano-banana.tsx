import { useState } from "react";
import { Link } from "wouter";
import {
  Download,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  X,
  Gift,
  FileText,
  Zap,
} from "lucide-react";

const PDF_URL = "/files/nano-banana-vs-duct-tape-guide-v1.pdf";
const PDF_FILENAME = "나노바나나vs덕테이프_프롬프트가이드_v1.pdf";
const KAKAO_ROOM_URL = "https://open.kakao.com/o/gCM9Aehi";

const HIGHLIGHTS = [
  "나노바나나(Gemini 2.5 Flash Image) vs 덕테이프(Sora 등) 실전 비교",
  "어떤 작업에 어떤 모델을 써야 하는지 — 케이스별 의사결정 기준",
  "복붙해서 바로 쓰는 프롬프트 템플릿",
  "결과 비교 이미지 + 비용 / 속도 / 품질 트레이드오프",
];

export default function FreeGuideNanoBanana() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = PDF_URL;
    a.download = PDF_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setDownloaded(true);
    setTimeout(() => setShowInviteModal(true), 700);
  };

  return (
    <div className="space-y-10">
      {/* Back link */}
      <div>
        <Link href="/resources">
          <span className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-[#CC9965] transition-colors cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" /> 무료 자료 전체 보기
          </span>
        </Link>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 glass-card-gold">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a1a] via-[#071515] to-[#050A0A] opacity-80" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#CC9965]/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#005051]/40 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-emerald-500/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 text-emerald-300 border border-emerald-500/20">
            <Gift className="h-4 w-4" />
            무료 PDF 가이드
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
            나노바나나 vs 덕테이프<br />
            <span className="text-[#CC9965]">프롬프트 가이드</span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base mb-8 max-w-xl leading-relaxed">
            AI 이미지 / 영상 생성, 어떤 모델을 언제 써야 할까?
            실전에서 바로 쓰는 프롬프트와 케이스별 의사결정 기준을 한 권에 담았습니다.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 bg-[#CC9965] text-black font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#d4a570] transition-all cursor-pointer gold-glow"
              data-testid="btn-download-pdf"
            >
              <Download className="h-4 w-4" />
              {downloaded ? "다시 다운로드" : "PDF 무료 다운로드"}
            </button>
            <a
              href={KAKAO_ROOM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/20 text-white/80 font-semibold text-sm px-6 py-3 rounded-xl hover:bg-white/5 hover:border-white/30 transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              매주 무료 특강 대기방
            </a>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-white/40">
            <FileText className="h-3.5 w-3.5" />
            PDF · 약 1.1MB · 윤자동 클래스 무료 배포
          </div>
        </div>
      </div>

      {/* What's inside */}
      <div className="grid gap-8 md:grid-cols-2">
        <div className="glass-card p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="h-4 w-4 text-[#CC9965]" />
            <h2 className="text-base font-bold text-white">이 가이드에 담긴 것</h2>
          </div>
          <ul className="space-y-3">
            {HIGHLIGHTS.map((line) => (
              <li key={line} className="flex items-start gap-3 text-sm text-white/70 leading-relaxed">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card-gold p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Zap className="h-4 w-4 text-[#CC9965]" />
            <h2 className="text-base font-bold text-white">이런 분께 추천</h2>
          </div>
          <ul className="space-y-3 text-sm text-white/70 leading-relaxed">
            <li className="flex items-start gap-3">
              <span className="text-[#CC9965] font-bold">·</span>
              <span>AI로 콘텐츠 만들고 싶은데 어떤 툴부터 써야 할지 막막한 분</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#CC9965] font-bold">·</span>
              <span>프롬프트 잘 못 짜서 결과물이 마음에 안 드는 분</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#CC9965] font-bold">·</span>
              <span>업무에 AI를 실전 투입하고 싶은 1인 사업자 / 마케터 / 크리에이터</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Big download CTA */}
      <div className="glass-card p-8 sm:p-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#CC9965]/15 border border-[#CC9965]/30 mb-5">
          <Download className="h-6 w-6 text-[#CC9965]" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">지금 바로 다운로드</h3>
        <p className="text-sm text-white/50 mb-6">
          가입 / 로그인 없이 받아갈 수 있습니다. 도움이 됐다면 주변에도 공유해주세요.
        </p>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 bg-[#CC9965] text-black font-bold text-sm px-7 py-3.5 rounded-xl hover:bg-[#d4a570] transition-all cursor-pointer gold-glow"
        >
          <Download className="h-4 w-4" />
          PDF 다운로드
        </button>
      </div>

      {/* Soft funnel — 라이브 대기방 */}
      <div className="glass-card-gold p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-14 h-14 rounded-2xl bg-[#CC9965]/15 border border-[#CC9965]/30 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-6 w-6 text-[#CC9965]" />
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-rose-500/15 rounded-full px-3 py-1 text-xs font-bold text-rose-300 border border-rose-500/20 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              매주 새로운 무료 자료 + 라이브
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
              윤자동 무료 특강 대기방
            </h3>
            <p className="text-sm text-white/60 leading-relaxed mb-5">
              매주 진행되는 AI · 자동화 무료 라이브 특강 일정 안내,
              오늘 같은 PDF / 프롬프트 / 템플릿이 가장 먼저 풀리는 곳입니다.
              가이드 받으셨다면 대기방에서 다음 자료까지 챙겨가세요.
            </p>
            <a
              href={KAKAO_ROOM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#CC9965] text-black font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#d4a570] transition-all cursor-pointer"
              data-testid="btn-join-kakao-room"
            >
              <MessageCircle className="h-4 w-4" />
              카톡 대기방 입장하기
            </a>
          </div>
        </div>
      </div>

      {/* Final note */}
      <p className="text-center text-xs text-white/30 pt-4">
        자동화 필요하면 윤자동 + 구독
      </p>

      {/* Post-download invite modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="glass-card-gold relative max-w-md w-full p-8 rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 mb-4">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">다운로드 시작했어요</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-6">
                PDF 잘 받으셨나요? <br />
                <span className="text-[#CC9965] font-semibold">매주 새로 풀리는 무료 자료와 라이브 특강</span>은
                카톡 대기방에서 가장 먼저 안내드립니다.
              </p>

              <div className="flex flex-col gap-2">
                <a
                  href={KAKAO_ROOM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-[#CC9965] text-black font-bold text-sm px-5 py-3 rounded-xl hover:bg-[#d4a570] transition-all"
                  onClick={() => setShowInviteModal(false)}
                >
                  <MessageCircle className="h-4 w-4" />
                  지금 대기방 입장하기
                </a>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-xs text-white/40 hover:text-white/70 py-2 transition-colors"
                >
                  나중에 할게요
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
