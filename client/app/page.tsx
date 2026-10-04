import { HomeFooter } from "@/components/home/footer";
import { Hero } from "@/components/home/hero";
import { Path } from "@/components/home/path";
import { Practices } from "@/components/home/practices";
import { HomeStack } from "@/components/home/stack";
import { Workspace } from "@/components/home/workspace";

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
