export type PetId = 'fox-orange' | 'elephant-blue' | 'owl-purple' | 'dragon-jade';

export type PetColor = 'orange' | 'blue' | 'purple' | 'jade';

export type PetRequiredStamp = 'stamp-lesson-09' | 'stamp-lesson-19' | 'stamp-lesson-29' | null;

export type PetDefinition = {
  id: PetId;
  name: string;
  color: PetColor;
  image: {
    src: string;
    alt: string;
  };
  requiredStamp: PetRequiredStamp;
  unlockLabel: string;
  unlockGuide: string;
  description: string;
  story: string;
  personality: string;
  cue: string;
};

export const DEFAULT_PET_ID: PetId = 'fox-orange';

export const PETS: readonly PetDefinition[] = [
  {
    id: 'fox-orange',
    name: 'Cáo Nhỏ',
    color: 'orange',
    image: {
      src: '/art/fox-pet-alpha.png',
      alt: 'Cáo Nhỏ màu cam mặc khăn xanh, đeo ba lô và cầm la bàn',
    },
    requiredStamp: null,
    unlockLabel: 'Bạn đồng hành đầu tiên',
    unlockGuide: 'Đã mở sẵn từ đầu hành trình.',
    description: 'Cáo Nhỏ là người dẫn đường bé xíu luôn mang theo bản đồ, la bàn và một túi tò mò.',
    story: 'Cáo Nhỏ luôn mang theo chiếc la bàn để dẫn đường qua từng chặng khám phá.',
    personality: 'Nhanh nhẹn, tò mò và luôn biết cách động viên bạn đồng hành.',
    cue: 'Mình cùng lên đường nhé!',
  },
  {
    id: 'elephant-blue',
    name: 'Voi Núi Xanh',
    color: 'blue',
    image: {
      src: '/art/pets/voi-nui-xanh.png',
      alt: 'Voi màu xanh dương đeo túi thám hiểm và cầm la bàn',
    },
    requiredStamp: 'stamp-lesson-09',
    unlockLabel: 'Mở sau dấu Bài 09',
    unlockGuide: 'Hoàn thành đủ nhiệm vụ của Bài 09 để mở khóa Voi Núi Xanh.',
    description: 'Voi Núi Xanh là người bạn khổng lồ hiền lành, giỏi ghi nhớ đường núi và tiếng gọi của bản làng.',
    story: 'Voi Núi Xanh nghe được tiếng gọi của những con đường xa và nhớ từng dấu chân trên bản đồ.',
    personality: 'Điềm tĩnh, kiên nhẫn và luôn sẵn sàng chở che cả đội.',
    cue: 'Tai mình đã sẵn sàng nghe chuyện làng nghề!',
  },
  {
    id: 'owl-purple',
    name: 'Cú Tím Thám Hiểm',
    color: 'purple',
    image: {
      src: '/art/pets/cu-tim-tham-hiem.png',
      alt: 'Cú màu tím dang cánh đeo túi thám hiểm và cầm la bàn',
    },
    requiredStamp: 'stamp-lesson-19',
    unlockLabel: 'Mở sau dấu Bài 19',
    unlockGuide: 'Hoàn thành đủ nhiệm vụ của Bài 19 để mở khóa Cú Tím Thám Hiểm.',
    description: 'Cú Tím Thám Hiểm là đôi mắt tinh anh của đội, nhìn thấy manh mối nhỏ nhất giữa phố cổ.',
    story: 'Cú Tím Thám Hiểm bay qua những mái ngói cổ, soi sáng manh mối trong mỗi con phố.',
    personality: 'Thông thái, quan sát kỹ và thích đặt những câu hỏi bất ngờ.',
    cue: 'Mình bay qua phố cổ tìm manh mối nhé!',
  },
  {
    id: 'dragon-jade',
    name: 'Rồng Ngọc',
    color: 'jade',
    image: {
      src: '/art/pets/rong-ngoc.png',
      alt: 'Rồng con màu xanh ngọc đeo túi thám hiểm và cầm la bàn',
    },
    requiredStamp: 'stamp-lesson-29',
    unlockLabel: 'Mở sau dấu Bài 29',
    unlockGuide: 'Hoàn thành đủ nhiệm vụ của Bài 29 để mở khóa Rồng Ngọc.',
    description: 'Rồng Ngọc là người canh kho bản đồ, mang trong mình ánh sáng xanh của những vùng đất đã đi qua.',
    story: 'Rồng Ngọc canh giữ kho bản đồ và trao sức mạnh cho người đã đi trọn hành trình Việt Nam.',
    personality: 'Dũng cảm, hào phóng và luôn tin rằng mọi hành trình đều có điều kỳ diệu.',
    cue: 'Bản đồ đã sáng! Cùng mở lối mới nào!',
  },
] as const;

export function getPetById(id: PetId): PetDefinition {
  const pet = PETS.find((candidate) => candidate.id === id);
  if (!pet) throw new Error(`Pet not found: ${id}`);
  return pet;
}

export function isPetUnlocked(pet: PetDefinition, stamps: readonly string[]): boolean {
  return pet.requiredStamp === null || stamps.includes(pet.requiredStamp);
}
