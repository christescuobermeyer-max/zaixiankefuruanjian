import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props} />;
}

export function ChatIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 9 9 0 0 1-4-1L3 20l1.5-4.5a8.5 8.5 0 0 1 16.5-4z" />
    </IconBase>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M9 3V2h6v1M9 9h6M9 13h6M9 17h3" />
    </IconBase>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 6 9 17l-5-5" />
    </IconBase>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 20V11M10 20V4M16 20v-6M22 20H2" />
    </IconBase>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </IconBase>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 3h6l-1 8 3.5 3.5V16H6.5v-1.5L10 11 9 3z" />
      <path d="M12 16v5" />
    </IconBase>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M17.9 17.9A10 10 0 0 1 12 19.5C5.5 19.5 1.5 12 1.5 12a18.4 18.4 0 0 1 5-5.9M9.9 4.7A9.1 9.1 0 0 1 12 4.5c6.5 0 10.5 7.5 10.5 7.5a18.6 18.6 0 0 1-2.2 3.2" />
      <path d="m1.5 1.5 21 21" />
    </IconBase>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.4" />
      <rect x="13" y="3" width="8" height="8" rx="1.4" />
      <rect x="3" y="13" width="8" height="8" rx="1.4" />
      <rect x="13" y="13" width="8" height="8" rx="1.4" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4-4" />
    </IconBase>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </IconBase>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 9l1-4h16l1 4M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M9 13h6" />
    </IconBase>
  );
}

export function WifiIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19h.01" />
    </IconBase>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5zM15.5 9a3.5 3.5 0 0 1 0 6" />
    </IconBase>
  );
}
