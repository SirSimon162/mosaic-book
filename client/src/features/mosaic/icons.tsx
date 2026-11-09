import {
  BookmarkIcon,
  BulbOnIcon,
  ChatIcon,
  CheckTickCircleIcon,
  CheckTickSquareIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  CopyIcon,
  CreditCardIcon,
  MultipleCrossCancelIcon,
  DeleteDustbin01Icon,
  EnvelopeIcon,
  File02Icon,
  FileIcon,
  HomeIcon,
  LinkSlantIcon,
  LogOutRightIcon,
  MapIcon,
  MoonIcon,
  PencilEditIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  RefreshIcon,
  SearchIcon,
  SidebarMenuIcon,
  SunIcon,
  UploadUpIcon,
  UserPlusIcon,
} from "@pikaicons/core-free";
import { PikaIcon, type IconSvgElement } from "@pikaicons/react";

const icons = {
  bookmark: BookmarkIcon,
  bulb: BulbOnIcon,
  card: CreditCardIcon,
  chat: ChatIcon,
  check: CheckTickCircleIcon,
  clipboard: ClipboardCheckIcon,
  selectAll: CheckTickSquareIcon,
  chevron: ChevronDownIcon,
  chevronLeft: ChevronLeftIcon,
  chevronRight: ChevronRightIcon,
  copy: CopyIcon,
  doc: File02Icon,
  help: QuestionMarkCircleIcon,
  map: MapIcon,
  envelope: EnvelopeIcon,
  file: FileIcon,
  home: HomeIcon,
  link: LinkSlantIcon,
  logout: LogOutRightIcon,
  close: MultipleCrossCancelIcon,
  moon: MoonIcon,
  pencil: PencilEditIcon,
  plus: PlusIcon,
  refresh: RefreshIcon,
  search: SearchIcon,
  sidebar: SidebarMenuIcon,
  sun: SunIcon,
  trash: DeleteDustbin01Icon,
  upload: UploadUpIcon,
  userPlus: UserPlusIcon,
} satisfies Record<string, IconSvgElement>;

export type MosaicIconName = keyof typeof icons;

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: MosaicIconName;
  size?: number;
  className?: string;
}) {
  return (
    <PikaIcon
      icon={icons[name]}
      size={size}
      strokeWidth={1.5}
      aria-hidden
      className={className}
    />
  );
}
