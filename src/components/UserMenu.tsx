import { useEffect, useId, useRef, useState } from 'react';
import type { AvatarId } from '../../shared/account-contracts';
import { DEFAULT_AVATAR_ID, getAvatarDefinition } from '../profile/avatarCatalog';
import { ChevronIcon } from './icons';

export type UserMenuProps = {
  displayName: string;
  avatarId: AvatarId;
  onOpenProfile: () => void;
  onOpenParent: () => void;
  onLogout: () => void;
};

export function UserMenu({ displayName, avatarId, onOpenProfile, onOpenParent, onLogout }: UserMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const avatar = getAvatarDefinition(avatarId) ?? getAvatarDefinition(DEFAULT_AVATAR_ID);

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const selectItem = (action: () => void) => {
    setOpen(false);
    action();
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const handleOutsidePointer = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node) || !rootRef.current?.contains(target)) {
        event.preventDefault();
        closeMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeMenu();
    };
    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  return (
    <div ref={rootRef} className="user-menu">
      <button
        ref={triggerRef}
        className="user-menu-trigger"
        type="button"
        aria-label="Mở menu tài khoản"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          setOpen((current) => !current);
        }}
      >
        <span className={`user-menu-avatar ${avatar?.variantClass ?? ''}`} aria-hidden="true">
          <img src={avatar?.assetUrl} alt="" />
        </span>
        <span className="user-menu-display-name">{displayName}</span>
        <span className="user-menu-chevron" data-user-menu-chevron data-state={open ? 'open' : 'closed'} aria-hidden="true"><ChevronIcon direction={open ? 'up' : 'down'} size={17} strokeWidth={2.4} /></span>
      </button>

      {open && (
        <div ref={menuRef} id={menuId} className="user-menu-panel" role="menu" aria-label="Menu tài khoản">
          <button className="user-menu-item" type="button" role="menuitem" onClick={() => selectItem(onOpenProfile)}>
            <span className="user-menu-item-icon" aria-hidden="true"><img src="/art/hud/profile.png" alt="" /></span>
            <span>Hồ sơ</span>
          </button>
          <button className="user-menu-item" type="button" role="menuitem" onClick={() => selectItem(onOpenParent)}>
            <span className="user-menu-item-icon" aria-hidden="true"><img src="/art/hud/parent.png" alt="" /></span>
            <span>Phụ huynh</span>
          </button>
          <button className="user-menu-item" type="button" role="menuitem" onClick={() => selectItem(onLogout)}>
            <span className="user-menu-item-icon" aria-hidden="true"><img src="/art/hud/logout.png" alt="" /></span>
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </div>
  );
}
