'use client'

import React, { useEffect, useState, useRef } from 'react'
import { FiMail, FiInstagram, FiFacebook } from 'react-icons/fi'
import { motion } from 'framer-motion'

const Start = '/Start-portrait.png'
const Home = '/Home-portrait.png'
const Tracking = '/Tracking-portrait.png'
const Logo = '/logo.png'
const deboikLogo = '/deboik-20.png'
const senditLogo = '/sendit.png'

const COLORS = { accent: '#F47C20', deep: '#152C3D' }
const LAUNCH_DATE = '2026-12-01T10:00:00Z'

export default function ComingSoon() {
  const [timeLeft, setTimeLeft] = useState(null)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const errorTimerRef = useRef(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setTimeLeft(getTimeLeft(LAUNCH_DATE))
    const t = setInterval(() => setTimeLeft(getTimeLeft(LAUNCH_DATE)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    return () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current) }
  }, [])

  const showError = (msg) => {
    setError(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setError(''), 4000)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showError('Enter a valid email address — e.g. johndoe@gmail.com')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/wait-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email }), 
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSubmitted(true)
      setEmail('')
      setTimeout(() => setSubmitted(false), 5000)
    } catch (err) {
      showError(err.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#152C3D] via-[#102626] to-[#07151a] text-white"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto' }}
    >
      <div className="w-full max-w-6xl bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">

          {/* LEFT */}
          <div className="lg:col-span-6 p-8 lg:p-12">
            <header className="flex items-center justify-between">
              <img src={Logo} alt="logo" className="w-32 sm:w-36 object-contain" />
            </header>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-8"
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
                Sendrey — Smart errand & delivery
              </h1>
              <p className="mt-4 text-sm text-white/80 max-w-prose">
                Skip the traffic, avoid the stress. We're building a faster way to get errands done —
                trusted local runners delivering from any market to your doorstep. Launching soon.
              </p>

              {/* Countdown */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <div className="grid grid-cols-4 gap-3 w-full sm:w-auto">
                  {['days', 'hours', 'mins', 'secs'].map((k, i) => (
                    <div key={k} className="bg-white/6 px-4 py-3 rounded-xl min-w-[64px] text-center">
                      <div className="text-xl font-semibold">
                        {timeLeft ? formatTimeValue(timeLeft, i) : '00'}
                      </div>
                      <div className="text-xs text-white/70 uppercase mt-1">{k}</div>
                    </div>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="ml-0 sm:ml-4 px-6 py-3 rounded-full font-semibold"
                  onClick={() => window.location.href = '/join-the-list'}
                  style={{
                    background: `linear-gradient(90deg, ${COLORS.accent} 0%, #ffd08a 100%)`,
                    color: '#07150f',
                  }}
                >
                  Join Waitlist
                </motion.button>
              </div>

              {/* Email signup */}
              <form onSubmit={handleSubmit} className="mt-6 w-full max-w-lg">
                <div className="flex sm:flex-row flex-col sm:gap-2 items-center sm:bg-white/5 rounded-full p-1">
                  <div className="flex flex-1 items-center sm:bg-transparent bg-white/5 rounded-full sm:mb-0 mb-2">
                    <div className="pl-3 pr-1 text-white/75">
                      <FiMail />
                    </div>
                    <input
                      type="email"
                      className="flex-1 bg-transparent outline-none px-3 py-3 rounded-full text-sm text-white placeholder:text-white/60 disabled:opacity-50"
                      placeholder="Your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-label="Email address"
                      disabled={loading || submitted}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || submitted}
                    className="rounded-full text-nowrap px-5 py-2 text-sm font-semibold bg-white/10 hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Saving...
                      </>
                    ) : submitted ? '✓ Done!' : 'Notify Me'}
                  </button>
                </div>

                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center gap-2 text-sm text-emerald-400 font-medium"
                  >
                    You're on the list! We'll reach out when we launch.
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-rose-400 mt-2"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="text-xs text-white/60 mt-2">
                  We'll only send launch updates — unsubscribe anytime.
                </div>
              </form>

              {/* Socials */}
              <div className="mt-6 flex items-center gap-4">
                <a href="https://www.instagram.com/_sendrey?igsh=MWZwdnpqZG91c3JkdQ==" target="_blank" className="bg-white/5 p-2 rounded-md hover:bg-white/10">
                  <FiInstagram />
                </a>
                <a href="https://web.facebook.com/profile.php?id=61581630117870" target="_blank" className="bg-white/5 p-2 rounded-md hover:bg-white/10">
                  <FiFacebook />
                </a>
                <div className="ml-auto text-xs text-white/70">
                  Powered by <strong>Sendrey</strong>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT: mockups */}
          <div className="lg:col-span-6 relative p-6 lg:p-12 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="w-full max-w-md"
            >
              <div className="relative">
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 140 }}
                  className="mx-auto w-56 sm:w-64 md:w-72 rounded-2xl overflow-hidden"
                >
                  <img src={Start} alt="mockup" className="w-full object-cover" />
                </motion.div>

                <motion.div
                  initial={{ x: -18, opacity: 0 }}
                  animate={{ x: -6, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  whileHover={{ y: -6 }}
                  className="hidden sm:block absolute -left-8 top-24 w-36 rounded-2xl overflow-hidden"
                  style={{ transform: 'translateY(12px)' }}
                >
                  <img src={Tracking} alt="mockup left" className="w-full object-cover" />
                </motion.div>

                <motion.div
                  initial={{ x: 18, opacity: 0 }}
                  animate={{ x: 6, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ y: -6 }}
                  className="hidden sm:block absolute -right-8 top-36 w-36 rounded-2xl overflow-hidden"
                  style={{ transform: 'translateY(24px)' }}
                >
                  <img src={Home} alt="mockup right" className="w-full object-cover" />
                </motion.div>

                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="absolute -top-8 right-6 bg-gradient-to-tr from-[#F47C20] to-[#ffd08a] text-[#07150f] rounded-xl p-3 shadow-lg w-44"
                >
                  <div className="text-xs font-semibold">Market Runner, On Demand</div>
                  <div className="text-[12px] mt-1 text-[#07150f]/85">Trusted local runners. Pay on delivery.</div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/6">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-white/70 text-sm">
            <div>© {new Date().getFullYear()} Sendrey • All rights reserved</div>
            <div className="flex items-center gap-6">
              <div className="opacity-90 text-xs">Partners</div>
              <div className="flex gap-4 items-center">
                <a href="https://deboik.com" target="_blank">
                  <img src={deboikLogo} alt="Deboik" className="w-20 h-10 object-contain opacity-80" />
                </a>
                <img src={senditLogo} alt="Sendit" className="w-20 h-10 object-contain opacity-80" />
                <img src={Logo} alt="Sendrey" className="w-16 h-10 object-contain opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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