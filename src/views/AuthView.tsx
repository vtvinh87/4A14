import { FormEvent, useState } from 'react';
import { DEFAULT_STUDENT_PIN, validatePin, validateUsername } from '../auth/account';
import { PinField } from '../components/PinField';

type LoginViewProps = {
  onStudentLogin: (username: string, pin: string) => void | Promise<void>;
  onAdminLogin: (username: string, password: string) => void | Promise<void>;
  error?: string;
  busy?: boolean;
};

export function LoginView({ onStudentLogin, onAdminLogin, error, busy = false }: LoginViewProps) {
  const [mode, setMode] = useState<'student' | 'admin'>('student');
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [localError, setLocalError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLocalError('');
    const form = event.currentTarget as HTMLFormElement;
    const submittedUsername = (form.elements.namedItem('auth-username') as HTMLInputElement | null)?.value ?? username;
    const submittedSecret = (form.elements.namedItem(mode === 'student' ? 'auth-pin' : 'auth-password') as HTMLInputElement | null)?.value ?? secret;
    if (mode === 'student') {
      const user = validateUsername(submittedUsername);
      const pin = validatePin(submittedSecret);
      if (!user.ok) { setLocalError(user.message); return; }
      if (!pin.ok) { setLocalError(pin.message); return; }
      void onStudentLogin(user.value, pin.value);
      return;
    }
    if (!submittedUsername.trim() || !submittedSecret) { setLocalError('Nhập tên và mật khẩu quản trị.'); return; }
    void onAdminLogin(submittedUsername.trim(), submittedSecret);
  };
  return (
    <main className="auth-screen" aria-labelledby="auth-title">
      <section className="auth-card">
        <img className="auth-emblem" src="/art/collection/collection-emblem.png" alt="" aria-hidden="true" />
        <p className="eyebrow">HÀNH TRÌNH 4A14</p>
        <h1 id="auth-title">Đăng nhập để bắt đầu chuyến đi</h1>
        <div className="auth-mode-switch" role="tablist" aria-label="Loại đăng nhập">
          <button type="button" className={mode === 'student' ? 'is-active' : ''} onClick={() => { setMode('student'); setSecret(''); setLocalError(''); }}>Học sinh</button>
          <button type="button" className={mode === 'admin' ? 'is-active' : ''} onClick={() => { setMode('admin'); setSecret(''); setLocalError(''); }}>Quản trị</button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label className="auth-field" htmlFor="auth-username"><span>{mode === 'student' ? 'Tên tài khoản' : 'Tên quản trị'}</span><input id="auth-username" name="username" type="text" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} autoFocus /></label>
          {mode === 'student' ? <PinField id="auth-pin" label="Mã PIN 6 số" value={secret} onChange={setSecret} autoComplete="current-password" /> : <label className="auth-field" htmlFor="auth-password"><span>Mật khẩu quản trị</span><input id="auth-password" name="password" type="password" autoComplete="current-password" value={secret} onChange={(event) => setSecret(event.target.value)} /></label>}
          {(error || localError) && <p className="auth-error" role="alert">{error || localError}</p>}
          <button className="primary-small-button auth-submit" type="submit" disabled={busy}>{busy ? 'Đang mở cổng…' : 'Vào hành trình →'}</button>
        </form>
        <div className="auth-note">
          <p>Liên hệ Admin để tạo tài khoản hoặc đặt lại mật khẩu.</p>
          <a className="auth-admin-contact" href="https://zalo.me/0948584429" target="_blank" rel="noreferrer"><img className="auth-admin-icon" src="/art/hud/zalo.webp" alt="" aria-hidden="true" width="22" height="22" /><span>Zalo: Thành Vinh</span></a>
        </div>
      </section>
    </main>
  );
}

type ChangePinViewProps = {
  title: string;
  kind: 'student' | 'parent';
  onChange: (nextPin: string, confirmation: string) => void | Promise<void>;
  onLogout: () => void;
  error?: string;
  busy?: boolean;
};

