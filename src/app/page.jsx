'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiMail, FiInstagram, FiFacebook } from 'react-icons/fi'
import { FaApple, FaGooglePlay } from 'react-icons/fa'
import { motion } from 'framer-motion'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'

const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-display' })
const body = Inter({ subsets: ['latin'], variable: '--font-body' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-mono' })

const StartShot = '/Start-portrait.png'
const RunnerHomeShot = '/Mockup1.png'
const HomeShot = '/Mockup2.png'
const Logo = '/logo.png'
const deboikLogo = '/deboik-20.png'
const senditLogo = '/sendit.png'

const LAUNCH_DATE = '2026-08-08T10:00:00Z'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
}

export default function HomePage() {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(null)
  const [mounted, setMounted] = useState(false)

  // Fix: ensure component is mounted before rendering dynamic content
  // This prevents hydration mismatch that causes blank page on back-navigation
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    setTimeLeft(getTimeLeft(LAUNCH_DATE))
    const t = setInterval(() => setTimeLeft(getTimeLeft(LAUNCH_DATE)), 1000)
    return () => clearInterval(t)
  }, [mounted])

  // Track page visit
  useEffect(() => {
    if (!mounted) return
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'page_view', page: 'landing' }),
    }).catch(() => {}) // silent fail — analytics should never break the page
  }, [mounted])

  const goToWaitlist = () => router.push('/join-the-list')

  return (
    <div
      className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-gradient-to-b from-primary to-black text-white`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* HEADER */}
      <header className="max-w-6xl mx-auto px-6 pt-8 flex items-center justify-between">
        <img src={Logo} alt="Sendrey" className="w-28 sm:w-32 object-contain" />
        <div className="flex items-center gap-4">
          <button
            onClick={goToWaitlist}
            className="hidden sm:inline-block text-sm font-semibold bg-secondary text-primary px-4 py-2 rounded-full hover:opacity-90 transition"
          >
            Join Waitlist
          </button>
          <a
            href="#get-the-app"
            className="hidden sm:inline text-sm text-white/70 hover:text-white transition"
          >
            Get the app →
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
        <motion.div {...fadeUp} className="max-w-2xl">
          <h1
            className="text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Market runs, Pick-ups, and deliveries —{' '}
            <span className="text-secondary">handled</span>.
          </h1>
          <p className="mt-5 text-white/75 text-base sm:text-lg max-w-lg">
            Sendrey connects you to vetted local runners who queue, shop, and deliver
            across town — so you don't have to leave your desk.
          </p>

          {/* Countdown — only render after mount to avoid hydration mismatch */}
          <div className="mt-10">
            <div className="text-xs uppercase tracking-widest text-white/50 mb-3">
              Launching in
            </div>
            <div className="flex gap-3">
              {['days', 'hours', 'mins', 'secs'].map((k, i) => (
                <div key={k} className="bg-white/6 px-4 py-3 rounded-xl min-w-[68px] text-center">
                  <div
                    className="text-2xl font-semibold"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {mounted && timeLeft ? formatTimeValue(timeLeft, i) : '00'}
                  </div>
                  <div className="text-[10px] text-white/60 uppercase mt-1">{k}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={goToWaitlist}
            className="mt-8 px-8 py-3 rounded-full font-semibold text-primary bg-secondary hover:opacity-90 transition"
          >
            Join the Waitlist
          </button>
        </motion.div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-white/10">
        <motion.div {...fadeUp}>
          <div className="text-xs uppercase tracking-widest text-secondary mb-3">
            How it works
          </div>
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight max-w-md"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Three steps, start to doorstep.
          </h2>
        </motion.div>

        <div className="mt-10 grid sm:grid-cols-3 gap-8">
          {[
            { n: '01', title: 'Tell us the errand', body: "Drop a market list, a parcel, or a quick pickup — anything that needs doing across town." },
            { n: '02', title: 'A runner is matched', body: 'A vetted local runner near you accepts the job and heads out within minutes.' },
            { n: '03', title: 'Track it, live', body: 'Watch the run in real time, chat with your runner, and pay only when it lands at your door.' },
          ].map((step, i) => (
            <motion.div
              key={step.n}
              {...fadeUp}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div
                className="text-3xl font-bold text-secondary"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {step.n}
              </div>
              <h3 className="mt-3 font-semibold text-lg">{step.title}</h3>
              <p className="mt-2 text-sm text-white/70">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PEEK INSIDE */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-white/10">
        <motion.div {...fadeUp}>
          <div className="text-xs uppercase tracking-widest text-secondary mb-3">
            A peek inside
          </div>
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight max-w-md"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Built to feel like checking up on a friend, not a delivery app.
          </h2>
        </motion.div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-10 sm:gap-16">
          <motion.img
            src={HomeShot}
            alt="Sendrey home screen"
            initial={{ opacity: 0, y: 24, rotate: -3 }}
            whileInView={{ opacity: 1, y: 0, rotate: -3 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0 }}
            whileHover={{ y: -8, rotate: 0 }}
            className="w-[200px] sm:w-[240px] rounded-3xl shadow-2xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="relative w-64 rounded-2xl p-5 text-primary bg-white"
            style={{ boxShadow: '0 20px 40px -15px rgba(0,0,0,0.45)' }}
          >
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary" />
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
              <span className="text-primary/60">Sendrey Tracking</span>
              <span className="text-secondary font-semibold">En route to delivery</span>
            </div>
            <div className="mt-3 text-lg tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>
              #ORD-22914
            </div>
            <div className="mt-1 text-xs text-primary/60">Garki Market → Lekki Phase 1</div>
            <div className="mt-4 border-t border-dashed border-primary/20" />
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-primary/60">Runner</span>
              <span className="font-semibold">Adaeze O.</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-primary/60">ETA</span>
              <span className="font-semibold text-secondary">12 mins</span>
            </div>
          </motion.div>

          <motion.img
            src={RunnerHomeShot}
            alt="Sendrey live tracking screen"
            initial={{ opacity: 0, y: 24, rotate: 3 }}
            whileInView={{ opacity: 1, y: 0, rotate: 3 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            whileHover={{ y: -8, rotate: 0 }}
            className="w-[200px] sm:w-[240px] rounded-3xl shadow-2xl"
          />
        </div>
      </section>

      {/* GET THE APP */}
      <section id="get-the-app" className="max-w-6xl mx-auto px-6 py-20 border-t border-white/10">
        <motion.div {...fadeUp} className="text-center max-w-xl mx-auto">
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Get Sendrey on your phone.
          </h2>
          <p className="mt-3 text-white/70 text-sm">
            Available on iOS and Android the moment we launch.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <StoreButton
              icon={<FaApple />}
              kicker="Download on the"
              title="App Store"
              href={process.env.NEXT_PUBLIC_APP_STORE_URL || '#'}
            />
            <StoreButton
              icon={<FaGooglePlay />}
              kicker="Get it on"
              title="Google Play"
              href={process.env.NEXT_PUBLIC_PLAY_STORE_URL || '#'}
            />
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 sm:grid-cols-3">
          <div>
            <img src={Logo} alt="Sendrey" className="w-28 object-contain" />
            <p className="mt-3 text-xs text-white/60 max-w-xs">
              Trusted local runners, delivering anything from any market to your doorstep.
            </p>
          </div>
          <div className="text-sm">
            <div className="text-white/50 text-xs uppercase tracking-wide mb-2">Contact</div>
            <a
              href="mailto:support@sendrey.com"
              className="flex items-center gap-2 text-white/80 hover:text-white transition"
            >
              <FiMail /> support@sendrey.com
            </a>
            <div className="mt-4 flex items-center gap-3">
              <a href="https://www.instagram.com/_sendrey?igsh=MWZwdnpqZG91c3JkdQ==" target="_blank" rel="noreferrer" className="bg-white/5 p-2 rounded-md hover:bg-white/10">
                <FiInstagram />
              </a>
              <a href="https://web.facebook.com/profile.php?id=61581630117870" target="_blank" rel="noreferrer" className="bg-white/5 p-2 rounded-md hover:bg-white/10">
                <FiFacebook />
              </a>
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-white/50 text-xs uppercase tracking-wide mb-2">Partners</div>
            <div className="flex sm:justify-end gap-4">
              <a href="https://deboik.com" target="_blank" rel="noreferrer">
                <img src={deboikLogo} alt="Deboik" className="w-16 h-8 object-contain opacity-80" />
              </a>
              <img src={senditLogo} alt="Sendit" className="w-16 h-8 object-contain opacity-80" />
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Sendrey. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

function StoreButton({ icon, kicker, title, href }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl px-5 py-3 transition hover:scale-[1.03] bg-black"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <span className="text-2xl text-secondary">{icon}</span>
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[10px] uppercase tracking-wide text-white/60">{kicker}</span>
        <span className="text-sm font-semibold text-white">{title}</span>
      </span>
    </a>
  )
}

function getTimeLeft(isoDate) {
  const t = Math.max(new Date(isoDate).getTime() - Date.now(), 0)
  const secs = Math.floor(t / 1000)
  return {
    days: Math.floor(secs / 86400),
    hours: Math.floor((secs % 86400) / 3600),
    mins: Math.floor((secs % 3600) / 60),
    seconds: secs % 60,
  }
}

function formatTimeValue(obj, index) {
  if (!obj) return '00'
  const keys = ['days', 'hours', 'mins', 'seconds']
  return String(obj[keys[index]]).padStart(2, '0')
}