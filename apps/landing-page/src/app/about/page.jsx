'use client'

import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiMail, FiInstagram, FiFacebook } from 'react-icons/fi'
import { FaLinkedinIn, FaXTwitter } from 'react-icons/fa6'
import { motion } from 'framer-motion'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'

const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-display' })
const body = Inter({ subsets: ['latin'], variable: '--font-body' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-mono' })

const Logo = '/logo.png'
const deboikLogo = '/deboik-20.png'
const senditLogo = '/sendit.png'
const postErrandImage = '/Post-errand.png'
const businessImage = '/business.png'
const trackRunner = '/track-runner.png'
const runnerWithdraw = '/runner-withdraw.png'
const escrow = '/Escrow.png'
const raiseDispute = '/raise-dispute.png'

const fadeUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.6 },
}

function ImageSlot({ label, src, aspect = 'aspect-[4/3]' }) {
    if (src) {
        return (
            <div className={`${aspect} w-full rounded-2xl overflow-hidden bg-white/5`}>
                <img src={src} alt={label || ''} className="w-full h-full object-cover" />
            </div>
        )
    }
    return (
        <div className={`${aspect} w-full rounded-2xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center`}>
            <span className="text-sm text-white/50 px-4 text-center">Image: {label}</span>
        </div>
    )
}

function FeatureBlock({ eyebrow, title, body: text, image, imageLabel, align = 'left' }) {
    const reversed = align === 'right'
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center py-16">
            <motion.div {...fadeUp} className={reversed ? 'md:order-2' : ''}>
                <div className="text-xs uppercase tracking-widest text-secondary mb-3">{eyebrow}</div>
                <h3
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    {title}
                </h3>
                <p className="mt-3 text-white/70 text-sm sm:text-base max-w-md">{text}</p>
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }} className={reversed ? 'md:order-1' : ''}>
                <ImageSlot src={image} label={imageLabel} />
            </motion.div>
        </div>
    )
}

export default function About() {
    const router = useRouter()
    const goToWaitlist = () => router.push('/join-the-list')

    return (
        <div
            className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-primary text-white`}
            style={{ fontFamily: 'var(--font-body)' }}
        >
            {/* HEADER */}
            <header className="max-w-6xl mx-auto px-6 pt-8 flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
                >
                    <FiArrowLeft /> Back
                </button>
                <img src={Logo} alt="Sendrey" className="w-28 sm:w-32 object-contain" />
                <button
                    onClick={goToWaitlist}
                    className="hidden sm:inline-block text-sm font-semibold bg-secondary text-primary px-4 py-2 rounded-full hover:opacity-90 transition"
                >
                    Join Waitlist
                </button>
            </header>

            {/* HERO — no whileInView, stays static on load like the homepage hero */}
            <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
                <div className="max-w-2xl">
                    <div className="text-xs uppercase tracking-widest text-secondary mb-3">About Sendrey</div>
                    <h1
                        className="text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        Errands are a kind of trust.{' '}
                        <span className="text-secondary">We built the infrastructure for it.</span>
                    </h1>
                    <p className="mt-5 text-white/75 text-base sm:text-lg max-w-lg">
                        Sendrey connects people who need something done with runners who can do it —
                        groceries picked up, packages delivered, errands handled — tracked in real time,
                        paid for safely, and backed by a system built to protect both sides.
                    </p>
                </div>
            </section>

            {/* TOP IMAGE */}
            {/* <section className="max-w-6xl mx-auto px-6 pb-8">
                <motion.div {...fadeUp}>
                    <ImageSlot label="hero — runner in motion / app in hand" aspect="aspect-[16/7]" />
                </motion.div>
            </section> */}

            {/* FEATURE BLOCKS */}
            <section className="max-w-6xl mx-auto px-6 border-t border-white/10">
                <FeatureBlock
                    align="left"
                    eyebrow="For users"
                    title="Ask, and know it's handled"
                    body="Post an errand, and Sendrey matches you with a runner nearby. Set a budget, add instructions, and approve items before anything's paid for. You're in control of the request from the moment it's posted to the moment it lands at your door."
                    image={postErrandImage}
                    imageLabel="user posting a request in the app"
                />

                <FeatureBlock
                    align="right"
                    eyebrow="For business"
                    title="Switch to a business account when errands scale up"
                    body="Running a shop, office, or anything with recurring errands? Convert your account to a business account and send multiple errands at once instead of one at a time — same tracking, same protection, built for higher volume."
                    image={businessImage}
                    imageLabel="business account / bulk errand screen"
                />

                <FeatureBlock
                    align="left"
                    eyebrow="Real-time tracking"
                    title="Watch the whole errand happen"
                    body="Once a runner accepts, you see their location update live, message them directly, and get status updates at every stage — accepted, picked up, on the way, delivered. No guessing where things stand."
                    image={trackRunner}
                    imageLabel="live map view with runner location pin"
                />

                <FeatureBlock
                    align="right"
                    eyebrow="Payment protection"
                    title="Money held safely until the job's done"
                    body="Funds are placed in escrow when a request is accepted and only released once the delivery is confirmed. Runners know they'll get paid for completed work; users know they're not paying for something that didn't happen."
                    image={escrow}
                    imageLabel="payment / escrow confirmation screen"
                />

                <FeatureBlock
                    align="left"
                    eyebrow="For runners"
                    title="Earn on your schedule, get paid out fast"
                    body="Accept requests that fit your route and your time. Earnings are tracked per order, and withdrawals go straight to your bank account — no waiting on a fixed payout cycle."
                    image={runnerWithdraw}
                    imageLabel="runner earnings / withdrawal screen"
                />

                <FeatureBlock
                    align="right"
                    eyebrow="When something goes wrong"
                    title="A real process for resolving disputes"
                    body="If an order doesn't go as expected, either side can raise it. Disputes are reviewed against what actually happened — order status, timing, and evidence — not just whoever complains first."
                    image={raiseDispute}
                    imageLabel="dispute / resolution screen"
                />
            </section>

            {/* CLOSING CTA */}
            <section className="max-w-6xl mx-auto px-6 py-20 border-t border-white/10">
                <motion.div {...fadeUp} className="text-center max-w-xl mx-auto">
                    <h2
                        className="text-2xl sm:text-3xl font-bold tracking-tight"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        Built for the errand that actually needs doing.
                    </h2>
                    <p className="mt-3 text-white/70 text-sm sm:text-base">
                        Whether you're requesting one or running one, Sendrey is the layer that makes it dependable.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                        <button
                            onClick={goToWaitlist}
                            className="px-8 py-3 rounded-full font-semibold text-primary bg-secondary hover:opacity-90 transition"
                        >
                            Join the Waitlist
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* FOOTER — same as homepage */}
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
                            <a href="https://www.instagram.com/sendrey.africa?igsh=NDNrNnplaW1oaXA=" target="_blank" rel="noreferrer" className="bg-white/5 p-2 rounded-md hover:bg-white/10">
                                <FiInstagram size={18} />
                            </a>
                            <a href="https://www.facebook.com/sendrey.africa" target="_blank" rel="noreferrer" className="bg-white/5 p-2 rounded-md hover:bg-white/10">
                                <FiFacebook size={18} />
                            </a>
                            <a href="https://x.com/sendreyafrica" target="_blank" rel="noreferrer" className="bg-white/5 p-2 rounded-md hover:bg-white/10">
                                <FaXTwitter size={18} />
                            </a>
                            <a href="" target="_blank" rel="noreferrer" className="bg-white/5 p-2 rounded-md hover:bg-white/10">
                                <FaLinkedinIn size={18} />
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