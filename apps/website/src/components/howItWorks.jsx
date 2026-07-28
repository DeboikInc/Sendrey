'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowRight } from 'react-icons/fi'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
}

const AUDIENCES = [
  {
    key: 'users',
    tab: 'For users',
    caption: 'Getting something moved',
    anchor: 'user-journey',
    steps: [
      {
        title: 'Sign up',
        detail: 'Create your account in a couple of minutes.',
      },
      {
        title: 'Pick a service',
        detail: 'Choose Pickup or Run an Errand — whatever you need done.',
      },
      {
        title: 'Place your order',
        detail: 'A nearby runner accepts and gets moving right away.',
      },
    ],
  },
  {
    key: 'runners',
    tab: 'For runners',
    caption: 'Earning on your schedule',
    anchor: 'runner-journey',
    steps: [
      {
        title: 'Sign up',
        detail: 'Create your runner account to get started.',
      },
      {
        title: 'Complete KYC',
        detail: 'Verify your identity so users can trust every handoff.',
      },
      {
        title: 'Go through Our training',
        detail: 'Walk through training covering platform practices, professionalism, and customer care.',
      },
      {
        title: 'Start earning',
        detail: 'Once you\u2019re approved, accept orders and get paid.',
      },
    ],
  },
]

export const HowItWorks = () => {
  const [activeKey, setActiveKey] = useState('users')
  const active = AUDIENCES.find((a) => a.key === activeKey)

  return (
    <section className="bg-gray-1000 py-20 sm:py-28 mt-3">
      <div className="mx-auto max-w-screen-2xl px-6">
        {/* Header */}
        <motion.div {...fadeUp} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            How it works
          </span>
          <h2 className="mt-3 text-3xl font-semibold text-secondary sm:text-4xl">
            From request to runner, in a few steps
          </h2>
          <p className="mt-3 text-base text-gray-800">
            Whether you&rsquo;re sending something or delivering it, Sendrey keeps it simple.
          </p>
        </motion.div>

        {/* Audience toggle */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          className="mt-10 flex justify-center"
        >
          <div className="relative inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-1002">
            {AUDIENCES.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setActiveKey(a.key)}
                className="relative z-10 rounded-full px-5 py-2 text-sm font-medium transition-colors"
                aria-pressed={activeKey === a.key}
              >
                {activeKey === a.key && (
                  <motion.span
                    layoutId="how-it-works-pill"
                    className="absolute inset-0 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span
                  className={`relative ${
                    activeKey === a.key ? 'text-black-100' : 'text-gray-800'
                  }`}
                >
                  {a.tab}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Steps */}
        <div className="relative mt-14">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="grid gap-6 sm:grid-cols-2 lg:[grid-template-columns:repeat(var(--steps),minmax(0,1fr))]"
              style={{ '--steps': active.steps.length }}
            >
              {/* connecting route line, desktop only */}
              <div
                className="pointer-events-none absolute left-0 right-0 top-6 hidden border-t-2 border-dashed border-gray-1002 lg:block"
                aria-hidden="true"
              />

              {active.steps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="relative flex flex-col gap-3 rounded-2xl bg-white p-6 ring-1 ring-gray-1002"
                >
                  <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-gray-1000">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-lg font-semibold text-secondary">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    {step.detail}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* View more */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.15 }}
          className="mt-12 flex justify-center"
        >
          <Link
            href={`/about?ref=${active.key}#${active.anchor}`}
            className="group inline-flex items-center gap-2 text-sm font-semibold text-secondary"
          >
            See the full {active.key === 'users' ? 'user' : 'runner'} breakdown
            <FiArrowRight className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}