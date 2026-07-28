'use client'

import Image from "next/image";
import { motion } from "framer-motion";
import {
    IoBriefcaseOutline,
    IoPeopleOutline,
    IoCalendarOutline,
    IoLayersOutline,
    IoBarChartOutline,
} from "react-icons/io5";

const fadeUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.6 },
};

const capabilities = [
    {
        icon: IoBriefcaseOutline,
        title: "You become the admin",
        text: "Converting your account puts you in charge of a dedicated business workspace, separate from your personal orders.",
    },
    {
        icon: IoPeopleOutline,
        title: "Add team members",
        text: "Invite people onto your business account so they can request errands and deliveries themselves, without needing accounts of their own.",
    },
    {
        icon: IoCalendarOutline,
        title: "Schedule tasks",
        text: "Set up errands and pickups ahead of time recurring restocks, standing deliveries, whatever runs on a schedule for you.",
    },
    {
        icon: IoLayersOutline,
        title: "Run errands in bulk",
        text: "Send several orders at once: multiple pickups, multiple drop-off points — instead of placing them one at a time.",
    },
    {
        icon: IoBarChartOutline,
        title: "See it all in reports",
        text: "Spend, order history, and team activity, all in one place, so you're never guessing what your business is spending on logistics.",
    },
];

const convertToBusiness = '/activate-business.png'
const businessPage = '/business-page.png'

export const BusinessFeature = () => {
    return (
        <section className="bg-gray-1000 py-20 px-4 sm:px-6 mt-3">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-center item-center mb-4">
                    <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                        There&rsquo;s more
                    </span>
                </header>
                {/* Intro block */}
                <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                    <motion.div {...fadeUp} className="space-y-5 text-center lg:text-left">
                        <h2 className="text-2xl sm:text-3xl font-bold text-secondary">
                            Running a business? Sendrey scales with you.
                        </h2>
                        <p className="text-gray-800 leading-relaxed">
                            Any Sendrey account can convert into a{" "}
                            <strong className="text-secondary">business</strong>{" "}
                            account. Once you do, you&rsquo;re not just placing
                            one-off orders anymore, you get a workspace built for
                            running errands and deliveries at volume, with a team
                            behind you instead of just you.
                        </p>
                        <div className="flex justify-center lg:justify-start">
                            <p
                                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                            >
                                Convert to a business account
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        {...fadeUp}
                        transition={{ ...fadeUp.transition, delay: 0.1 }}
                        className="space-y-4 sm:space-y-6"
                    >
                        <div className="relative aspect-[1366/639] w-full overflow-hidden rounded-2xl bg-black-100 ring-1 ring-gray-1002 shadow-sm">
                            <Image
                                src={convertToBusiness}
                                alt="Screen showing the option to convert a personal account into a business account"
                                fill
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                className="object-contain"
                            />
                        </div>

                        <div className="relative aspect-[1366/639] w-full overflow-hidden rounded-2xl bg-black-100 ring-1 ring-gray-1002 shadow-sm">
                            <Image
                                src={businessPage}
                                alt="Business administration dashboard showing the team directory, with Reports and Schedules tabs"
                                fill
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                className="object-contain"
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Capability grid — flex-wrap so a partial last row centers itself automatically */}
                <motion.div
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: 0.15 }}
                    className="mt-16 flex flex-wrap justify-center gap-8"
                >
                    {capabilities.map(({ icon: Icon, title, text }) => (
                        <div
                            key={title}
                            className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.3334rem)] rounded-2xl bg-white p-6 ring-1 ring-gray-1002 space-y-3"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <Icon className="text-primary text-xl" />
                            </div>
                            <h3 className="font-bold text-secondary">{title}</h3>
                            <p className="text-sm text-gray-800 leading-relaxed">{text}</p>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};