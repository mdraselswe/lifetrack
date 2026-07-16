import type { SVGProps } from 'react'

// Lightweight lucide-style icons — 24x24, stroke = currentColor.
type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
)

export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>
)

export const ArrowUpRightIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
)

export const ArrowDownLeftIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M17 7 7 17" /><path d="M16 17H7V8" /></svg>
)

export const ArrowLeftIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
)

export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
)

export const SunIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></svg>
)

export const MoonIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>
)

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
)

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
)

export const LogoutIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h9" /></svg>
)

export const DownloadIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
)

export const WalletIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v2" /><path d="M3 7.5V18a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H5.5A2.5 2.5 0 0 1 3 7.5Z" /><circle cx="16" cy="13.5" r="1.2" /></svg>
)

export const ScaleIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3v18" /><path d="M6 7h12" /><path d="M6 7l-3 6a3 3 0 0 0 6 0Z" /><path d="M18 7l-3 6a3 3 0 0 0 6 0Z" /><path d="M8 21h8" /></svg>
)

export const EditIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 20h4L18.5 9.5a2 2 0 0 0-3-3L5 17v3Z" /><path d="M13.5 6.5l3 3" /></svg>
)

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 7l1 13h10l1-13" /></svg>
)

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 12.5 10 17 19 7" /></svg>
)

export const CheckCircleIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
)

export const AlertCircleIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16.5v.5" /></svg>
)

export const AlertTriangleIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 16.5v.5" /></svg>
)

export const InfoIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.5v.5" /></svg>
)

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>
)

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)

export const SortIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M7 4v16" /><path d="M4 8l3-4 3 4" /><path d="M17 20V4" /><path d="M14 16l3 4 3-4" /></svg>
)

export const ShareIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-4.6" /><path d="m8.2 13.2 7.6 4.6" /></svg>
)

export const KeyIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="8" cy="8" r="4" /><path d="m11 11 8 8" /><path d="m16 16 2-2" /><path d="m19 19 2-2" /></svg>
)

export const WifiOffIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 3l18 18" /><path d="M9 17h.01" /><path d="M6.5 13.5a7 7 0 0 1 4-2.3" /><path d="M3.5 10a12 12 0 0 1 4-2.6" /><path d="M20.5 10a12 12 0 0 0-6-3.3" /></svg>
)

export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 4v16h16" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></svg>
)

export const MicIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
)

export const MessageIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
)

export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
)

export const WhatsAppIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
)

export const FileTextIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="M8 9h2" /></svg>
)

export const SettingsIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
)

export const RotateIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 4v6h6" /><path d="M4 10a8 8 0 1 1-1.5 4.7" /></svg>
)

export const PlusCircleIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
)

export const HistoryIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 5v5h5" /><path d="M3.5 10a8 8 0 1 1 .5 4" /><path d="M12 8v4l3 2" /></svg>
)

export const GoogleIcon = (p: IconProps) => (
  <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
)
