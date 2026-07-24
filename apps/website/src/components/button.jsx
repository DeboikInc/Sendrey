"use client";

import Link from "next/link";

// Shared style so the Link and <button> variants never drift apart
const baseClasses =
  "relative overflow-hidden text-nowrap items-center flex justify-center text-center p-2 px-5 rounded-tl-2xl rounded-br-2xl transition-all duration-300 active:scale-105";

const variantClasses = {
  primary: "bg-primary text-gray-1000 hover:bg-secondary hover:text-gray-1000",
  secondary: "bg-secondary text-gray-1000 hover:bg-primary hover:text-gray-1000",
  outline:
    "bg-transparent border border-primary text-primary hover:bg-primary hover:text-gray-1000",
  ghost: "bg-transparent text-secondary hover:bg-gray-100",
};

/**
 * Link-based button — use when it should navigate (nav CTAs, "View details", etc.)
 */
export const Button = ({
  children,
  classes = "",
  variant = "primary",
  action,
  href = "#",
  blank,
  rel,
  download,
}) => {
  return (
    <Link
      target={blank ? "_blank" : undefined}
      rel={rel}
      download={download}
      href={href}
      onClick={action}
      className={`${baseClasses} ${variantClasses[variant]} ${classes}`}
    >
      {children}
      <span className="wave-effect" />
    </Link>
  );
};

/**
 * Native <button> — use for form submits, modal triggers, in-app actions.
 */
export const Buttons = ({
  children,
  classes = "",
  variant = "primary",
  action,
  type = "button",
  disabled,
}) => {
  return (
    <button
      disabled={disabled}
      type={type}
      onClick={action}
      className={`${baseClasses} ${variantClasses[variant]} ${classes} ${
        disabled ? "opacity-50 cursor-not-allowed active:scale-100" : ""
      }`}
    >
      {children}
      <span className="wave-effect" />
    </button>
  );
};