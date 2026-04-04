import { ExternalLink, GraduationCap, Star } from "lucide-react";

const gcHover = "glass-card hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-300";

const COURSES = [
  {
    id: 1,
    title: "한 명 인건비로 완성하는 업무 자동화 코칭반",
    platform: "Class101",
    description: "실무에서 바로 적용 가능한 업무 자동화 코칭반. 노션, Make, 클로드코드 등 핵심 툴을 마스터하고 자동��� 시스템을 구축하세요.",
    originalPrice: "2,700,000원",
    installment: "12개월 할부 월 204,166원",
    badge: "얼���버드",
    badgeColor: "bg-red-500",
    tags: ["자동화", "코칭", "실전"],
    url: "https://class101.net/ko/products/699ad4eb9251eededf8b9711",
  },
  {
    id: 2,
    title: "왕초보를 위한, 바로 써먹는 노션 & 자동화",
    platform: "Class101",
    description: "모든게 어려운 왕초보를 위한 노션 & 자동화 강의. 기초부터 차근차근 배워 실전에 바�� 적용할 수 있습니다.",
    originalPrice: "169,000원",
    discountRate: "30%",
    installment: "5개월 할부 월 23,800원",
    rating: 4.0,
    reviewCount: 1,
    badge: "베스트",
    badgeColor: "bg-[#CC9965]",
    tags: ["노션", "자동화", "입문"],
    url: "https://class101.net/ko/products/6981c07d92b7d0a4ebd2036b",
  },
  {
    id: 3,
    title: "윤자동대학 — 종합 교육 프로그램",
    platform: "LiveKlass",
    description: "윤자동의 모든 노하우를 담은 종합 교육 프로그램. 노션, 자동화, AI 활용까지 체계적으로 학습할 수 있는 올인원 커리큘럼입니다.",
    badge: "프리미엄",
    badgeColor: "bg-purple-500",
    tags: ["종합", "커리큘럼", "프리미엄"],
    url: "https://yjd.liveklass.com/p/Training-Inquiry",
  },
];

export default function Courses() {
  return (
    <div className="space-y-10">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white mb-1">유료 강의</h1>
        <p className="text-white/50 text-sm">더 깊이 배우고 싶다면, 체계적인 커리큘럼의 유료 강의를 확인하세요.</p>
      </div>

      {/* Banner */}
      <div className={`glass-card p-6 sm:p-8 border-[#CC9965]/20`}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#CC9965]/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <GraduationCap className="h-6 w-6 text-[#CC9965]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">무료 특강으로 ���족하셨나요?</h2>
            <p className="text-white/50 text-sm">무료 라이브에서 맛본 내용을 유료 강의에서 깊이 있게 배워보세요. 실전 프로젝트와 1:1 코칭까��� 포함된 프리미엄 과정입니다.</p>
          </div>
        </div>
      </div>

      {/* Course Cards */}
      <div className="space-y-6">
        {COURSES.map((course) => (
          <a
            key={course.id}
            href={course.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className={`${gcHover} overflow-hidden`}>
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`${course.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                    {course.badge}
                  </span>
                  <span className="text-xs text-white/30 font-medium">{course.platform}</span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#CC9965] transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-white/50 mb-4 leading-relaxed">{course.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {course.tags.map((tag) => (
                    <span key={tag} className="bg-white/5 text-white/50 text-xs font-medium px-2.5 py-1 rounded-full border border-white/5">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-end justify-between pt-5 border-t border-white/10">
                  <div>
                    {course.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-4 w-4 fill-[#CC9965] text-[#CC9965]" />
                        <span className="text-sm font-semibold text-white">{course.rating}</span>
                        <span className="text-xs text-white/30">({course.reviewCount})</span>
                      </div>
                    )}
                    {course.discountRate && (
                      <span className="text-[#CC9965] font-bold text-lg mr-2">{course.discountRate}</span>
                    )}
                    {course.originalPrice && (
                      <span className="text-xl font-bold text-white">{course.originalPrice}</span>
                    )}
                    {course.installment && (
                      <p className="text-xs text-white/30 mt-1">{course.installment}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 bg-[#CC9965] text-black px-5 py-2.5 rounded-xl font-bold text-sm group-hover:bg-[#d4a570] transition-colors gold-glow">
                    자세히 보기
                    <ExternalLink className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
