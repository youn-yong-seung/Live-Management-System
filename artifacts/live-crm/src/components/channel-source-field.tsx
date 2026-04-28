import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Hash,
  MessagesSquare,
  Users,
  Search,
  MoreHorizontal,
  Check,
  AtSign,
  Instagram,
  Youtube,
  type LucideIcon,
} from "lucide-react";

export interface ChannelSourceItem {
  name: string;
  category: string | null;
}

interface Props {
  sources: ChannelSourceItem[];
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  customValue: string;
  onCustomChange: (v: string) => void;
  theme?: "dark" | "light";
  idPrefix?: string;
}

const CUSTOM_PLATFORM = "__custom__";
const CUSTOM_VALUES = new Set(["직접 입력", "기타"]);

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  스레드: AtSign,
  인스타: Instagram,
  유튜브: Youtube,
  SNS: Hash,
  오픈채팅방: MessagesSquare,
  "지인 추천": Users,
  지인: Users,
  검색: Search,
  기타: MoreHorizontal,
};

function iconFor(category: string): LucideIcon {
  return PLATFORM_ICONS[category] ?? MoreHorizontal;
}

/**
 * 2단계 유입경로 선택 필드:
 *   1) 플랫폼(카테고리) 카드 선택
 *   2) 해당 플랫폼의 채널 RadioGroup 선택
 *
 * 저장 형식은 단일 채널명 string (기존 동일). 기타/직접 입력은 customValue로 폴백.
 */
export function ChannelSourceField({
  sources,
  value,
  onChange,
  customValue,
  onCustomChange,
  theme = "dark",
  idPrefix = "ch",
}: Props) {
  // category 별 그룹핑. category 없는 항목 + "기타" 카테고리 + "직접 입력"/"기타" 채널은 모두 CUSTOM_PLATFORM으로.
  const grouped = useMemo(() => {
    const map = new Map<string, ChannelSourceItem[]>();
    for (const s of sources) {
      const isCustomChannel = CUSTOM_VALUES.has(s.name);
      const cat = isCustomChannel || !s.category ? CUSTOM_PLATFORM : s.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    return map;
  }, [sources]);

  // 플랫폼 표시 순서: SNS → 오픈채팅방 → 지인 추천 → 검색 → 그 외 → 기타/직접입력
  const platforms = useMemo(() => {
    const preferred = ["스레드", "인스타", "유튜브", "오픈채팅방", "SNS", "지인 추천", "지인", "검색"];
    const all = Array.from(grouped.keys());
    const ordered: string[] = [];
    for (const p of preferred) if (all.includes(p)) ordered.push(p);
    for (const p of all) if (!ordered.includes(p) && p !== CUSTOM_PLATFORM) ordered.push(p);
    if (all.includes(CUSTOM_PLATFORM)) ordered.push(CUSTOM_PLATFORM);
    return ordered;
  }, [grouped]);

  // 현재 선택된 채널이 어떤 플랫폼에 속하는지 역추적해서 platform 상태 동기화
  const [platform, setPlatform] = useState<string | null>(() => {
    if (!value) return null;
    if (CUSTOM_VALUES.has(value)) return CUSTOM_PLATFORM;
    const hit = sources.find((s) => s.name === value);
    if (!hit) return CUSTOM_PLATFORM; // 마스터에 없는 자유 입력값
    return CUSTOM_VALUES.has(hit.name) || !hit.category ? CUSTOM_PLATFORM : hit.category;
  });

  // sources/value 변경 시 플랫폼 재동기화 (채널이 비활성화돼서 사라진 경우 등)
  useEffect(() => {
    if (!value) return;
    if (CUSTOM_VALUES.has(value)) {
      setPlatform(CUSTOM_PLATFORM);
      return;
    }
    const hit = sources.find((s) => s.name === value);
    if (!hit) return;
    setPlatform(CUSTOM_VALUES.has(hit.name) || !hit.category ? CUSTOM_PLATFORM : hit.category);
  }, [value, sources]);

  const isDark = theme === "dark";
  const cardBase = isDark
    ? "border-white/10 bg-white/5 hover:bg-white/10 text-white/70"
    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700";
  const cardActive = isDark
    ? "border-[#CC9965] bg-[#CC9965]/10 text-[#CC9965]"
    : "border-blue-500 bg-blue-50 text-blue-700";
  const channelLabel = isDark ? "text-white/70" : "text-gray-700";
  const inputCls = isDark
    ? "rounded-xl border-white/10 bg-white/5 !text-white placeholder:text-white/30"
    : "!rounded-xl !border-gray-200 !text-black";

  const showCustomInput =
    platform === CUSTOM_PLATFORM && (value === undefined || CUSTOM_VALUES.has(value));

  const channelsForPlatform = platform ? grouped.get(platform) ?? [] : [];

  const handlePlatformPick = (p: string) => {
    setPlatform(p);
    // 플랫폼만 선택 + 채널 미선택 상태로 둠. 단, CUSTOM_PLATFORM이면 "직접 입력"이 채널일 수 있음.
    // 기존에 다른 플랫폼 채널이 선택돼있었다면 비워서 사용자가 새 채널을 고르게.
    if (value && !grouped.get(p)?.some((c) => c.name === value)) {
      onChange(undefined);
      onCustomChange("");
    }
  };

  return (
    <div className="space-y-3">
      {/* 1단계: 플랫폼 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {platforms.map((p) => {
          const isCustom = p === CUSTOM_PLATFORM;
          const label = isCustom ? "기타 / 직접 입력" : p;
          const Icon = isCustom ? MoreHorizontal : iconFor(p);
          const selected = platform === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => handlePlatformPick(p)}
              className={`relative flex flex-col items-center justify-center gap-1.5 px-3 py-3 rounded-xl border transition-colors text-xs font-medium ${
                selected ? cardActive : cardBase
              }`}
            >
              {selected && (
                <span
                  className={`absolute top-1.5 right-1.5 ${
                    isDark ? "text-[#CC9965]" : "text-blue-600"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
              )}
              <Icon className="h-4 w-4" />
              <span className="leading-tight text-center">{label}</span>
            </button>
          );
        })}
      </div>

      {/* 2단계: 선택한 플랫폼의 채널 */}
      {platform && channelsForPlatform.length > 0 && (
        <div
          className={`rounded-xl border px-3 py-3 ${
            isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50"
          }`}
        >
          <p
            className={`text-[11px] font-medium mb-2 ${
              isDark ? "text-white/50" : "text-gray-500"
            }`}
          >
            {platform === CUSTOM_PLATFORM
              ? "어디서 알게 되셨는지 직접 입력해주세요"
              : `${platform} — 어디서 보셨나요?`}
          </p>
          <RadioGroup
            value={value ?? ""}
            onValueChange={(v) => onChange(v)}
            className="space-y-2"
          >
            {channelsForPlatform.map((ch) => (
              <div key={ch.name} className="flex items-center gap-2">
                <RadioGroupItem value={ch.name} id={`${idPrefix}-${ch.name}`} />
                <Label
                  htmlFor={`${idPrefix}-${ch.name}`}
                  className={`text-sm cursor-pointer ${channelLabel}`}
                >
                  {ch.name}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {showCustomInput && (
            <Input
              placeholder="직접 입력해주세요"
              className={`mt-3 ${inputCls}`}
              value={customValue}
              onChange={(e) => {
                onCustomChange(e.target.value);
                onChange(e.target.value ? "직접 입력" : undefined);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
