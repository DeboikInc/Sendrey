"use client";

import { useRef, useState } from "react";
import { Buttons } from "@/components/button";
import { Captcha } from "@/components/captcha";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6 },
};

const initialForm = { name: "", email: "", message: "" };

export const Contact = () => {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState("");
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const captchaRef = useRef(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCaptchaPass = (passed, token, answer) => {
    setCaptchaPassed(passed);
    setCaptchaToken(passed ? token : "");
    setCaptchaAnswer(passed ? answer : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!captchaPassed) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, captchaToken, captchaAnswer }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setStatus("success");
      setForm(initialForm);
      setCaptchaPassed(false);
      setCaptchaToken("");
      setCaptchaAnswer("");
      captchaRef.current?.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <section className="bg-gray-1000 py-20 px-4 sm:px-6">
      <motion.div {...fadeUp}>
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-secondary">
              Send us a message
            </h2>
            <p className="text-gray-800">
              We usually reply within a business day.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-secondary"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-1002 bg-white px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Your name"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-secondary"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-1002 bg-white px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="message"
                className="block text-sm font-medium text-secondary"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                value={form.message}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-1002 bg-white px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="How can we help?"
              />
            </div>

            <Captcha ref={captchaRef} onCaptchaPass={handleCaptchaPass} />

            <Buttons
              type="submit"
              disabled={status === "loading" || !captchaPassed}
              classes="w-full py-3"
            >
              {status === "loading" ? "Sending..." : "Send message"}
            </Buttons>

            {status === "success" && (
              <strong className="text-center text-sm text-primary">
                Message sent — we&apos;ll get back to you soon.
              </strong>
            )}
            {status === "error" && (
              <p className="text-center text-sm text-red-500">
                {errorMessage || "Something went wrong. Please try again."}
              </p>
            )}
          </form>
        </div>
      </motion.div>
    </section>
  );
};