import { BookOpen, PanelsTopLeft, Route, type LucideIcon } from "lucide-react";

export type NavLink = {
  href: string;
  id: string;
  label: string;
  icon: LucideIcon;
};

export const navLinks: NavLink[] = [
  { href: "/#path", id: "path", label: "Path", icon: Route },
  { href: "/#learn", id: "learn", label: "Learn", icon: BookOpen },
  { href: "/#workspace", id: "workspace", label: "Workspace", icon: PanelsTopLeft },
];

const sectionOrder = navLinks.map((link) => link.id);

export function sectionInView() {
  const step = Math.floor(window.scrollY / window.innerHeight + 0.35);
  return sectionOrder[step - 1] ?? null;
}

export function scrollToSection(id: string) {
  const index = sectionOrder.indexOf(id);
  if (index === -1) return;
  window.scrollTo({ top: (index + 1) * window.innerHeight, behavior: "smooth" });
}
