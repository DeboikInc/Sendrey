'use client'

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { motion } from 'framer-motion'
import { UserJourney } from "@/components/userJourney"; 
import { RunnerJourney } from "@/components/runnerJourney"; 

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
}



export default function AboutPage() {
  return (
    <main className="bg-gray-1000 min-h-screen">
      <Navbar />


      <motion.div {...fadeUp}>
        <header className="w-full bg-secondary py-16 sm:py-24 px-4 text-center">
          <div className="max-w-screen-md mx-auto space-y-3">
            <h6 className="text-flash-white/80 font-semibold uppercase tracking-wide text-sm">
              About Sendrey
            </h6>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-flash-white">
              Built for the time you don&apos;t have.
            </h1>
          </div>
        </header>
      </motion.div>

      {/* How it works */}
      <UserJourney />
      <RunnerJourney />
      <Footer />
    </main>
  );
}