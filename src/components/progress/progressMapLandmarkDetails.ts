import type { ProgressMapLandmarkId } from './progressMapLandmarks';

export type ProgressMapLandmarkDetail = {
  id: ProgressMapLandmarkId;
  lead: string;
  facts: readonly string[];
  sourceUrls: readonly string[];
};

export const PROGRESS_MAP_LANDMARK_DETAILS: Readonly<Record<ProgressMapLandmarkId, ProgressMapLandmarkDetail>> = {
  'lung-cu': {
    id: 'lung-cu',
    lead: 'Cột cờ Lũng Cú đứng trên núi Rồng giữa vùng núi phía Bắc. Tớ cùng cậu ngắm lá cờ bay trên cao và hồ Lô Lô xanh biếc phía dưới nhé.',
    facts: [
      'Dưới chân cột cờ có những mảng phù điêu mang hoa văn trống đồng Đông Sơn.',
      'Cột cờ trên núi Rồng tạo nên một điểm nhìn đặc biệt giữa núi non và bản làng Lũng Cú.',
    ],
    sourceUrls: ['https://vietnamtourism.gov.vn/printer/14932?type=1'],
  },
  'khue-van-cac': {
    id: 'khue-van-cac',
    lead: 'Khuê Văn Các là một gác nhỏ thanh nhã trong Văn Miếu – Quốc Tử Giám, nơi ánh sáng và chữ nghĩa gặp nhau giữa không gian học hành xưa.',
    facts: [
      'Công trình được xây dựng năm 1805 dưới triều vua Gia Long, gồm một gác gỗ đặt trên nền gạch.',
      'Bốn mặt gác có cửa tròn, gợi tia sáng của sao Khuê và vẻ đẹp văn chương, văn hiến của Hà Nội.',
    ],
    sourceUrls: ['https://www.vanmieu.gov.vn/vi/visit/architecture/khue-van-pavilion'],
  },
  'hoa-lu': {
    id: 'hoa-lu',
    lead: 'Cố đô Hoa Lư là vùng đất gắn với những buổi đầu dựng nước và giữ nước của nhà nước Đại Cồ Việt giữa núi đá, sông ngòi Ninh Bình.',
    facts: [
      'Hoa Lư từng là kinh đô của các triều Đinh, Tiền Lê và giai đoạn đầu triều Lý trong thế kỷ X và đầu thế kỷ XI.',
      'Các đền vua Đinh Tiên Hoàng và vua Lê Đại Hành cùng cảnh quan núi đá giúp kể lại câu chuyện lịch sử của cố đô.',
      'Quần thể di tích Cố đô Hoa Lư được xếp hạng di tích quốc gia đặc biệt.',
    ],
    sourceUrls: ['https://dsvh.gov.vn/di-tich-lich-su-va-kien-truc-nghe-thuat-co-do-hoa-lu-2952'],
  },
  'kim-lien': {
    id: 'kim-lien',
    lead: 'Làng Sen Kim Liên, ở Nam Đàn, Nghệ An, là quê hương của Chủ tịch Hồ Chí Minh. Không gian làng quê mộc mạc giúp chúng mình hiểu hơn về gia đình và tuổi thơ của Người.',
    facts: [
      'Chủ tịch Hồ Chí Minh sinh tại làng Hoàng Trù, quê ngoại, còn Làng Sen là quê nội nơi Người sống trong những năm 1901–1906.',
      'Nhà tranh, hàng tre, giếng nước và những hiện vật trong khu di tích gợi lại nếp sống giản dị của một làng quê xứ Nghệ.',
      'Làng Sen cũng ghi dấu hai lần Chủ tịch Hồ Chí Minh về thăm quê sau ngày đất nước giành được độc lập.',
    ],
    sourceUrls: ['https://langsenkimlien.hochiminh.vn/KimLiendata/pano/info.html'],
  },
  hue: {
    id: 'hue',
    lead: 'Quần thể di tích Cố đô Huế nằm bên sông Hương, lưu giữ kinh thành, hoàng thành, lăng tẩm và nhiều công trình của triều Nguyễn.',
    facts: [
      'Huế là kinh đô của Việt Nam thống nhất dưới triều Nguyễn từ năm 1802 đến năm 1945.',
      'Trong thời gian đó, Huế là trung tâm chính trị, văn hóa và tôn giáo của triều Nguyễn; các công trình hòa cùng cảnh quan sông Hương.',
    ],
    sourceUrls: ['https://whc.unesco.org/en/list/678'],
  },
  'hoi-an': {
    id: 'hoi-an',
    lead: 'Phố cổ Hội An là một đô thị thương cảng lâu đời bên sông Thu Bồn, nơi những ngôi nhà, hội quán và con phố nhỏ kể chuyện giao lưu văn hóa.',
    facts: [
      'Phố cổ được bảo tồn tốt từ thế kỷ XV–XIX, khi Hội An là một thương cảng quốc tế quan trọng ở Đông Nam Á.',
      'Hội An cho thấy sự gặp gỡ của nhiều cộng đồng và nền văn hóa qua kiến trúc, nghề thủ công và đời sống phố thị.',
    ],
    sourceUrls: ['https://whc.unesco.org/en/list/948'],
  },
  'tay-nguyen-rong-house': {
    id: 'tay-nguyen-rong-house',
    lead: 'Nhà rông là không gian sinh hoạt cộng đồng quen thuộc của nhiều dân tộc ở Tây Nguyên, nổi bật với mái cao vút như đang vươn lên giữa núi rừng.',
    facts: [
      'Nhà rông thường là nơi cộng đồng gặp gỡ, tổ chức nghi lễ, trao đổi công việc và truyền lại những câu chuyện của buôn làng.',
      'Hình dáng, vật liệu và hoa văn của nhà rông có thể khác nhau giữa các dân tộc, nhưng đều thể hiện tinh thần cộng đồng.',
    ],
    sourceUrls: ['https://dantoc.vietnamtourism.gov.vn/nha-rong-ve-dep-kien-truc-doc-dao-cua-dong-bao-dan-toc-tai-tay-nguyen/'],
  },
  'mekong-floating-market': {
    id: 'mekong-floating-market',
    lead: 'Chợ nổi Cái Răng trên sông Cần Thơ là một khu chợ buôn bán trên ghe thuyền, nơi nhịp sống miền Tây bắt đầu từ lúc trời còn sớm.',
    facts: [
      'Người bán thường treo hàng hóa lên cây bẹo trước mũi ghe để khách nhìn từ xa và biết thuyền đang bán gì.',
      'Chợ nổi gắn với sông nước, giao thông đường thủy và thói quen mua bán của cư dân vùng đồng bằng sông Cửu Long.',
    ],
    sourceUrls: ['https://csdl.vietnamtourism.gov.vn/dest/?item=545'],
  },
};

export function getProgressMapLandmarkDetail(id: ProgressMapLandmarkId): ProgressMapLandmarkDetail {
  const detail = PROGRESS_MAP_LANDMARK_DETAILS[id];
  if (!detail) throw new Error('Unknown progress map landmark detail: ' + id);
  return detail;
}
