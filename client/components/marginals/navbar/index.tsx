"use client";

import { usePathname } from "next/navigation";
import { HomeNavbar } from "./home";
import { SimpleNavbar } from "./simple";

export function Navbar() {
  const pathname = usePathname();
  return pathname === "/" ? <HomeNavbar /> : <SimpleNavbar />;
}
