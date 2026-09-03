import { AppChrome } from "@/components/marginals/app-chrome";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppChrome variant="home">{children}</AppChrome>;
}
