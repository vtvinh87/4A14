import reviewedContent from '../../source/mvp-content-reviewed.json' with { type: 'json' };
import type { Activity, Choice, Lesson, Match, Mission, Order, Select, SourceRef } from './types';
import { FULL_LESSON_SEEDS, type LessonSeed } from './courseSeeds';
import { CLUE_DISTRACTORS, learnerEvidence } from './expeditionClues';
import { getExpeditionDecision } from './expeditionDecisions';

type ReviewedFact = {
  id: string;
  pdfPage: number;
  printedPage: number;
  locator: string;
  text: string;
};

type ReviewedLesson = {
  id: 'bai-1' | 'bai-7';
  title: string;
  facts: ReviewedFact[];
  missionPlan: { id: string; title: string; activities: string[] }[];
};

const reviewedLessons = reviewedContent.lessons as ReviewedLesson[];

if (reviewedContent.reviewed !== true) throw new Error('Reviewed lesson content is required before playability is enabled.');

function sourceRef(fact: ReviewedFact): SourceRef {
  return {
    sourceId: 'sgk-lsdl4-sample',
    pdfPage: fact.pdfPage,
    printedPage: fact.printedPage,
    locator: fact.locator,
  };
}

function getFact(lesson: ReviewedLesson, id: string): ReviewedFact {
  const fact = lesson.facts.find((candidate) => candidate.id === id);
  if (!fact) throw new Error(`Reviewed fact not found: ${lesson.id}/${id}`);
  return fact;
}

function refs(lesson: ReviewedLesson, ...ids: string[]): SourceRef[] {
  return ids.map((id) => sourceRef(getFact(lesson, id)));
}

function base(lesson: ReviewedLesson, id: string, objectiveId: string, prompt: string, hint: string, explanation: string, factIds: string[]) {
  const sourceRefs = refs(lesson, ...factIds);
  return {
    id,
    objectiveId,
    prompt,
    hint,
    explanation,
    source: sourceRefs[0],
    sourceRefs,
    reviewStatus: 'verified' as const,
  };
}

function makeChoice(lesson: ReviewedLesson, id: string, objectiveId: string, prompt: string, hint: string, explanation: string, factIds: string[], options: { id: string; text: string }[], correctId: string, contextTable?: Choice['contextTable']): Choice {
  return { ...base(lesson, id, objectiveId, prompt, hint, explanation, factIds), type: 'choice', options, correctId, contextTable };
}

function makeMatch(lesson: ReviewedLesson, id: string, objectiveId: string, prompt: string, hint: string, explanation: string, factIds: string[], pairs: Match['pairs']): Match {
  return { ...base(lesson, id, objectiveId, prompt, hint, explanation, factIds), type: 'match', pairs };
}

function makeOrder(lesson: ReviewedLesson, id: string, objectiveId: string, prompt: string, hint: string, explanation: string, factIds: string[], items: Order['items'], correctOrder: string[]): Order {
  return { ...base(lesson, id, objectiveId, prompt, hint, explanation, factIds), type: 'order', items, correctOrder };
}

function makeSelect(lesson: ReviewedLesson, id: string, objectiveId: string, prompt: string, hint: string, explanation: string, factIds: string[], options: Select['options'], correctIds: string[]): Select {
  return { ...base(lesson, id, objectiveId, prompt, hint, explanation, factIds), type: 'select', options, correctIds };
}

function getSeedFact(seed: LessonSeed, id: string) {
  const found = seed.facts.find((item) => item.id === id);
  if (!found) throw new Error(`Lesson seed fact not found: ${seed.id}/${id}`);
  return found;
}

function seedBase(seed: LessonSeed, id: string, objectiveId: string, prompt: string, hint: string, explanation: string, factIds: string[]) {
  const sourceRefs = factIds.map((factId) => getSeedFact(seed, factId).source);
  if (!sourceRefs.length) throw new Error(`Activity without source refs: ${seed.id}/${id}`);
  return {
    id,
    objectiveId,
    prompt,
    hint,
    explanation,
    source: sourceRefs[0],
    sourceRefs,
    reviewStatus: 'verified' as const,
  };
}

