export type ViewId =
  | 'journey'
  | 'lessons'
  | 'lesson'
  | 'reward'
  | 'pet'
  | 'collection'
  | 'parent'
  | 'settings';

export type NavigationView = {
  id: Exclude<ViewId, 'settings'>;
  label: string;
  shortLabel: string;
  description: string;
};

export const PRIMARY_VIEWS: NavigationView[] = [
  {
    id: 'journey',
    label: 'Hành trình',
    shortLabel: 'Đi',
    description: 'Đường phiêu lưu của bạn',
  },
  {
    id: 'lessons',
    label: 'Bài học',
    shortLabel: 'Học',
    description: 'Chọn chặng muốn khám phá',
  },
  {
    id: 'lesson',
    label: 'Màn học',
    shortLabel: 'Chơi',
    description: 'Không gian làm nhiệm vụ',
  },
  {
    id: 'reward',
    label: 'Nhận dấu',
    shortLabel: 'Dấu',
    description: 'Hộ chiếu hành trình',
  },
  {
    id: 'pet',
    label: 'Pet của tôi',
    shortLabel: 'Pet',
    description: 'Cáo Nhỏ và đồ phiêu lưu',
  },
  {
    id: 'collection',
    label: 'Bộ sưu tập',
    shortLabel: 'Kho',
    description: 'Những điều đã mở khóa',
  },
  {
    id: 'parent',
    label: 'Góc phụ huynh',
    shortLabel: 'Nhà',
    description: 'Theo dõi và cài đặt',
  },
];

export function getViewLabel(viewId: ViewId): string {
  if (viewId === 'settings') return 'Cài đặt';
  return PRIMARY_VIEWS.find((view) => view.id === viewId)?.label ?? 'Hành trình';
}
