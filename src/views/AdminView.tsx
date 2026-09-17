import { FormEvent, useEffect, useState } from 'react';
import type { ClientAccount } from '../auth/apiClient';
import { createStudentAccount, listStudentAccounts, resetStudentPin, updateStudentAccount } from '../auth/apiClient';

function mergeAccount(accounts: ClientAccount[], account: ClientAccount): ClientAccount[] {
  const index = accounts.findIndex((candidate) => candidate.id === account.id);
  if (index < 0) return [...accounts, account];
  const next = accounts.slice();
  next[index] = account;
  return next;
}

export function AdminView({ onLogout }: { onLogout: () => void }) {
  const [students, setStudents] = useState<ClientAccount[]>([]);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const result = await listStudentAccounts();
    if (!result.ok) { setError(result.message); return; }
    setStudents(result.accounts);
  };

  useEffect(() => { void refresh(); }, []);

  const run = async (action: () => Promise<{ ok: true; [key: string]: unknown } | { ok: false; message: string }>, successMessage: string) => {
    setBusy(true);
    setError('');
    setMessage('');
    const result = await action();
    setBusy(false);
    if (!result.ok) { setError(result.message); return false; }
    if ('account' in result && result.account && typeof result.account === 'object') {
      setStudents((current) => mergeAccount(current, result.account as ClientAccount));
    }
    setMessage(successMessage);
    void refresh();
    return true;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await run(() => createStudentAccount(username, displayName), 'Đã tạo tài khoản; PIN mặc định là 123456 và sẽ đổi khi đăng nhập lần đầu.');
    if (ok) { setUsername(''); setDisplayName(''); }
  };

  const saveName = async (student: ClientAccount) => {
    const ok = await run(() => updateStudentAccount(student.id, { displayName: editingName }), `Đã cập nhật tên hiển thị của ${student.username}.`);
    if (ok) { setEditingId(null); setEditingName(''); }
  };

  const resetPin = async (student: ClientAccount, kind: 'student' | 'parent') => {
    const label = kind === 'parent' ? 'PIN phụ huynh' : 'PIN học sinh';
    await run(() => resetStudentPin(student.id, kind), `Đã đặt lại ${label} cho ${student.displayName}; mã mới là 123456.`);
  };

  const toggleActive = async (student: ClientAccount) => {
    const action = student.active ? 'tạm khóa' : 'mở lại';
    await run(() => updateStudentAccount(student.id, { active: !student.active }), `Đã ${action} ${student.displayName}.`);
  };

  const filteredStudents = students.filter((student) => `${student.displayName} ${student.username}`.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')));

  return (
    <main className="auth-screen admin-screen" aria-labelledby="admin-title">
      <section className="admin-card">
        <div className="admin-heading"><div><p className="eyebrow">KHU VỰC QUẢN TRỊ</p><h1 id="admin-title">Danh sách nhà thám hiểm</h1><p>Tạo và quản lý từng tài khoản học sinh. PIN hiện tại không bao giờ hiển thị.</p></div><button className="secondary-button" type="button" onClick={onLogout}>Đăng xuất</button></div>
        <form className="admin-create-form" onSubmit={(event) => void submit(event)}>
          <label className="auth-field" htmlFor="student-username"><span>Tên tài khoản</span><input id="student-username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ví dụ: bao04" autoComplete="off" /></label>
          <label className="auth-field" htmlFor="student-display-name"><span>Tên hiển thị</span><input id="student-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="ví dụ: Bé Bảo" /></label>
          <button className="primary-small-button" type="submit" disabled={busy}>Tạo tài khoản →</button>
        </form>
        <div className="admin-list-tools"><label className="auth-field" htmlFor="student-search"><span>Tìm học sinh</span><input id="student-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên hoặc tài khoản" /></label></div>
        {(error || message) && <p className={error ? 'auth-error' : 'admin-success'} role={error ? 'alert' : 'status'}>{error || message}</p>}
        <div className="admin-overview-strip" aria-label="Tổng quan tài khoản học sinh">
          <div><small>Tổng tài khoản</small><strong>{students.length}</strong></div>
          <div><small>Đang hoạt động</small><strong>{students.filter((student) => student.active).length}</strong></div>
          <div><small>Đang khóa</small><strong>{students.filter((student) => !student.active).length}</strong></div>
        </div>
        <div className="admin-student-list"><div className="admin-list-heading"><h2>{filteredStudents.length}/{students.length} tài khoản học sinh</h2><span>PIN mới: 123456</span></div>{filteredStudents.length === 0 ? <p className="attempt-empty">{students.length ? 'Không có tài khoản khớp tìm kiếm.' : 'Chưa có tài khoản. Tạo tài khoản đầu tiên ở phía trên.'}</p> : filteredStudents.map((student) => <div className={`admin-student-row${student.active ? '' : ' is-inactive'}`} key={student.id}>
          <div className="admin-student-main">{editingId === student.id ? <label className="visually-hidden" htmlFor={`edit-${student.id}`}>Tên hiển thị mới</label> : null}{editingId === student.id ? <input id={`edit-${student.id}`} value={editingName} onChange={(event) => setEditingName(event.target.value)} autoFocus /> : <><strong>{student.displayName}</strong><small>@{student.username}</small></>}<span className={`admin-account-status ${student.active ? 'is-active' : 'is-inactive'}`}>{student.active ? 'Đang hoạt động' : 'Đang khóa'}</span></div>
          <div className="admin-row-actions">{editingId === student.id ? <><button className="text-button" type="button" disabled={busy} onClick={() => void saveName(student)}>Lưu tên</button><button className="text-button" type="button" onClick={() => setEditingId(null)}>Hủy</button></> : <><button className="text-button" type="button" disabled={busy} onClick={() => { setEditingId(student.id); setEditingName(student.displayName); }}>Sửa tên</button><button className="text-button" type="button" disabled={busy} onClick={() => void resetPin(student, 'student')}>Đặt lại PIN con</button><button className="text-button" type="button" disabled={busy} onClick={() => void resetPin(student, 'parent')}>Đặt lại PIN phụ huynh</button><button className="text-button" type="button" disabled={busy} onClick={() => void toggleActive(student)}>{student.active ? 'Tạm khóa' : 'Mở lại'}</button></>}</div>
        </div>)}</div>
      </section>
    </main>
  );
}
