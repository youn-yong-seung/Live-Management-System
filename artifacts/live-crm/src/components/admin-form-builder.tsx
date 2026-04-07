import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Sparkles, Check, X, Plus, GripVertical, Info, Eye,
} from "lucide-react";

interface RecommendedQuestion {
  question: string;
  questionType: string;
  options?: string[];
  purpose: string;
}

interface FormConfig {
  showEmail: boolean;
  showIndustry: boolean;
  showChannelSource: boolean;
  showSkillLevel: boolean;
  showMessage: boolean;
  showMarketingConsent: boolean;
  industryOptions: string[] | null;
  channelSourceOptions: string[] | null;
  aiRecommendedQuestions: RecommendedQuestion[] | null;
  thankYouTitle: string | null;
  thankYouBody: string | null;
}

interface ChannelSource {
  id: number; name: string; category: string | null;
}

function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem("crm_admin_token");
  return fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-Admin-Token": token || "", ...opts?.headers },
  }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "요청 실패");
    if (r.status === 204) return null as T;
    return r.json();
  });
}

export function AdminFormBuilder({ liveId, liveTitle }: { liveId: number; liveTitle: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [config, setConfig] = useState<FormConfig>({
    showEmail: true, showIndustry: true, showChannelSource: true,
    showSkillLevel: false, showMessage: true, showMarketingConsent: true,
    industryOptions: null, channelSourceOptions: null,
    aiRecommendedQuestions: null, thankYouTitle: null, thankYouBody: null,
  });

  const [channelSources, setChannelSources] = useState<ChannelSource[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [formConfig, sources] = await Promise.all([
          apiFetch<FormConfig | null>(`/lives/${liveId}/form-config`),
          apiFetch<ChannelSource[]>("/channel-sources"),
        ]);
        if (formConfig) setConfig(formConfig);
        setChannelSources(sources);
        if (formConfig?.aiRecommendedQuestions) {
          setRecommendations(formConfig.aiRecommendedQuestions);
          setSelectedQuestions(new Set(formConfig.aiRecommendedQuestions.map((_, i) => i)));
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [liveId]);

  const generateQuestions = async () => {
    setGenerating(true);
    try {
      const data = await apiFetch<{ recommendations: RecommendedQuestion[] }>(`/lives/${liveId}/ai-recommend-questions`, { method: "POST" });
      setRecommendations(data.recommendations);
      setSelectedQuestions(new Set(data.recommendations.map((_, i) => i)));
      toast({ title: `${data.recommendations.length}개 추천 질문 생성!` });
    } catch (e) {
      toast({ variant: "destructive", title: (e as Error).message });
    }
    setGenerating(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const selected = recommendations.filter((_, i) => selectedQuestions.has(i));
      const saveData = {
        showEmail: config.showEmail,
        showIndustry: config.showIndustry,
        showChannelSource: config.showChannelSource,
        showSkillLevel: config.showSkillLevel,
        showMessage: config.showMessage,
        showMarketingConsent: config.showMarketingConsent,
        industryOptions: config.industryOptions,
        channelSourceOptions: config.channelSourceOptions,
        aiRecommendedQuestions: selected.length > 0 ? selected : null,
        thankYouTitle: config.thankYouTitle,
        thankYouBody: config.thankYouBody,
      };
      console.log("[FormBuilder] Saving:", JSON.stringify(saveData));
      const saved = await apiFetch<FormConfig>(`/lives/${liveId}/form-config`, {
        method: "PUT",
        body: JSON.stringify(saveData),
      });
      if (saved) {
        setConfig(saved);
        console.log("[FormBuilder] Saved response:", JSON.stringify(saved));
      }
      toast({ title: "폼 설정 저장 완료!" });
    } catch (e) {
      toast({ variant: "destructive", title: (e as Error).message });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 text-sm">신청폼 설정 — {liveTitle}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-3.5 w-3.5 mr-1" />{showPreview ? "미리보기 닫기" : "미리보기"}
          </Button>
          <Button size="sm" className="rounded-lg text-xs" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}저장
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left: Settings */}
        <div className="flex-1 space-y-5">
          {/* 기본 필드 토글 */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">기본 필드</Label>
            {[
              { key: "showEmail" as const, label: "이메일" },
              { key: "showIndustry" as const, label: "업종" },
              { key: "showChannelSource" as const, label: "유입경로 (어디서 보고 오셨나요?)" },
              { key: "showSkillLevel" as const, label: "AI/툴 활용 수준" },
              { key: "showMessage" as const, label: "사전 질문" },
              { key: "showMarketingConsent" as const, label: "마케팅 수신 동의" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-700">{label}</span>
                <Switch checked={config[key]} onCheckedChange={(v) => setConfig((c) => ({ ...c, [key]: v }))} />
              </div>
            ))}
          </div>

          {/* 유입경로 커스텀 */}
          {config.showChannelSource && (() => {
            // Build ordered list: channelSourceOptions order first, then remaining
            const currentOrder = config.channelSourceOptions ?? channelSources.map((x) => x.name);
            const orderedSources = [
              ...currentOrder.map((name) => channelSources.find((s) => s.name === name)).filter(Boolean) as ChannelSource[],
              ...channelSources.filter((s) => !currentOrder.includes(s.name)),
            ];
            // Remove duplicates
            const seen = new Set<number>();
            const uniqueSources = orderedSources.filter((s) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });

            return (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">유입경로 옵션</Label>
              <p className="text-[10px] text-gray-400">드래그로 순서 변경, 체크로 표시/숨김</p>
              <div className="max-h-[250px] overflow-y-auto space-y-0.5 p-2 bg-gray-50 rounded-lg border">
                {uniqueSources.map((s, idx) => {
                  const included = !config.channelSourceOptions || config.channelSourceOptions.includes(s.name);
                  return (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("bg-blue-50"); }}
                      onDragLeave={(e) => e.currentTarget.classList.remove("bg-blue-50")}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("bg-blue-50");
                        if (dragIdx === null || dragIdx === idx) return;
                        setConfig((c) => {
                          const list = [...(c.channelSourceOptions ?? uniqueSources.map((x) => x.name))];
                          const [moved] = list.splice(dragIdx, 1);
                          list.splice(idx, 0, moved);
                          return { ...c, channelSourceOptions: list };
                        });
                        setDragIdx(null);
                      }}
                      className={`flex items-center justify-between py-1 px-1 rounded transition-colors ${dragIdx === idx ? "opacity-50" : ""} ${included ? "" : "opacity-40"}`}
                    >
                      <div className="flex items-center gap-1.5 flex-1 cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-3 w-3 text-gray-300 flex-shrink-0" />
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 flex-1">
                          <input
                            type="checkbox" checked={included}
                            onChange={(e) => {
                              setConfig((c) => {
                                const current = c.channelSourceOptions ?? uniqueSources.map((x) => x.name);
                                const next = e.target.checked
                                  ? current.includes(s.name) ? current : [...current, s.name]
                                  : current.filter((n) => n !== s.name);
                                return { ...c, channelSourceOptions: next };
                              });
                            }}
                            className="rounded"
                          />
                          {s.name}
                          {s.category && <span className="text-[9px] text-gray-400">({s.category})</span>}
                        </label>
                      </div>
                      <button className="text-gray-300 hover:text-red-400 p-0.5 flex-shrink-0" title="삭제" onClick={() => {
                        apiFetch(`/channel-sources/${s.id}`, { method: "DELETE" }).then(() => {
                          setChannelSources((prev) => prev.filter((x) => x.id !== s.id));
                          setConfig((c) => ({
                            ...c,
                            channelSourceOptions: (c.channelSourceOptions ?? uniqueSources.map((x) => x.name)).filter((n) => n !== s.name),
                          }));
                        });
                      }}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {/* 새 유입경로 추가 */}
              <div className="flex gap-2">
                <Input
                  id="new-channel-input"
                  placeholder="새 유입경로 추가"
                  className="h-7 text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const input = e.currentTarget;
                      const name = input.value.trim();
                      if (!name) return;
                      apiFetch<ChannelSource>("/channel-sources", { method: "POST", body: JSON.stringify({ name, category: "기타" }) }).then((s) => {
                        setChannelSources((prev) => [...prev, s]);
                        setConfig((c) => ({
                          ...c,
                          channelSourceOptions: [...(c.channelSourceOptions ?? channelSources.map((x) => x.name)), name],
                        }));
                        input.value = "";
                      }).catch((err) => toast({ variant: "destructive", title: (err as Error).message }));
                    }
                  }}
                />
                <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                  const input = document.getElementById("new-channel-input") as HTMLInputElement;
                  const name = input?.value.trim();
                  if (!name) return;
                  apiFetch<ChannelSource>("/channel-sources", { method: "POST", body: JSON.stringify({ name, category: "기타" }) }).then((s) => {
                    setChannelSources((prev) => [...prev, s]);
                    setConfig((c) => ({
                      ...c,
                      channelSourceOptions: [...(c.channelSourceOptions ?? channelSources.map((x) => x.name)), name],
                    }));
                    input.value = "";
                  }).catch((err) => toast({ variant: "destructive", title: (err as Error).message }));
                }}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            );
          })()}

          {/* AI 추천 질문 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">AI 추천 질문</Label>
              <Button variant="outline" size="sm" className="rounded-lg text-xs h-7" onClick={generateQuestions} disabled={generating}>
                {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                AI 추천 생성
              </Button>
            </div>

            {recommendations.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">AI 추천 생성 버튼을 눌러 라이브 주제에 맞는 질문을 추천받으세요</p>
            ) : (
              <div className="space-y-2">
                {recommendations.map((q, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedQuestions.has(i) ? "border-blue-200 bg-blue-50/50" : "border-gray-200 bg-white opacity-60"
                    }`}
                    onClick={() => {
                      setSelectedQuestions((prev) => {
                        const next = new Set(prev);
                        next.has(i) ? next.delete(i) : next.add(i);
                        return next;
                      });
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center ${
                        selectedQuestions.has(i) ? "bg-blue-500 border-blue-500" : "border-gray-300"
                      }`}>
                        {selectedQuestions.has(i) && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{q.question}</p>
                        {q.options && (
                          <p className="text-[10px] text-gray-400 mt-1">옵션: {q.options.join(" / ")}</p>
                        )}
                        <div className="flex items-start gap-1 mt-1.5">
                          <Info className="h-3 w-3 text-blue-400 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-blue-500">{q.purpose}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 감사 페이지 */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">감사 페이지</Label>
            <Input
              placeholder="신청이 완료되었습니다!"
              value={config.thankYouTitle ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, thankYouTitle: e.target.value || null }))}
              className="text-sm"
            />
            <textarea
              placeholder="당일 알림톡으로 접속 링크를 보내드립니다..."
              value={config.thankYouBody ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, thankYouBody: e.target.value || null }))}
              className="w-full text-sm border rounded-lg p-2 resize-none min-h-[80px]"
            />
          </div>
        </div>

        {/* Right: Preview */}
        {showPreview && (
          <div className="w-[280px] flex-shrink-0">
            <div className="sticky top-0 bg-gray-50 rounded-xl border p-4 space-y-3">
              <p className="text-xs font-bold text-gray-600 text-center">폼 미리보기</p>

              <div className="space-y-2.5">
                <div><p className="text-[10px] font-medium text-gray-500">이름 *</p><div className="h-7 bg-white border rounded text-[10px] px-2 flex items-center text-gray-300">이름을 입력해주세요</div></div>
                <div><p className="text-[10px] font-medium text-gray-500">연락처 *</p><div className="h-7 bg-white border rounded text-[10px] px-2 flex items-center text-gray-300">010-0000-0000</div></div>

                {config.showEmail && (
                  <div><p className="text-[10px] font-medium text-gray-500">이메일</p><div className="h-7 bg-white border rounded text-[10px] px-2 flex items-center text-gray-300">example@email.com</div></div>
                )}

                {config.showChannelSource && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-500">어디서 보고 오셨나요? *</p>
                    <div className="text-[9px] text-gray-400 mt-1 space-y-0.5">
                      {(config.channelSourceOptions ?? channelSources.map((s) => s.name)).slice(0, 5).map((s) => (
                        <div key={s} className="flex items-center gap-1"><div className="w-2.5 h-2.5 border rounded-sm" />{s}</div>
                      ))}
                      <span className="text-gray-300">...</span>
                    </div>
                  </div>
                )}

                {config.showIndustry && (
                  <div><p className="text-[10px] font-medium text-gray-500">업종</p><div className="h-7 bg-white border rounded text-[10px] px-2 flex items-center text-gray-300">업종을 선택해주세요</div></div>
                )}

                {/* AI 추천 질문 미리보기 */}
                {recommendations.filter((_, i) => selectedQuestions.has(i)).map((q, i) => (
                  <div key={i}>
                    <p className="text-[10px] font-medium text-gray-500">{q.question}</p>
                    {q.options ? (
                      <div className="text-[9px] text-gray-400 mt-0.5 space-y-0.5">
                        {q.options.slice(0, 3).map((o) => (
                          <div key={o} className="flex items-center gap-1"><div className="w-2.5 h-2.5 border rounded-full" />{o}</div>
                        ))}
                        {q.options.length > 3 && <span className="text-gray-300">+{q.options.length - 3}개</span>}
                      </div>
                    ) : (
                      <div className="h-12 bg-white border rounded text-[10px] px-2 pt-1 text-gray-300">답변 입력...</div>
                    )}
                  </div>
                ))}

                {config.showMessage && (
                  <div><p className="text-[10px] font-medium text-gray-500">사전 질문 (선택)</p><div className="h-12 bg-white border rounded text-[10px] px-2 pt-1 text-gray-300">궁금한 점을 남겨주세요</div></div>
                )}

                {config.showMarketingConsent && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-500">마케팅 수신 동의 *</p>
                    <div className="text-[9px] text-gray-400 mt-0.5 space-y-0.5">
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 border rounded-full" />동의합니다</div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 border rounded-full" />동의하지 않습니다</div>
                    </div>
                  </div>
                )}

                <div className="h-8 bg-blue-500 rounded flex items-center justify-center text-[10px] text-white font-bold">제출</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
