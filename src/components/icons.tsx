import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="m14.9 9.1-1.8 4-4 1.8 1.8-4 4-1.8Z" />
      <path d="M12 3.8v1.3M12 18.9v1.3M3.8 12h1.3M18.9 12h1.3" />
    </IconBase>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.3 5.5c2.5-.9 5-.6 7.7 1v12.1c-2.7-1.6-5.2-1.9-7.7-1V5.5Z" />
      <path d="M19.7 5.5c-2.5-.9-5-.6-7.7 1v12.1c2.7-1.6 5.2-1.9 7.7-1V5.5Z" />
      <path d="M12 6.5v12.1" />
    </IconBase>
  );
}

export function StampIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8.1 4.7a3.9 3.9 0 0 1 7.8 0c0 1.5-.7 2.3-1.4 3.2-.6.7-1.1 1.3-1.1 2.4h-2.8c0-1.1-.5-1.7-1.1-2.4-.7-.9-1.4-1.7-1.4-3.2Z" />
      <path d="M6.1 10.3h11.8M5 14.4h14l-1.6 5H6.6l-1.6-5Z" />
      <path d="M8.7 16.9h6.6" />
    </IconBase>
  );
}

export function PetIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8.1 10.2 5.4 5.1l4.5 2.1a5.1 5.1 0 0 1 4.2 0l4.5-2.1-2.7 5.1a6.5 6.5 0 1 1-7.8 0Z" />
      <circle cx="9.6" cy="12.1" r=".7" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="12.1" r=".7" fill="currentColor" stroke="none" />
      <path d="M10.1 15.1c1.3 1 2.5 1 3.8 0" />
    </IconBase>
  );
}

export function CollectionIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 7.5h15v11h-15z" />
      <path d="M6.8 7.5V5.8h10.4v1.7M8.2 11.1h7.6M8.2 14.5h4.5" />
    </IconBase>
  );
}

export function ParentIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3" />
      <path d="M5.7 19.1c.8-3.1 2.9-4.7 6.3-4.7s5.5 1.6 6.3 4.7" />
      <path d="M4.2 12.6H2.8M21.2 12.6h-1.4" />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="m19.1 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3.1 1.3v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3.1-1.3l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1A1.8 1.8 0 0 0 4 11.9h-.2a1.8 1.8 0 0 1 0-3.6H4a1.8 1.8 0 0 0 1.3-3.1l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1A1.8 1.8 0 0 0 10.9 1.4v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3.1 1.3l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1A1.8 1.8 0 0 0 21.4 8h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-2.3 3.4Z" transform="scale(.72) translate(4.7 4.7)" />
    </IconBase>
  );
}

export function SoundIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 10v4h3l4 3.3V6.7L7.5 10h-3Z" />
      <path d="M15 9.1a4.4 4.4 0 0 1 0 5.8M17.6 6.8a7.5 7.5 0 0 1 0 10.4" />
    </IconBase>
  );
}

export function SoundOffIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 10v4h3l4 3.3V6.7L7.5 10h-3Z" />
      <path d="m16 10 4 4M20 10l-4 4" />
    </IconBase>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h13M13 6l6 6-6 6" />
    </IconBase>
  );
}

export function ChevronIcon({ direction = 'down', ...props }: IconProps & { direction?: 'up' | 'down' | 'left' | 'right' }) {
  const paths = {
    up: 'm6 14 6-6 6 6',
    down: 'm6 10 6 6 6-6',
    left: 'm14 6-6 6 6 6',
    right: 'm10 6 6 6-6 6',
  };
  return (
    <IconBase {...props}>
      <path d={paths[direction]} />
    </IconBase>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3 1.2 5.8L19 10l-5.8 1.2L12 17l-1.2-5.8L5 10l5.8-1.2L12 3Z" />
      <path d="m19.1 15.8.5 2.2 2.2.5-2.2.5-.5 2.2-.5-2.2-2.2-.5 2.2-.5.5-2.2Z" />
    </IconBase>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5.5" y="10" width="13" height="10" rx="2" />
      <path d="M8.5 10V7.7a3.5 3.5 0 0 1 7 0V10M12 14v2" />
    </IconBase>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M19 10.3c0 4.8-7 10-7 10s-7-5.2-7-10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10.2" r="2.2" />
    </IconBase>
  );
}

export function MountainIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m3.5 18 5.2-8 3.2 4.1 2.4-3.2 6.2 7.1" />
      <path d="m12.1 14.1 2.2 2.5M7 18h14" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5.5 12.5 4.1 4.1 8.9-9" />
    </IconBase>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 10.8v5M12 7.8h.01" />
    </IconBase>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m9 6.5 8 5.5-8 5.5v-11Z" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4v10M8.5 10.5 12 14l3.5-3.5M5 18.5h14" />
    </IconBase>
  );
}

export function PawIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <ellipse cx="12" cy="15.5" rx="3.6" ry="3" />
      <circle cx="7.1" cy="10.5" r="1.8" />
      <circle cx="10.1" cy="7.3" r="1.7" />
      <circle cx="13.9" cy="7.3" r="1.7" />
      <circle cx="16.9" cy="10.5" r="1.8" />
    </IconBase>
  );
}
