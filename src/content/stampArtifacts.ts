import type { LessonId } from './types';

export type StampArtifact = {
  lessonId: LessonId;
  name: string;
  region: string;
  src: string;
  alt: string;
  story: string;
  sourceNote: string;
};

const artifact = (
  lessonId: LessonId,
  name: string,
  region: string,
  alt: string,
  story: string,
  sourceNote: string,
): StampArtifact => ({
  lessonId,
  name,
  region,
  src: `/art/stamps/stamp-${lessonId.slice(-2)}.png`,
  alt,
  story,
  sourceNote,
});

/**
 * The stamp stories are short museum-label style copy for the game. When a
 * lesson is a review or a broad nature lesson, the copy explicitly calls the
 * badge an inspired emblem instead of presenting an illustration as a claimed
 * archaeological object.
 */
export const STAMP_ARTIFACTS: StampArtifact[] = [
  artifact(
    'lesson-01',
    'Mũi Tên Cổ Loa',
    'Địa phương em',
    'Mũi tên đồng Cổ Loa trên nền huy hiệu xanh vàng',
    'Mũi tên đồng là một manh mối nhỏ nhưng rất mạnh: từ hình dáng và chất liệu, người học có thể lần theo tay nghề của cư dân xưa. Dấu này phỏng theo những mũi tên đồng gắn với thành Cổ Loa, nhắc em rằng bản đồ, tranh ảnh và hiện vật đều có thể mở cánh cửa vào quá khứ.',
    'Bài 01 và hoạt động về công cụ học tập; motif hiện vật được dùng như minh họa lịch sử.',
  ),
  artifact(
    'lesson-02',
    'Ghim Quê Hương',
    'Địa phương em',
    'Ghim bản đồ hình ngôi sao đánh dấu một quê hương',
    'Chiếc ghim nhỏ trên bản đồ là lời mời gọi bắt đầu chuyến đi từ nơi em đang sống. Huy hiệu này là biểu tượng tổng hợp: mỗi em có thể đặt nó lên một con sông, ngọn núi, khu phố hay làng quê riêng, rồi kể xem thiên nhiên đã giúp con người tạo nên cuộc sống như thế nào.',
    'Huy hiệu phỏng theo thao tác xác định địa điểm trong bài 02, không phải tên một cổ vật cụ thể.',
  ),
  artifact(
    'lesson-03',
    'Trống Hội Quê',
    'Địa phương em',
    'Mặt trống hội quê với hoa văn đỏ vàng',
    'Một tiếng trống hội có thể gọi mọi người ra sân đình, mở đầu cuộc rước hoặc báo hiệu trò chơi sắp bắt đầu. Huy hiệu gợi từ những chiếc trống hội trong lễ làng Việt Nam, nơi món ăn, điệu hát, nghề thủ công và ký ức gia đình gặp nhau thành một câu chuyện địa phương.',
    'Huy hiệu phỏng theo sinh hoạt lễ hội truyền thống được rà soát trong bài 03.',
  ),
  artifact(
    'lesson-04',
    'Đỉnh Phan-xi-păng',
    'Trung du và miền núi phía Bắc',
    'Đỉnh Phan-xi-păng phủ mây trong huy hiệu tròn',
    'Phan-xi-păng vươn lên giữa dãy Hoàng Liên Sơn như một cột mốc của miền núi phía Bắc. Mây, rừng và độ cao trên huy hiệu nhắc em quan sát mối liên hệ giữa địa hình, nguồn nước, khoáng sản và cách con người đi lại, làm nhà, canh tác trong vùng.',
    'Bài 04; địa danh và đặc điểm tự nhiên đối chiếu theo nội dung SGK đã rà soát.',
  ),
  artifact(
    'lesson-05',
    'Ruộng Bậc Thang',
    'Trung du và miền núi phía Bắc',
    'Ruộng bậc thang uốn theo sườn núi dưới nắng vàng',
    'Những thửa ruộng xếp tầng biến sườn dốc thành các bậc giữ nước và giữ đất. Mỗi đường cong là dấu vết của nhiều thế hệ biết đọc địa hình, chọn mùa và cùng nhau chăm lúa; vì thế huy hiệu này kể chuyện về dân cư và sức sáng tạo trong lao động.',
    'Bài 05; cảnh quan ruộng bậc thang là hình ảnh minh họa cho sản xuất vùng núi.',
  ),
  artifact(
    'lesson-06',
    'Đàn Tính Then',
    'Trung du và miền núi phía Bắc',
    'Đàn tính Then bằng gỗ với dây đàn sáng',
    'Âm thanh đàn tính đi cùng hát Then tạo nên một sợi chỉ nối người kể chuyện với cộng đồng. Khi tiếng đàn vang trong lễ hội, chợ vùng cao hay đêm sinh hoạt, em có thể hình dung văn hóa không nằm yên trong tủ kính mà tiếp tục sống qua người hát, người nghe và người truyền lại.',
    'Bài 06; nhạc cụ và hát Then được dùng làm neo văn hóa cho miền núi phía Bắc.',
  ),
  artifact(
    'lesson-07',
    'Bánh Chưng Hùng Vương',
    'Đền Hùng và Giỗ Tổ',
    'Bánh chưng vuông xanh trên nền họa tiết lễ hội',
    'Bánh chưng vuông là vật phẩm trong truyền thuyết Lang Liêu và cũng là món quà dâng cúng trong nhiều gia đình Việt. Lớp lá xanh, nếp thơm và nhân đậu gợi đất trời, mùa màng, còn câu chuyện Đền Hùng nhắc em trân trọng nguồn cội qua một món ăn rất gần gũi.',
    'Bài 07; truyền thuyết bánh chưng và lễ Giỗ Tổ được dùng làm nguồn câu chuyện.',
  ),
  artifact(
    'lesson-08',
    'Bát Phù Sa',
    'Đồng bằng Bắc Bộ',
    'Chiếc bát chứa lớp đất phù sa vàng nâu và mầm lúa',
    'Huy hiệu hình chiếc bát gom lại món quà lặng thầm của sông Hồng: lớp phù sa theo nước bồi đắp đồng bằng. Từ nền đất ấy, làng xóm, ruộng lúa và những tuyến đường thủy dần mở ra; một vật phẩm nhỏ giúp em nhìn thấy sức mạnh của dòng sông trong đời sống.',
    'Huy hiệu phỏng theo phù sa sông Hồng trong bài 08, không phải cổ vật khảo cổ.',
  ),
  artifact(
    'lesson-09',
    'Gốm Bát Tràng',
    'Đồng bằng Bắc Bộ',
    'Bình gốm Bát Tràng men xanh lam với hoa văn mây',
    'Đất sét qua bàn tay người thợ trở thành chiếc bát, bình hay món đồ trang trí có dáng riêng. Gốm Bát Tràng là lời nhắc về làng nghề ven sông: nguyên liệu, lửa lò, kỹ thuật và thị trường kết nối thành một hành trình lao động bền bỉ.',
    'Bài 09; Bát Tràng được nêu như ví dụ làng nghề của Đồng bằng Bắc Bộ.',
  ),
  artifact(
    'lesson-10',
    'Cổng Làng Việt',
    'Đồng bằng Bắc Bộ',
    'Cổng làng Việt với cây đa và con đường lát gạch',
    'Qua cổng làng, con đường thường dẫn tới cây đa, giếng nước và sân đình, những không gian quen thuộc của làng quê Bắc Bộ. Huy hiệu này là một chiếc chìa khóa ký ức: bước qua nó, em gặp nếp nhà, ngày hội và cách mọi người cùng giữ gìn nơi chốn của mình.',
    'Bài 10; huy hiệu tổng hợp các biểu tượng cổng làng, cây đa, giếng và sân đình.',
  ),
  artifact(
    'lesson-11',
    'Trống Đồng Đông Sơn',
    'Sông Hồng và văn minh sông Hồng',
    'Trống đồng Đông Sơn với ngôi sao và chim cách điệu',
    'Mặt trống Đông Sơn thường gây tò mò bởi ngôi sao trung tâm, vòng hoa văn và những hình người, chim, thuyền chuyển động quanh đó. Nó giống một bản ghi bằng đồng về cư dân, lễ nghi và kỹ thuật của văn minh sông Hồng, giúp em đọc lịch sử qua hình ảnh thay vì chỉ qua chữ.',
    'Bài 11; trống đồng Đông Sơn là hiện vật lịch sử được dùng làm mốc nhận diện văn minh sông Hồng.',
  ),
  artifact(
    'lesson-12',
    'Rồng Thăng Long',
    'Thăng Long – Hà Nội',
    'Rồng vàng thời Lý uốn quanh mây trên huy hiệu',
    'Rồng thời Lý có thân mềm, dáng bay lên và thường được liên tưởng với khát vọng dựng xây kinh đô. Huy hiệu kể lại khoảnh khắc Đại La được chọn làm nơi mở đô năm 1010: một quyết định nhìn xa theo sông ngòi, đất đai và vị trí giao thương.',
    'Bài 12; hình tượng rồng là biểu tượng nghệ thuật minh họa cho Thăng Long thời Lý.',
  ),
  artifact(
    'lesson-13',
    'Bia Tiến Sĩ',
    'Văn Miếu – Quốc Tử Giám',
    'Bia tiến sĩ trên lưng rùa đá dưới mái Văn Miếu',
    'Những tấm bia đá đặt trên lưng rùa ghi tên người đỗ đạt và lưu lại một phần lịch sử giáo dục. Khi chạm tay vào huy hiệu, em có thể tưởng tượng sân Văn Miếu yên tĩnh, nơi việc học được coi là hành trình rèn tài, rèn đức và đóng góp cho đất nước.',
    'Bài 13; bia tiến sĩ và Văn Miếu – Quốc Tử Giám là di sản được nhắc trong bài học.',
  ),
  artifact(
    'lesson-14',
    'La Bàn Bắc Bộ',
    'Ôn tập Đồng bằng Bắc Bộ',
    'La bàn vàng hướng qua sông Hồng và ruộng lúa',
    'Chiếc la bàn là huy hiệu phỏng theo cả một vùng thay vì một hiện vật riêng lẻ. Bốn hướng mở ra sông Hồng, đồng lúa, làng nghề và di sản, giúp em xâu chuỗi những dấu vết đã gặp trong các bài Bắc Bộ thành một tuyến khám phá có điểm đầu và điểm cuối.',
    'Bài 14 ôn tập; huy hiệu tổng hợp các địa hình, nghề và di sản của vùng.',
  ),
  artifact(
    'lesson-15',
    'Đèn Biển Miền Trung',
    'Duyên hải miền Trung',
    'Hải đăng trên mũi đá nhìn ra biển xanh và sóng bạc',
    'Hải đăng đứng giữa gió, sóng và những chuyến tàu, vừa là công trình dẫn đường vừa là dấu mốc của dải duyên hải. Huy hiệu mời em quan sát bờ biển, đồng bằng nhỏ hẹp, núi chạy sát biển và những thử thách tự nhiên đã tạo nên cách cư dân thích nghi.',
    'Bài 15; hải đăng là biểu tượng minh họa cho không gian biển và hoạt động ven biển.',
  ),
  artifact(
    'lesson-16',
    'Hạt Muối Duyên Hải',
    'Duyên hải miền Trung',
    'Hạt muối lấp lánh giữa ruộng muối và nắng miền Trung',
    'Một hạt muối cần nắng, gió, nước biển và rất nhiều công sức của người diêm dân. Từ ruộng muối đến bến cá, huy hiệu cho thấy biển vừa là cảnh quan vừa là nơi làm việc, nuôi sống gia đình và tạo ra những sản phẩm đi xa khỏi quê nhà.',
    'Bài 16; muối và sản phẩm biển được dùng làm vật phẩm đại diện cho sinh kế duyên hải.',
  ),
  artifact(
    'lesson-17',
    'Đèn Lồng Hội An',
    'Duyên hải miền Trung',
    'Đèn lồng Hội An nhiều màu dưới mái phố cổ',
    'Khi phố lên đèn, những chiếc đèn lồng biến con đường thành dòng màu ấm áp. Huy hiệu gợi Hội An, Mỹ Sơn, lễ hội và những cuộc gặp gỡ ven biển, nơi dấu vết giao thương và bàn tay người thợ cùng tạo nên một di sản dễ nhận ra.',
    'Bài 17; đèn lồng Hội An là vật phẩm văn hóa minh họa cho di sản miền Trung.',
  ),
  artifact(
    'lesson-18',
    'Mái Ngọ Môn',
    'Cố đô Huế',
    'Mái Ngọ Môn vàng đỏ trên nền sông Hương và núi Ngự',
    'Mái Ngọ Môn là một dấu hiệu quen thuộc của kinh thành Huế, nơi kiến trúc, sông Hương và núi Ngự Bình tạo thành một không gian đặc biệt. Huy hiệu kể chuyện về triều Nguyễn bằng đường mái, sắc màu và nhịp cổng thành, để lịch sử hiện ra như một nơi có thể bước vào.',
    'Bài 18; Ngọ Môn và cảnh quan Huế được đối chiếu với nội dung bài học.',
  ),
  artifact(
    'lesson-19',
    'Chùa Cầu Hội An',
    'Phố cổ Hội An',
    'Chùa Cầu Hội An có mái cong phản chiếu bên sông',
    'Chùa Cầu bắc qua một nhánh nước giữa phố cổ, vừa là công trình giao thông vừa là biểu tượng của Hội An. Dưới mái cầu, dấu vết giao thương, nhà gỗ, dòng Thu Bồn và câu chuyện cư dân nhiều thế kỷ gặp nhau trong một khung cảnh rất riêng.',
    'Bài 19; Chùa Cầu, phố cổ và sông Thu Bồn là các mốc di sản của Hội An.',
  ),
  artifact(
    'lesson-20',
    'Đất Đỏ Tây Nguyên',
    'Tây Nguyên',
    'Mảng đất đỏ bazan bên rừng xanh và cao nguyên',
    'Đất đỏ bazan là lớp nền giàu sức gợi của các cao nguyên: màu đất đậm, rừng rộng và những mùa mưa nắng rõ rệt. Huy hiệu phỏng theo chất liệu của vùng để em nối địa hình, khí hậu, sông suối và cây trồng thành một bức tranh thiên nhiên sống động.',
    'Bài 20; huy hiệu mô phỏng đất đỏ bazan, không phải mẫu vật địa chất thu thập tại chỗ.',
  ),
  artifact(
    'lesson-21',
    'Cà Phê Cao Nguyên',
    'Tây Nguyên',
    'Cành cà phê chín đỏ trên nền cao nguyên xanh',
    'Từ hoa trắng đến quả đỏ, cây cà phê ghi lại nhịp mùa của cao nguyên và công việc chăm sóc của người trồng. Huy hiệu không chỉ có hạt cà phê: phía sau nó còn là đất bazan, nguồn nước, đường vận chuyển, cây che bóng và thị trường kết nối Tây Nguyên với nhiều nơi.',
    'Bài 21; cà phê là sản phẩm tiêu biểu dùng để minh họa hoạt động sản xuất Tây Nguyên.',
  ),
  artifact(
    'lesson-22',
    'Chiêng Nhà Rông',
    'Tây Nguyên',
    'Chiêng đồng trước mái nhà rông cao và sắc màu thổ cẩm',
    'Nhà rông là không gian cộng đồng, còn tiếng chiêng giúp lễ hội và câu chuyện của buôn làng vang xa. Huy hiệu ghép hai hình ảnh ấy để nhắc em về nghề dệt, lễ hội voi, những người anh hùng và truyền thống yêu nước được gìn giữ qua nhiều thế hệ.',
    'Bài 22; chiêng và nhà rông là vật phẩm tổng hợp từ các nét văn hóa Tây Nguyên.',
  ),
  artifact(
    'lesson-23',
    'Cồng Chiêng Tây Nguyên',
    'Tây Nguyên',
    'Bộ cồng chiêng đồng treo trong vòng lửa lễ hội',
    'Mỗi chiếc cồng, chiếc chiêng có một âm sắc; cả bộ chỉ thật sự kể chuyện khi nhiều người cùng tấu. Huy hiệu gợi không gian văn hóa cồng chiêng, nơi âm nhạc gắn với lễ mừng, nghi thức, sân làng và ký ức tập thể chứ không chỉ là một nhạc cụ đứng riêng.',
    'Bài 23; không gian văn hóa cồng chiêng là trọng tâm văn hóa của bài học.',
  ),
  artifact(
    'lesson-24',
    'Ghe Sông Nước',
    'Nam Bộ',
    'Chiếc ghe gỗ lướt qua kênh rạch với hàng dừa nước',
    'Ở Nam Bộ, ghe xuồng có thể là phương tiện đi chợ, chở hàng, thăm vườn hoặc nối những xóm ven kênh. Huy hiệu cho em nhìn địa lý bằng chuyển động: sông ngòi, kênh rạch và mùa nước đã định hình cách người dân sống, đi lại và làm việc.',
    'Bài 24; ghe xuồng là hình ảnh minh họa cho mạng lưới sông nước Nam Bộ.',
  ),
  artifact(
    'lesson-25',
    'Bông Lúa Nam Bộ',
    'Nam Bộ',
    'Bông lúa vàng trên nền đồng ruộng và sông nước',
    'Bông lúa vàng là thành quả của đất phù sa, nước, nắng và công chăm sóc. Từ ruộng lúa đến vườn cây, nhà máy và bến cảng, huy hiệu giúp em thấy sản xuất Nam Bộ có nhiều tầng nối tiếp nhau, cùng dựa trên một vùng sông nước rộng lớn.',
    'Bài 25; lúa và nông nghiệp là hình ảnh đại diện cho hoạt động sản xuất Nam Bộ.',
  ),
  artifact(
    'lesson-26',
    'Khăn Rằn Phương Nam',
    'Nam Bộ',
    'Khăn rằn đen trắng cuộn bên mái chèo và đàn kìm',
    'Chiếc khăn rằn vừa gần gũi trong đời sống vừa gợi hình ảnh người dân phương Nam bền bỉ, phóng khoáng. Cùng với ghe xuồng, chợ nổi, đờn ca tài tử và câu chuyện Trương Định, huy hiệu mở ra một miền văn hóa có nhịp điệu riêng.',
    'Bài 26; khăn rằn là vật phẩm văn hóa được dùng làm mốc nhận diện Nam Bộ.',
  ),
  artifact(
    'lesson-27',
    'Tàu Bến Nhà Rồng',
    'Thành phố Hồ Chí Minh',
    'Con tàu rời Bến Nhà Rồng trên nền sông Sài Gòn',
    'Bến Nhà Rồng bên sông Sài Gòn gắn với chuyến đi tìm đường cứu nước của Nguyễn Tất Thành. Huy hiệu đặt con tàu giữa dòng nước để kể về một thành phố mở cửa giao thương, chứng kiến những bước ngoặt lớn và giữ vai trò quan trọng trong lịch sử hiện đại.',
    'Bài 27; Bến Nhà Rồng và câu chuyện lịch sử thành phố được dùng làm mốc chính.',
  ),
  artifact(
    'lesson-28',
    'Bếp Hoàng Cầm',
    'Địa đạo Củ Chi',
    'Bếp Hoàng Cầm khói thấp giữa rừng Củ Chi',
    'Bếp Hoàng Cầm được thiết kế để khói tản ra thấp và kín hơn, phù hợp với cuộc sống trong thời chiến. Cùng địa đạo nhiều tầng và những lối đi bí mật, vật phẩm này cho thấy con người đã dùng hiểu biết về gió, đất và rừng để bảo vệ cộng đồng.',
    'Bài 28; bếp Hoàng Cầm và cấu trúc địa đạo Củ Chi là chi tiết lịch sử đã rà soát.',
  ),
  artifact(
    'lesson-29',
    'La Bàn Sáu Vùng',
    'Hành trình Việt Nam',
    'La bàn sáu cánh nối Bắc Bộ, miền Trung, Tây Nguyên và Nam Bộ',
    'Dấu cuối cùng là một la bàn ghép từ những tuyến đường đã đi qua: núi, đồng bằng, biển, cao nguyên và sông nước. Nó không phải cổ vật duy nhất của một địa danh; đó là huy hiệu tổng hợp nhắc em biết so sánh, nối mạch và tự vẽ bản đồ ký ức của cả hành trình.',
    'Bài 29 ôn tập; huy hiệu tổng hợp các vùng và hiện vật đã gặp trong 28 bài trước.',
  ),
];

const STAMP_ARTIFACT_BY_LESSON = new Map(STAMP_ARTIFACTS.map((item) => [item.lessonId, item]));

export function getStampArtifact(lessonId: LessonId): StampArtifact {
  const item = STAMP_ARTIFACT_BY_LESSON.get(lessonId);
  if (!item) throw new Error(`Stamp artifact not found: ${lessonId}`);
  return item;
}