function makeSeedLesson(seed: LessonSeed): Lesson {
  const objectives = seed.facts.map((item, index) => ({ id: `${seed.id}-objective-${index + 1}`, text: `Nhận biết và giải thích ${item.label.toLowerCase()}.` }));
  const pairs: Match['pairs'] = seed.facts.map((item) => ({
    leftId: item.id,
    left: item.label,
    rightId: `${item.id}-detail`,
    right: learnerEvidence(item.text),
  }));
  const objectiveIdFor = (objectiveIndex: number) => `${seed.id}-objective-${(objectiveIndex % seed.facts.length) + 1}`;
  const makeSeedChoice = (quizSeed: LessonSeed['quizzes'][number], missionIndex: number, objectiveIndex: number): Choice => ({
    ...seedBase(
      seed,
      `${seed.id}-m${missionIndex}-a1`,
      objectiveIdFor(objectiveIndex),
      quizSeed.prompt,
      quizSeed.hint,
      `Theo tư liệu của bài, đáp án đúng là “${quizSeed.options.find((option) => option.id === quizSeed.correctId)?.text ?? quizSeed.correctId}”.`,
      quizSeed.factIds,
    ),
    type: 'choice',
    options: quizSeed.options,
    correctId: quizSeed.correctId,
  });
  const makeSeedMatch = (missionIndex: number, factIds: string[], objectiveIndex: number): Match => ({
    ...seedBase(seed, `${seed.id}-m${missionIndex}-a2`, objectiveIdFor(objectiveIndex), 'Ghép mỗi mẩu thông tin với mô tả đúng.', 'Đọc từng mẩu tư liệu rồi ghép thẻ có cùng ý.', 'Mỗi mẩu thông tin được ghép với mô tả cùng ý trong phần khám phá.', factIds),
    type: 'match',
    pairs: pairs.filter((pair) => factIds.includes(pair.leftId)),
  });
  const makeSeedOrder = (missionIndex: number, objectiveIndex: number): Order => ({
    ...seedBase(seed, `${seed.id}-m${missionIndex}-a2`, objectiveIdFor(objectiveIndex), 'Xếp mạch khám phá bài học theo thứ tự hợp lí.', 'Bắt đầu từ việc xác định thông tin, sau đó mô tả và liên hệ.', `Thứ tự hợp lí là: ${seed.order.items.map((item) => item.text).join(' → ')}.`, seed.order.factIds),
    type: 'order',
    items: seed.order.items,
    correctOrder: seed.order.correctOrder,
  });
  const makeSeedSelect = (missionIndex: number, objectiveIndex: number, factIds: string[]): Select => ({
    ...seedBase(seed, `${seed.id}-m${missionIndex}-a2`, objectiveIdFor(objectiveIndex), 'Chọn đủ các manh mối đúng của chặng này.', 'Có hai mẩu tư liệu liên quan trực tiếp đến chặng; chọn đúng cả hai.', `Hai manh mối phù hợp là: ${factIds.map((factId) => getSeedFact(seed, factId).label).join(' và ')}.`, factIds),
    type: 'select',
    options: [
      { id: factIds[0], text: learnerEvidence(getSeedFact(seed, factIds[0]).text) },
      { id: `${seed.id}-distractor-${missionIndex}`, text: CLUE_DISTRACTORS[seed.id][0] },
      { id: `${seed.id}-distractor-${missionIndex}-extra`, text: CLUE_DISTRACTORS[seed.id][1] },
      { id: factIds[1], text: learnerEvidence(getSeedFact(seed, factIds[1]).text) },
    ],
    correctIds: factIds,
  });
  const missionOneFacts = seed.facts.slice(0, 2).map((item) => item.id);
  const missionTwoFacts = seed.facts.slice(1).map((item) => item.id);
  const missionThreeFacts = seed.facts.map((item) => item.id);
  const missionFourFacts = [seed.facts[0].id, seed.facts[2].id];
  const missionFiveFacts = [seed.facts[1].id, seed.facts[2].id];
  const missions: Mission[] = [
    {
      id: `${seed.id}-m1`,
      title: `Mở bản đồ ${seed.topic.toLowerCase()}`,
      discovery: missionOneFacts.map((factId) => ({ text: getSeedFact(seed, factId).text, source: getSeedFact(seed, factId).source })),
      activities: [makeSeedChoice(seed.quizzes[0], 1, 0), makeSeedMatch(1, missionOneFacts, 0)],
    },
    {
      id: `${seed.id}-m2`,
      title: 'Nối các mảnh tư liệu',
      discovery: missionTwoFacts.map((factId) => ({ text: getSeedFact(seed, factId).text, source: getSeedFact(seed, factId).source })),
      activities: [makeSeedChoice(seed.quizzes[1], 2, 1), makeSeedOrder(2, 1)],
    },
    {
      id: `${seed.id}-m3`,
      title: 'Kể lại điều đã nhớ',
      discovery: missionThreeFacts.map((factId) => ({ text: getSeedFact(seed, factId).text, source: getSeedFact(seed, factId).source })),
      activities: [makeSeedChoice(seed.quizzes[2], 3, 2), makeSeedMatch(3, missionThreeFacts, 2)],
    },
    {
      id: `${seed.id}-m4`,
      title: 'Săn dấu tư liệu',
      discovery: missionFourFacts.map((factId) => ({ text: getSeedFact(seed, factId).text, source: getSeedFact(seed, factId).source })),
      activities: [{ ...makeSeedChoice(getExpeditionDecision(seed, 4), 4, 2), explanation: getExpeditionDecision(seed, 4).explanation }, makeSeedSelect(4, 2, missionFourFacts)],
    },
    {
      id: `${seed.id}-m5`,
      title: 'Về đích trên bản đồ',
      discovery: missionFiveFacts.map((factId) => ({ text: getSeedFact(seed, factId).text, source: getSeedFact(seed, factId).source })),
      activities: [{ ...makeSeedChoice(getExpeditionDecision(seed, 5), 5, 1), explanation: getExpeditionDecision(seed, 5).explanation }, makeSeedOrder(5, 1)],
    },
  ];
  return { id: seed.id, version: 1, title: seed.title, objectives, missions };
}

