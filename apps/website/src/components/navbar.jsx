"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Buttons } from "@/components/button";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-secondary">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl font-bold text-primary">
            Sendrey
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-flash-white hover:text-primary transition-colors duration-200 font-medium"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop actions */}
        {/* <div className="hidden md:flex items-center gap-3">
          <Button href="" variant="primary">
            Get Started
          </Button>
        </div> */}

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="md:hidden relative w-9 h-9 flex flex-col items-center justify-center gap-1.5"
        >
          <span
            className={`block h-0.5 w-6 bg-flash-white transition-transform duration-300 ${
              open ? "rotate-45 translate-y-2" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-flash-white transition-opacity duration-300 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-flash-white transition-transform duration-300 ${
              open ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-[26rem]" : "max-h-0"
        }`}
      >
        <ul className="flex flex-col px-4 sm:px-6 pb-4 gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className="block py-2 text-flash-white hover:text-primary font-medium"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        {/* <div className="flex flex-col gap-3 px-4 sm:px-6 pb-6">
          <Button
            href="/signup"
            action={() => setOpen(false)}
            variant="primary"
            classes="w-full"
          >
            Get Started
          </Button>
        </div> */}
      </div>
    </header>
  );
};