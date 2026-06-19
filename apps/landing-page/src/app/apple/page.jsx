'use client'

import React, { useState } from 'react'
import { FiMenu, FiSearch, FiShoppingBag } from 'react-icons/fi'
import { FaFacebookF, FaTwitter, FaLinkedinIn } from 'react-icons/fa'
import { motion } from 'framer-motion'

// AppleWatchHero.jsx
// React + Tailwind component with responsive tweaks + framer-motion animations.
// JS (not TypeScript).
// Install: npm i framer-motion react-icons

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.08, when: 'beforeChildren' } },
}

const textVariant = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const imageVariant = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.9, ease: 'circOut' } },
}

export default function AppleWatchHero() {
  const [active, setActive] = useState(0)

  const thumbBg = ['bg-[#152C3D]/20', 'bg-[#7EE4CC]/30', 'bg-[#FDCFC4]/30']

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e8f3f7] to-[#d9eef3] p-6 md:p-8"
    >
      <div className="w-full max-w-7xl bg-white/6 backdrop-blur-sm rounded-l-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left column */}
        <motion.aside variants={textVariant} className="w-full md:w-1/2 p-6 md:p-12 relative flex flex-col justify-between">
          {/* Top nav */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 md:gap-6">
              <button aria-label="menu" className="p-2 rounded-md hover:bg-white/20">
                <FiMenu className="text-[#152C3D] text-2xl" />
              </button>
              <div className="flex items-center gap-2 md:gap-4">
                <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-[#152C3D] font-bold"></div>
                <nav className="hidden md:flex items-center gap-6 text-sm text-[#152C3D]/80">
                  <a className="hover:underline">Mac</a>
                  <a className="hover:underline">iPhone</a>
                  <a className="hover:underline">iPad</a>
                  <a className="px-3 py-1 rounded-full bg-white/60 text-[#152C3D]">iWatch</a>
                  <a className="hover:underline">Support</a>
                </nav>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[#152C3D]/70">
              <FiSearch className="text-xl" />
              <FiShoppingBag className="text-xl" />
            </div>
          </div>

          {/* Hero text */}
          <div className="mt-6 md:mt-8">
            <motion.h1
              variants={textVariant}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-[#152C3D]"
            >
              The Perfect Moment
            </motion.h1>

            <motion.h2 variants={textVariant} className="text-2xl sm:text-3xl md:text-4xl font-light mt-4 text-[#152C3D]/70">
              Between Past And
              <br />
              Future.
            </motion.h2>

            <motion.div variants={textVariant} className="mt-8">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-full border-2 border-[#152C3D] bg-transparent text-[#152C3D] font-semibold hover:bg-[#F47C20] hover:border-[#F47C20] hover:text-white transition"
              >
                Buy Now
              </motion.button>
            </motion.div>
          </div>

          {/* bottom left: thumbnails + pager */}
          <div className="mt-6 md:mt-auto flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              {[0, 1, 2].map((i) => (
                <motion.button
                  key={i}
                  onClick={() => setActive(i)}
                  whileHover={{ scale: 1.06, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-14 h-10 rounded-md flex items-center justify-center border border-transparent ${thumbBg[i]} ${active === i ? 'ring-2 ring-[#F47C20]/40' : ''}`}
                >
                  {/* <img src={productImage} alt={`thumb-${i}`} className="w-10 h-8 object-contain" /> */}
                </motion.button>
              ))}
            </div>

            <div className="text-sm text-[#152C3D]/60">← 1 →</div>
          </div>

          {/* social icons vertical on far left (mobile: hidden) */}
          <div className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 flex-col items-center gap-6 text-[#152C3D]/70">
            <a aria-label="facebook" className="hover:text-[#152C3D]"><FaFacebookF /></a>
            <a aria-label="twitter" className="hover:text-[#152C3D]"><FaTwitter /></a>
            <a aria-label="linkedin" className="hover:text-[#152C3D]"><FaLinkedinIn /></a>
          </div>
        </motion.aside>

        {/* Right column */}
        <motion.main variants={imageVariant} className="w-full md:w-1/2 p-6 md:p-12 flex items-center justify-center relative">
          {/* color dots vertical (hide on small screens) */}
          <div className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 flex-col items-center gap-4">
            <span className="w-3 h-3 rounded-full bg-[#152C3D] shadow" />
            <span className="w-4 h-4 rounded-full border-2 border-white bg-transparent" />
            <span className="w-3 h-3 rounded-full bg-[#7EE4CC]" />
            <span className="w-3 h-3 rounded-full bg-[#FDCFC4]" />
          </div>

          {/* product image area */}
          <div className="relative flex items-center justify-center w-full h-72 sm:h-96 md:h-[520px] lg:h-[620px]">
            <motion.div
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute -right-2 md:-right-8 top-6 w-[66%] sm:w-[58%] md:w-[54%] lg:w-[48%] aspect-[4/3]"
              style={{ transform: 'rotate(-6deg)' }}
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/60 to-white/30 blur-[12px] -z-10" />
              {/* <motion.img
                src={productImage}
                alt="Apple Watch"
                className="w-full h-full object-contain drop-shadow-2xl"
                whileHover={{ scale: 1.02, rotate: -3 }}
                transition={{ type: 'spring', stiffness: 120 }}
              /> */}
            </motion.div>

            {/* floating shadow below product */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="absolute right-20 bottom-6 w-48 h-6 rounded-full bg-black/10 blur-xl"
            />
          </div>
        </motion.main>
      </div>
    </motion.div>
  )
}
