import { HomeFooter } from "@/features/home/footer";
import { Hero } from "@/features/home/hero";
import { Path } from "@/features/home/path";
import { Practices } from "@/features/home/practices";
import { HomeStack } from "@/features/home/stack";
import { Workspace } from "@/features/home/workspace";

export default function Home() {
  return (
    <HomeStack>
      <Hero />
      <Path />
      <Practices />
      <Workspace />
      <HomeFooter />
    </HomeStack>
  );
}
