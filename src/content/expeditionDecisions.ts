import type { LessonSeed, SeedQuiz } from './courseSeeds';

type MissionNumber = 4 | 5;

type DecisionRecipe = {
  prompt: string;
  options: Record<string, string>;
};

type ExpeditionDecision = SeedQuiz & {
  /** The original generated explanation, kept stable for persisted/replayed attempts. */
  explanation: string;
};

/**
 * Mission 4 turns the third seed question into a small evidence-application
 * decision. Mission 5 turns the second seed question into a "which question
 * does this clue answer?" decision. The answer ids stay in the seed so old
 * saved responses continue to evaluate against the same ids.
 */
const DECISIONS: Record<string, Partial<Record<MissionNumber, DecisionRecipe>>> = {
  'lesson-02': {
    4: {
      prompt: 'Một nhóm trực nhật muốn làm đúng manh mối về bảo vệ môi trường. Việc nào là cách áp dụng phù hợp?',
      options: {
        care: 'Giảm rác, tiết kiệm nước và giữ nơi công cộng sạch',
        litter: 'Vứt rác xuống sông để nước tự cuốn đi',
        waste: 'Để vòi nước chảy liên tục dù không sử dụng',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về địa hình, sông hồ, nhiệt độ, lượng mưa và các mùa đang trả lời câu hỏi nào?',
      options: {
        'rain-temp': 'Khí hậu địa phương có nhiệt độ, lượng mưa và các mùa ra sao?',
        population: 'Địa phương có những danh nhân nào?',
        craft: 'Địa phương có những làng nghề nào?',
      },
    },
  },
  'lesson-03': {
    4: {
      prompt: 'Khi chuẩn bị một chuyến tham quan di tích, việc nào áp dụng đúng mẩu tư liệu?',
      options: {
        plan: 'Ghi tên di tích và mục đích chuyến đi trước khi chuẩn bị các bước khác',
        buy: 'Chỉ lo mua đồ lưu niệm, không cần xác định nơi sẽ đến',
        skip: 'Bỏ qua mục đích và thời gian để chuyến đi tự diễn ra',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về lễ hội, phong tục và tập quán đang gợi em đặt câu hỏi nào?',
      options: {
        festival: 'Địa phương có những lễ hội, món ăn hoặc phong tục nào?',
        password: 'Món ăn địa phương có nguyên liệu chính và cách làm ra sao?',
        traffic: 'Một chuyến tham quan di tích cần xác định mục đích và chuẩn bị gì?',
      },
    },
  },
  'lesson-04': {
    4: {
      prompt: 'Vùng có nhiều sông và khoáng sản. Cách ghi nào áp dụng đúng thông tin này?',
      options: {
        rivers: 'Có thể khai thác tiềm năng thuỷ điện ở nơi sông có thác ghềnh, đồng thời sử dụng khoáng sản hợp lí',
        flat: 'Xây thuỷ điện ở nơi hoàn toàn không có sông',
        dry: 'Kết luận vùng không có sông và không có khoáng sản',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về Phan-xi-păng đang trả lời câu hỏi nào?',
      options: {
        fansipan: 'Đỉnh núi cao nhất nước ta trong vùng tên là gì?',
        bachma: 'Đỉnh Bạch Mã thuộc bài học về vùng nào?',
        'ba-den': 'Núi Bà Đen có phải là đỉnh cao nhất nước ta không?',
      },
    },
  },
  'lesson-05': {
    4: {
      prompt: 'Khi giải thích vai trò sản xuất của vùng, câu nào dùng đúng manh mối về thuỷ điện và khoáng sản?',
      options: {
        power: 'Thuỷ điện cung cấp điện; khoáng sản cung cấp nguyên liệu cho sản xuất',
        market: 'Nhà máy thuỷ điện chỉ có nhiệm vụ mở chợ bán nông sản',
        road: 'Khoáng sản chỉ được dùng để mở chợ phiên và làm đường',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về ruộng bậc thang đang trả lời câu hỏi nào?',
      options: {
        slope: 'Ruộng bậc thang mang lại lợi ích gì cho lương thực, rừng và cảnh quan?',
        sea: 'Dân cư trong vùng phân bố như thế nào giữa trung du và miền núi?',
        city: 'Thuỷ điện và khoáng sản đóng góp gì cho sản xuất?',
      },
    },
  },
  'lesson-06': {
    4: {
      prompt: 'Bạn muốn tham gia chợ phiên đúng với tư liệu. Lựa chọn nào phù hợp?',
      options: {
        days: 'Chọn ngày họp phiên, rồi tham gia hoạt động mua bán và cộng đồng phù hợp',
        daily: 'Coi chợ phiên là nơi mở suốt ngày đêm',
        online: 'Chỉ theo dõi chợ phiên trên mạng, không cần biết ngày họp',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về các nét văn hoá vùng cao đang gợi em đặt câu hỏi nào về Xoè?',
      options: {
        thai: 'Xoè là điệu múa truyền thống của dân tộc nào?',
        kinh: 'Hát Then gắn với những dân tộc nào?',
        dao: 'Chợ phiên vùng cao họp vào thời gian nào?',
      },
    },
  },
  'lesson-08': {
    4: {
      prompt: 'Nếu lớp lập kế hoạch chăm sóc thiên nhiên Đồng bằng Bắc Bộ, việc nào áp dụng đúng?',
      options: {
        protect: 'Giữ sạch sông, bảo vệ đất và sinh vật, đồng thời hạn chế tác động xấu của con người',
        pollute: 'Xả rác xuống sông để nước cuốn đi',
        cut: 'Phá thảm thực vật mà không quan tâm hậu quả',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về khí hậu Đồng bằng Bắc Bộ đang gợi em đặt câu hỏi nào?',
      options: {
        cold: 'Mùa đông và mùa hạ ở Đồng bằng Bắc Bộ có đặc điểm gì?',
        hot: 'Địa hình vùng có bằng phẳng và được bồi đắp bởi phù sa không?',
        dry: 'Khi bảo vệ thiên nhiên, cần chú ý đến những yếu tố nào?',
      },
    },
  },
  'lesson-09': {
    4: {
      prompt: 'Một bạn giới thiệu làng nghề bằng mẩu tin về Bát Tràng, Vạn Phúc và Đại Bái. Cách ghi nào đúng?',
      options: {
        pottery: 'Bát Tràng làm gốm; Vạn Phúc dệt lụa; Đại Bái đúc đồng',
        silk: 'Gọi Bát Tràng là nơi dệt lụa và bỏ qua các làng nghề khác',
        silver: 'Gọi Đại Bái là nơi chạm bạc thay vì đúc đồng',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về đất màu, nước dồi dào và hệ thống đê đang trả lời câu hỏi nào?',
      options: {
        rice: 'Vì sao Đồng bằng Bắc Bộ phát triển trồng lúa nước?',
        desert: 'Vì sao vùng này khô hạn quanh năm?',
        mine: 'Khoáng sản kim loại nào quyết định việc trồng lúa?',
      },
    },
  },
  'lesson-10': {
    4: {
      prompt: 'Nếu tổ chức lễ hội làng quê theo mẩu tư liệu, hoạt động nào phù hợp?',
      options: {
        tug: 'Tổ chức tế lễ và trò chơi như kéo co vào dịp lễ hội',
        diving: 'Đưa lặn biển vào lễ hội làng quê đồng bằng',
        ski: 'Đưa trượt tuyết vào lễ hội mùa xuân',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu nói lễ hội làng quê thường diễn ra vào mùa xuân. Câu hỏi nào khớp với manh mối?',
      options: {
        spring: 'Lễ hội làng quê thường diễn ra vào mùa nào?',
        'winter-only': 'Lễ hội làng quê có những trò chơi nào?',
        never: 'Làng quê truyền thống có những hình ảnh nào?',
      },
    },
  },
  'lesson-11': {
    4: {
      prompt: 'Khi mô tả đời sống người Việt cổ, câu nào dùng đúng mẩu tư liệu?',
      options: {
        boat: 'Người Việt cổ trồng lúa, đi lại bằng thuyền, ở nhà sàn và thờ cúng tổ tiên, các vị thần',
        train: 'Người Việt cổ đi tàu hoả và sống trong khu nhà cao tầng',
        plane: 'Người Việt cổ đi máy bay và không gắn với sông nước',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu nhắc Văn Lang, Âu Lạc và trống đồng Đông Sơn đang trả lời câu hỏi nào?',
      options: {
        'red-civ': 'Nền văn minh nào gắn với Văn Lang, Âu Lạc và trống đồng Đông Sơn?',
        coastal: 'Đời sống người Việt cổ có những hoạt động và tín ngưỡng nào?',
        modern: 'Sông Hồng chảy vào Việt Nam từ đâu?',
      },
    },
  },
  'lesson-12': {
    4: {
      prompt: 'Khi giới thiệu Hà Nội hôm nay, cách ghi nào áp dụng đúng mẩu tư liệu?',
      options: {
        'red-delta': 'Đặt Hà Nội ở Đồng bằng Bắc Bộ và nêu vai trò trung tâm chính trị, kinh tế, văn hoá, giáo dục',
        highlands: 'Đặt Hà Nội ở Tây Nguyên và chỉ nêu hoạt động trồng cây công nghiệp',
        south: 'Đặt Hà Nội ở Nam Bộ và chỉ nêu đời sống sông nước',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu giải thích tên Thăng Long đang trả lời câu hỏi nào?',
      options: {
        dragon: 'Tên gọi Thăng Long có nghĩa là gì?',
        river: 'Hà Nội hôm nay thuộc vùng nào của nước ta?',
        green: 'Dời đô ra Đại La và đổi tên Thăng Long diễn ra khi nào?',
      },
    },
  },
  'lesson-13': {
    4: {
      prompt: 'Khi dùng thông tin về Nhà bia Tiến sĩ để giới thiệu Văn Miếu, câu nào đúng?',
      options: {
        study: 'Nhà bia ghi danh người đỗ Tiến sĩ, góp phần tôn vinh truyền thống hiếu học',
        fishing: 'Nhà bia ghi lại sản lượng đánh bắt cá',
        mining: 'Nhà bia giới thiệu mỏ khoáng sản',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu nói Quốc Tử Giám là trường học và nhà bia ghi danh người đỗ Tiến sĩ. Câu hỏi nào khớp với phần nói về trường học?',
      options: {
        school: 'Quốc Tử Giám có chức năng gì?',
        market: 'Văn Miếu là nơi thờ ai?',
        harbor: 'Nhà bia Tiến sĩ thể hiện truyền thống nào?',
      },
    },
  },
  'lesson-14': {
    4: {
      prompt: 'Khi chọn địa điểm để minh hoạ truyền thống hiếu học, em nên ghi gì?',
      options: {
        'van-mieu': 'Văn Miếu – Quốc Tử Giám',
        floating: 'Chợ nổi miền sông nước',
        'cu-chi': 'Địa đạo Củ Chi',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về Đồng bằng Bắc Bộ đang trả lời câu hỏi nào?',
      options: {
        delta: 'Đồng bằng Bắc Bộ có những đặc điểm tự nhiên và dân cư nào?',
        mountain: 'Trung du và miền núi phía Bắc có địa hình gì?',
        desert: 'Nam Bộ có khí hậu và mùa khô ra sao?',
      },
    },
  },
  'lesson-15': {
    4: {
      prompt: 'Khi lập kế hoạch phòng tránh thiên tai ở Duyên hải miền Trung, việc nào áp dụng đúng manh mối?',
      options: {
        'storm-flood': 'Theo dõi và chuẩn bị ứng phó với bão, ngập lụt, hạn hán và sạt lở',
        snow: 'Chuẩn bị chống băng tuyết quanh năm',
        none: 'Cho rằng vùng không có thiên tai',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu nói phía đông là đồng bằng nhỏ hẹp và sông thường ngắn, dốc. Câu hỏi nào khớp với manh mối?',
      options: {
        'narrow-delta': 'Phía đông vùng có dạng địa hình nào và sông thường có đặc điểm gì?',
        'high-mountain': 'Phía tây của vùng có những dạng địa hình nào?',
        desert: 'Vùng thường gặp những thiên tai nào?',
      },
    },
  },
  'lesson-16': {
    4: {
      prompt: 'Một làng ven biển muốn chọn năng lượng phù hợp. Cách vận dụng đúng là gì?',
      options: {
        'sun-wind': 'Kết hợp nắng và gió để phát triển điện mặt trời, điện gió khi phù hợp',
        'river-only': 'Chỉ dựa vào sông nước và bỏ qua nắng, gió',
        'no-sun': 'Cho rằng vùng không có ánh sáng để sản xuất điện',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về biển rộng, vịnh, đầm phá và cửa sông đang trả lời câu hỏi nào?',
      options: {
        salt: 'Biển và các vịnh, đầm phá tạo thuận lợi cho những hoạt động kinh tế nào?',
        forest: 'Nguồn năng lượng nào có thể phát triển nhờ nhiều nắng và gió?',
        snow: 'Những dân tộc nào sinh sống trong vùng?',
      },
    },
  },
  'lesson-17': {
    4: {
      prompt: 'Khi giới thiệu nhà rông, câu nào áp dụng đúng manh mối?',
      options: {
        community: 'Nêu đây là nơi sinh hoạt chung của cộng đồng và tổ chức hoạt động chung',
        private: 'Gọi nhà rông là phòng riêng của một gia đình',
        warehouse: 'Gọi nhà rông là kho hàng của buôn làng',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu nhắc Phố cổ Hội An và Thánh địa Mỹ Sơn đang trả lời câu hỏi nào?',
      options: {
        heritage: 'Những địa điểm nào của vùng là di sản văn hoá thế giới?',
        mine: 'Vùng có những mỏ khoáng sản nào?',
        power: 'Vùng có những nhà máy điện nào?',
      },
    },
  },
  'lesson-18': {
    4: {
      prompt: 'Khi kể lại cuộc phản công Kinh thành Huế năm 1885, cách ghi nào đúng?',
      options: {
        'ton-that-thuyet': 'Ghi Tôn Thất Thuyết lãnh đạo quân ta tấn công đồn Mang Cá và Toà Khâm sứ Pháp',
        'bao-dai': 'Ghi vua Bảo Đại lãnh đạo cuộc phản công năm 1885',
        'ly-thai-to': 'Ghi Lý Thái Tổ lãnh đạo cuộc phản công năm 1885',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về Kinh thành Huế đang trả lời câu hỏi nào?',
      options: {
        nguyen: 'Kinh thành Huế được xây dựng dưới triều đại nào?',
        ly: 'Cố đô Huế có những cảnh quan nào?',
        tran: 'Ai lãnh đạo cuộc phản công năm 1885?',
      },
    },
  },
  'lesson-19': {
    4: {
      prompt: 'Một bạn muốn góp phần bảo tồn Phố cổ Hội An. Việc nào áp dụng đúng?',
      options: {
        restore: 'Giữ môi trường sạch, du lịch có trách nhiệm và trùng tu di tích',
        demolish: 'Phá nhà cổ để dựng biển quảng cáo',
        litter: 'Xả rác xuống sông khi tham quan',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về nhà cổ Hội An đang trả lời câu hỏi nào?',
      options: {
        'narrow-deep': 'Nhà cổ Hội An có hình dáng và cách chia không gian ra sao?',
        tower: 'Chùa Cầu có đặc điểm kiến trúc nào?',
        tent: 'Hội An nằm ở đâu trên sông Thu Bồn?',
      },
    },
  },
  'lesson-20': {
    4: {
      prompt: 'Khi đề xuất bảo vệ rừng Tây Nguyên, việc nào áp dụng đúng?',
      options: {
        'forest-role': 'Bảo vệ và phục hồi rừng để giảm lũ, giảm khô hạn và giữ sản vật',
        none: 'Cho rằng rừng không có vai trò đối với cuộc sống',
        road: 'Chỉ chặt rừng để mở đường, không cần phục hồi',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về cao nguyên và đất đỏ badan đang trả lời câu hỏi nào?',
      options: {
        coffee: 'Đất đỏ badan phù hợp với nhóm cây nào?',
        'rice-only': 'Rừng và khí hậu Tây Nguyên có đặc điểm gì?',
        seaweed: 'Vị trí Tây Nguyên có giáp biển không?',
      },
    },
  },
  'lesson-21': {
    4: {
      prompt: 'Khi giải thích vì sao Tây Nguyên có thể phát triển thuỷ điện, câu nào dùng đúng?',
      options: {
        slope: 'Dựa vào sông có độ dốc lớn và nhiều bậc địa hình, nhưng cần lưu ý tác động môi trường',
        flat: 'Nói vùng không có sông nên không thể phát triển thuỷ điện',
        dry: 'Chỉ dựa vào hồ phẳng, không cần độ dốc của sông',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về cây công nghiệp lâu năm đang trả lời câu hỏi nào?',
      options: {
        coffee: 'Cây công nghiệp nào được trồng nhiều ở Tây Nguyên?',
        rice: 'Dân cư Tây Nguyên phân bố như thế nào?',
        seaweed: 'Thuỷ điện ở Tây Nguyên có điều kiện gì?',
      },
    },
  },
  'lesson-22': {
    4: {
      prompt: 'Khi giới thiệu Anh hùng Núp từ mẩu tư liệu, câu nào đúng?',
      options: {
        'ba-na': 'Đinh Núp là người Ba Na, lãnh đạo buôn làng chống thực dân Pháp',
        kinh: 'Đinh Núp là người Kinh và chỉ hoạt động trong thành phố',
        cham: 'Đinh Núp là người Chăm và không gắn với buôn làng',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về N’Trang Lơng đang trả lời câu hỏi nào?',
      options: {
        '1911-1935': 'Cuộc khởi nghĩa do N’Trang Lơng lãnh đạo kéo dài từ năm nào đến năm nào?',
        '1945-1954': 'Nhà Rông có vai trò gì trong buôn làng?',
        '1975-1980': 'Đinh Núp thuộc dân tộc nào?',
      },
    },
  },
  'lesson-23': {
    4: {
      prompt: 'Khi giới thiệu cách tổ chức Lễ hội Cồng chiêng, câu nào áp dụng đúng?',
      options: {
        rotate: 'Nêu lễ hội luân phiên hằng năm ở các tỉnh, có trình diễn và phục dựng lễ dân gian',
        fixed: 'Nói lễ hội chỉ tổ chức cố định ở một nơi',
        never: 'Nói lễ hội không được tổ chức',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về vai trò cồng chiêng đang trả lời câu hỏi nào?',
      options: {
        ritual: 'Cồng chiêng được sử dụng trong những dịp nào?',
        'only-school': 'Không gian văn hoá Cồng chiêng trải rộng trên mấy tỉnh?',
        'only-market': 'Lễ hội Cồng chiêng được tổ chức như thế nào?',
      },
    },
  },
  'lesson-24': {
    4: {
      prompt: 'Khi chuẩn bị ứng phó với khí hậu Nam Bộ, việc nào áp dụng đúng?',
      options: {
        water: 'Dự trữ và sử dụng tiết kiệm nước trong mùa khô, đồng thời chú ý lũ và sạt lở',
        snow: 'Chuẩn bị chống băng tuyết quanh năm',
        none: 'Cho rằng lũ, sạt lở và thiếu nước không gây khó khăn',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về vị trí và địa hình Nam Bộ đang trả lời câu hỏi nào?',
      options: {
        delta: 'Nam Bộ tiếp giáp những đâu và có địa hình chủ yếu là gì?',
        mountain: 'Sông ngòi và kênh rạch tạo thuận lợi gì cho Nam Bộ?',
        plateau: 'Mùa khô ở Nam Bộ có thể gây khó khăn gì?',
      },
    },
  },
  'lesson-25': {
    4: {
      prompt: 'Khi mô tả công nghiệp Nam Bộ trên bản đồ, cách ghi nào đúng?',
      options: {
        southeast: 'Đánh dấu Đông Nam Bộ là nơi tập trung nhiều hoạt động công nghiệp và nhiều ngành sản xuất',
        mountain: 'Đánh dấu vùng núi phía Bắc là nơi tập trung toàn bộ công nghiệp Nam Bộ',
        island: 'Đánh dấu các đảo xa bờ là nơi tập trung các khu công nghiệp Nam Bộ',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về nông nghiệp Nam Bộ đang trả lời câu hỏi nào?',
      options: {
        crops: 'Nam Bộ trồng những nhóm cây nào và còn phát triển hoạt động nông nghiệp nào?',
        snow: 'Nam Bộ có những dân tộc nào và đời sống gắn với môi trường nào?',
        none: 'Hoạt động công nghiệp tập trung chủ yếu ở tiểu vùng nào?',
      },
    },
  },
  'lesson-26': {
    4: {
      prompt: 'Khi ghi chú về Trương Định, câu nào dùng đúng mẩu tư liệu?',
      options: {
        'binh-tay': 'Trương Định lãnh đạo nhân dân chống Pháp và được suy tôn là Bình Tây Đại Nguyên soái',
        king: 'Gọi Trương Định là Vua Văn Lang',
        teacher: 'Gọi Trương Định là Thầy giáo làng',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về chợ nổi Nam Bộ đang trả lời câu hỏi nào?',
      options: {
        produce: 'Chợ nổi thường bán những gì để phục vụ đời sống miệt vườn?',
        books: 'Trương Định được nhân dân suy tôn là gì?',
        machines: 'Tinh thần yêu nước của đồng bào Nam Bộ thể hiện ra sao?',
      },
    },
  },
  'lesson-27': {
    4: {
      prompt: 'Khi giới thiệu vai trò hiện nay của Thành phố Hồ Chí Minh, cách ghi nào đúng?',
      options: {
        center: 'Nêu thành phố là trung tâm kinh tế, giáo dục, khoa học và công nghệ, đồng thời có nhiều cảng và khu công nghiệp',
        'mining-only': 'Chỉ nêu thành phố có hoạt động khai thác khoáng sản',
        'farming-only': 'Chỉ nêu thành phố trồng lúa',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về tên gọi thành phố đang trả lời câu hỏi nào?',
      options: {
        1976: 'Thành phố được đổi tên là Thành phố Hồ Chí Minh từ năm nào?',
        1945: 'Nguyễn Tất Thành rời Bến Nhà Rồng gắn với sự kiện lịch sử nào?',
        1954: 'Thành phố hiện nay có những vai trò trung tâm nào?',
      },
    },
  },
  'lesson-28': {
    4: {
      prompt: 'Khi vẽ sơ đồ công trình trong Địa đạo Củ Chi, cách ghi nào đúng?',
      options: {
        kitchen: 'Đánh dấu bếp Hoàng Cầm cùng hầm nghỉ, cứu thương, giếng nước, nơi dự trữ và hầm chỉ huy',
        weapon: 'Chỉ ghi đây là nơi trưng bày vũ khí',
        bridge: 'Đánh dấu bếp Hoàng Cầm là cầu qua sông',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về vị trí và quy mô Địa đạo Củ Chi đang trả lời câu hỏi nào?',
      options: {
        'three-250': 'Địa đạo Củ Chi có đặc điểm gì về số tầng và chiều dài?',
        'one-10': 'Bếp Hoàng Cầm có tác dụng gì?',
        surface: 'Quân và dân Củ Chi đã chiến đấu và tiếp tế ra sao?',
      },
    },
  },
  'lesson-29': {
    4: {
      prompt: 'Khi làm bảng so sánh ba vùng trong bài ôn tập, cách ghi nào đúng về Nam Bộ?',
      options: {
        south: 'Ghi Nam Bộ có vùng trồng lúa, cây ăn quả lớn, công nghiệp phát triển, Trương Định và Địa đạo Củ Chi',
        north: 'Ghi Duyên hải miền Trung có nghề biển, di sản Huế – Hội An và nhiều thiên tai cần phòng tránh',
        highlands: 'Ghi Tây Nguyên nổi bật với cao nguyên, cây công nghiệp, thuỷ điện và văn hoá cồng chiêng',
      },
    },
    5: {
      prompt: 'Mẩu tư liệu về Tây Nguyên đang trả lời câu hỏi nào?',
      options: {
        highlands: 'Tây Nguyên nổi bật với những đặc điểm tự nhiên, sản xuất và văn hoá nào?',
        central: 'Duyên hải miền Trung có những nghề biển, di sản và thiên tai nào?',
        south: 'Nam Bộ có những hoạt động và dấu ấn nào?',
      },
    },
  },
};

const MISSION_QUIZ_INDEX: Record<MissionNumber, number> = { 4: 2, 5: 1 };

function originalExplanation(quiz: SeedQuiz): string {
  const answer = quiz.options.find((option) => option.id === quiz.correctId)?.text ?? quiz.correctId;
  return `Theo tư liệu của bài, đáp án đúng là “${answer}”.`;
}

function assertOptionContract(seed: LessonSeed, quiz: SeedQuiz, recipe: DecisionRecipe, missionNumber: MissionNumber): void {
  const sourceIds = quiz.options.map((option) => option.id).sort();
  const transformedIds = Object.keys(recipe.options).sort();
  if (sourceIds.join('|') !== transformedIds.join('|')) {
    throw new Error(`Expedition decision options changed for ${seed.id}/m${missionNumber}`);
  }
  if (!quiz.options.some((option) => option.id === quiz.correctId)) {
    throw new Error(`Seed quiz has no correct option for ${seed.id}/m${missionNumber}`);
  }
}

/**
 * Return the learner-facing decision for one generated mission.
 *
 * `missionNumber` is the persisted lesson number (4 or 5), rather than a
 * zero-based array index. Other missions pass through unchanged so the
 * helper can be used safely at the single `makeSeedChoice` call site.
 */
export function getExpeditionDecision(seed: LessonSeed, missionNumber: number): ExpeditionDecision {
  if (missionNumber !== 4 && missionNumber !== 5) {
    const quiz = seed.quizzes[Math.max(0, Math.min(seed.quizzes.length - 1, missionNumber - 1))];
    if (!quiz) throw new Error(`Seed quiz not found: ${seed.id}/m${missionNumber}`);
    return { ...quiz, explanation: originalExplanation(quiz) };
  }

  const mission = missionNumber as MissionNumber;
  const quiz = seed.quizzes[MISSION_QUIZ_INDEX[mission]];
  const recipe = DECISIONS[seed.id]?.[mission];
  if (!quiz || !recipe) throw new Error(`Expedition decision not found: ${seed.id}/m${missionNumber}`);
  assertOptionContract(seed, quiz, recipe, mission);

  return {
    ...quiz,
    prompt: recipe.prompt,
    options: quiz.options.map((option) => ({ id: option.id, text: recipe.options[option.id] })),
    explanation: originalExplanation(quiz),
  };
}

export type { ExpeditionDecision };
