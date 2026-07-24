import { Navbar } from '@/components/navbar';
import { Hero } from '@/components/hero';
import { WhySendrey } from '@/components/whySendrey';
import { Footer } from '@/components/footer'
import { HowItWorks } from '@/components/howItWorks';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-secondary font-sans dark:bg-black">

      <Navbar />

      <Hero />

      <WhySendrey />

      <HowItWorks />

      <Footer />
    </div>
  );
}
