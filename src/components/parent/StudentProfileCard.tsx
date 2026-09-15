import { useState } from 'react';
import type { StudentProfileView } from '../../../shared/account-contracts';
import { DEFAULT_AVATAR_ID } from '../../../shared/account-contracts';
import { getAvatarDefinition } from '../../profile/avatarCatalog';

export type StudentProfileCardProps = {
  profile: StudentProfileView | null;
  busy: boolean;
  onBirthdayWishesEnabledChange: (enabled: boolean) => void | Promise<void>;
  unavailableMessage?: string;
  errorMessage?: string;
};

function formatBirthDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function errorText(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Chưa thể lưu tùy chọn lời chúc; trạng thái trước đó vẫn được giữ.';
}

export function StudentProfileCard({ profile, busy, onBirthdayWishesEnabledChange, unavailableMessage, errorMessage: externalError }: StudentProfileCardProps) {
  const [localError, setLocalError] = useState('');
  const definition = getAvatarDefinition(profile?.avatarId ?? DEFAULT_AVATAR_ID) ?? getAvatarDefinition(DEFAULT_AVATAR_ID);
  const error = externalError || localError;

  const handlePreferenceChange = (enabled: boolean) => {
    setLocalError('');
    void Promise.resolve(onBirthdayWishesEnabledChange(enabled)).catch((caught) => setLocalError(errorText(caught)));
  };

  return (
    <section className="parent-card student-profile-card" data-parent-profile-card aria-labelledby="student-profile-card-title">
      <div className="parent-card-heading student-profile-card-heading">
        <div>
          <p className="eyebrow">HỒ SƠ ĐƯỢC CẤP QUYỀN</p>
          <h2 id="student-profile-card-title">Hồ sơ của con</h2>
        </div>
        <span className="parent-profile-scope">Chỉ trong Góc phụ huynh</span>
      </div>

      {profile ? (
        <>
          <div className="student-profile-card-main">
            <span className={`profile-avatar student-profile-avatar ${definition?.variantClass ?? ''}`} data-parent-profile-avatar aria-hidden="true">
              <img src={definition?.assetUrl} alt="" draggable={false} />
            </span>
            <div className="student-profile-copy">
              <strong>{profile.displayName}</strong>
              <small>Tài khoản: {profile.username}</small>
              <p>Ngày sinh: <time dateTime={profile.birthDate ?? undefined}>{profile.birthDate ? formatBirthDate(profile.birthDate) : 'Chưa cập nhật'}</time></p>
            </div>
          </div>

          <div className="student-profile-preference">
            <div className="student-profile-preference-copy">
              <strong>Lời chúc sinh nhật</strong>
              <small>Cho phép bảng lời chúc an toàn trong lớp khi tính năng online được mở.</small>
            </div>
            <label className="student-profile-preference-control">
              <span className="visually-hidden">Cho phép lời chúc sinh nhật</span>
              <input
                type="checkbox"
                role="switch"
                aria-label="Cho phép lời chúc sinh nhật"
                checked={profile.birthdayWishesEnabled}
                disabled={busy}
                onChange={(event) => handlePreferenceChange(event.currentTarget.checked)}
              />
              <span className={`toggle${profile.birthdayWishesEnabled ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
            </label>
          </div>
          {busy && <p className="student-profile-status" role="status">Đang lưu tùy chọn lời chúc…</p>}
          {error && <p className="auth-error student-profile-error" role="alert">{error}</p>}
        </>
      ) : (
        <>
          <div className="student-profile-unavailable" role={unavailableMessage ? 'alert' : 'status'}>
            <strong>{busy ? 'Đang tải hồ sơ phụ huynh…' : 'Hồ sơ phụ huynh chưa sẵn sàng.'}</strong>
            <span>{unavailableMessage || (busy ? 'Đang xác minh quyền truy cập của phụ huynh.' : 'Tùy chọn lời chúc đang tạm khóa để không đoán dữ liệu.')}</span>
          </div>
          <div className="student-profile-preference is-disabled">
            <div className="student-profile-preference-copy">
              <strong>Lời chúc sinh nhật</strong>
              <small>Chỉ bật được sau khi hồ sơ của đúng con trong grant hiện hành được tải.</small>
            </div>
            <label className="student-profile-preference-control">
              <span className="visually-hidden">Cho phép lời chúc sinh nhật</span>
              <input type="checkbox" role="switch" aria-label="Cho phép lời chúc sinh nhật" checked={false} disabled onChange={() => undefined} />
              <span className="toggle" aria-hidden="true"><span /></span>
            </label>
          </div>
        </>
      )}
    </section>
  );
}