export function ChangePinView({ title, kind, onChange, onLogout, error, busy = false }: ChangePinViewProps) {
  const [nextPin, setNextPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [localError, setLocalError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const submittedNextPin = (form.elements.namedItem('new-pin') as HTMLInputElement | null)?.value ?? nextPin;
    const submittedConfirmation = (form.elements.namedItem('confirm-pin') as HTMLInputElement | null)?.value ?? confirmation;
    const valid = validatePin(submittedNextPin);
    if (!valid.ok) { setLocalError(valid.message); return; }
    if (valid.value === DEFAULT_STUDENT_PIN) { setLocalError('Hãy chọn một mã PIN khác mã mặc định.'); return; }
    if (valid.value !== submittedConfirmation) { setLocalError('Hai lần nhập mã PIN chưa giống nhau.'); return; }
    setLocalError('');
    void onChange(valid.value, submittedConfirmation);
  };
  return (
    <main className="auth-screen" aria-labelledby="change-pin-title">
      <section className="auth-card auth-card-compact">
        <img className="auth-emblem" src="/art/collection/collection-emblem.png" alt="" aria-hidden="true" />
        <p className="eyebrow">MỘT BƯỚC NHỎ TRƯỚC KHI CHƠI</p>
        <h1 id="change-pin-title">{title}</h1>
        <p className="auth-lead">Mã mặc định đã dùng một lần. Chọn mã 6 số riêng của con và nhập lại để xác nhận.</p>
        <form className="auth-form" onSubmit={submit}>
          <PinField id="new-pin" label="Mã PIN mới" value={nextPin} onChange={setNextPin} autoComplete="new-password" autoFocus />
          <PinField id="confirm-pin" label="Nhập lại mã PIN mới" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
          {(error || localError) && <p className="auth-error" role="alert">{error || localError}</p>}
          <button className="primary-small-button auth-submit" type="submit" disabled={busy}>{busy ? 'Đang lưu…' : `Lưu mã PIN ${kind === 'parent' ? 'phụ huynh' : ''} →`}</button>
          <button className="secondary-button auth-cancel" type="button" onClick={onLogout}>Đăng xuất</button>
        </form>
      </section>
    </main>
  );
}

export function ParentPinDialog({ childName, onSubmit, onCancel, error, busy = false }: { childName: string; onSubmit: (pin: string) => void | Promise<void>; onCancel: () => void; error?: string; busy?: boolean }) {
  const [pin, setPin] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const submittedPin = (form.elements.namedItem('parent-pin') as HTMLInputElement | null)?.value ?? pin;
    const valid = validatePin(submittedPin);
    if (valid.ok) void onSubmit(valid.value);
  };
  return (
    <div className="modal-backdrop auth-modal-backdrop" role="presentation">
      <section className="auth-card auth-modal" role="dialog" aria-modal="true" aria-labelledby="parent-pin-title">
        <button type="button" className="auth-close" aria-label="Đóng" onClick={onCancel}>×</button>
        <p className="eyebrow">GÓC PHỤ HUYNH</p>
        <h2 id="parent-pin-title">Mở bảng đồng hành cho {childName}</h2>
        <p className="auth-lead">Nhập mã PIN phụ huynh của {childName}. Mã này khác với mã PIN con dùng để chơi.</p>
        <form className="auth-form" onSubmit={submit}>
          <PinField id="parent-pin" label="Mã PIN phụ huynh" value={pin} onChange={setPin} autoComplete="current-password" autoFocus />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-small-button auth-submit" type="submit" disabled={busy}>{busy ? 'Đang kiểm tra…' : 'Mở Dashboard →'}</button>
          <button className="secondary-button auth-cancel" type="button" onClick={onCancel}>Để sau</button>
        </form>
      </section>
    </div>
  );
}

export function ParentPinChangeDialog({ childName, onSubmit, onCancel, error, busy = false }: { childName: string; onSubmit: (currentPin: string, nextPin: string) => void | Promise<void>; onCancel: () => void; error?: string; busy?: boolean }) {
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [localError, setLocalError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const submittedCurrent = (form.elements.namedItem('current-parent-pin') as HTMLInputElement | null)?.value ?? currentPin;
    const submittedNext = (form.elements.namedItem('new-parent-pin') as HTMLInputElement | null)?.value ?? nextPin;
    const submittedConfirmation = (form.elements.namedItem('confirm-parent-pin') as HTMLInputElement | null)?.value ?? confirmation;
    const validCurrent = validatePin(submittedCurrent);
    const validNext = validatePin(submittedNext);
    if (!validCurrent.ok) { setLocalError('Nhập đúng PIN phụ huynh hiện tại gồm 6 chữ số.'); return; }
    if (!validNext.ok) { setLocalError(validNext.message); return; }
    if (validNext.value === DEFAULT_STUDENT_PIN) { setLocalError('Hãy chọn một mã PIN khác mã mặc định.'); return; }
    if (validNext.value !== submittedConfirmation) { setLocalError('Hai lần nhập mã PIN mới chưa giống nhau.'); return; }
    setLocalError('');
    void onSubmit(validCurrent.value, validNext.value);
  };

  return (
    <div className="modal-backdrop auth-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="auth-card auth-modal" role="dialog" aria-modal="true" aria-labelledby="parent-pin-change-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="auth-close" aria-label="Đóng" onClick={onCancel}>×</button>
        <p className="eyebrow">BẢO VỆ DASHBOARD</p>
        <h2 id="parent-pin-change-title">Đổi PIN phụ huynh</h2>
        <p className="auth-lead">Mã mới chỉ áp dụng cho Góc phụ huynh của {childName}; PIN con dùng để chơi không thay đổi.</p>
        <form className="auth-form" onSubmit={submit}>
          <PinField id="current-parent-pin" label="PIN phụ huynh hiện tại" value={currentPin} onChange={setCurrentPin} autoComplete="current-password" autoFocus />
          <PinField id="new-parent-pin" label="PIN phụ huynh mới" value={nextPin} onChange={setNextPin} autoComplete="new-password" />
          <PinField id="confirm-parent-pin" label="Nhập lại PIN mới" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
          {(error || localError) && <p className="auth-error" role="alert">{error || localError}</p>}
          <button className="primary-small-button auth-submit" type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu PIN phụ huynh →'}</button>
          <button className="secondary-button auth-cancel" type="button" onClick={onCancel}>Để sau</button>
        </form>
      </section>
    </div>
  );
}