function makeLessonOne(source: ReviewedLesson): Lesson {
  const objectives = [
    { id: 'b1-tools', text: 'Nhận biết một số phương tiện học tập môn Lịch sử và Địa lí.' },
    { id: 'b1-map', text: 'Đọc và sử dụng bản đồ, lược đồ theo các bước trong sách.' },
    { id: 'b1-evidence', text: 'Đọc bảng số liệu và nhận biết hiện vật, tranh ảnh.' },
    { id: 'b1-data', text: 'Đọc bảng và biểu đồ để tìm thông tin theo yêu cầu.' },
    { id: 'b1-observe', text: 'Quan sát, mô tả và nhận xét hiện vật, tranh ảnh.' },
  ];
  const missions: Mission[] = [
    {
      id: 'b1-m1',
      title: 'Mở túi nhà thám hiểm',
      discovery: [
        { text: getFact(source, 'map').text, source: sourceRef(getFact(source, 'map')) },
        { text: getFact(source, 'data').text, source: sourceRef(getFact(source, 'data')) },
      ],
      activities: [
        makeChoice(source, 'b1-m1-a1', 'b1-tools', 'Phương tiện nào thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ?', 'Hãy tìm cụm từ “thu nhỏ ... theo tỉ lệ”.', getFact(source, 'map').text, ['map'], [
          { id: 'map', text: 'Bản đồ' }, { id: 'table', text: 'Bảng số liệu' }, { id: 'chart', text: 'Biểu đồ' }, { id: 'timeline', text: 'Trục thời gian' },
        ], 'map'),
        makeMatch(source, 'b1-m1-a2', 'b1-tools', 'Ghép mỗi phương tiện với mô tả tương ứng.', 'Mỗi thẻ bên trái chỉ ghép một lần.', 'Bản đồ thu nhỏ theo tỉ lệ; biểu đồ thể hiện số liệu trực quan; trục thời gian trình bày chuỗi sự kiện theo thời gian.', ['map', 'data'], [
          { leftId: 'map', left: 'Bản đồ', rightId: 'map-description', right: 'Thu nhỏ khu vực theo tỉ lệ' },
          { leftId: 'chart', left: 'Biểu đồ', rightId: 'chart-description', right: 'Thể hiện số liệu trực quan' },
          { leftId: 'timeline', left: 'Trục thời gian', rightId: 'timeline-description', right: 'Trình bày chuỗi sự kiện theo thời gian' },
        ]),
      ],
    },
    {
      id: 'b1-m2',
      title: 'Giải mã kí hiệu',
      discovery: [{ text: getFact(source, 'sketch').text, source: sourceRef(getFact(source, 'sketch')) }],
      activities: [
        makeOrder(source, 'b1-m2-a1', 'b1-map', 'Xếp ba bước đọc bản đồ hoặc lược đồ theo thứ tự trong sách.', 'Bước đầu tiên là đọc tên.', getFact(source, 'sketch').text, ['sketch'], [
          { id: 'read-name', text: 'Đọc tên để biết nội dung' },
          { id: 'read-legend', text: 'Xem chú giải để hiểu kí hiệu' },
          { id: 'find-object', text: 'Tìm đối tượng dựa vào kí hiệu' },
        ], ['read-name', 'read-legend', 'find-object']),
        makeChoice(source, 'b1-m2-a2', 'b1-map', 'Muốn hiểu các kí hiệu trên bản đồ hoặc lược đồ, em cần xem gì?', 'Đó là phần giúp giải thích ý nghĩa của kí hiệu.', 'Theo sách, cần xem chú giải để hiểu kí hiệu.', ['sketch'], [
          { id: 'legend', text: 'Chú giải' }, { id: 'title', text: 'Tên bản đồ' }, { id: 'scale', text: 'Tỉ lệ' },
        ], 'legend'),
      ],
    },
    {
      id: 'b1-m3',
      title: 'Thám tử dữ liệu',
      discovery: [
        { text: getFact(source, 'table').text.split(' Luôn hiển thị')[0], source: sourceRef(getFact(source, 'table')) },
        { text: getFact(source, 'artifact').text, source: sourceRef(getFact(source, 'artifact')) },
        { text: getFact(source, 'picture').text, source: sourceRef(getFact(source, 'picture')) },
      ],
      activities: [
        makeChoice(source, 'b1-m3-a1', 'b1-evidence', 'Trong bảng diện tích năm 2020, địa phương nào lớn nhất trong năm địa phương được nêu?', 'Hãy nhìn bảng năm 2020 và so sánh các số diện tích.', 'Trong bảng năm 2020 của sách, Lâm Đồng có diện tích lớn nhất trong năm địa phương được nêu.', ['table'], [
          { id: 'ha-noi', text: 'Hà Nội' }, { id: 'da-nang', text: 'Đà Nẵng' }, { id: 'lam-dong', text: 'Lâm Đồng' }, { id: 'can-tho', text: 'Cần Thơ' },
        ], 'lam-dong', {
          caption: 'Diện tích theo bảng năm 2020 (km²)',
          columns: ['Địa phương', 'Diện tích (km²)'],
          rows: [
            { label: 'Hà Nội', value: '3359' },
            { label: 'Đà Nẵng', value: '1285' },
            { label: 'Lâm Đồng', value: '9783' },
            { label: 'Thành phố Hồ Chí Minh', value: '2061' },
            { label: 'Cần Thơ', value: '1439' },
          ],
        }),
        makeMatch(source, 'b1-m3-a2', 'b1-evidence', 'Ghép loại tư liệu với ví dụ hoặc công dụng trong phần khám phá.', 'Nhớ: hiện vật là đồ vật từ quá khứ còn lưu lại.', 'Bảng số liệu sắp xếp số liệu; mũi tên đồng Cổ Loa là hiện vật; ảnh cánh đồng Phong Nậm là tranh ảnh.', ['table', 'artifact', 'picture'], [
          { leftId: 'table', left: 'Bảng số liệu', rightId: 'numbers', right: 'Sắp xếp số liệu khoa học' },
          { leftId: 'artifact', left: 'Hiện vật', rightId: 'co-loa', right: 'Mũi tên đồng Cổ Loa' },
          { leftId: 'picture', left: 'Tranh ảnh', rightId: 'phong-nam', right: 'Ảnh cánh đồng Phong Nậm' },
        ]),
      ],
    },
    {
      id: 'b1-m4',
      title: 'Giải mã bảng và biểu đồ',
      discovery: [
        { text: getFact(source, 'data').text, source: sourceRef(getFact(source, 'data')) },
        { text: getFact(source, 'table').text, source: sourceRef(getFact(source, 'table')) },
      ],
      activities: [
        makeChoice(source, 'b1-m4-a1', 'b1-data', 'Muốn trình bày số liệu một cách trực quan, em có thể dùng phương tiện nào?', 'Hãy nhớ phần mô tả về phương tiện thể hiện số liệu.', 'Theo sách, biểu đồ thể hiện số liệu một cách trực quan.', ['data'], [
          { id: 'chart', text: 'Biểu đồ' }, { id: 'map', text: 'Bản đồ' }, { id: 'timeline', text: 'Trục thời gian' },
        ], 'chart'),
        makeSelect(source, 'b1-m4-a2', 'b1-data', 'Chọn đủ hai phương tiện giúp đọc và trình bày số liệu.', 'Bảng sắp xếp số liệu; biểu đồ giúp quan sát số liệu trực quan.', 'Hai phương tiện phù hợp là bảng số liệu và biểu đồ.', ['data', 'table'], [
          { id: 'table', text: 'Bảng số liệu' }, { id: 'chart', text: 'Biểu đồ' }, { id: 'map', text: 'Bản đồ' },
        ], ['table', 'chart']),
      ],
    },
    {
      id: 'b1-m5',
      title: 'Ghi dấu hiện vật',
      discovery: [
        { text: getFact(source, 'artifact').text, source: sourceRef(getFact(source, 'artifact')) },
        { text: getFact(source, 'picture').text, source: sourceRef(getFact(source, 'picture')) },
      ],
      activities: [
        makeChoice(source, 'b1-m5-a1', 'b1-observe', 'Mũi tên đồng Cổ Loa là ví dụ của loại tư liệu nào?', 'Đó là đồ vật còn lưu lại từ quá khứ.', 'Theo sách, mũi tên đồng Cổ Loa là một hiện vật lịch sử.', ['artifact'], [
          { id: 'artifact', text: 'Hiện vật lịch sử' }, { id: 'picture', text: 'Tranh ảnh' }, { id: 'map', text: 'Bản đồ' },
        ], 'artifact'),
        makeOrder(source, 'b1-m5-a2', 'b1-observe', 'Xếp các bước sử dụng hiện vật hoặc tranh ảnh theo trình tự hợp lí.', 'Bắt đầu bằng việc đọc tên, rồi quan sát và mô tả.', 'Theo sách, cần đọc tên; quan sát và mô tả; sau đó nhận xét theo yêu cầu bài học.', ['picture'], [
          { id: 'read-name', text: 'Đọc tên hiện vật hoặc tranh ảnh' },
          { id: 'observe', text: 'Quan sát và mô tả' },
          { id: 'comment', text: 'Nhận xét theo yêu cầu bài học' },
        ], ['read-name', 'observe', 'comment']),
      ],
    },
  ];
  return { id: 'lesson-01', version: 1, title: source.title, objectives, missions };
}

