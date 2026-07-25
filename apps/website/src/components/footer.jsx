"use client";

import Link from "next/link";
import { IoLogoLinkedin, IoLogoInstagram, IoLogoFacebook, IoLogoWhatsapp } from "react-icons/io5";
import { FaXTwitter } from "react-icons/fa6";
import { motion } from 'framer-motion'

const FOOTER_LINKS = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "FAQs", href: "/faqs" },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
}

const SOCIAL_LINKS = [
    {
        icon: IoLogoFacebook,
        href: "https://www.facebook.com/sendrey.africa",
        label: "Facebook"
    },
    {
        icon: IoLogoInstagram,
        href: "https://www.instagram.com/sendrey.africa?igsh=NDNrNnplaW1oaXA=",
        label: "Instagram"
    },
    {
        icon: IoLogoLinkedin,
        href: "https://www.linkedin.com/company/sendrey",
        label: "LinkedIn"
    },
    {
        icon: IoLogoWhatsapp,
        href: "https://chat.whatsapp.com/HNnMftYrxUOLqMOMwteoBi?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQPOTM2NjE5NzQzMzkyNDU5AAGnihblSOOzQpxtIOFoG4ixSqHcUaNqronoobTQoLLL4-YZgbwNa6pqNaKZZnI_aem_EaodWVYe8KUPT8vIVDfewg",
        label: "Whatsapp"
    },
    {
        icon: FaXTwitter,
        href: "https://x.com/sendreyafrica",
        label: "Twitter"
    },
];

export const Footer = () => {
    return (
        <footer className="bg-secondary text-flash-white">
            <motion.div {...fadeUp}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-16">
                        <div className="grid md:grid-cols-12 gap-8">
                            {/* Logo and Description */}
                            <div className="md:text-left col-span-6">
                                <h2 className="text-3xl font-bold text-primary pb-4">
                                    Sendrey
                                </h2>
                                <p className="text-flash-white/70 text-lg">
                                    Sendrey is a trusted on-demand delivery and errand service that connects you with reliable runners in your city.
                                    Whether you need packages delivered, items picked up, or tasks completed, Sendrey makes it easy to get things done quickly and efficiently.
                                    Post your request, get matched with a nearby runner, and track your task in real-time.
                                </p>
                            </div>

                            {/* Quick Links */}
                            <div className="text-left col-span-3">
                                <h3 className="text-xl font-semibold text-primary pb-4">
                                    Quick Links
                                </h3>
                                <ul className="space-y-2">
                                    {FOOTER_LINKS.map((link) => (
                                        <li key={link.href}>
                                            <Link
                                                href={link.href}
                                                className="text-flash-white/70 hover:text-primary transition-colors duration-200"
                                            >
                                                {link.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Social Links */}
                            <div className="text-left col-span-3">
                                <h3 className="text-xl font-semibold text-primary pb-4">
                                    Follow Us
                                </h3>
                                <div className="space-y-3">
                                    {SOCIAL_LINKS.map((social) => {
                                        const Icon = social.icon;
                                        return (
                                            <Link
                                                key={social.label}
                                                href={social.href}
                                                target="_blank"
                                                className="text-flash-white/70 hover:text-primary transition-colors duration-200 flex items-center gap-3"
                                            >
                                                <Icon size={25} />
                                                <span>{social.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Bar */}
                        <div className="border-t border-flash-white/10 mt-12 pt-8 text-center">
                            <p className="text-flash-white/60">
                                &copy; {new Date().getFullYear()} Sendrey. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </footer>
    );
};