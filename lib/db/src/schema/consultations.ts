import {
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { livesTable, registrationsTable } from "./lives";

/**
 * 고민상담 — 윤자동의 자동화 상담소
 * 커뮤니티 안에서 폼형으로 사연을 받고,
 * liveRequested = true 이면 인접 라이브에 자동 등록까지.
 */
export const consultationStatusEnum = ["pending", "featured", "answered", "hidden"] as const;
export type ConsultationStatus = (typeof consultationStatusEnum)[number];

export const communityConsultationsTable = pgTable(
  "community_consultations",
  {
    id: serial("id").primaryKey(),
    /** 로그인 사용자가 작성하면 매칭. 비로그인도 허용. */
    authorId: uuid("author_id").references(() => usersTable.id, { onDelete: "set null" }),

    name: text("name").notNull(),
    ageRange: text("age_range").notNull(),
    phone: text("phone").notNull(),
    industry: text("industry").notNull(),
    industryCustom: text("industry_custom"),
    jobType: text("job_type").notNull(),
    jobTypeCustom: text("job_type_custom"),

    currentWork: text("current_work").notNull(),
    concern: text("concern").notNull(),
    hardest: text("hardest").notNull(),

    /** 라이브 신청 동시 체크. true면 liveId/registrationId 자동 세팅. */
    liveRequested: boolean("live_requested").notNull().default(false),
    liveId: integer("live_id").references(() => livesTable.id, { onDelete: "set null" }),
    registrationId: integer("registration_id").references(() => registrationsTable.id, {
      onDelete: "set null",
    }),

    /**
     * 라이브 전화상담 의향
     * - 'available' : 라이브 시간에 전화 받을 수 있음 (픽업 1순위 후보)
     * - 'apply_only': 응모만 — 시간 봐서 받을지 결정
     * - 'decline'   : 전화상담은 포기, 사연만 다뤄주세요
     * null = 미응답 (구버전 사연)
     */
    phoneConsultPreference: text("phone_consult_preference"),

    likeCount: integer("like_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),

    /** 라이브에서 다룬 사연 표시 등 큐레이션용. */
    status: text("status").notNull().default("pending"),

    /** 시드 사연(가라) 표시 — 통계/뱃지에서 제외하기 위함. */
    isSeed: boolean("is_seed").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_consultations_created").on(t.createdAt),
    index("idx_consultations_status").on(t.status),
    index("idx_consultations_live").on(t.liveId),
    index("idx_consultations_author").on(t.authorId),
  ],
);

/**
 * 좋아요 (회원 1회 제한 / 비회원은 visitorId 로 1회 제한)
 */
export const communityConsultationLikesTable = pgTable(
  "community_consultation_likes",
  {
    id: serial("id").primaryKey(),
    consultationId: integer("consultation_id")
      .notNull()
      .references(() => communityConsultationsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_consult_likes_consult").on(t.consultationId),
    uniqueIndex("uniq_consult_likes_user").on(t.consultationId, t.userId),
    uniqueIndex("uniq_consult_likes_visitor").on(t.consultationId, t.visitorId),
  ],
);

export const insertCommunityConsultationSchema = createInsertSchema(
  communityConsultationsTable,
).omit({
  id: true,
  likeCount: true,
  viewCount: true,
  registrationId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCommunityConsultation = z.infer<typeof insertCommunityConsultationSchema>;
export type CommunityConsultation = typeof communityConsultationsTable.$inferSelect;

export type CommunityConsultationLike = typeof communityConsultationLikesTable.$inferSelect;

/**
 * 사연 게시판/폼 텍스트 동적 편집용 단일행 설정 테이블.
 * 어드민이 게시판 소개·폼 질문·플레이스홀더 등을 자유롭게 바꿀 수 있게.
 */
export type ConsultationFormConfig = {
  board: {
    badge: string; // "NEW · 윤자동의 자동화 상담소"
    title: string;
    description: string;
  };
  form: {
    badge: string; // 폼 상단 작은 배지
    title: string;
    description: string;
    sectionHeaders?: {
      profile: string;  // 1) 본인 소개
      industry: string; // 2) 일하시는 분야
      concern: string;  // 3) 어디서 막혔나요?
    };
    fields: {
      currentWork: { label: string; hint: string; placeholder: string };
      concern: { label: string; hint: string; placeholder: string };
      hardest: { label: string; hint: string; placeholder: string };
    };
    submitLabel: string;
    liveCheckboxLabel: string;
    liveCheckboxDescription: string;
    phoneConsult?: {
      label: string;
      hint: string;
      options: {
        available: { label: string; description: string };
        applyOnly: { label: string; description: string };
        decline: { label: string; description: string };
      };
    };
  };
  thankYou: {
    title: string;
    body: string;
  };
};

export const consultationFormConfigTable = pgTable("consultation_form_config", {
  id: serial("id").primaryKey(),
  config: jsonb("config").$type<ConsultationFormConfig>().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ConsultationFormConfigRow = typeof consultationFormConfigTable.$inferSelect;

export const DEFAULT_CONSULTATION_FORM_CONFIG: ConsultationFormConfig = {
  board: {
    badge: "윤자동의 자동화 상담소",
    title: "반복업무 때문에 막힌 일, 18년 경력으로 직접 처방해드려요.",
    description:
      "자동화·AI·AX 어디서 막혔는지 알려주시면, 매주 목요일 라이브에서 직접 답변드립니다. 폼 한 번 작성하면 이번 주 라이브 참가 신청까지 같이 완료돼요.",
  },
  form: {
    badge: "윤자동의 자동화 상담소",
    title: "사연 신청하기",
    description:
      "반복 업무·자동화·AX 도입 어디서 막혔는지 알려주세요. 18년 경력으로 직접 처방해드려요. 체크박스 한 번이면 이번 주 라이브 참가까지 자동 신청됩니다.",
    sectionHeaders: {
      profile: "본인 소개",
      industry: "일하시는 분야",
      concern: "어디서 막혔나요?",
    },
    fields: {
      currentWork: {
        label: "어떤 일을 하고 계신가요?",
        hint: "예: 강남에서 카페 2호점 운영 중. 일 8시간 중 4시간이 정산·재고관리.",
        placeholder: "구체적으로 적어주실수록 정확한 처방이 가능해요.",
      },
      concern: {
        label: "어떤 고민이 있으신가요?",
        hint: "자동화·AI·반복업무 무엇이든 좋아요.",
        placeholder: "예: 고객 문의가 카톡/인스타/메일에 흩어져서 답장 누락이 자주 나요.",
      },
      hardest: {
        label: "가장 힘든 게 무엇인가요?",
        hint: "한 줄만 — 우선순위가 명확해야 처방이 빠릅니다.",
        placeholder: "예: 매주 같은 보고서를 손으로 만드는 게 너무 지쳐요.",
      },
    },
    submitLabel: "사연 제출하기",
    liveCheckboxLabel: "이번 라이브에도 참가할래요",
    liveCheckboxDescription:
      "체크하면 별도 신청 없이 바로 등록됩니다. 알림톡으로 접속 링크를 보내드려요.",
    phoneConsult: {
      label: "라이브 전화상담, 어떻게 하실래요?",
      hint: "픽업되신 분은 라이브에서 실시간 전화로 직접 상담해드려요.",
      options: {
        available: {
          label: "이번 라이브 시간에 전화 받을 수 있어요",
          description: "라이브 픽업 1순위로 검토해드려요.",
        },
        applyOnly: {
          label: "일단 응모만 할게요",
          description: "라이브 시간 일정 봐서 받을지 결정할 수 있어요.",
        },
        decline: {
          label: "전화상담은 포기할게요. 사연만 다뤄주세요",
          description: "라이브에서 사연만 익명으로 소개됩니다.",
        },
      },
    },
  },
  thankYou: {
    title: "사연이 등록되었어요!",
    body: "윤자동이 직접 읽고, 라이브에서 다룰 사연을 골라드립니다. 커뮤니티에서 좋아요·댓글이 많을수록 픽업 가능성이 올라가요.",
  },
};
