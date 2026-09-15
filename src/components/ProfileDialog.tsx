import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AvatarId, StudentProfilePatch, StudentProfileView } from '../../shared/account-contracts';
import { DEFAULT_STUDENT_PIN, validateBirthDate, validateDisplayName, validatePin } from '../../shared/account-contracts';
import { getAvatarDefinition, AVATAR_IDS } from '../profile/avatarCatalog';
import { getFocusableElements, getNextFocusIndex } from './SettingsDialog';
import { PinField } from './PinField';

export type ProfileActionResult = void | { ok: true } | { ok: false; message: string };

export type ProfileDialogProps = {
  profile: StudentProfileView;
  onSave: (patch: StudentProfilePatch) => ProfileActionResult | Promise<ProfileActionResult>;
  onChangePin: (currentPin: string, nextPin: string) => ProfileActionResult | Promise<ProfileActionResult>;
  onClose: () => void;
  onLogout: () => void;
};

const PROFILE_FOCUSABLE_SELECTOR = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function actionFailure(result: ProfileActionResult): string | null {
  return result && typeof result === 'object' && result.ok === false ? result.message : null;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function avatarLabel(avatarId: AvatarId): string {
  const labels: Record<AvatarId, string> = {
    'fox-scout': 'Cáo thám hiểm',
    'fox-sunny': 'Cáo nắng mai',
    'fox-leaf': 'Cáo lá xanh',
    'fox-night': 'Cáo đêm sao',
  };
  return labels[avatarId];
}

export function ProfileDialog({ profile, onSave, onChangePin, onClose, onLogout }: ProfileDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [avatarId, setAvatarId] = useState<AvatarId>(profile.avatarId);
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? '');
  const [profileError, setProfileError] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [confirmationPin, setConfirmationPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinStatus, setPinStatus] = useState('');
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setUsername(profile.username);
    setAvatarId(profile.avatarId);
    setBirthDate(profile.birthDate ?? '');
  }, [profile.accountId, profile.displayName, profile.username, profile.avatarId, profile.birthDate]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = getFocusableElements(dialog).filter((element) => element.matches(PROFILE_FOCUSABLE_SELECTOR));
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && (currentIndex <= 0 || currentIndex === -1)) {
        event.preventDefault();
        focusable[getNextFocusIndex(0, focusable.length, true)]?.focus();
      } else if (!event.shiftKey && (currentIndex === focusable.length - 1 || currentIndex === -1)) {
        event.preventDefault();
        focusable[getNextFocusIndex(focusable.length - 1, focusable.length, false)]?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const previousFocus = previousFocusRef.current;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError('');
    setProfileStatus('');
    const validName = validateDisplayName(displayName);
    if (!validName.ok) {
      setProfileError(validName.message);
      return;
    }
    const validBirthDate = validateBirthDate(birthDate || null);
    if (!validBirthDate.ok) {
      setProfileError(validBirthDate.message);
      return;
    }

    const patch: StudentProfilePatch = {};
    if (validName.value !== profile.displayName) patch.displayName = validName.value;
    if (avatarId !== profile.avatarId) patch.avatarId = avatarId;
    if (validBirthDate.value !== profile.birthDate) patch.birthDate = validBirthDate.value;
    setProfileBusy(true);
    try {
      const failure = actionFailure(await onSave(patch));
      if (failure) {
        setProfileError(failure);
        return;
      }
      setDisplayName(validName.value);
      setProfileStatus('Đã lưu thay đổi hồ sơ.');
    } catch (error) {
      setProfileError(errorMessage(error, 'Chưa thể lưu hồ sơ; bản nháp vẫn được giữ lại.'));
    } finally {
      setProfileBusy(false);
    }
  };

  const submitPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPinError('');
    setPinStatus('');
    const validCurrentPin = validatePin(currentPin);
    const validNextPin = validatePin(nextPin);
    if (!validCurrentPin.ok) {
      setPinError('Nhập đúng PIN hiện tại gồm 6 chữ số.');
      return;
    }
    if (!validNextPin.ok) {
      setPinError(validNextPin.message);
      return;
    }
    if (validNextPin.value === DEFAULT_STUDENT_PIN) {
      setPinError('Hãy chọn một mã PIN khác mã mặc định.');
      return;
    }
    if (validNextPin.value !== confirmationPin) {
      setPinError('Hai lần nhập mã PIN mới chưa giống nhau.');
      return;
    }

    setPinBusy(true);
    try {
      const failure = actionFailure(await onChangePin(validCurrentPin.value, validNextPin.value));
      if (failure) {
        setPinError(failure);
        return;
      }
      setCurrentPin('');
      setNextPin('');
      setConfirmationPin('');
      setPinStatus('Đã đổi mã PIN.');
    } catch (error) {
      setPinError(errorMessage(error, 'Chưa thể đổi mã PIN; các ô PIN vẫn được giữ lại.'));
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <div className="profile-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} className="profile-dialog" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="profile-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="profile-dialog-heading">
          <div>
            <p className="eyebrow">GÓC CỦA BẠN</p>
            <h2 id="profile-dialog-title">Hồ sơ học sinh</h2>
            <p className="profile-dialog-lead">Chọn avatar và thông tin để hành trình gọi đúng tên con.</p>
          </div>
          <button ref={closeRef} className="dialog-close" type="button" onClick={onClose} aria-label="Đóng hồ sơ">×</button>
        </div>

        <form className="profile-form" onSubmit={(event) => void submitProfile(event)}>
          <fieldset className="profile-section">
            <legend>Avatar của con</legend>
            <div className="profile-avatar-grid" role="group" aria-label="Chọn avatar">
              {AVATAR_IDS.map((id) => {
                const definition = getAvatarDefinition(id);
                return (
                  <button key={id} className={`profile-avatar-option${avatarId === id ? ' is-selected' : ''}`} type="button" data-avatar-option={id} aria-label={`Chọn avatar ${avatarLabel(id)}`} aria-pressed={avatarId === id} onClick={() => setAvatarId(id)}>
                    <span className={`profile-avatar ${definition?.variantClass ?? ''}`} aria-hidden="true"><img src={definition?.assetUrl} alt="" /></span>
                    <span>{avatarLabel(id)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="profile-section profile-fields">
            <label className="auth-field" htmlFor="profile-display-name"><span>Tên hiển thị</span><input id="profile-display-name" name="displayName" type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" /></label>
            <label className="auth-field" htmlFor="profile-username"><span>Tên tài khoản</span><input id="profile-username" name="username" type="text" value={username} readOnly aria-readonly="true" autoComplete="username" /></label>
            <label className="auth-field" htmlFor="profile-birth-date"><span>Ngày sinh</span><input id="profile-birth-date" name="birthDate" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
          </div>

          {(profileError || profileStatus) && <p className={profileError ? 'auth-error' : 'profile-status'} role={profileError ? 'alert' : 'status'}>{profileError || profileStatus}</p>}
          <button className="primary-small-button auth-submit" type="submit" disabled={profileBusy}>{profileBusy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
        </form>

        <section className="profile-pin-section" aria-labelledby="profile-pin-heading">
          <div className="profile-section-heading">
            <div><h3 id="profile-pin-heading">Mã PIN</h3><p>Mã PIN mới chỉ thay đổi quyền đăng nhập của con.</p></div>
            <button className="secondary-button profile-pin-toggle" type="button" aria-expanded={pinOpen} onClick={() => { setPinOpen((current) => !current); setPinError(''); setPinStatus(''); }}>{pinOpen ? 'Ẩn' : 'Đổi mã PIN'}</button>
          </div>
          {pinOpen && (
            <form id="profile-pin-form" className="auth-form profile-pin-form" onSubmit={(event) => void submitPin(event)}>
              <PinField id="profile-current-pin" label="PIN hiện tại" value={currentPin} onChange={setCurrentPin} autoComplete="current-password" autoFocus />
              <PinField id="profile-new-pin" label="PIN mới" value={nextPin} onChange={setNextPin} autoComplete="new-password" />
              <PinField id="profile-confirm-pin" label="Nhập lại PIN mới" value={confirmationPin} onChange={setConfirmationPin} autoComplete="new-password" />
              {(pinError || pinStatus) && <p className={pinError ? 'auth-error' : 'profile-status'} role={pinError ? 'alert' : 'status'}>{pinError || pinStatus}</p>}
              <button className="primary-small-button auth-submit" type="submit" disabled={pinBusy}>{pinBusy ? 'Đang đổi…' : 'Lưu mã PIN'}</button>
            </form>
          )}
        </section>

        <button className="secondary-button profile-logout-button" type="button" onClick={onLogout}>Đăng xuất tài khoản</button>
      </section>
    </div>
  );
}
