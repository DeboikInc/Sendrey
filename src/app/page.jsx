'use client'

// ComingSoon.jsx
import React, { useEffect, useState } from 'react'
import { FiMail, FiInstagram, FiTwitter, FiFacebook } from 'react-icons/fi'
import { motion } from 'framer-motion'
const Start = '/Start-portrait.png'
const Home = '/Home-portrait.png'
const Tracking = '/Tracking-portrait.png'
const Logo = '/logo.png'
const deboikLogo = '/deboik-20.png'
const senditLogo = '/sendit.png'

/*
  ComingSoon.jsx
  - JS (no TypeScript)
  - Uses Tailwind CSS, framer-motion, react-icons
  - Replace assets as needed
  - Install: npm i framer-motion react-icons
*/

const COLORS = {
  accent: '#F47C20',
  deep: '#152C3D',
}

const LAUNCH_DATE = '2025-12-01T10:00:00Z' // <- change to your launch date/time (ISO)

export default function ComingSoon() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(LAUNCH_DATE))
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(getTimeLeft(LAUNCH_DATE))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  function validateNigerianPhone(raw) {
    if (!raw) return false;
    // normalize: remove spaces, dashes, parentheses
    const cleaned = raw.trim().replace(/[\s()-]/g, '');

    // Accept formats like: 08031234567 or +2348031234567
    const regex = /^(?:\+234|0)(?:7|8|9)\d{9}$/;
    return regex.test(cleaned);
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    // basic phone validation
    if (!validateNigerianPhone(phone)) {
      setError('Please enter a valid Nigerian phone number (e.g. 08031234567 or +2348031234567)')
      return
    }
    // fake submit (replace with your API call)
    setSubmitted(true)
    setTimeout(() => {
      // keep UX consistent — clear phone field after success
      setPhone('')
    }, 800)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#152C3D] via-[#102626] to-[#07151a] text-white"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto' }}
    >
      <div className="w-full max-w-6xl bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          {/* LEFT: content */}
          <div className="lg:col-span-6 p-8 lg:p-12">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={Logo} alt="logo" className="w-32 sm:w-36 object-contain" />
              </div>
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
                Skip the traffic, avoid the stress. We’re building a faster way to get errands done —
                trusted local runners delivering from any market to your doorstep. Launching soon.
              </p>

              {/* Countdown */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <div className="grid grid-cols-4 gap-3 w-full sm:w-auto">
                  {['days', 'hours', 'mins', 'secs'].map((k, i) => (
                    <div key={k} className="bg-white/6 px-4 py-3 rounded-xl min-w-[64px] text-center">
                      <div className="text-xl font-semibold">{formatTimeValue(timeLeft, i)}</div>
                      <div className="text-xs text-white/70 uppercase mt-1">
                        {k === 'mins' ? 'mins' : k}
                      </div>
                    </div>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="ml-0 sm:ml-4 px-6 py-3 rounded-full font-semibold"
                  style={{
                    background: `linear-gradient(90deg, ${COLORS.accent} 0%, #ffd08a 100%)`,
                    color: '#07150f',
                  }}
                >
                  Join Waitlist
                </motion.button>
              </div>

              {/* phone signup */}
              <form onSubmit={handleSubmit} className="mt-6 w-full max-w-lg">
                <div className="flex sm:flex-row flex-col sm:gap-2 items-center sm:bg-white/5 rounded-full p-1">
                  <div className='flex flex-1 items-center sm:bg-transparent bg-white/5 rounded-full sm:mb-0 mb-2'>
                    <div className="pl-3 pr-1 text-white/75">
                      <FiMail />
                    </div>
                    <input
                      className="flex-1 bg-transparent outline-none px-3 py-3 rounded-full text-sm text-white placeholder:text-white/60"
                      placeholder="Your Whatsapp Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      aria-label="whatsapp"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-full text-nowrap px-5 py-2 text-sm font-semibold bg-white/10 hover:bg-white/20 transition"
                  >
                    {submitted ? 'Thanks!' : 'Notify Me'}
                  </button>
                </div>
                {error && <div className="text-sm text-rose-400 mt-2">{error}</div>}
                <div className="text-xs text-white/60 mt-2">
                  We’ll only send launch updates — unsubscribe anytime.
                </div>
              </form>

              {/* social + small */}
              <div className="mt-6 flex items-center gap-4">
                <a href='https://www.instagram.com/_sendrey?igsh=MWZwdnpqZG91c3JkdQ==' target='_blank' className="bg-white/5 p-2 rounded-md hover:bg-white/10">
                  <FiInstagram />
                </a>
                <a href='https://web.facebook.com/profile.php?id=61581630117870' target='_blank' className="bg-white/5 p-2 rounded-md hover:bg-white/10">
                  <FiFacebook />
                </a>

                <div className="ml-auto text-xs text-white/70">
                  Powered by <strong>Sendrey</strong>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT: mockups / visuals */}
          <div className="lg:col-span-6 relative p-6 lg:p-12 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="w-full max-w-md"
            >
              <div className="relative">
                {/* center mockup */}
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 140 }}
                  className="mx-auto w-56 sm:w-64 md:w-72 rounded-2xl overflow-hidden"
                >
                  <img src={Start} alt="mockup" className="w-full object-cover" />
                </motion.div>

                {/* left small */}
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

                {/* right small */}
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

                {/* subtle floating badge */}
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

        {/* footer logos / small strip */}
        <div className="border-t border-white/6">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-white/70 text-sm">
            <div>© {new Date().getFullYear()} Sendrey • All rights reserved</div>
            <div className="flex items-center gap-6">
              <div className="opacity-90 text-xs">Partners</div>
              <div className="flex gap-4 items-center">
                <a href="https://deboik.com" target='_blank'>
                  <img src={deboikLogo} alt="partner" className="w-20 h-10 object-contain opacity-80" />
                </a>
                <img src={senditLogo} alt="partner" className="w-20 h-10 object-contain opacity-80" />
                <img src={Logo} alt="partner" className="w-16 h-10 object-contain opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* helpers */
function getTimeLeft(isoDate) {
  const t = Math.max(new Date(isoDate).getTime() - Date.now(), 0)
  const secs = Math.floor(t / 1000)
  const days = Math.floor(secs / 86400)
  const hours = Math.floor((secs % 86400) / 3600)
  const mins = Math.floor((secs % 3600) / 60)
  const seconds = secs % 60
  return { days, hours, mins, seconds }
}

function formatTimeValue(obj, index) {
  // index 0 -> days, 1 -> hours, 2 -> mins, 3 -> secs
  if (!obj) return '0'
  if (index === 0) return String(obj.days).padStart(2, '0')
  if (index === 1) return String(obj.hours).padStart(2, '0')
  if (index === 2) return String(obj.mins).padStart(2, '0')
  return String(obj.seconds).padStart(2, '0')
}
