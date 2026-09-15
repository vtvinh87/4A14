import type { LessonId, SourceRef } from './types.ts';

export type SeedFact = {
  id: string;
  label: string;
  text: string;
  source: SourceRef;
};

export type SeedQuiz = {
  prompt: string;
  hint: string;
  options: { id: string; text: string }[];
  correctId: string;
  factIds: string[];
};

export type SeedOrder = {
  items: { id: string; text: string }[];
  correctOrder: string[];
  factIds: string[];
};

export type LessonSeed = {
  id: LessonId;
  title: string;
  topic: 'Địa phương em' | 'Trung du và miền núi phía Bắc' | 'Đồng bằng Bắc Bộ' | 'Duyên hải miền Trung' | 'Tây Nguyên' | 'Nam Bộ';
  eyebrow: string;
  facts: SeedFact[];
  quizzes: SeedQuiz[];
  order: SeedOrder;
};

const vbt = (pdfPage: number, printedPage: number, locator: string): SourceRef => ({ sourceId: 'vbt-lsdl4-2026', pdfPage, printedPage, locator });
const sgk = (pdfPage: number, printedPage: number, locator: string): SourceRef => ({ sourceId: 'sgk-lsdl4-sample', pdfPage, printedPage, locator });
const fact = (id: string, label: string, text: string, source: SourceRef): SeedFact => ({ id, label, text, source });
const quiz = (prompt: string, hint: string, options: { id: string; text: string }[], correctId: string, factIds: string[]): SeedQuiz => ({ prompt, hint, options, correctId, factIds });
const sequence = (items: { id: string; text: string }[], correctOrder: string[], factIds: string[]): SeedOrder => ({ items, correctOrder, factIds });

