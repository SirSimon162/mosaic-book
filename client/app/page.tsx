import { Close } from "@/components/home/close";
import { Footer } from "@/components/home/footer";
import { Hero } from "@/components/home/hero";
import { Navbar } from "@/components/home/navbar";
import { Path } from "@/components/home/path";
import { Practices } from "@/components/home/practices";
import { Workspace } from "@/components/home/workspace";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Path />
        <Practices />
        <Workspace />
        <Close />
      </main>
      <Footer />
    </>
  );
}
