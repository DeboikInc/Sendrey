'use client'

import Image from "next/image";
import { TabsComponent } from "@/components/tabs";
import { IoFlash, IoShieldCheckmark, IoLocationSharp } from "react-icons/io5";
import { FooterCommit } from "@/components/footerCommit";
import { motion } from 'framer-motion'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
}

export const WhySendrey = () => {
  const tabs = [
    {
      name: "first",
      label: "Story",
      content: (
        <article
          key="story-content"
          className="space-y-3 h-1/3 overflow-y-auto"
        >
          <strong>Why Sendrey?</strong>
          <p>
            Anyone who has tried to get an errand done in traffic knows
            the problem: your time is worth more than the queue at the bank,
            the <strong className="text-secondary">market errands</strong>, or the trip across town to <strong className="text-secondary"> pick up</strong> a package.
            Sendrey was built to close that gap.
          </p>
          <p>
            Instead of routing every job through a call center or a single
            delivery fleet, Sendrey connects you directly to runners nearby
            who are ready to move on foot, by bike, or by car matched to
            what you actually need done.
          </p>
          <p>
            What started as a way to move packages faster has grown into a
            platform that also gives runners a flexible way to earn, on
            their own schedule, in their own city.
          </p>
        </article>
      ),
    },
    {
      name: "second",
      label: "Vision",
      content: (
        <article key="vision-content">
          We see a future where getting something done across your city
          takes minutes, not hours and where that speed is powered by
          people in your own community, not a warehouse across town.
        </article>
      ),
    },
    {
      name: "third",
      label: "Mission",
      content: (
        <article key="mission-content">
          Our mission is to make <strong className="text-secondary"> errands</strong> and deliveries fast, affordable,
          and trustworthy by putting a verified runner within reach of
          every request while giving runners a fair, transparent way to
          earn from the work they already do best: getting around their
          city.
        </article>
      ),
    },
  ];

  return (
    <section className="bg-gray-200">
      <motion.div {...fadeUp} >
        <section className="max-w-screen-2xl mx-auto px-3 md:px-14 lg:px-20 py-28 space-y-5">
          <section className="grid grid-cols-9 lg:gap-20 md:gap-10 mx-auto">

            <aside className="lg:col-span-4 col-span-12 relative xl:block lg:hidden">
              <div className="bg-primary/90 rounded-lg absolute lg:w-40 lg:h-40 w-24 h-24 -top-8 sm:-left-2 lg:-left-8 -left-8 text-gray-200 font-['Jost',sans-serif] lg:text-2xl text-lg items-center flex justify-center p-3 text-center z-10 sm:ml-0 ml-8">
                <h6>Runner Verified</h6>
              </div>

              <div className="relative overflow-hidden">
                <Image
                  src="/runner-in-motion.png"
                  alt="Sendrey runner on the move"
                  width={700}
                  height={100}
                  className="rounded-lg w-full h-full object-cover"
                />
              </div>
            </aside>
            <aside className="xl:col-span-5 col-span-12 text-gray-800 items-center flex">
              <article className="space-y-3 sm:py-0 py-8">
                <h6 className="text-primary font-semibold uppercase tracking-wide text-sm">
                  Why Choose Sendrey?
                </h6>
                <h1 className="flex md:w-3/4 items-start lg:text-[50.9px] capitalize text-3xl font-extrabold lg:leading-[58.665px] leading-[40.665px] text-secondary">
                  Errands Handled By People In Your City
                </h1>
                <section className="py-4 text-gray-800">
                  <p>
                    Whether it&apos;s a package that needs to move across
                    town, groceries that need picking up, or a document that
                    has to land on someone&apos;s desk by noon, Sendrey puts a
                    nearby runner on it.
                  </p>

                  <p>
                    Every runner on Sendrey is verified before they take their
                    first job, and every order is tracked in real time from
                     <strong className="text-secondary"> pickup</strong> to drop-off{" "}
                    <strong className="text-secondary">
                      so you always know where your errand stands
                    </strong>
                    .
                  </p>
                </section>

                <TabsComponent tabs={tabs} />
              </article>
            </aside>
          </section>

          <FooterCommit
            IoHeadset={IoFlash}
            IoPeopleSharp={IoShieldCheckmark}
            IoPerson={IoLocationSharp}
            firstTitle="Fast Matching"
            firstText="Get paired with a nearby runner in minutes, not hours."
            secondTitle="Verified Runners"
            secondText="Every runner is identity-checked before their first job."
            thirdTitle="Real-Time Tracking"
            thirdText="Follow your errand from pickup to drop-off, live."
          />
        </section>
      </motion.div>
    </section>
  );
};