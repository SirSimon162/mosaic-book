import { AppChrome } from "@/components/marginals/app-chrome";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppChrome variant="full">{children}</AppChrome>;
}
