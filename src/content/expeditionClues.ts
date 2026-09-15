import type { LessonId } from './types';

/** Intentionally false alternatives for the two true evidence cards in each clue hunt. */
export const CLUE_DISTRACTORS: Record<LessonId, [string, string]> = {
  'lesson-01': ['Bản đồ thể hiện sự vật theo kích thước thật.', 'Trục thời gian dùng để dự báo thời tiết.'],
  'lesson-02': ['Chỉ cần biết tên địa phương là đủ để xác định các nơi tiếp giáp.', 'Xả rác xuống sông giúp bảo vệ môi trường địa phương.'],
  'lesson-03': ['Có thể tham quan di tích mà không cần chuẩn bị hay mục đích.', 'Lễ hội và phong tục không thuộc văn hoá địa phương.'],
  'lesson-04': ['Vùng Trung du và miền núi phía Bắc chỉ có đồng bằng.', 'Sông không có vai trò đối với sản xuất thuỷ điện.'],
  'lesson-05': ['Dân cư trong vùng phân bố hoàn toàn đồng đều.', 'Nhà máy thuỷ điện chỉ phục vụ mua bán nông sản.'],
  'lesson-06': ['Hát Then chỉ là một hình thức mua bán ở chợ.', 'Chợ phiên vùng cao bắt buộc họp liên tục cả ngày lẫn đêm.'],
  'lesson-07': ['Giỗ Tổ diễn ra vào tháng Ba dương lịch.', 'Truyền thuyết là bảng số liệu thống kê.'],
  'lesson-08': ['Đồng bằng Bắc Bộ có địa hình toàn núi dốc.', 'Xả rác xuống sông là cách bảo vệ thiên nhiên.'],
  'lesson-09': ['Đồng bằng Bắc Bộ không có dân cư sinh sống.', 'Bát Tràng là làng nghề dệt lụa.'],
  'lesson-10': ['Đình làng không gắn với sinh hoạt cộng đồng.', 'Lễ hội truyền thống chỉ có hoạt động mua bán.'],
  'lesson-11': ['Sông Hồng không bồi đắp phù sa cho đồng bằng.', 'Hiện vật không thể giúp tìm hiểu cuộc sống người Việt cổ.'],
  'lesson-12': ['Lý Công Uẩn dời đô ra Đại La vào năm 1910.', 'Hà Nội chỉ có vai trò là nơi sản xuất nông nghiệp.'],
  'lesson-13': ['Văn Miếu được xây để làm nhà máy.', 'Bia tiến sĩ khuyến khích mọi người từ bỏ việc học.'],
  'lesson-14': ['Trung du và Đồng bằng Bắc Bộ có địa hình giống hệt nhau.', 'Các di sản không có liên hệ với vùng đất nào.'],
  'lesson-15': ['Duyên hải miền Trung hoàn toàn không giáp biển.', 'Không cần chuẩn bị ứng phó với thiên tai ở miền Trung.'],
  'lesson-16': ['Biển không tạo ra sinh kế nào cho người dân.', 'Làm muối không cần đến nước mặn.'],
  'lesson-17': ['Di sản văn hoá chỉ là các đồ vật mới được mua.', 'Có thể tự ý làm hỏng di tích khi tham quan.'],
  'lesson-18': ['Cố đô Huế nằm bên sông Hồng.', 'Huế chưa từng là kinh đô của triều Nguyễn.'],
  'lesson-19': ['Phố cổ Hội An chỉ có những toà nhà cao tầng hiện đại.', 'Viết lên tường nhà cổ là cách bảo tồn di sản.'],
  'lesson-20': ['Tây Nguyên có địa hình chủ yếu là đồng bằng ven biển.', 'Tây Nguyên không có rừng và nguồn nước.'],
  'lesson-21': ['Cà phê là cây sống dưới biển.', 'Thuỷ điện không tạo ra điện năng.'],
  'lesson-22': ['Nhà Rông chỉ dùng để cất giữ hàng hoá.', 'Giữ gìn văn hoá là bỏ hết phong tục của cộng đồng.'],
  'lesson-23': ['Cồng chiêng là dụng cụ chỉ dùng để đo lượng mưa.', 'Lễ hội cồng chiêng không gắn với cộng đồng Tây Nguyên.'],
  'lesson-24': ['Nam Bộ không có hệ thống sông ngòi, kênh rạch.', 'Mọi nơi ở Nam Bộ đều có khí hậu lạnh quanh năm.'],
  'lesson-25': ['Nam Bộ chỉ có một dân tộc sinh sống.', 'Nam Bộ không có hoạt động công nghiệp.'],
  'lesson-26': ['Chợ nổi chỉ mua bán trên các con đường bộ.', 'Ghe xuồng không phù hợp với vùng sông nước.'],
  'lesson-27': ['Thành phố Hồ Chí Minh không có hoạt động giao thương.', 'Bến Nhà Rồng không gắn với hành trình tìm đường cứu nước.'],
  'lesson-28': ['Địa đạo Củ Chi chỉ gồm những toà nhà trên mặt đất.', 'Các đường hầm Củ Chi hoàn toàn không liên thông.'],
  'lesson-29': ['Mọi vùng của Việt Nam đều có địa hình và sinh kế giống nhau.', 'Khi giới thiệu di sản, không cần tìm hiểu vùng đất của di sản.'],
};

export function learnerEvidence(text: string): string {
  return text.split(' Luôn hiển thị')[0]
    .replace('Vở bài tập gợi ý sưu tầm', 'Em có thể tìm hiểu')
    .replace('Bài tập gợi ý ghi nhận', 'Tìm hiểu thiên nhiên qua');
}