export const FULL_LESSON_SEEDS: readonly LessonSeed[] = [
  {
    id: 'lesson-01', title: 'Làm quen với phương tiện học tập môn Lịch sử và Địa lí', topic: 'Địa phương em', eyebrow: 'TRẠM KHỞI HÀNH',
    facts: [
      fact('map', 'Bản đồ', 'Bản đồ là hình vẽ thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo một tỉ lệ nhất định.', vbt(6, 5, 'Bài tập 2')),
      fact('timeline', 'Trục thời gian', 'Trục thời gian là đường thẳng thể hiện chuỗi sự kiện lịch sử theo trình tự thời gian.', vbt(6, 5, 'Bài tập 2')),
      fact('evidence', 'Hiện vật và tranh ảnh', 'Hiện vật là di tích, đồ vật từ quá khứ còn lưu giữ; tranh ảnh giúp quan sát và mô tả đối tượng lịch sử, địa lí.', vbt(6, 5, 'Bài tập 2')),
    ],
    quizzes: [
      quiz('Phương tiện nào thu nhỏ một khu vực theo tỉ lệ?', 'Hãy tìm mô tả bắt đầu bằng “hình vẽ thu nhỏ”.', [{ id: 'map', text: 'Bản đồ' }, { id: 'table', text: 'Bảng số liệu' }, { id: 'timeline', text: 'Trục thời gian' }], 'map', ['map']),
      quiz('Đường thẳng thể hiện chuỗi sự kiện theo thời gian gọi là gì?', 'Nó sắp xếp sự kiện theo thứ tự trước sau.', [{ id: 'timeline', text: 'Trục thời gian' }, { id: 'photo', text: 'Tranh ảnh' }, { id: 'map', text: 'Bản đồ' }], 'timeline', ['timeline']),
      quiz('Mũi tên đồng Cổ Loa thuộc nhóm tư liệu nào?', 'Đó là đồ vật còn lưu lại từ quá khứ.', [{ id: 'artifact', text: 'Hiện vật lịch sử' }, { id: 'weather', text: 'Bảng khí hậu' }, { id: 'map', text: 'Bản đồ' }], 'artifact', ['evidence']),
    ],
    order: sequence([{ id: 'name', text: 'Đọc tên phương tiện' }, { id: 'legend', text: 'Đọc chú giải hoặc nội dung các cột, hàng' }, { id: 'find', text: 'Tìm và nhận xét đối tượng theo yêu cầu' }], ['name', 'legend', 'find'], ['map', 'timeline', 'evidence']),
  },
  {
    id: 'lesson-02', title: 'Thiên nhiên và con người ở địa phương em', topic: 'Địa phương em', eyebrow: 'GÓC QUÊ HƯƠNG',
    facts: [
      fact('location', 'Vị trí địa phương', 'Tìm hiểu địa phương cần xác định các tỉnh, thành phố, biển hoặc quốc gia tiếp giáp trên lược đồ.', vbt(9, 8, 'Bài tập 1')),
      fact('nature', 'Địa hình và khí hậu', 'Bài tập gợi ý ghi nhận dạng địa hình, sông hồ, nhiệt độ, lượng mưa và các mùa trong năm của địa phương.', vbt(10, 9, 'Bài tập 2–3')),
      fact('care', 'Bảo vệ môi trường', 'Học sinh có thể góp phần bảo vệ môi trường bằng những hành động phù hợp với nơi mình sống.', vbt(11, 10, 'Bài tập 5')),
    ],
    quizzes: [
      quiz('Khi tìm hiểu thiên nhiên địa phương, nhóm thông tin nào cần thu thập?', 'Nhìn vào các mục địa hình, sông hồ và khí hậu.', [{ id: 'nature', text: 'Địa hình, sông hồ và khí hậu' }, { id: 'only-food', text: 'Chỉ món ăn' }, { id: 'only-games', text: 'Chỉ trò chơi' }], 'nature', ['nature']),
      quiz('Thông tin nào giúp mô tả khí hậu địa phương?', 'Bảng khí hậu thường có hai đại lượng và các mùa.', [{ id: 'rain-temp', text: 'Nhiệt độ, lượng mưa và các mùa' }, { id: 'population', text: 'Tên các danh nhân' }, { id: 'craft', text: 'Tên làng nghề' }], 'rain-temp', ['nature']),
      quiz('Việc nào phù hợp để bảo vệ môi trường nơi em sống?', 'Chọn hành động làm giảm rác và tiết kiệm tài nguyên.', [{ id: 'care', text: 'Giảm rác, tiết kiệm nước và giữ nơi công cộng sạch' }, { id: 'litter', text: 'Vứt rác xuống sông' }, { id: 'waste', text: 'Để vòi nước chảy liên tục' }], 'care', ['care']),
    ],
    order: sequence([{ id: 'locate', text: 'Xác định vị trí và ranh giới' }, { id: 'describe', text: 'Mô tả địa hình, sông hồ, khí hậu' }, { id: 'care', text: 'Nêu việc làm bảo vệ môi trường' }], ['locate', 'describe', 'care'], ['location', 'nature', 'care']),
  },
  {
    id: 'lesson-03', title: 'Lịch sử và văn hoá truyền thống địa phương em', topic: 'Địa phương em', eyebrow: 'DẤU XƯA QUÊ MÌNH',
    facts: [
      fact('food', 'Món ăn địa phương', 'Vở bài tập gợi ý sưu tầm món ăn, nguyên liệu chính và cách làm món ăn em yêu thích.', vbt(11, 10, 'Bài tập 1–3')),
      fact('festival', 'Lễ hội và phong tục', 'Lễ hội, phong tục và tập quán là những nét văn hoá có thể ghi lại bằng tên gọi và mô tả ngắn.', vbt(13, 12, 'Bài tập 5')),
      fact('heritage', 'Di tích và danh nhân', 'Một chuyến tham quan di tích cần có mục đích, thời gian, chuẩn bị và các bước thực hiện.', vbt(13, 12, 'Bài tập 4')),
    ],
    quizzes: [
      quiz('Thẻ giới thiệu một món ăn địa phương nên có thông tin nào?', 'Nêu tên, nguyên liệu và cách làm.', [{ id: 'food-card', text: 'Tên món, nguyên liệu chính và cách làm' }, { id: 'weather', text: 'Chỉ nhiệt độ' }, { id: 'map-only', text: 'Chỉ tên con sông' }], 'food-card', ['food']),
      quiz('Nội dung nào là một nét văn hoá truyền thống của địa phương?', 'Có thể là lễ hội, món ăn hoặc phong tục.', [{ id: 'festival', text: 'Lễ hội, món ăn hoặc phong tục tập quán' }, { id: 'password', text: 'Mật khẩu thiết bị' }, { id: 'traffic', text: 'Mã chuyến xe' }], 'festival', ['festival']),
      quiz('Kế hoạch tham quan di tích nên bắt đầu bằng điều gì?', 'Hãy xem các mục gợi ý trong bảng kế hoạch.', [{ id: 'plan', text: 'Xác định tên di tích và mục đích tham quan' }, { id: 'buy', text: 'Mua thật nhiều đồ lưu niệm' }, { id: 'skip', text: 'Bỏ qua việc chuẩn bị' }], 'plan', ['heritage']),
    ],
    order: sequence([{ id: 'choose', text: 'Chọn di tích hoặc nét văn hoá muốn tìm hiểu' }, { id: 'collect', text: 'Ghi lại thông tin và hình ảnh phù hợp' }, { id: 'share', text: 'Giới thiệu và nêu cách gìn giữ' }], ['choose', 'collect', 'share'], ['food', 'festival', 'heritage']),
  },
  {
    id: 'lesson-04', title: 'Thiên nhiên vùng Trung du và miền núi phía Bắc', topic: 'Trung du và miền núi phía Bắc', eyebrow: 'VÙNG NÚI PHÍA BẮC',
    facts: [
      fact('position', 'Vị trí và địa hình', 'Vùng nằm ở phía bắc, chủ yếu là đồi núi; khu trung du có đồi đỉnh tròn, sườn thoải.', vbt(14, 13, 'Bài tập 1')),
      fact('fansipan', 'Phan-xi-păng', 'Phan-xi-păng là đỉnh núi cao nhất nước ta và nằm trong vùng Trung du và miền núi phía Bắc.', vbt(15, 14, 'Bài tập 1.4')),
      fact('resources', 'Sông và khoáng sản', 'Vùng có nhiều sông, thuận lợi cho thuỷ điện, đồng thời giàu khoáng sản như than, sắt và a-pa-tít.', vbt(16, 15, 'Bài tập 3–4')),
    ],
    quizzes: [
      quiz('Vùng Trung du và miền núi phía Bắc nằm ở phía nào nước ta?', 'Tên vùng đã gợi ý hướng chính.', [{ id: 'north', text: 'Phía bắc' }, { id: 'south', text: 'Phía nam' }, { id: 'east', text: 'Phía đông' }], 'north', ['position']),
      quiz('Đỉnh núi cao nhất nước ta trong vùng là gì?', 'Đỉnh núi này thường được nhắc cùng Lào Cai.', [{ id: 'fansipan', text: 'Phan-xi-păng' }, { id: 'bachma', text: 'Bạch Mã' }, { id: 'ba-den', text: 'Bà Đen' }], 'fansipan', ['fansipan']),
      quiz('Điều kiện nào tạo tiềm năng phát triển thuỷ điện?', 'Sông có nhiều bậc địa hình, thác ghềnh.', [{ id: 'rivers', text: 'Sông có nhiều thác ghềnh' }, { id: 'flat', text: 'Địa hình hoàn toàn bằng phẳng' }, { id: 'dry', text: 'Không có sông' }], 'rivers', ['resources']),
    ],
    order: sequence([{ id: 'locate', text: 'Xác định vị trí vùng trên lược đồ' }, { id: 'describe', text: 'Mô tả địa hình, sông và khoáng sản' }, { id: 'protect', text: 'Nêu cách bảo vệ thiên nhiên, phòng thiên tai' }], ['locate', 'describe', 'protect'], ['position', 'fansipan', 'resources']),
  },
  {
    id: 'lesson-05', title: 'Dân cư và hoạt động sản xuất ở vùng Trung du và miền núi phía Bắc', topic: 'Trung du và miền núi phía Bắc', eyebrow: 'NGƯỜI VÀ ĐẤT',
    facts: [
      fact('people', 'Dân cư đa dạng', 'Vùng là nơi sinh sống của nhiều dân tộc; dân cư phân bố khác nhau giữa trung du và miền núi.', vbt(19, 18, 'Bài tập 1–2')),
      fact('terrace', 'Ruộng bậc thang', 'Ruộng bậc thang giúp bảo đảm lương thực, hạn chế phá rừng làm nương và tạo cảnh quan du lịch.', vbt(19, 18, 'Bài tập 1.3–1.5')),
      fact('production', 'Thuỷ điện và khoáng sản', 'Thuỷ điện cung cấp điện; khoáng sản như a-pa-tít, sắt, đồng, bô-xít và đá vôi tạo nguyên liệu cho sản xuất.', vbt(21, 20, 'Bài tập 4–8')),
    ],
    quizzes: [
      quiz('Dân cư vùng Trung du và miền núi phía Bắc có đặc điểm nào?', 'Bài tập dùng cụm “khác nhau giữa các tỉnh, các khu vực”.', [{ id: 'different', text: 'Phân bố khác nhau giữa các tỉnh và khu vực' }, { id: 'same', text: 'Phân bố hoàn toàn giống nhau' }, { id: 'none', text: 'Không có dân cư' }], 'different', ['people']),
      quiz('Ruộng bậc thang thường được làm ở đâu?', 'Hãy hình dung các bậc ruộng men theo sườn núi.', [{ id: 'slope', text: 'Sườn núi' }, { id: 'sea', text: 'Ngoài biển' }, { id: 'city', text: 'Giữa phố' }], 'slope', ['terrace']),
      quiz('Vai trò quan trọng của nhà máy thuỷ điện là gì?', 'Chọn công dụng phục vụ sinh hoạt và sản xuất.', [{ id: 'power', text: 'Cung cấp điện cho sinh hoạt và sản xuất' }, { id: 'market', text: 'Chỉ bán nông sản' }, { id: 'road', text: 'Mở chợ phiên' }], 'power', ['production']),
    ],
    order: sequence([{ id: 'people', text: 'Tìm hiểu dân cư và sự phân bố' }, { id: 'work', text: 'Nhận diện ruộng bậc thang, thuỷ điện, khoáng sản' }, { id: 'role', text: 'Giải thích vai trò và sử dụng bền vững' }], ['people', 'work', 'role'], ['people', 'terrace', 'production']),
  },
  {
    id: 'lesson-06', title: 'Một số nét văn hoá ở vùng Trung du và miền núi phía Bắc', topic: 'Trung du và miền núi phía Bắc', eyebrow: 'SẮC MÀU VÙNG CAO',
    facts: [
      fact('then', 'Hát Then', 'Hát Then là loại hình diễn xướng âm nhạc dân gian của một số dân tộc như Tày, Nùng, Thái.', vbt(23, 22, 'Bài tập 1.1')),
      fact('xoe', 'Xoè Thái', 'Xoè là loại hình múa truyền thống của dân tộc Thái, thường biểu diễn trong ngày lễ, tết và ngày vui.', vbt(23, 22, 'Bài tập 1.2–2.3')),
      fact('market', 'Chợ phiên và lễ hội', 'Chợ phiên vùng cao họp vào những ngày nhất định; nhiều lễ hội có kéo co, đẩy gậy và hoạt động cộng đồng.', vbt(24, 23, 'Bài tập 4–6')),
    ],
    quizzes: [
      quiz('Hát Then gắn với những dân tộc nào?', 'Nhớ nhóm Tày, Nùng, Thái.', [{ id: 'then', text: 'Tày, Nùng, Thái' }, { id: 'south', text: 'Khơ-me, Chăm, Hoa' }, { id: 'coastal', text: 'Chăm, Kinh, Hoa' }], 'then', ['then']),
      quiz('Xoè là loại hình múa truyền thống của dân tộc nào?', 'Tên “Xoè Thái” là gợi ý rõ.', [{ id: 'thai', text: 'Thái' }, { id: 'kinh', text: 'Kinh' }, { id: 'dao', text: 'Dao' }], 'thai', ['xoe']),
      quiz('Điểm đặc trưng của chợ phiên vùng cao là gì?', 'Chợ thường không họp mỗi ngày.', [{ id: 'days', text: 'Họp vào những ngày nhất định' }, { id: 'daily', text: 'Luôn mở suốt ngày đêm' }, { id: 'online', text: 'Chỉ mua bán trực tuyến' }], 'days', ['market']),
    ],
    order: sequence([{ id: 'observe', text: 'Quan sát loại hình văn hoá' }, { id: 'describe', text: 'Mô tả hoạt động, thời điểm và cộng đồng' }, { id: 'respect', text: 'Giữ gìn, tham gia phù hợp và tôn trọng' }], ['observe', 'describe', 'respect'], ['then', 'xoe', 'market']),
  },
  {
    id: 'lesson-07', title: 'Đền Hùng và lễ Giỗ Tổ Hùng Vương', topic: 'Trung du và miền núi phía Bắc', eyebrow: 'CHẶNG DI SẢN',
    facts: [
      fact('location', 'Đền Hùng', 'Theo sách, khu di tích Đền Hùng chủ yếu thuộc thành phố Việt Trì, tỉnh Phú Thọ.', vbt(26, 25, 'Bài tập 1.1')),
      fact('festival', 'Ngày Giỗ Tổ', 'Giỗ Tổ Hùng Vương vào ngày mồng 10 tháng Ba âm lịch, thể hiện đạo lí uống nước nhớ nguồn.', vbt(26, 25, 'Bài tập 1.2–1.3')),
      fact('legends', 'Truyền thuyết thời Hùng Vương', 'Các truyền thuyết về Con Rồng cháu Tiên và bánh chưng, bánh giầy được kể như truyền thuyết, không phải bằng chứng lịch sử.', vbt(28, 27, 'Bài tập 5')),
    ],
    quizzes: [
      quiz('Khu di tích Đền Hùng thuộc tỉnh nào theo sách?', 'Địa danh đi cùng thành phố Việt Trì.', [{ id: 'phu-tho', text: 'Phú Thọ' }, { id: 'cao-bang', text: 'Cao Bằng' }, { id: 'lam-dong', text: 'Lâm Đồng' }], 'phu-tho', ['location']),
      quiz('Giỗ Tổ Hùng Vương diễn ra vào ngày nào?', 'Đây là ngày mồng 10 của tháng Ba âm lịch.', [{ id: 'third-lunar', text: 'Mồng 10 tháng Ba âm lịch' }, { id: 'first', text: 'Mồng 1 tháng Giêng' }, { id: 'fifteenth', text: 'Ngày 15 tháng Tám' }], 'third-lunar', ['festival']),
      quiz('Khi kể chuyện Con Rồng cháu Tiên, cần gắn nhãn nào?', 'Câu chuyện thuộc nhóm kể dân gian về nguồn gốc.', [{ id: 'legend', text: 'Theo truyền thuyết' }, { id: 'table', text: 'Theo bảng số liệu' }, { id: 'weather', text: 'Theo dự báo thời tiết' }], 'legend', ['legends']),
    ],
    order: sequence([{ id: 'place', text: 'Xác định Đền Hùng và thời điểm lễ' }, { id: 'ritual', text: 'Tìm hiểu phần lễ, phần hội và ý nghĩa' }, { id: 'legend', text: 'Kể lại truyền thuyết với nhãn phù hợp' }], ['place', 'ritual', 'legend'], ['location', 'festival', 'legends']),
  },
  {
    id: 'lesson-08', title: 'Thiên nhiên vùng Đồng bằng Bắc Bộ', topic: 'Đồng bằng Bắc Bộ', eyebrow: 'MIỀN PHÙ SA',
    facts: [
      fact('terrain', 'Địa hình', 'Địa hình Đồng bằng Bắc Bộ phần lớn tương đối bằng phẳng và được bồi đắp bởi phù sa sông.', vbt(29, 28, 'Bài tập 1–2')),
      fact('climate', 'Khí hậu', 'Vùng có khí hậu nhiệt đới gió mùa, mùa đông lạnh, mùa hạ nóng và mưa nhiều.', vbt(30, 29, 'Bài tập 3')),
      fact('care', 'Bảo vệ thiên nhiên', 'Bảo vệ thiên nhiên cần quan tâm đến sông ngòi, đất, sinh vật và tác động ngày càng tăng của con người.', vbt(31, 30, 'Bài tập 7–8')),
    ],
    quizzes: [
      quiz('Đặc điểm địa hình nổi bật của Đồng bằng Bắc Bộ là gì?', 'Vùng đồng bằng có bề mặt thấp và khá phẳng.', [{ id: 'flat', text: 'Phần lớn tương đối bằng phẳng' }, { id: 'steep', text: 'Toàn bộ là núi dốc' }, { id: 'desert', text: 'Chỉ có cồn cát' }], 'flat', ['terrain']),
      quiz('Mùa đông ở Đồng bằng Bắc Bộ thường có đặc điểm gì?', 'Đọc mẩu khí hậu của bài.', [{ id: 'cold', text: 'Lạnh' }, { id: 'hot', text: 'Nóng nhất quanh năm' }, { id: 'dry', text: 'Không có mưa bao giờ' }], 'cold', ['climate']),
      quiz('Khi bảo vệ thiên nhiên, việc nào phù hợp?', 'Chọn hành động giảm tác động tiêu cực của con người.', [{ id: 'protect', text: 'Giữ sạch sông, bảo vệ đất và sinh vật' }, { id: 'pollute', text: 'Xả rác xuống sông' }, { id: 'cut', text: 'Phá mọi thảm thực vật' }], 'protect', ['care']),
    ],
    order: sequence([{ id: 'terrain', text: 'Mô tả địa hình và sông ngòi' }, { id: 'climate', text: 'Nhận xét khí hậu theo mùa' }, { id: 'care', text: 'Đề xuất biện pháp bảo vệ thiên nhiên' }], ['terrain', 'climate', 'care'], ['terrain', 'climate', 'care']),
  },
  {
    id: 'lesson-09', title: 'Dân cư và hoạt động sản xuất ở vùng Đồng bằng Bắc Bộ', topic: 'Đồng bằng Bắc Bộ', eyebrow: 'LÀNG NGHỀ VÀ MÙA VỤ',
    facts: [
      fact('population', 'Dân cư đông', 'Đồng bằng Bắc Bộ có dân cư tập trung đông đúc; dân tộc chủ yếu là Kinh.', vbt(33, 32, 'Bài tập 1.1–1.3')),
      fact('rice', 'Trồng lúa nước', 'Đất đai màu mỡ, nguồn nước dồi dào và hệ thống đê giúp vùng phát triển trồng lúa nước.', vbt(33, 32, 'Bài tập 1.5')),
      fact('craft', 'Làng nghề', 'Vùng có nhiều làng nghề như Bát Tràng làm gốm, Vạn Phúc dệt lụa và Đại Bái đúc đồng.', vbt(34, 33, 'Bài tập 4')),
    ],
    quizzes: [
      quiz('Dân tộc chủ yếu ở Đồng bằng Bắc Bộ là dân tộc nào?', 'Chọn phương án đúng trong bài tập.', [{ id: 'kinh', text: 'Kinh' }, { id: 'mong', text: 'Mông' }, { id: 'cham', text: 'Chăm' }], 'kinh', ['population']),
      quiz('Yếu tố nào giúp Đồng bằng Bắc Bộ phát triển trồng lúa nước?', 'Nhớ đến đất, nước và hệ thống đê.', [{ id: 'rice', text: 'Đất màu mỡ, nước dồi dào và hệ thống đê' }, { id: 'desert', text: 'Khí hậu khô hạn quanh năm' }, { id: 'mine', text: 'Nhiều mỏ kim loại' }], 'rice', ['rice']),
      quiz('Làng Bát Tràng nổi tiếng với sản phẩm nào?', 'Đây là một làng nghề truyền thống ở Hà Nội.', [{ id: 'pottery', text: 'Gốm' }, { id: 'silk', text: 'Lụa' }, { id: 'silver', text: 'Chạm bạc' }], 'pottery', ['craft']),
    ],
    order: sequence([{ id: 'land', text: 'Chuẩn bị đất và nguồn nước' }, { id: 'grow', text: 'Trồng, chăm sóc và thu hoạch' }, { id: 'craft', text: 'Gắn sản xuất với làng nghề và sản phẩm' }], ['land', 'grow', 'craft'], ['population', 'rice', 'craft']),
  },
  {
    id: 'lesson-10', title: 'Một số nét văn hoá ở vùng Đồng bằng Bắc Bộ', topic: 'Đồng bằng Bắc Bộ', eyebrow: 'LÀNG QUÊ BẮC BỘ',
    facts: [
      fact('village', 'Làng quê truyền thống', 'Làng quê truyền thống thường có luỹ tre, cổng làng, cây đa, giếng nước và sân đình.', vbt(36, 35, 'Bài tập 2–3')),
      fact('festival', 'Lễ hội', 'Lễ hội thường diễn ra vào mùa xuân để cầu mùa màng bội thu, có tế lễ và trò chơi như kéo co, đánh đu, đấu vật.', vbt(37, 36, 'Bài tập 5')),
      fact('house', 'Nhà ở', 'Nhà ở truyền thống và nhà ở hiện nay có thể so sánh theo vật liệu, không gian và cách sử dụng.', vbt(37, 36, 'Bài tập 4')),
    ],
    quizzes: [
      quiz('Hình ảnh nào gắn với làng quê truyền thống Đồng bằng Bắc Bộ?', 'Hãy nhớ nhóm luỹ tre, cây đa, giếng nước, sân đình.', [{ id: 'village', text: 'Luỹ tre, cây đa, giếng nước và sân đình' }, { id: 'tower', text: 'Chỉ có nhà cao tầng' }, { id: 'desert', text: 'Cồn cát và ốc đảo' }], 'village', ['village']),
      quiz('Lễ hội làng quê thường diễn ra vào thời gian nào?', 'Bài tập gợi ý mùa trong năm.', [{ id: 'spring', text: 'Mùa xuân' }, { id: 'winter-only', text: 'Chỉ giữa mùa đông' }, { id: 'never', text: 'Không có thời điểm' }], 'spring', ['festival']),
      quiz('Hoạt động nào thường có trong lễ hội làng quê?', 'Chọn trò chơi được nêu trong nguồn.', [{ id: 'tug', text: 'Kéo co' }, { id: 'diving', text: 'Lặn biển' }, { id: 'ski', text: 'Trượt tuyết' }], 'tug', ['festival']),
    ],
    order: sequence([{ id: 'space', text: 'Nhận diện không gian làng quê' }, { id: 'ritual', text: 'Tìm hiểu lễ hội và sinh hoạt chung' }, { id: 'compare', text: 'So sánh và nêu cách giữ gìn nét đẹp' }], ['space', 'ritual', 'compare'], ['village', 'festival', 'house']),
  },
  {
    id: 'lesson-11', title: 'Sông Hồng và văn minh sông Hồng', topic: 'Đồng bằng Bắc Bộ', eyebrow: 'DÒNG SÔNG KỂ CHUYỆN',
    facts: [
      fact('river', 'Sông Hồng', 'Sông Hồng bắt nguồn từ Trung Quốc, chảy vào Việt Nam và bồi đắp đồng bằng.', vbt(38, 37, 'Bài tập 1–2')),
      fact('civilization', 'Văn minh sông Hồng', 'Văn minh sông Hồng là nền văn minh đầu tiên của người Việt cổ, gắn với Văn Lang, Âu Lạc và trống đồng Đông Sơn.', vbt(39, 38, 'Bài tập 3–4')),
      fact('life', 'Đời sống người Việt cổ', 'Người Việt cổ trồng lúa, đi lại bằng thuyền, ở nhà sàn và có tín ngưỡng thờ cúng tổ tiên, các vị thần.', vbt(40, 39, 'Bài tập 5')),
    ],
    quizzes: [
      quiz('Sông Hồng bắt nguồn từ đâu theo bài học?', 'Đọc thông tin về dòng sông trước khi vào Việt Nam.', [{ id: 'china', text: 'Trung Quốc' }, { id: 'laos', text: 'Lào' }, { id: 'south', text: 'Nam Bộ' }], 'china', ['river']),
      quiz('Nền văn minh nào gắn với Văn Lang, Âu Lạc và trống đồng Đông Sơn?', 'Tên nền văn minh mang tên dòng sông.', [{ id: 'red-civ', text: 'Văn minh sông Hồng' }, { id: 'coastal', text: 'Văn minh biển' }, { id: 'modern', text: 'Văn minh công nghiệp' }], 'red-civ', ['civilization']),
      quiz('Phương tiện đi lại chủ yếu của người Việt cổ là gì?', 'Nguồn mô tả đời sống vật chất.', [{ id: 'boat', text: 'Thuyền' }, { id: 'train', text: 'Tàu hoả' }, { id: 'plane', text: 'Máy bay' }], 'boat', ['life']),
    ],
    order: sequence([{ id: 'river', text: 'Tìm hiểu dòng sông và phù sa' }, { id: 'state', text: 'Nhận diện Văn Lang, Âu Lạc và thành tựu' }, { id: 'life', text: 'Mô tả đời sống vật chất, tinh thần' }], ['river', 'state', 'life'], ['river', 'civilization', 'life']),
  },
  {
    id: 'lesson-12', title: 'Thăng Long – Hà Nội', topic: 'Đồng bằng Bắc Bộ', eyebrow: 'DẤU ẤN KINH ĐÔ',
    facts: [
      fact('move', 'Dời đô năm 1010', 'Năm 1010, Lý Công Uẩn dời đô từ Hoa Lư ra Đại La và đổi tên thành Thăng Long.', vbt(42, 41, 'Bài tập 1–3')),
      fact('meaning', 'Tên gọi Thăng Long', 'Thăng Long có nghĩa là rồng bay lên; nơi đây trở thành kinh đô qua nhiều triều đại.', vbt(42, 41, 'Bài tập 1.3–3')),
      fact('capital', 'Hà Nội hôm nay', 'Hà Nội nằm ở Đồng bằng Bắc Bộ và là trung tâm chính trị, kinh tế, văn hoá, giáo dục của cả nước.', vbt(43, 42, 'Bài tập 7')),
    ],
    quizzes: [
      quiz('Vị vua nào đổi tên Đại La thành Thăng Long?', 'Đó là vị vua dời đô năm 1010.', [{ id: 'ly-thai-to', text: 'Lý Thái Tổ' }, { id: 'tran-thai-tong', text: 'Trần Thái Tông' }, { id: 'le-loi', text: 'Lê Lợi' }], 'ly-thai-to', ['move']),
      quiz('Tên gọi Thăng Long có nghĩa là gì?', 'Hãy liên tưởng đến hình ảnh một con vật bay lên.', [{ id: 'dragon', text: 'Rồng bay lên' }, { id: 'river', text: 'Dòng sông rộng' }, { id: 'green', text: 'Thành phố xanh' }], 'dragon', ['meaning']),
      quiz('Hà Nội thuộc vùng nào của nước ta?', 'Đây là vùng có sông Hồng và đồng bằng rộng.', [{ id: 'red-delta', text: 'Đồng bằng Bắc Bộ' }, { id: 'highlands', text: 'Tây Nguyên' }, { id: 'south', text: 'Nam Bộ' }], 'red-delta', ['capital']),
    ],
    order: sequence([{ id: 'hoa-lu', text: 'Kinh đô ở Hoa Lư' }, { id: 'dai-la', text: 'Lý Công Uẩn dời đô ra Đại La' }, { id: 'thang-long', text: 'Đại La được đổi tên thành Thăng Long' }], ['hoa-lu', 'dai-la', 'thang-long'], ['move', 'meaning', 'capital']),
  },
  {
    id: 'lesson-13', title: 'Văn Miếu – Quốc Tử Giám', topic: 'Đồng bằng Bắc Bộ', eyebrow: 'VƯỜN HIỀN TÀI',
    facts: [
      fact('history', 'Công trình thời Lý', 'Văn Miếu – Quốc Tử Giám được bắt đầu xây dựng dưới thời nhà Lý.', vbt(46, 45, 'Bài tập 1')),
      fact('roles', 'Các công trình', 'Văn Miếu là nơi thờ Khổng Tử; Quốc Tử Giám là trường học; nhà bia ghi danh người đỗ Tiến sĩ.', vbt(46, 45, 'Bài tập 3')),
      fact('learning', 'Truyền thống hiếu học', 'Khu di tích giúp tìm hiểu và tôn vinh truyền thống hiếu học của dân tộc.', vbt(47, 46, 'Bài tập 4–6')),
    ],
    quizzes: [
      quiz('Văn Miếu – Quốc Tử Giám bắt đầu xây dựng vào thời nào?', 'Nguồn ghi “thời nhà ...”.', [{ id: 'ly', text: 'Thời Lý' }, { id: 'nguyen', text: 'Thời Nguyễn' }, { id: 'tran', text: 'Thời Trần' }], 'ly', ['history']),
      quiz('Quốc Tử Giám có chức năng gì?', 'Đây là một cơ sở học tập trong khu di tích.', [{ id: 'school', text: 'Nơi học tập của người giỏi và con em quan lại' }, { id: 'market', text: 'Nơi họp chợ' }, { id: 'harbor', text: 'Nơi neo thuyền' }], 'school', ['roles']),
      quiz('Nhà bia Tiến sĩ góp phần thể hiện truyền thống nào?', 'Bia ghi danh người đỗ đạt để khuyến khích học tập.', [{ id: 'study', text: 'Truyền thống hiếu học' }, { id: 'fishing', text: 'Truyền thống đánh bắt cá' }, { id: 'mining', text: 'Truyền thống khai khoáng' }], 'study', ['learning']),
    ],
    order: sequence([{ id: 'build', text: 'Nhận diện lịch sử hình thành khu di tích' }, { id: 'roles', text: 'Ghép công trình với chức năng' }, { id: 'learn', text: 'Rút ra bài học về truyền thống hiếu học' }], ['build', 'roles', 'learn'], ['history', 'roles', 'learning']),
  },
  {
    id: 'lesson-14', title: 'Ôn tập vùng Đồng bằng Bắc Bộ', topic: 'Đồng bằng Bắc Bộ', eyebrow: 'BẢN ĐỒ GHI NHỚ',
    facts: [
      fact('north', 'Trung du và miền núi phía Bắc', 'Vùng phía bắc có địa hình đồi núi, nhiều sông dốc, khoáng sản và chợ phiên vùng cao.', vbt(49, 48, 'Bài tập 2–3')),
      fact('delta', 'Đồng bằng Bắc Bộ', 'Đồng bằng Bắc Bộ có địa hình phần lớn bằng phẳng, sông ngòi dày đặc, đông dân và có làng nghề.', vbt(49, 48, 'Bài tập 2–3')),
      fact('heritage', 'Di sản và lễ hội', 'Đền Hùng, lễ Giỗ Tổ, chợ phiên và Văn Miếu – Quốc Tử Giám là những điểm nhớ văn hoá của phần ôn tập.', vbt(50, 49, 'Bài tập 3–4')),
    ],
    quizzes: [
      quiz('Vùng nào có địa hình chủ yếu là đồi, núi và một số cao nguyên?', 'Đối chiếu hai vùng trong bảng ôn tập.', [{ id: 'north', text: 'Trung du và miền núi phía Bắc' }, { id: 'delta', text: 'Đồng bằng Bắc Bộ' }, { id: 'south', text: 'Nam Bộ' }], 'north', ['north']),
      quiz('Đồng bằng Bắc Bộ có đặc điểm nào?', 'Nhớ địa hình, dân cư và mạng lưới sông.', [{ id: 'delta', text: 'Địa hình khá bằng phẳng, sông ngòi dày và dân cư đông' }, { id: 'mountain', text: 'Toàn bộ là núi cao' }, { id: 'desert', text: 'Khô hạn quanh năm' }], 'delta', ['delta']),
      quiz('Địa điểm nào gắn với truyền thống hiếu học?', 'Đó là khu di tích ở Hà Nội.', [{ id: 'van-mieu', text: 'Văn Miếu – Quốc Tử Giám' }, { id: 'floating', text: 'Chợ nổi' }, { id: 'cu-chi', text: 'Địa đạo Củ Chi' }], 'van-mieu', ['heritage']),
    ],
    order: sequence([{ id: 'compare', text: 'Đặt hai vùng cạnh nhau để so sánh' }, { id: 'connect', text: 'Nối đặc điểm với vùng phù hợp' }, { id: 'remember', text: 'Ghi nhớ di sản, lễ hội và cách bảo vệ' }], ['compare', 'connect', 'remember'], ['north', 'delta', 'heritage']),
  },
  {
    id: 'lesson-15', title: 'Thiên nhiên vùng Duyên hải miền Trung', topic: 'Duyên hải miền Trung', eyebrow: 'DẢI ĐẤT VEN BIỂN',
    facts: [
      fact('bridge', 'Vị trí cầu nối', 'Vùng nằm ở giữa đất nước, là cầu nối giữa lãnh thổ phía bắc và phía nam, có đường bờ biển dài.', vbt(52, 51, 'Bài tập 1–3')),
      fact('terrain', 'Địa hình và sông ngòi', 'Phía tây là đồi núi và cao nguyên, phía đông là các đồng bằng nhỏ hẹp; sông thường ngắn và dốc.', vbt(56, 55, 'Bài tập 6')),
      fact('hazards', 'Thiên tai và tài nguyên', 'Vùng có biển, đảo, rừng và nhiều cảnh đẹp nhưng thường gặp bão, ngập lụt, hạn hán và sạt lở.', vbt(59, 58, 'Bài tập 11–15')),
    ],
    quizzes: [
      quiz('Đặc điểm vị trí nổi bật của Duyên hải miền Trung là gì?', 'Vùng nằm giữa lãnh thổ nước ta.', [{ id: 'bridge', text: 'Là cầu nối giữa phía bắc và phía nam' }, { id: 'inland', text: 'Không giáp biển' }, { id: 'border-only', text: 'Chỉ giáp một quốc gia' }], 'bridge', ['bridge']),
      quiz('Phía đông của vùng thường có dạng địa hình nào?', 'Đọc cặp “phía tây – phía đông”.', [{ id: 'narrow-delta', text: 'Dải đồng bằng nhỏ, hẹp' }, { id: 'high-mountain', text: 'Dãy núi cao liên tục sát biển' }, { id: 'desert', text: 'Hoang mạc rộng' }], 'narrow-delta', ['terrain']),
      quiz('Thiên tai nào thường xảy ra ở vùng?', 'Nguồn liệt kê một nhóm thiên tai ven biển.', [{ id: 'storm-flood', text: 'Bão, ngập lụt và hạn hán' }, { id: 'snow', text: 'Băng tuyết quanh năm' }, { id: 'none', text: 'Không có thiên tai' }], 'storm-flood', ['hazards']),
    ],
    order: sequence([{ id: 'map', text: 'Xác định vị trí, biển và đảo' }, { id: 'terrain', text: 'Mô tả địa hình, sông, rừng và đất' }, { id: 'care', text: 'Cân nhắc lợi ích và phòng thiên tai' }], ['map', 'terrain', 'care'], ['bridge', 'terrain', 'hazards']),
  },
  {
    id: 'lesson-16', title: 'Dân cư và hoạt động sản xuất ở vùng Duyên hải miền Trung', topic: 'Duyên hải miền Trung', eyebrow: 'BIỂN VÀ SINH KẾ',
    facts: [
      fact('people', 'Dân cư và nghề', 'Người dân vùng gồm nhiều dân tộc; các nghề chính có trồng trọt, chăn nuôi, làm muối, đánh bắt và nuôi trồng hải sản.', vbt(60, 59, 'Bài tập 1')),
      fact('sea', 'Kinh tế biển', 'Biển rộng, nhiều vịnh, đầm phá, cửa sông và bãi tắm tạo điều kiện cho hải sản, du lịch và vận tải biển.', vbt(63, 62, 'Bài tập 5–6')),
      fact('energy', 'Năng lượng', 'Sông dốc, nhiều nắng và gió giúp phát triển thuỷ điện, điện mặt trời và điện gió.', vbt(65, 64, 'Bài tập 8–11')),
    ],
    quizzes: [
      quiz('Hoạt động nào là kinh tế biển của vùng?', 'Chọn nghề gắn với bờ biển và hải sản.', [{ id: 'seafood', text: 'Đánh bắt và nuôi trồng hải sản' }, { id: 'coal', text: 'Khai thác than đá ở mọi nơi' }, { id: 'snow', text: 'Trượt tuyết' }], 'seafood', ['people']),
      quiz('Điều kiện nào thuận lợi cho làm muối?', 'Muối cần nước biển mặn và nhiều nắng.', [{ id: 'salt', text: 'Nước biển mặn và nhiều nắng' }, { id: 'forest', text: 'Rừng rậm quanh năm' }, { id: 'snow', text: 'Nhiệt độ dưới 0°C' }], 'salt', ['sea']),
      quiz('Vì sao vùng phát triển được điện gió, điện mặt trời?', 'Nguồn nói đến số giờ nắng và gió.', [{ id: 'sun-wind', text: 'Có nhiều nắng và gió mạnh, ổn định' }, { id: 'river-only', text: 'Chỉ có sông nước' }, { id: 'no-sun', text: 'Không có ánh sáng' }], 'sun-wind', ['energy']),
    ],
    order: sequence([{ id: 'people', text: 'Nhận diện dân cư và nghề chính' }, { id: 'sea', text: 'Nối điều kiện biển với hoạt động' }, { id: 'energy', text: 'Cân nhắc năng lượng và môi trường' }], ['people', 'sea', 'energy'], ['people', 'sea', 'energy']),
  },
  {
    id: 'lesson-17', title: 'Một số nét văn hoá ở vùng Duyên hải miền Trung', topic: 'Duyên hải miền Trung', eyebrow: 'DI SẢN VEN BIỂN',
    facts: [
      fact('festivals', 'Lễ hội biển', 'Lễ Rước cá Ông thể hiện lòng biết ơn và cầu cho trời yên biển lặng; lễ Ka-tê của người Chăm diễn ra khoảng tháng 9–10.', vbt(67, 66, 'Bài tập 1–4')),
      fact('heritage', 'Di sản thế giới', 'Vùng có những di sản như Phố cổ Hội An, Thánh địa Mỹ Sơn và các di sản văn hoá khác.', vbt(68, 67, 'Bài tập 2–3')),
      fact('community', 'Nhà ở và cộng đồng', 'Nhà rông ở một số khu vực cao nguyên là nơi sinh hoạt chung của cộng đồng và tổ chức lễ hội.', vbt(70, 69, 'Bài tập 5–7')),
    ],
    quizzes: [
      quiz('Lễ Rước cá Ông thể hiện điều gì?', 'Ngư dân bày tỏ sự tôn kính với cá Ông.', [{ id: 'whale', text: 'Lòng biết ơn, tôn kính và cầu biển yên' }, { id: 'harvest', text: 'Cầu mùa màng trên ruộng lúa' }, { id: 'study', text: 'Tôn vinh truyền thống hiếu học' }], 'whale', ['festivals']),
      quiz('Phố cổ Hội An thuộc nhóm nào?', 'Đây là một di sản văn hoá vật thể nổi tiếng.', [{ id: 'heritage', text: 'Di sản văn hoá thế giới' }, { id: 'mine', text: 'Mỏ khoáng sản' }, { id: 'power', text: 'Nhà máy điện' }], 'heritage', ['heritage']),
      quiz('Nhà rông dùng để làm gì?', 'Không gian này phục vụ cả buôn làng.', [{ id: 'community', text: 'Sinh hoạt chung của cộng đồng' }, { id: 'private', text: 'Chỉ làm phòng riêng' }, { id: 'warehouse', text: 'Chỉ chứa hàng hoá' }], 'community', ['community']),
    ],
    order: sequence([{ id: 'identify', text: 'Nhận diện lễ hội và di sản' }, { id: 'interpret', text: 'Giải thích ý nghĩa văn hoá' }, { id: 'protect', text: 'Nêu việc làm bảo tồn phù hợp' }], ['identify', 'interpret', 'protect'], ['festivals', 'heritage', 'community']),
  },
  {
    id: 'lesson-18', title: 'Cố đô Huế', topic: 'Duyên hải miền Trung', eyebrow: 'DÒNG SÔNG DI SẢN',
    facts: [
      fact('landscape', 'Cảnh quan Huế', 'Cố đô Huế được điểm tô bởi dòng sông Hương, núi Ngự Bình và cảnh quan nên thơ.', vbt(75, 74, 'Bài tập 2')),
      fact('dynasty', 'Triều Nguyễn', 'Kinh thành Huế được xây dựng dưới triều Nguyễn; quần thể có nhiều công trình kiến trúc và cảnh quan đặc sắc.', vbt(74, 73, 'Bài tập 1.1–1.2')),
      fact('history', 'Cuộc phản công 1885', 'Đêm mồng 4 rạng sáng mồng 5-7-1885, Tôn Thất Thuyết lãnh đạo quân ta tấn công đồn Mang Cá và Toà Khâm sứ Pháp.', vbt(75, 74, 'Bài tập 4')),
    ],
    quizzes: [
      quiz('Công trình nào thuộc quần thể kiến trúc Cố đô Huế?', 'Chọn công trình gắn với Huế.', [{ id: 'thien-mu', text: 'Chùa Thiên Mụ' }, { id: 'chua-cau', text: 'Chùa Cầu' }, { id: 'van-mieu', text: 'Văn Miếu' }], 'thien-mu', ['landscape']),
      quiz('Kinh thành Huế được xây dựng dưới triều đại nào?', 'Đây là triều đại cuối cùng của chế độ phong kiến Việt Nam.', [{ id: 'nguyen', text: 'Triều Nguyễn' }, { id: 'ly', text: 'Triều Lý' }, { id: 'tran', text: 'Triều Trần' }], 'nguyen', ['dynasty']),
      quiz('Ai lãnh đạo cuộc phản công ở Kinh thành Huế năm 1885?', 'Tên nhân vật nằm trong câu chuyện lịch sử.', [{ id: 'ton-that-thuyet', text: 'Tôn Thất Thuyết' }, { id: 'bao-dai', text: 'Vua Bảo Đại' }, { id: 'ly-thai-to', text: 'Lý Thái Tổ' }], 'ton-that-thuyet', ['history']),
    ],
    order: sequence([{ id: 'landscape', text: 'Quan sát sông Hương, núi Ngự Bình và cảnh quan' }, { id: 'dynasty', text: 'Nhận diện công trình và triều Nguyễn' }, { id: 'history', text: 'Kể lại sự kiện lịch sử năm 1885' }], ['landscape', 'dynasty', 'history'], ['landscape', 'dynasty', 'history']),
  },
  {
    id: 'lesson-19', title: 'Phố cổ Hội An', topic: 'Duyên hải miền Trung', eyebrow: 'PHỐ ĐÈN BÊN SÔNG',
    facts: [
      fact('place', 'Vị trí Hội An', 'Phố cổ Hội An nằm ở hạ lưu sông Thu Bồn và gắn với hoạt động buôn bán, giao lưu lâu đời.', vbt(77, 76, 'Bài tập 1.1')),
      fact('architecture', 'Công trình kiến trúc', 'Nhà cổ thường hẹp ngang, dài sâu; Chùa Cầu bằng gỗ, mái ngói âm dương; hội quán mang phong cách kiến trúc Trung Hoa.', vbt(78, 77, 'Bài tập 2–3')),
      fact('preserve', 'Bảo tồn di sản', 'Lễ hội, du lịch gắn với bảo vệ môi trường và trùng tu, phục dựng di tích góp phần bảo tồn Hội An.', vbt(81, 80, 'Bài tập 6–7')),
    ],
    quizzes: [
      quiz('Phố cổ Hội An nằm ở đâu?', 'Chọn vị trí gắn với sông Thu Bồn.', [{ id: 'lower-thubon', text: 'Hạ lưu sông Thu Bồn' }, { id: 'upper-huong', text: 'Thượng lưu sông Hương' }, { id: 'red-river', text: 'Ven sông Hồng' }], 'lower-thubon', ['place']),
      quiz('Đặc điểm nào đúng về nhà cổ Hội An?', 'Nhớ không gian nhà hẹp ngang nhưng sâu.', [{ id: 'narrow-deep', text: 'Hẹp ngang, dài sâu và chia không gian buôn bán, sinh hoạt, thờ tự' }, { id: 'tower', text: 'Chỉ gồm một tháp đá' }, { id: 'tent', text: 'Nhà tạm không có mái' }], 'narrow-deep', ['architecture']),
      quiz('Việc nào góp phần bảo tồn Phố cổ Hội An?', 'Chọn hoạt động vừa giữ di tích vừa bảo vệ môi trường.', [{ id: 'restore', text: 'Trùng tu di tích và du lịch gắn với bảo vệ môi trường' }, { id: 'demolish', text: 'Phá nhà cổ để xây biển quảng cáo' }, { id: 'litter', text: 'Xả rác xuống sông' }], 'restore', ['preserve']),
    ],
    order: sequence([{ id: 'place', text: 'Xác định vị trí và dòng sông' }, { id: 'architecture', text: 'Khám phá nhà cổ, hội quán, Chùa Cầu' }, { id: 'preserve', text: 'Đề xuất việc bảo tồn di sản' }], ['place', 'architecture', 'preserve'], ['place', 'architecture', 'preserve']),
  },
  {
    id: 'lesson-20', title: 'Thiên nhiên vùng Tây Nguyên', topic: 'Tây Nguyên', eyebrow: 'CAO NGUYÊN ĐỎ',
    facts: [
      fact('position', 'Vị trí Tây Nguyên', 'Tây Nguyên gồm năm tỉnh, nằm ở phía tây của Duyên hải miền Trung và là vùng duy nhất không giáp biển.', sgk(87, 86, 'Mục 1')),
      fact('plateau', 'Cao nguyên và đất đỏ', 'Địa hình gồm các cao nguyên xếp tầng, cao ở phía đông và thấp dần về phía tây; đất đỏ badan giàu dinh dưỡng.', sgk(88, 87, 'Mục 2a–2c')),
      fact('forest', 'Rừng và khí hậu', 'Vùng có mùa mưa, mùa khô rõ rệt; rừng giúp giảm lũ, giảm khô hạn, cung cấp sản vật và cần được phục hồi, bảo vệ.', sgk(89, 88, 'Mục 2b–2d')),
    ],
    quizzes: [
      quiz('Tây Nguyên có đặc điểm vị trí nào?', 'Đây là vùng duy nhất của nước ta không giáp biển.', [{ id: 'no-sea', text: 'Không giáp biển' }, { id: 'coast', text: 'Giáp biển ở cả hai phía' }, { id: 'island', text: 'Chỉ gồm các đảo' }], 'no-sea', ['position']),
      quiz('Đất đỏ badan ở Tây Nguyên phù hợp với cây nào?', 'Nguồn nêu nhóm cây công nghiệp lâu năm.', [{ id: 'coffee', text: 'Cà phê, hồ tiêu và cao su' }, { id: 'rice-only', text: 'Chỉ lúa nước' }, { id: 'seaweed', text: 'Rong biển' }], 'coffee', ['plateau']),
      quiz('Vai trò nào của rừng được nêu trong bài?', 'Rừng vừa điều hoà nước vừa cung cấp sản vật.', [{ id: 'forest-role', text: 'Giảm lũ, giảm khô hạn và cung cấp sản vật' }, { id: 'none', text: 'Không có vai trò' }, { id: 'road', text: 'Chỉ làm đường giao thông' }], 'forest-role', ['forest']),
    ],
    order: sequence([{ id: 'position', text: 'Xác định vị trí và các cao nguyên' }, { id: 'nature', text: 'Mô tả địa hình, đất và khí hậu' }, { id: 'forest', text: 'Đề xuất biện pháp bảo vệ rừng' }], ['position', 'nature', 'forest'], ['position', 'plateau', 'forest']),
  },
  {
    id: 'lesson-21', title: 'Dân cư và hoạt động sản xuất ở vùng Tây Nguyên', topic: 'Tây Nguyên', eyebrow: 'CÀ PHÊ VÀ DÒNG SÔNG',
    facts: [
      fact('people', 'Dân cư', 'Tây Nguyên là vùng thưa dân, có Gia Rai, Ê Đê, Ba Na, Xơ Đăng, Mạ... và nhiều dân tộc từ vùng khác đến.', sgk(91, 90, 'Mục 1')),
      fact('crops', 'Cây công nghiệp', 'Tây Nguyên là vùng trồng cây công nghiệp lâu năm lớn, nổi bật là cà phê, hồ tiêu, cao su và chè.', sgk(92, 91, 'Mục 2a')),
      fact('hydro', 'Chăn nuôi và thuỷ điện', 'Đồng cỏ, khí hậu thuận lợi cho trâu bò; sông dốc tạo khả năng phát triển thuỷ điện nhưng cần lưu ý tác động môi trường.', sgk(93, 92, 'Mục 2b–2c')),
    ],
    quizzes: [
      quiz('Tây Nguyên có đặc điểm dân cư như thế nào?', 'Bài học so sánh mật độ dân số giữa các vùng.', [{ id: 'sparse', text: 'Thưa dân' }, { id: 'dense', text: 'Đông dân nhất cả nước' }, { id: 'none', text: 'Không có buôn làng' }], 'sparse', ['people']),
      quiz('Cây công nghiệp nào được trồng nhiều ở Tây Nguyên?', 'Chọn cây có giá trị xuất khẩu cao.', [{ id: 'coffee', text: 'Cà phê' }, { id: 'rice', text: 'Lúa nước là cây duy nhất' }, { id: 'seaweed', text: 'Rong biển' }], 'coffee', ['crops']),
      quiz('Vì sao Tây Nguyên có thể phát triển thuỷ điện?', 'Sông chảy qua nhiều bậc địa hình có độ dốc lớn.', [{ id: 'slope', text: 'Sông có độ dốc lớn và nhiều bậc địa hình' }, { id: 'flat', text: 'Không có sông' }, { id: 'dry', text: 'Chỉ có hồ phẳng' }], 'slope', ['hydro']),
    ],
    order: sequence([{ id: 'people', text: 'Nhận diện dân cư và buôn làng' }, { id: 'crops', text: 'Tìm hiểu cây công nghiệp và chăn nuôi' }, { id: 'hydro', text: 'Giải thích thuỷ điện và lưu ý môi trường' }], ['people', 'crops', 'hydro'], ['people', 'crops', 'hydro']),
  },
  {
    id: 'lesson-22', title: 'Một số nét văn hoá và truyền thống yêu nước, cách mạng của đồng bào Tây Nguyên', topic: 'Tây Nguyên', eyebrow: 'NHÀ RÔNG VÀ ANH HÙNG',
    facts: [
      fact('culture', 'Nhà ở và lễ hội', 'Nhà Rông, nhà Dài, trang phục thổ cẩm và các lễ hội như Đua voi, Tạ ơn cha mẹ là nét văn hoá tiêu biểu.', sgk(94, 93, 'Mục 1')),
      fact('ntrang', 'N’Trang Lơng', 'N’Trang Lơng lãnh đạo cuộc khởi nghĩa kéo dài từ năm 1911 đến năm 1935, thu hút nhiều dân tộc tham gia.', sgk(96, 95, 'Mục 2')),
      fact('nup', 'Anh hùng Núp', 'Đinh Núp là người Ba Na, lãnh đạo buôn làng chống thực dân Pháp và được phong danh hiệu Anh hùng Lực lượng vũ trang nhân dân.', sgk(97, 96, 'Câu chuyện lịch sử')),
    ],
    quizzes: [
      quiz('Nhà Rông có vai trò gì trong buôn làng?', 'Đây là ngôi nhà chung ở trung tâm buôn làng.', [{ id: 'community', text: 'Không gian sinh hoạt chung của cộng đồng' }, { id: 'private', text: 'Nhà ở riêng của một gia đình' }, { id: 'market', text: 'Chỉ là nơi bán hàng' }], 'community', ['culture']),
      quiz('Cuộc khởi nghĩa do N’Trang Lơng lãnh đạo kéo dài thời gian nào?', 'Nguồn ghi hai mốc đầu và cuối.', [{ id: '1911-1935', text: 'Từ năm 1911 đến năm 1935' }, { id: '1945-1954', text: 'Từ năm 1945 đến năm 1954' }, { id: '1975-1980', text: 'Từ năm 1975 đến năm 1980' }], '1911-1935', ['ntrang']),
      quiz('Đinh Núp thuộc dân tộc nào?', 'Tên quê và dân tộc được nêu trong câu chuyện.', [{ id: 'ba-na', text: 'Ba Na' }, { id: 'kinh', text: 'Kinh' }, { id: 'cham', text: 'Chăm' }], 'ba-na', ['nup']),
    ],
    order: sequence([{ id: 'culture', text: 'Khám phá không gian sống và lễ hội' }, { id: 'resist', text: 'Tìm hiểu N’Trang Lơng và phong trào đấu tranh' }, { id: 'nup', text: 'Kể lại câu chuyện về Anh hùng Núp' }], ['culture', 'resist', 'nup'], ['culture', 'ntrang', 'nup']),
  },
  {
    id: 'lesson-23', title: 'Lễ hội Cồng chiêng Tây Nguyên', topic: 'Tây Nguyên', eyebrow: 'NHỊP CỒNG CHIÊNG',
    facts: [
      fact('space', 'Không gian văn hoá', 'Không gian văn hoá Cồng chiêng trải rộng trên năm tỉnh Tây Nguyên; nhiều dân tộc là chủ nhân của không gian này.', sgk(98, 97, 'Mục 1')),
      fact('meaning', 'Vai trò cồng chiêng', 'Cồng chiêng diễn tả niềm vui, nỗi buồn và được dùng trong nghi lễ, ngày hội, sinh hoạt cộng đồng.', sgk(98, 97, 'Mục 1')),
      fact('festival', 'Lễ hội', 'Lễ hội Cồng chiêng được tổ chức luân phiên hằng năm; có trình diễn cồng chiêng, phục dựng lễ dân gian và thi tạc tượng, dệt thổ cẩm.', sgk(99, 98, 'Mục 2')),
    ],
    quizzes: [
      quiz('Không gian văn hoá Cồng chiêng trải rộng trên mấy tỉnh Tây Nguyên?', 'Đọc con số trong mẩu tư liệu.', [{ id: 'five', text: 'Năm tỉnh' }, { id: 'two', text: 'Hai tỉnh' }, { id: 'ten', text: 'Mười tỉnh' }], 'five', ['space']),
      quiz('Cồng chiêng thường được sử dụng trong dịp nào?', 'Nguồn nêu ba nhóm dịp.', [{ id: 'ritual', text: 'Nghi lễ, ngày hội và sinh hoạt cộng đồng' }, { id: 'only-school', text: 'Chỉ trong lớp học' }, { id: 'only-market', text: 'Chỉ ở chợ' }], 'ritual', ['meaning']),
      quiz('Lễ hội Cồng chiêng được tổ chức như thế nào?', 'Nhiều tỉnh luân phiên đăng cai.', [{ id: 'rotate', text: 'Luân phiên hằng năm ở các tỉnh' }, { id: 'fixed', text: 'Cố định một nơi' }, { id: 'never', text: 'Không tổ chức' }], 'rotate', ['festival']),
    ],
    order: sequence([{ id: 'space', text: 'Xác định không gian và các dân tộc chủ nhân' }, { id: 'meaning', text: 'Giải thích vai trò của cồng chiêng' }, { id: 'festival', text: 'Mô tả hoạt động lễ hội và cách gìn giữ' }], ['space', 'meaning', 'festival'], ['space', 'meaning', 'festival']),
  },
  {
    id: 'lesson-24', title: 'Thiên nhiên vùng Nam Bộ', topic: 'Nam Bộ', eyebrow: 'MIỆT VƯỜN SÔNG NƯỚC',
    facts: [
      fact('position', 'Vị trí và địa hình', 'Nam Bộ gồm Đông Nam Bộ và Tây Nam Bộ, tiếp giáp Cam-pu-chia, Biển Đông và có địa hình chủ yếu là đồng bằng.', vbt(85, 84, 'Bài tập 1–3')),
      fact('rivers', 'Sông ngòi và kênh rạch', 'Sông Đồng Nai, sông Tiền, sông Hậu cùng mạng lưới kênh rạch tạo thuận lợi cho giao thông đường thuỷ và thuỷ sản.', vbt(86, 85, 'Bài tập 2–6')),
      fact('climate', 'Khí hậu và khó khăn', 'Nam Bộ có nhiệt độ cao, hai mùa mưa – khô rõ rệt; mùa khô có thể thiếu nước, còn lũ và sạt lở gây khó khăn.', vbt(87, 86, 'Bài tập 4–7')),
    ],
    quizzes: [
      quiz('Nam Bộ tiếp giáp với quốc gia nào?', 'Nhớ đường biên giới phía tây nam.', [{ id: 'cambodia', text: 'Cam-pu-chia' }, { id: 'china', text: 'Trung Quốc' }, { id: 'laos', text: 'Lào' }], 'cambodia', ['position']),
      quiz('Đặc điểm địa hình chủ yếu của Nam Bộ là gì?', 'Nguồn so sánh với Đông Nam Bộ và đồng bằng sông Cửu Long.', [{ id: 'delta', text: 'Đồng bằng' }, { id: 'mountain', text: 'Núi cao' }, { id: 'plateau', text: 'Cao nguyên xếp tầng' }], 'delta', ['position']),
      quiz('Mùa khô ở Nam Bộ có thể gây ra khó khăn gì?', 'Đọc đoạn khí hậu của nguồn.', [{ id: 'water', text: 'Thiếu nước cho sinh hoạt và sản xuất' }, { id: 'snow', text: 'Băng tuyết' }, { id: 'none', text: 'Không có khó khăn' }], 'water', ['climate']),
    ],
    order: sequence([{ id: 'map', text: 'Xác định vùng, biển và các sông lớn' }, { id: 'nature', text: 'Mô tả địa hình, khí hậu, đất và kênh rạch' }, { id: 'care', text: 'Nêu thuận lợi, khó khăn và cách ứng phó' }], ['map', 'nature', 'care'], ['position', 'rivers', 'climate']),
  },
  {
    id: 'lesson-25', title: 'Dân cư và hoạt động sản xuất ở vùng Nam Bộ', topic: 'Nam Bộ', eyebrow: 'MÙA VỤ PHƯƠNG NAM',
    facts: [
      fact('people', 'Dân cư đa dạng', 'Nam Bộ có các dân tộc Kinh, Khơ-me, Hoa, Chăm và đời sống gắn với sông nước, miệt vườn.', vbt(88, 87, 'Bài tập 1–3')),
      fact('agriculture', 'Nông nghiệp', 'Nam Bộ trồng lúa, cây ăn quả, cao su, điều, hồ tiêu; chăn nuôi và nuôi trồng thuỷ sản phát triển.', vbt(89, 88, 'Bài tập 3–5')),
      fact('industry', 'Công nghiệp', 'Đông Nam Bộ tập trung nhiều hoạt động công nghiệp; các ngành gồm dầu khí, điện tử – tin học, dệt may, chế biến lương thực và nhiệt điện.', vbt(90, 89, 'Bài tập 6')),
    ],
    quizzes: [
      quiz('Nhóm dân tộc nào sống chủ yếu ở Nam Bộ?', 'Chọn nhóm được nêu trong bài.', [{ id: 'south-people', text: 'Kinh, Khơ-me, Hoa, Chăm' }, { id: 'north-people', text: 'Tày, Nùng, Dao, Mông' }, { id: 'only-kinh', text: 'Chỉ một dân tộc' }], 'south-people', ['people']),
      quiz('Nam Bộ là vùng trồng lớn về nhóm cây nào?', 'Nguồn nêu lúa, cây ăn quả và cây công nghiệp.', [{ id: 'crops', text: 'Lúa, cây ăn quả và cây công nghiệp' }, { id: 'snow', text: 'Cây ôn đới trên núi cao' }, { id: 'none', text: 'Không trồng trọt' }], 'crops', ['agriculture']),
      quiz('Hoạt động công nghiệp tập trung chủ yếu ở đâu?', 'Nguồn nhấn mạnh một tiểu vùng.', [{ id: 'southeast', text: 'Đông Nam Bộ' }, { id: 'mountain', text: 'Vùng núi phía Bắc' }, { id: 'island', text: 'Các đảo xa bờ' }], 'southeast', ['industry']),
    ],
    order: sequence([{ id: 'people', text: 'Nhận diện dân cư và đời sống sông nước' }, { id: 'farm', text: 'Tìm hiểu cây trồng, vật nuôi, thuỷ sản' }, { id: 'industry', text: 'Nối ngành công nghiệp với nơi phân bố' }], ['people', 'farm', 'industry'], ['people', 'agriculture', 'industry']),
  },
  {
    id: 'lesson-26', title: 'Một số nét văn hoá và truyền thống yêu nước, cách mạng của đồng bào Nam Bộ', topic: 'Nam Bộ', eyebrow: 'SẮC MÀU SÔNG NƯỚC',
    facts: [
      fact('culture', 'Văn hoá sông nước', 'Nhà sàn, nhà nổi, ghe xuồng, chợ nổi, khăn rằn và đờn ca tài tử là những nét văn hoá tiêu biểu của Nam Bộ.', vbt(91, 90, 'Bài tập 1–3')),
      fact('truong-dinh', 'Trương Định', 'Trương Định lãnh đạo nhân dân chống Pháp và được suy tôn là Bình Tây Đại Nguyên soái.', vbt(93, 92, 'Bài tập 4')),
      fact('community', 'Tinh thần yêu nước', 'Truyền thống yêu nước, cách mạng của đồng bào Nam Bộ thể hiện qua sự đoàn kết, che chở và đấu tranh bảo vệ quê hương.', vbt(93, 92, 'Bài tập 5')),
    ],
    quizzes: [
      quiz('Phương tiện đi lại chủ yếu ở Nam Bộ là gì?', 'Đời sống gắn với sông nước.', [{ id: 'boat', text: 'Ghe, xuồng' }, { id: 'train', text: 'Tàu hoả' }, { id: 'cable', text: 'Cáp treo' }], 'boat', ['culture']),
      quiz('Chợ nổi thường bán những gì?', 'Chợ phục vụ đời sống miệt vườn.', [{ id: 'produce', text: 'Nông sản và vật dụng cần thiết' }, { id: 'books', text: 'Chỉ sách vở' }, { id: 'machines', text: 'Chỉ máy móc nặng' }], 'produce', ['culture']),
      quiz('Trương Định được nhân dân suy tôn là gì?', 'Tên gọi thể hiện vai trò lãnh đạo chống Pháp.', [{ id: 'binh-tay', text: 'Bình Tây Đại Nguyên soái' }, { id: 'king', text: 'Vua Văn Lang' }, { id: 'teacher', text: 'Thầy giáo làng' }], 'binh-tay', ['truong-dinh']),
    ],
    order: sequence([{ id: 'culture', text: 'Khám phá nếp sống và nghệ thuật sông nước' }, { id: 'history', text: 'Tìm hiểu nhân vật, phong trào yêu nước' }, { id: 'share', text: 'Nêu việc làm trân trọng và phát huy truyền thống' }], ['culture', 'history', 'share'], ['culture', 'truong-dinh', 'community']),
  },
  {
    id: 'lesson-27', title: 'Thành phố Hồ Chí Minh', topic: 'Nam Bộ', eyebrow: 'THÀNH PHỐ BÊN SÔNG',
    facts: [
      fact('history', 'Dấu mốc lịch sử', 'Nguyễn Tất Thành rời Bến Nhà Rồng ra đi tìm đường cứu nước; ngày 30-4-1975 là một mốc lớn của Thành phố.', vbt(95, 94, 'Bài tập 2–3')),
      fact('name', 'Tên gọi', 'Thành phố được đổi tên là Thành phố Hồ Chí Minh từ năm 1976.', vbt(94, 93, 'Bài tập 1.2')),
      fact('center', 'Trung tâm lớn', 'Thành phố Hồ Chí Minh là trung tâm kinh tế, giáo dục, khoa học, công nghệ và có nhiều cảng, khu công nghiệp.', vbt(96, 95, 'Bài tập 4–5')),
    ],
    quizzes: [
      quiz('Thành phố Hồ Chí Minh nằm ở vùng nào?', 'Tên vùng gắn với sông nước phía nam.', [{ id: 'south', text: 'Nam Bộ' }, { id: 'north-delta', text: 'Đồng bằng Bắc Bộ' }, { id: 'highlands', text: 'Tây Nguyên' }], 'south', ['history']),
      quiz('Tên gọi Thành phố Hồ Chí Minh bắt đầu từ năm nào?', 'Mốc thời gian được nêu trong bài.', [{ id: '1976', text: 'Năm 1976' }, { id: '1945', text: 'Năm 1945' }, { id: '1954', text: 'Năm 1954' }], '1976', ['name']),
      quiz('Thế mạnh nào của Thành phố Hồ Chí Minh được nêu?', 'Chọn một vai trò trung tâm.', [{ id: 'center', text: 'Trung tâm kinh tế, giáo dục, khoa học và công nghệ' }, { id: 'mining-only', text: 'Chỉ có khai thác khoáng sản' }, { id: 'farming-only', text: 'Chỉ trồng lúa' }], 'center', ['center']),
    ],
    order: sequence([{ id: 'departure', text: 'Nhớ mốc Bến Nhà Rồng và hành trình tìm đường cứu nước' }, { id: 'milestone', text: 'Xếp các mốc lịch sử của thành phố' }, { id: 'today', text: 'Nhận diện vai trò trung tâm hiện nay' }], ['departure', 'milestone', 'today'], ['history', 'name', 'center']),
  },
  {
    id: 'lesson-28', title: 'Địa đạo Củ Chi', topic: 'Nam Bộ', eyebrow: 'MẠCH HẦM LỊCH SỬ',
    facts: [
      fact('place', 'Vị trí và quy mô', 'Địa đạo Củ Chi là hệ thống phòng thủ dưới lòng đất ở huyện Củ Chi, Thành phố Hồ Chí Minh, dài khoảng 250 km và có ba tầng.', sgk(119, 118, 'Mục 1')),
      fact('facilities', 'Công trình tiêu biểu', 'Trong địa đạo có hầm nghỉ ngơi, cứu thương, nơi dự trữ vũ khí – lương thực, giếng nước, bếp Hoàng Cầm và hầm chỉ huy.', sgk(120, 119, 'Mục 1')),
      fact('resistance', 'Tinh thần chiến đấu', 'Quân và dân Củ Chi đào hầm, nguỵ trang, tiếp tế sáng tạo và kiên cường chống các cuộc càn quét.', sgk(121, 120, 'Câu chuyện lịch sử')),
    ],
    quizzes: [
      quiz('Địa đạo Củ Chi nằm ở đâu?', 'Nguồn nêu huyện và thành phố.', [{ id: 'cu-chi', text: 'Huyện Củ Chi, Thành phố Hồ Chí Minh' }, { id: 'phu-tho', text: 'Tỉnh Phú Thọ' }, { id: 'hue', text: 'Thành phố Huế' }], 'cu-chi', ['place']),
      quiz('Địa đạo Củ Chi có đặc điểm nào?', 'Nhớ độ sâu, số tầng và chiều dài.', [{ id: 'three-250', text: 'Ba tầng, dài khoảng 250 km' }, { id: 'one-10', text: 'Một tầng, dài 10 km' }, { id: 'surface', text: 'Chỉ là đường trên mặt đất' }], 'three-250', ['place']),
      quiz('Bếp Hoàng Cầm có tác dụng gì?', 'Bếp giúp nấu ăn mà khó bị phát hiện.', [{ id: 'kitchen', text: 'Dẫn và tản khói để nấu ăn kín đáo' }, { id: 'weapon', text: 'Là nơi trưng bày vũ khí' }, { id: 'bridge', text: 'Là cầu qua sông' }], 'kitchen', ['facilities']),
    ],
    order: sequence([{ id: 'dig', text: 'Đào các đường hầm và giếng theo kế hoạch' }, { id: 'connect', text: 'Nối các tầng, công trình và lối đi bí mật' }, { id: 'resist', text: 'Sử dụng địa đạo để bảo vệ, tiếp tế và chiến đấu' }], ['dig', 'connect', 'resist'], ['place', 'facilities', 'resistance']),
  },
  {
    id: 'lesson-29', title: 'Ôn tập', topic: 'Nam Bộ', eyebrow: 'BẢN ĐỒ TỔNG HỢP',
    facts: [
      fact('central', 'Duyên hải miền Trung', 'Duyên hải miền Trung có nghề biển, di sản Huế – Hội An và nhiều thiên tai cần phòng tránh.', vbt(99, 98, 'Bài tập 1–2')),
      fact('highlands', 'Tây Nguyên', 'Tây Nguyên nổi bật với cao nguyên, cây công nghiệp, chăn nuôi gia súc, thuỷ điện và văn hoá cồng chiêng.', vbt(99, 98, 'Bài tập 1–2')),
      fact('south', 'Nam Bộ', 'Nam Bộ có vùng trồng lúa, cây ăn quả lớn, công nghiệp phát triển, Trương Định và Địa đạo Củ Chi.', vbt(100, 99, 'Bài tập 2')),
    ],
    quizzes: [
      quiz('Vùng nào nổi tiếng với nghề làm muối, đánh bắt và nuôi trồng hải sản?', 'Nối hoạt động với vùng trong bài ôn tập.', [{ id: 'central', text: 'Duyên hải miền Trung' }, { id: 'highlands', text: 'Tây Nguyên' }, { id: 'south', text: 'Nam Bộ' }], 'central', ['central']),
      quiz('Vùng nào trồng nhiều cây công nghiệp lâu năm và phát triển thuỷ điện?', 'Nhớ cao nguyên, cà phê và sông dốc.', [{ id: 'highlands', text: 'Tây Nguyên' }, { id: 'central', text: 'Duyên hải miền Trung' }, { id: 'south', text: 'Nam Bộ' }], 'highlands', ['highlands']),
      quiz('Địa đạo Củ Chi gắn với vùng nào?', 'Đây là di tích trong phần Nam Bộ.', [{ id: 'south', text: 'Nam Bộ' }, { id: 'north', text: 'Đồng bằng Bắc Bộ' }, { id: 'highlands', text: 'Tây Nguyên' }], 'south', ['south']),
    ],
    order: sequence([{ id: 'central', text: 'Ôn lại Duyên hải miền Trung' }, { id: 'highlands', text: 'Ôn lại Tây Nguyên' }, { id: 'south', text: 'Ôn lại Nam Bộ và liên hệ' }], ['central', 'highlands', 'south'], ['central', 'highlands', 'south']),
  },
];

export const LESSON_SEED_BY_ID = new Map(FULL_LESSON_SEEDS.map((seed) => [seed.id, seed]));

if (FULL_LESSON_SEEDS.length !== 29 || new Set(FULL_LESSON_SEEDS.map((seed) => seed.id)).size !== 29) {
  throw new Error('The complete lesson seed catalog must contain exactly 29 unique lessons.');
}
