'use client'

import { Button } from "@/components/button";
import { motion } from 'framer-motion'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
}

export const Hero = () => {
  return (
    <section className="sm:px-0 px-3 mt-40 mb-16 text-center lg:w-[65rem] md:w-3/4 mx-auto space-y-8">
      <motion.div {...fadeUp}>
        <article className="flex m-auto justify-center items-start lg:text-[60px] sm:text-[50.9px] capitalize text-4xl font-extrabold sm:leading-[78.665px] leading-[45.665px] text-flash-white">
          Anything you need moved, someone nearby can run it.
        </article>
        <article className="my-10 sm:text-[23px] text-lg leading-[28.784px] text-flash-white">
          Sendrey connects you to trusted runners for errands, deliveries, and
          pickups across your city. Post what you need done, and get matched
          in minutes.
        </article>
        <aside className="flex flex-wrap gap-4 justify-center">
          <Button href="/signup" classes="py-3 px-8 capitalize">
            Send an errand
          </Button>
          <Button
            href="/runners"
            variant="outline"
            classes="py-3 px-8 capitalize"
          >
            Become a runner
          </Button>
        </aside>
      </motion.div>
    </section>
  );
};