'use client'
import React from 'react'
import { FiMenu, FiSearch, FiLogIn } from 'react-icons/fi'
import { FaSpotify, FaSlack, FaDropbox } from 'react-icons/fa'
import { SiCoinbase, SiWebflow, SiZoom } from 'react-icons/si'
import { motion } from 'framer-motion'
const Start = '/Start-portrait.png'
const Home = '/Home-portrait.png'
const Tracking = '/Tracking-portrait.png'
const Logo = '/logo.png'
const Runner = '/runner.svg'

const COLORS = {
  accent: '#F47C20',
  deep: '#152C3D',
}

const logos = [
  { id: 'coinbase', Icon: SiCoinbase },
  { id: 'spotify', Icon: FaSpotify },
  { id: 'slack', Icon: FaSlack },
  { id: 'dropbox', Icon: FaDropbox },
  { id: 'webflow', Icon: SiWebflow },
  { id: 'zoom', Icon: SiZoom },
]

export default function DroplyHero() {
  return (
    <section className="w-full bg-[linear-gradient(180deg,#152C3D_0%,#152C3D_55%,#695BA7_100%)] text-white overflow-hidden">
      <section className='relative'>
        <header className="max-w-7xl mx-auto px-6 py-8">
          {/* Top nav */}
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 w-full">
                <img src={Logo} alt="logo" width={100} className='object-fit-contain w-40' />
              </div>
            </div>

            <ul className="hidden md:flex items-center gap-4 ml-6 text-sm text-[rgba(255,255,255,0.85)] bg-tartiary bg-opacity-10 rounded-full h-10">
              <li className="px-4 rounded-full bg-white text-black font-medium h-10 flex items-center">Home</li>
              <li className="px-4 rounded-full hover:bg-white/5 h-10 flex items-center cursor-pointer">Features</li>
              <li className="px-4 rounded-full hover:bg-white/5 h-10 flex items-center cursor-pointer">Pricing</li>
              <li className="px-4 rounded-full hover:bg-white/5 h-10 flex items-center cursor-pointer">About</li>
              <li className="px-4 rounded-full hover:bg-white/5 h-10 flex items-center cursor-pointer">FAQ</li>
            </ul>

            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black font-semibold hover:opacity-95">
                <FiLogIn /> <span className="text-sm">Login</span>
              </button>
              <button className="md:hidden p-2 rounded-md bg-[rgba(255,255,255,0.04)]">
                <FiMenu />
              </button>
            </div>
          </nav>

          {/* Hero grid */}
          <div className="mt-16 h-[42rem]">
            {/* Left: Heading + CTA */}
            <div className="text-center">
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight w-11/12 mx-auto" style={{ color: 'white' }}>
                  Simplify Your Business & Daily Life with Sendrey errand app.
                </h1>

                <div className="flex flex-wrap justify-center items-center gap-4 my-6">
                  <p className="text-sm text-[rgba(255,255,255,0.8) lg:w-1/2">Skip the traffic, avoid the stress. Get anything from any Nigerian market delivered to your doorstep by trusted, vetted runners.</p>
                </div>

                <div className="space-x-4 items-center flex-wrap pt-4">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-8 py-4 rounded-full font-semibold bg-gradient-to-tr from-error to-secondary">
                    Download the App
                  </motion.button>

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-8 py-4 rounded-full font-semibold text-[rgba(255,255,255,0.85)] border border-[rgba(255,255,255,0.08)] hover:bg-white/5 ">
                    Get Started - I&apos;s Free
                  </motion.button>
                </div>
              </motion.div>
            </div>

            {/* Right: Device mockups (stacked) */}
            <div className="relative mt-8">
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-[rgba(255,255,255,0.03)] rounded-2xl p-4 absolute -top-2 left-16 w-72">
                <h3 className="text-sm font-semibold">Your Top Selling Countries</h3>
                <p className="text-xs text-[rgba(255,255,255,0.75)]">This Month</p>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[rgb(7,32,15)] font-bold">🇺🇸</div>
                    <div className="flex-1">
                      <div className="w-full bg-[rgba(255,255,255,0.06)] h-3 rounded-full">
                        <div className="h-3 rounded-full bg-gradient-to-r from-[#7EE4CC] to-[#2ad49a]" style={{ width: '72%' }} />
                      </div>
                    </div>
                    <div className="w-12 text-sm text-[rgba(255,255,255,0.85)]">72%</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[rgb(7,32,15)] font-bold">🇨🇦</div>
                    <div className="flex-1">
                      <div className="w-full bg-[rgba(255,255,255,0.06)] h-3 rounded-full">
                        <div className="h-3 rounded-full bg-[#F7E28A]" style={{ width: '8%' }} />
                      </div>
                    </div>
                    <div className="w-12 text-sm text-[rgba(255,255,255,0.85)]">8%</div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-end justify-center gap-6">
                {/* left phone */}
                <motion.div whileHover={{ y: -6 }} className="hidden sm:block w-36 md:w-48 lg:w-56 rounded-2xl p-3" style={{ transform: 'translateY(18px)' }}>
                  <img src={Tracking} alt="app screen" className="w-full h-full object-cover rounded-md" />
                </motion.div>

                {/* center phone */}
                <motion.div whileHover={{ y: -10 }} className="w-44 md:w-56 lg:w-72 p-3 rounded-2xl">
                  <img src={Start} alt="app screen center" className="w-full h-full object-cover rounded-md" />
                </motion.div>

                {/* right phone */}
                <motion.div whileHover={{ y: -6 }} className="hidden sm:block w-36 md:w-44 lg:w-64 rounded-2xl p-3" style={{ transform: 'translateY(18px)' }}>
                  <img src={Home} alt="app screen right" className="w-full h-full object-cover rounded-md" />
                </motion.div>
              </motion.div>

              {/* floating small CTA on right */}
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6 }} className="absolute -top-20 right-8 bg-gradient-to-tr from-error to-secondary text-white rounded-2xl p-4 w-72 shadow-lg">
                <div className='grid grid-cols-2'>
                  <div>
                    <h4 className="font-semibold text-sm">Market Runner, On Demand</h4>
                    <p className="text-[12px] mt-1">Become a Runner, be part of 200+ vetted and trained runner.</p>
                    <div className="mt-3">
                      <button className="px-3 py-2 rounded-full bg-tartiary bg-opacity-95 text-white text-sm">Join The List</button>
                    </div>
                  </div>

                  <div>
                    <img src={Runner} alt="app screen right" className="w-38 h-28 object-cover rounded-md" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </header>

        {/* Logos strip */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className=" bg-primary p-4 flex items-center justify-between gap-6 overflow-x-auto absolute bottom-0 w-full">
          <div className="flex items-center gap-6 justify-center max-w-7xl mx-auto px-6 space-x-12">
            {logos.map((L) => (
              <div key={L.id} className="flex items-center gap-2 opacity-90">
                <L.Icon size={28} style={{ color: COLORS.accent }} />
                <span className="text-sm text-[rgba(255,255,255,0.85)] capitalize">{L.id}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

    </section>
  )
}
