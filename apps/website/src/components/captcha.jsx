"use client";
import { useState, useEffect } from "react";
import { BiRefresh } from "react-icons/bi";

export const Captcha = ({ onCaptchaPass }) => {
  const [captcha, setCaptcha] = useState({ question: "", answer: null, token: "" });
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCaptcha = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/captcha");
      const data = await res.json();
      setCaptcha(data);
      setUserInput("");
      setError("");
      onCaptchaPass(false, "", "");
    } catch (err) {
      setError("Failed to load captcha. Try refreshing.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setUserInput(value);

    if (value === "") {
      onCaptchaPass(false, "", "");
      setError("");
    } else if (parseInt(value, 10) === captcha.answer) {
      onCaptchaPass(true, captcha.token, value);
      setError("");
    } else {
      onCaptchaPass(false, "", "");
      setError("Invalid answer");
    }
  };

  return (
    <section className="max-w-3xl mx-auto my-3 text-center">
      <aside className="flex items-center justify-center space-x-2">
        <div className="text-nowrap sm:p-4 p-2 rounded-lg text-2xl flex items-center space-x-6 bg-white border border-gray-1002">
          <span className="text-secondary">{captcha.question || "..."}</span>

          <span
            className={`text-gray-500 cursor-pointer transition-transform hover:text-primary ${
              isLoading ? "animate-spin" : ""
            }`}
            onClick={fetchCaptcha}
            role="button"
            aria-label="Refresh captcha"
          >
            <BiRefresh size={32} />
          </span>
        </div>

        <span className="text-2xl text-secondary">=</span>

        <input
          type="tel"
          placeholder="??"
          value={userInput}
          onChange={handleChange}
          className="rounded-lg sm:p-4 p-2 text-2xl sm:w-16 w-14 sm:h-16 border border-gray-1002 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </aside>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </section>
  );
};
