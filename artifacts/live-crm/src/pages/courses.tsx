import { ExternalLink, GraduationCap, Star, Clock, Users, Sparkles, ArrowRight } from "lucide-react";

const COURSES = [
  {
    id: 1,
    title: "한 명 인건비로 완성하는 업무 자동화 코칭반",
    platform: "Class101",
    instructor: "윤자동",
    description: "실무에서 바로 적용 가능한 업무 자동화 코칭반. 노션, Make, 클로드코드 등 핵심 툴을 마스터하고 자동화 시스템을 구축하세��.",
    originalPrice: "2,700,000원",
    monthlyPrice: "월 225,000원",
    installment: "12개월 할부 월 204,166원",
    badge: "얼리버드",
    badgeColor: "bg-red-500",
    tags: ["자동화", "코칭", "실전"],
    url: "https://class101.net/ko/products/699ad4eb9251eededf8b9711",
  },
  {
    id: 2,
    title: "왕초보를 위한, 바로 써먹는 노션 & 자동화",
    platform: "Class101",
    instructor: "윤자동",
    description: "모든게 어려운 왕초보를 위한 노션 & 자동화 강의. 기초부터 차근차근 배워 실전에 바로 적용할 수 있습니다.",
    originalPrice: "169,000원",
    discountRate: "30%",
    monthlyPrice: "월 33,800원",
    installment: "5개월 할부 월 23,800원",
    rating: 4.0,
    reviewCount: 1,
    badge: "베스트",
    badgeColor: "bg-blue-500",
    tags: ["노션", "자동화", "입문"],
    url: "https://class101.net/ko/products/6981c07d92b7d0a4ebd2036b",
  },
  {
    id: 3,
    title: "윤자동대학 — 종합 교육 프로그램",
    platform: "LiveKlass",
    instructor: "윤자동",
    description: "윤자동의 모든 노하우를 담은 종합 교육 프로그램. 노션, 자동화, AI 활용까지 체계적으로 학습할 수 있는 올인원 커리큘럼입니다.",
    badge: "프리미엄",
    badgeColor: "bg-purple-500",
    tags: ["종합", "커리큘럼", "프리미엄"],
    url: "https://yjd.liveklass.com/p/Training-Inquiry",
  },
];

export default function Courses() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">유료 강의</h1>
        <p className="text-gray-500 text-sm">��� 깊이 배우고 싶다면, 체계적인 커리큘럼의 유료 강의를 확인하세요.</p>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-1">무료 특강으로 부족하셨나요?</h2>
            <p className="text-indigo-100 text-sm">무료 라이브에서 맛본 내용을 유료 강의에서 깊이 있게 배워보세요. 실전 프로젝트와 1:1 코칭까지 포함된 프리미엄 과정입니다.</p>
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-200 overflow-hidden">
              <div className="p-6 sm:p-8">
                {/* Top: Badge + Platform */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`${course.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                    {course.badge}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">{course.platform}</span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {course.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{course.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {course.tags.map((tag) => (
                    <span key={tag} className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Price + CTA */}
                <div className="flex items-end justify-between pt-4 border-t border-gray-100">
                  <div>
                    {course.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-semibold text-gray-700">{course.rating}</span>
                        <span className="text-xs text-gray-400">({course.reviewCount})</span>
                      </div>
                    )}
                    {course.discountRate && (
                      <span className="text-red-500 font-bold text-lg mr-2">{course.discountRate}</span>
                    )}
                    {course.originalPrice && (
                      <span className="text-xl font-bold text-gray-900">{course.originalPrice}</span>
                    )}
                    {course.installment && (
                      <p className="text-xs text-gray-400 mt-1">{course.installment}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm group-hover:bg-blue-700 transition-colors">
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
