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
  CreditCardIcon,
  MultipleCrossCancelIcon,
  DeleteDustbin01Icon,
  EnvelopeIcon,
  File02Icon,
  FileIcon,
  FilterVerticalIcon,
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
  ThreeDotsMenuHorizontalIcon,
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
  doc: File02Icon,
  help: QuestionMarkCircleIcon,
  map: MapIcon,
  envelope: EnvelopeIcon,
  file: FileIcon,
  link: LinkSlantIcon,
  logout: LogOutRightIcon,
  close: MultipleCrossCancelIcon,
  moon: MoonIcon,
  more: ThreeDotsMenuHorizontalIcon,
  pencil: PencilEditIcon,
  plus: PlusIcon,
  refresh: RefreshIcon,
  search: SearchIcon,
  sidebar: SidebarMenuIcon,
  sort: FilterVerticalIcon,
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
