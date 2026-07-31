'use client'

import { IoMail } from "react-icons/io5";
import { motion } from 'framer-motion'

const fadeUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.6 },
}


export const ContactInfo = () => {
    return (
        <section className="bg-secondary">
            <motion.div {...fadeUp}>
                <section className="max-w-screen-2xl mx-auto md:px-14 lg:px-20 md:py-28 py-20 text-gray-200 sm:px-8 px-4">
                    <article className="space-y-5 max-w-2xl mx-auto flex flex-col items-center text-center">
                        <h1 className="lg:text-[65px] sm:text-[50.9px] capitalize text-3xl font-extrabold sm:leading-[78.665px] leading-[45.665px] mb-5">
                            Contact Us
                        </h1>

                        <a
                            href="mailto:support@sendrey.com"
                            className="flex items-center gap-5"
                        >
                            <span className="text-gray-200">
                                <IoMail size={35} />
                            </span>
                            <span className="text-left">
                                <h5 className="font-semibold md:text-xl tracking-wide">
                                    Email Address
                                </h5>
                                <p className="font-normal text-primary">
                                    support@sendrey.com
                                </p>
                            </span>
                        </a>
                    </article>
                </section>
            </motion.div>
        </section>
    );
};