function makeLessonSeven(source: ReviewedLesson): Lesson {
  const objectives = [
    { id: 'b7-place', text: 'Nhận biết địa danh và thời điểm của lễ Giỗ Tổ Hùng Vương theo sách.' },
    { id: 'b7-festival', text: 'Phân biệt phần lễ, phần hội và ý nghĩa uống nước nhớ nguồn.' },
    { id: 'b7-legends', text: 'Kể lại mạch chính của các câu chuyện theo truyền thuyết.' },
    { id: 'b7-heritage', text: 'Kết nối địa danh, thời điểm và hoạt động của ngày hội.' },
    { id: 'b7-story', text: 'Kể lại chi tiết tiêu biểu trong các truyền thuyết.' },
  ];
  const missions: Mission[] = [
    {
      id: 'b7-m1',
      title: 'Ghé miền Đất Tổ',
      discovery: [
        { text: getFact(source, 'location').text, source: sourceRef(getFact(source, 'location')) },
        { text: getFact(source, 'festival').text, source: sourceRef(getFact(source, 'festival')) },
      ],
      activities: [
        makeChoice(source, 'b7-m1-a1', 'b7-place', 'Theo sách, khu di tích Đền Hùng chủ yếu thuộc tỉnh nào?', 'Tìm địa danh đi cùng thành phố Việt Trì.', 'Theo sách, khu di tích Đền Hùng chủ yếu thuộc thành phố Việt Trì, tỉnh Phú Thọ.', ['location'], [
          { id: 'phu-tho', text: 'Phú Thọ' }, { id: 'cao-bang', text: 'Cao Bằng' }, { id: 'lam-dong', text: 'Lâm Đồng' },
        ], 'phu-tho'),
        makeChoice(source, 'b7-m1-a2', 'b7-place', 'Giỗ Tổ Hùng Vương diễn ra vào ngày nào hằng năm?', 'Đây là ngày mồng 10 của một tháng âm lịch.', 'Theo sách, Giỗ Tổ Hùng Vương vào ngày mồng 10 tháng Ba âm lịch hằng năm.', ['festival'], [
          { id: 'third-lunar', text: 'Mồng 10 tháng Ba âm lịch' }, { id: 'first-solar', text: 'Mồng 1 tháng Giêng dương lịch' }, { id: 'fifteenth-lunar', text: 'Ngày 15 tháng Tám âm lịch' },
        ], 'third-lunar'),
      ],
    },
    {
      id: 'b7-m2',
      title: 'Nhịp ngày hội',
      discovery: [{ text: getFact(source, 'festival').text, source: sourceRef(getFact(source, 'festival')) }],
      activities: [
        makeMatch(source, 'b7-m2-a1', 'b7-festival', 'Ghép phần của ngày hội với hoạt động tương ứng.', 'Dâng hương thuộc phần lễ; thi giã bánh giầy thuộc phần hội.', 'Phần lễ có rước kiệu và dâng hương; phần hội có các hoạt động như thi giã bánh giầy.', ['festival'], [
          { leftId: 'ceremony', left: 'Phần lễ', rightId: 'incense', right: 'Dâng hương' },
          { leftId: 'festival', left: 'Phần hội', rightId: 'pounding', right: 'Thi giã bánh giầy' },
        ]),
        makeChoice(source, 'b7-m2-a2', 'b7-festival', 'Ý nghĩa của Giỗ Tổ Hùng Vương là gì?', 'Câu trả lời gợi nhớ một thành ngữ về lòng biết ơn nguồn cội.', 'Theo sách, ý nghĩa là uống nước nhớ nguồn, tôn vinh công lao dựng nước của các Vua Hùng.', ['festival'], [
          { id: 'remember-founders', text: 'Uống nước nhớ nguồn, nhớ công lao dựng nước của các Vua Hùng' },
          { id: 'choose-travels', text: 'Chọn một nơi để đi du lịch' }, { id: 'measure-land', text: 'Đo diện tích các địa phương' },
        ], 'remember-founders'),
      ],
    },
    {
      id: 'b7-m3',
      title: 'Nghe chuyện bên lửa',
      discovery: [
        { text: getFact(source, 'dragon').text, source: sourceRef(getFact(source, 'dragon')) },
        { text: getFact(source, 'cakes').text, source: sourceRef(getFact(source, 'cakes')) },
      ],
      activities: [
        makeMatch(source, 'b7-m3-a1', 'b7-legends', 'Theo truyền thuyết, ghép mỗi loại bánh với hình dạng và ý nghĩa tương ứng.', 'Bánh chưng vuông; bánh giầy tròn.', 'Theo truyền thuyết, bánh chưng hình vuông tượng trưng Đất và bánh giầy hình tròn tượng trưng Trời.', ['cakes'], [
          { leftId: 'banh-chung', left: 'Bánh chưng', rightId: 'earth', right: 'Hình vuông, tượng trưng Đất' },
          { leftId: 'banh-giay', left: 'Bánh giầy', rightId: 'sky', right: 'Hình tròn, tượng trưng Trời' },
        ]),
        makeOrder(source, 'b7-m3-a2', 'b7-legends', 'Xếp mạch chuyện theo truyền thuyết về việc chọn người nối ngôi.', 'Lang Liêu làm bánh sau khi được thần báo mộng.', 'Theo truyền thuyết, vua muốn chọn người nối ngôi; Lang Liêu làm hai loại bánh; vua hiểu ý nghĩa rồi chọn bánh và truyền ngôi.', ['cakes'], [
          { id: 'king-asks', text: 'Vua tìm người nối ngôi qua lễ vật có ý nghĩa' },
          { id: 'lang-lieu-makes', text: 'Lang Liêu làm bánh chưng và bánh giầy' },
          { id: 'king-chooses', text: 'Vua chọn bánh và truyền ngôi cho Lang Liêu' },
        ], ['king-asks', 'lang-lieu-makes', 'king-chooses']),
      ],
    },
    {
      id: 'b7-m4',
      title: 'Lần theo dấu ngày hội',
      discovery: [
        { text: getFact(source, 'location').text, source: sourceRef(getFact(source, 'location')) },
        { text: getFact(source, 'festival').text, source: sourceRef(getFact(source, 'festival')) },
      ],
      activities: [
        makeMatch(source, 'b7-m4-a1', 'b7-heritage', 'Ghép địa danh hoặc ngày lễ với thông tin tương ứng.', 'Đền Hùng gắn với Phú Thọ; Giỗ Tổ diễn ra vào mồng 10 tháng Ba âm lịch.', 'Khu di tích Đền Hùng chủ yếu thuộc thành phố Việt Trì, tỉnh Phú Thọ; Giỗ Tổ vào ngày mồng 10 tháng Ba âm lịch.', ['location', 'festival'], [
          { leftId: 'location', left: 'Đền Hùng', rightId: 'phu-tho', right: 'Việt Trì, Phú Thọ' },
          { leftId: 'festival', left: 'Giỗ Tổ Hùng Vương', rightId: 'third-lunar', right: 'Mồng 10 tháng Ba âm lịch' },
        ]),
        makeSelect(source, 'b7-m4-a2', 'b7-heritage', 'Chọn đủ hoạt động thuộc phần lễ của ngày Giỗ Tổ.', 'Phần lễ gồm hoạt động trang nghiêm như rước kiệu và dâng hương.', 'Phần lễ có rước kiệu và dâng hương; các hoạt động thi giã bánh giầy, đấu vật thuộc phần hội.', ['festival'], [
          { id: 'procession', text: 'Rước kiệu' }, { id: 'incense', text: 'Dâng hương' }, { id: 'pounding', text: 'Thi giã bánh giầy' }, { id: 'wrestling', text: 'Đấu vật' },
        ], ['procession', 'incense']),
      ],
    },
    {
      id: 'b7-m5',
      title: 'Kể chuyện nguồn cội',
      discovery: [
        { text: getFact(source, 'dragon').text, source: sourceRef(getFact(source, 'dragon')) },
        { text: getFact(source, 'cakes').text, source: sourceRef(getFact(source, 'cakes')) },
      ],
      activities: [
        makeChoice(source, 'b7-m5-a1', 'b7-story', 'Theo truyền thuyết Con Rồng cháu Tiên, người con trưởng theo mẹ lên núi được tôn làm gì?', 'Câu chuyện kể về người con trưởng của Lạc Long Quân và Âu Cơ.', 'Theo truyền thuyết, người con trưởng theo mẹ lên núi được tôn làm vua, hiệu Hùng Vương.', ['dragon'], [
          { id: 'hung-vuong', text: 'Vua, hiệu Hùng Vương' }, { id: 'king-of-sea', text: 'Vua dưới biển' }, { id: 'village-chief', text: 'Trưởng chợ phiên' },
        ], 'hung-vuong'),
        makeOrder(source, 'b7-m5-a2', 'b7-story', 'Xếp mạch chuyện bánh chưng, bánh giầy theo truyền thuyết.', 'Lang Liêu làm bánh sau khi được thần báo mộng.', 'Theo truyền thuyết, vua tìm người nối ngôi; Lang Liêu làm bánh; vua hiểu ý nghĩa rồi chọn bánh và truyền ngôi.', ['cakes'], [
          { id: 'king-asks', text: 'Vua tìm người nối ngôi qua lễ vật có ý nghĩa' },
          { id: 'lang-lieu-makes', text: 'Lang Liêu làm bánh chưng và bánh giầy' },
          { id: 'king-chooses', text: 'Vua chọn bánh và truyền ngôi cho Lang Liêu' },
        ], ['king-asks', 'lang-lieu-makes', 'king-chooses']),
      ],
    },
  ];
  return { id: 'lesson-07', version: 1, title: source.title, objectives, missions };
}

const lessonOneSource = reviewedLessons.find((lesson) => lesson.id === 'bai-1');
const lessonSevenSource = reviewedLessons.find((lesson) => lesson.id === 'bai-7');
if (!lessonOneSource || !lessonSevenSource) throw new Error('Both reviewed MVP lessons are required.');

const reviewedMvpPackages = new Map<Lesson['id'], Lesson>([
  ['lesson-01', makeLessonOne(lessonOneSource)],
  ['lesson-07', makeLessonSeven(lessonSevenSource)],
]);

export const MVP_LESSON_PACKAGES: Lesson[] = FULL_LESSON_SEEDS.map((seed) => {
  const lesson = reviewedMvpPackages.get(seed.id) ?? makeSeedLesson(seed);
  return { ...lesson, missions: lesson.missions.map((mission) => ({
    ...mission, discovery: mission.discovery.map((item) => ({ ...item, text: learnerEvidence(item.text) })),
  })) };
});

export function getLessonPackage(id: Lesson['id']): Lesson {
  const lesson = MVP_LESSON_PACKAGES.find((candidate) => candidate.id === id);
  if (!lesson) throw new Error(`Playable lesson not found: ${id}`);
  return lesson;
}
