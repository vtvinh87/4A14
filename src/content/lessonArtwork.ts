export type LessonArtworkId =
  | 'lesson-01' | 'lesson-02' | 'lesson-03' | 'lesson-04' | 'lesson-05'
  | 'lesson-06' | 'lesson-07' | 'lesson-08' | 'lesson-09' | 'lesson-10'
  | 'lesson-11' | 'lesson-12' | 'lesson-13' | 'lesson-14' | 'lesson-15'
  | 'lesson-16' | 'lesson-17' | 'lesson-18' | 'lesson-19' | 'lesson-20'
  | 'lesson-21' | 'lesson-22' | 'lesson-23' | 'lesson-24' | 'lesson-25'
  | 'lesson-26' | 'lesson-27' | 'lesson-28' | 'lesson-29';

export type LessonArtwork = {
  lessonId: LessonArtworkId;
  src: string;
  alt: string;
  theme: 'local' | 'north-mountains' | 'red-river' | 'central-coast' | 'highlands' | 'south';
  visualAnchor: string;
  referenceStatus: 'confirmed-from-textbook' | 'visual-reference-only' | 'needs-content-review';
  objectPosition?: string;
};

export const LESSON_ARTWORKS: readonly LessonArtwork[] = [
  {
    lessonId: 'lesson-01',
    src: '/art/lessons/lesson-01.png',
    alt: 'Bàn khám phá với bản đồ và công cụ học tập',
    theme: 'local',
    visualAnchor: 'Bàn khám phá có bản đồ, trục thời gian, biểu đồ và kính lúp',
    referenceStatus: 'confirmed-from-textbook',
  },
  {
    lessonId: 'lesson-02',
    src: '/art/lessons/lesson-02.png',
    alt: 'Cảnh quan địa phương với ghim bản đồ và nhóm cộng đồng',
    theme: 'local',
    visualAnchor: 'Cảnh quan địa phương tổng quát với ghim bản đồ và nhóm cộng đồng nhỏ',
    referenceStatus: 'needs-content-review',
  },
  {
    lessonId: 'lesson-03',
    src: '/art/lessons/lesson-03.png',
    alt: 'Cổng di sản và nhà sinh hoạt cộng đồng',
    theme: 'local',
    visualAnchor: 'Cổng di sản/nhà sinh hoạt cộng đồng và một chi tiết thủ công địa phương trung tính',
    referenceStatus: 'needs-content-review',
  },
  {
    lessonId: 'lesson-04',
    src: '/art/lessons/lesson-04.png',
    alt: 'Núi xanh, ruộng bậc thang và dòng suối',
    theme: 'north-mountains',
    visualAnchor: 'Dãy núi xanh, ruộng bậc thang, thung lũng và dòng suối',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-05',
    src: '/art/lessons/lesson-05.png',
    alt: 'Đồi chè, ruộng bậc thang và chợ vùng cao',
    theme: 'north-mountains',
    visualAnchor: 'Đồi chè, ruộng bậc thang, đường núi và chợ vùng cao tổng quát',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-06',
    src: '/art/lessons/lesson-06.png',
    alt: 'Nhà sàn và không gian sinh hoạt cộng đồng',
    theme: 'north-mountains',
    visualAnchor: 'Nhà sàn, hoa văn dệt và không gian sinh hoạt cộng đồng; không gán trang phục cho dân tộc cụ thể',
    referenceStatus: 'needs-content-review',
  },
  {
    lessonId: 'lesson-07',
    src: '/art/lessons/lesson-07.png',
    alt: 'Đền trên đồi với đoàn rước và lễ vật',
    theme: 'north-mountains',
    visualAnchor: 'Đền trên đồi, khói hương, đoàn rước và lễ vật; không vẽ chân dung Vua Hùng',
    referenceStatus: 'confirmed-from-textbook',
  },
  {
    lessonId: 'lesson-08',
    src: '/art/lessons/lesson-08.png',
    alt: 'Sông, đê, ruộng lúa và làng quê',
    theme: 'red-river',
    visualAnchor: 'Sông, đê, ruộng lúa, làng quê và đường chân trời thấp',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-09',
    src: '/art/lessons/lesson-09.png',
    alt: 'Ruộng lúa, bến sông và làng nghề',
    theme: 'red-river',
    visualAnchor: 'Ruộng lúa, bến sông, làng nghề và hoạt động sản xuất tổng quát',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-10',
    src: '/art/lessons/lesson-10.png',
    alt: 'Đình làng và cổng làng',
    theme: 'red-river',
    visualAnchor: 'Đình làng, cổng làng và chi tiết lễ hội dân gian trung tính',
    referenceStatus: 'needs-content-review',
  },
  {
    lessonId: 'lesson-11',
    src: '/art/lessons/lesson-11.png',
    alt: 'Sông uốn lượn, bãi bồi và đê',
    theme: 'red-river',
    visualAnchor: 'Dải sông uốn lượn, bãi bồi, đê và lớp phù sa; không tự thêm hiện vật lịch sử',
    referenceStatus: 'needs-content-review',
  },
  {
    lessonId: 'lesson-12',
    src: '/art/lessons/lesson-12.png',
    alt: 'Công trình lịch sử bên mặt hồ và thành phố',
    theme: 'red-river',
    visualAnchor: 'Cổng thành/công trình lịch sử, mặt hồ và thành phố hiện đại ở hậu cảnh',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-13',
    src: '/art/lessons/lesson-13.png',
    alt: 'Khuê Văn Các, sân bia và hàng cây',
    theme: 'red-river',
    visualAnchor: 'Khuê Văn Các, sân bia và hàng cây; không chèn chữ lên bia',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-14',
    src: '/art/lessons/lesson-14.png',
    alt: 'Bản đồ hành trình với thẻ ghi nhớ và la bàn',
    theme: 'red-river',
    visualAnchor: 'Bản đồ hành trình với thẻ ghi nhớ, la bàn và các huy hiệu vùng',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-15',
    src: '/art/lessons/lesson-15.png',
    alt: 'Bờ biển, đầm phá, cồn cát và núi ven biển',
    theme: 'central-coast',
    visualAnchor: 'Bờ biển dài, đầm phá, cồn cát và dãy núi sát biển',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-16',
    src: '/art/lessons/lesson-16.png',
    alt: 'Thuyền đánh cá, ruộng muối và chợ biển',
    theme: 'central-coast',
    visualAnchor: 'Thuyền đánh cá, ruộng muối, bến cảng và chợ biển tổng quát',
    referenceStatus: 'needs-content-review',
  },
  {
    lessonId: 'lesson-17',
    src: '/art/lessons/lesson-17.png',
    alt: 'Nhà phố ven sông với đèn lồng và đồ thủ công',
    theme: 'central-coast',
    visualAnchor: 'Nhà phố ven sông, đèn lồng và đồ thủ công; không gán một lễ hội cụ thể',
    referenceStatus: 'needs-content-review',
  },
  {
    lessonId: 'lesson-18',
    src: '/art/lessons/lesson-18.png',
    alt: 'Cổng thành cổ, mái cung điện và sông',
    theme: 'central-coast',
    visualAnchor: 'Cổng thành cổ, mái cung điện, sông và cây xanh; không sao chép nguyên ảnh',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-19',
    src: '/art/lessons/lesson-19.png',
    alt: 'Nhà màu vàng, thuyền gỗ và đèn lồng ven sông',
    theme: 'central-coast',
    visualAnchor: 'Nhà màu vàng, mái ngói, thuyền gỗ và đèn lồng ven sông',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-20',
    src: '/art/lessons/lesson-20.png',
    alt: 'Cao nguyên đất đỏ với rừng và thác',
    theme: 'highlands',
    visualAnchor: 'Cao nguyên đất đỏ, rừng, thác và đường chân trời rộng',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-21',
    src: '/art/lessons/lesson-21.png',
    alt: 'Nương rẫy, đường cao nguyên và khu dân cư',
    theme: 'highlands',
    visualAnchor: 'Nương rẫy/cánh đồng, đường cao nguyên và khu dân cư tổng quát',
    referenceStatus: 'needs-content-review',
  },
  {
    lessonId: 'lesson-22',
    src: '/art/lessons/lesson-22.png',
    alt: 'Nhà sinh hoạt cộng đồng với hoa văn dệt',
    theme: 'highlands',
    visualAnchor: 'Nhà sinh hoạt cộng đồng, hoa văn dệt và lối mòn lịch sử; không tự gán nhân vật/sự kiện',
    referenceStatus: 'needs-content-review',
  },
  {
    lessonId: 'lesson-23',
    src: '/art/lessons/lesson-23.png',
    alt: 'Bộ cồng chiêng quanh không gian cộng đồng',
    theme: 'highlands',
    visualAnchor: 'Bộ cồng chiêng quanh không gian cộng đồng, ánh lửa và bóng người cách điệu',
    referenceStatus: 'needs-content-review',
  },
  {
    lessonId: 'lesson-24',
    src: '/art/lessons/lesson-24.png',
    alt: 'Sông ngòi, kênh rạch, vườn cây và vùng ngập nước',
    theme: 'south',
    visualAnchor: 'Sông ngòi chằng chịt, kênh rạch, vườn cây và vùng ngập nước',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-25',
    src: '/art/lessons/lesson-25.png',
    alt: 'Ghe thuyền, vườn cây, ruộng và chợ nổi',
    theme: 'south',
    visualAnchor: 'Ghe thuyền, vườn cây, ruộng và chợ nổi tổng quát',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-26',
    src: '/art/lessons/lesson-26.png',
    alt: 'Nhà ven sông với chi tiết văn hoá Nam Bộ',
    theme: 'south',
    visualAnchor: 'Nhà ven sông, chi tiết văn hoá Nam Bộ và biểu tượng ký ức lịch sử trung tính',
    referenceStatus: 'needs-content-review',
  },
  {
    lessonId: 'lesson-27',
    src: '/art/lessons/lesson-27.png',
    alt: 'Đô thị ven sông với cầu và skyline hiện đại',
    theme: 'south',
    visualAnchor: 'Đô thị ven sông, cầu, cây xanh và skyline hiện đại; không phụ thuộc vào một logo/biển hiệu',
    referenceStatus: 'visual-reference-only',
  },
  {
    lessonId: 'lesson-28',
    src: '/art/lessons/lesson-28.png',
    alt: 'Lối vào hầm trong rừng và mặt cắt giáo dục',
    theme: 'south',
    visualAnchor: 'Lối vào hầm trong rừng và mặt cắt giáo dục không có cảnh bạo lực',
    referenceStatus: 'needs-content-review',
  },
  {
    lessonId: 'lesson-29',
    src: '/art/lessons/lesson-29.png',
    alt: 'Bản đồ tổng hợp sáu vùng với hộ chiếu và la bàn',
    theme: 'south',
    visualAnchor: 'Bản đồ tổng hợp sáu vùng, hộ chiếu, la bàn và các mảnh ghép ghi nhớ',
    referenceStatus: 'visual-reference-only',
  },
] as const;

export function getLessonArtwork(id: LessonArtworkId): LessonArtwork {
  const artwork = LESSON_ARTWORKS.find((item) => item.lessonId === id);
  if (!artwork) throw new Error(`Unknown lesson artwork: ${id}`);
  return artwork;
}
