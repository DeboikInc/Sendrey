'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const Logo = '/logo.png'

export default function JoinTheList() {
  const router = useRouter()
  const [submitted, setSubmitted] = useState(false)
  const [countdown, setCountdown] = useState(4)
  const iframeRef = useRef(null)
  const countdownRef = useRef(null)
  const submittedRef = useRef(false) 
  const loadCountRef = useRef(0)

  // Track waitlist page visit
  useEffect(() => {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'page_view', page: 'waitlist' }),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      if (submittedRef.current) return // already handled

      loadCountRef.current += 1

      // Try to read the URL — only works momentarily before CORS kicks in
      try {
        const href = iframe.contentWindow?.location?.href || ''
        if (href.includes('formResponse') || href.includes('closedform')) {
          handleSubmitted()
          return
        }
      } catch {
        // Cross-origin — expected on the form page
      }

      // Second load event = Google redirected to confirmation page
      if (loadCountRef.current >= 2) {
        handleSubmitted()
      }
    }

    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, []) // no deps — uses refs only, no stale closure

  function handleSubmitted() {
    if (submittedRef.current) return // guard against double-fire
    submittedRef.current = true
    setSubmitted(true)

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'waitlist_signup', page: 'waitlist' }),
    }).catch(() => {})

    let count = 4
    countdownRef.current = setInterval(() => {
      count--
      setCountdown(count)
      if (count <= 0) {
        clearInterval(countdownRef.current)
        router.replace('/')
      }
    }, 1000)
  }

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-[#152C3D] to-[#07151a] px-4 pt-8 pb-12">
      {/* Back nav */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/')}
          className="text-white/60 hover:text-white text-sm flex items-center gap-1 transition"
        >
          ← Back
        </button>
        <img src={Logo} alt="Sendrey" className="w-24 object-contain" />
        <div className="w-12" />
      </div>

      {/* Submitted banner */}
      {submitted && (
        <div className="w-full max-w-2xl mb-6 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 px-6 py-5 text-center">
          <div className="text-2xl mb-1">🎉</div>
          <p className="text-emerald-300 font-semibold text-sm">You're on the list!</p>
          <p className="text-white/60 text-xs mt-1">Heading back to home in {countdown}s…</p>
        </div>
      )}

      {/* Form iframe */}
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <iframe
          ref={iframeRef}
          src="https://docs.google.com/forms/d/e/1FAIpQLSeEQLvdGrf-tWoX1KZ6K8AK434N7yCk5AIgukJnY42AEWcTUg/viewform?embedded=true"
          width="100%"
          height="900"
          frameBorder="0"
          marginHeight="0"
          marginWidth="0"
          className="w-full bg-white"
          title="Sendrey Waitlist"
        >
          Loading…
        </iframe>
      </div>

      <p className="mt-4 text-white/40 text-xs text-center">
        No spam — launch updates only. Unsubscribe anytime.
      </p>
    </div>
  )
}