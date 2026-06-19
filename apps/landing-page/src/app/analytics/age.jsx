'use client'

import { useEffect, useState, useCallback } from 'react'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'

const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-display' })
const body = Inter({ subsets: ['latin'], variable: '--font-body' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-mono' })

const Logo = '/logo.png'
const ANALYTICS_SECRET = process.env.NEXT_PUBLIC_ANALYTICS_SECRET || 'sendrey-analytics-2026'

function BarChart({ data, valueKey, labelKey, color = '#F4C542', height = 120 }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  const barWidth = Math.max(4, Math.floor(560 / data.length) - 3)

  return (
    <div className="overflow-x-auto">
      <svg
        width={Math.max(data.length * (barWidth + 3), 560)}
        height={height + 36}
        className="block"
      >
        {data.map((d, i) => {
          const barH = Math.max(2, Math.round((d[valueKey] / max) * height))
          const x = i * (barWidth + 3)
          const y = height - barH
          const isLast7 = i >= data.length - 7
          return (
            <g key={d[labelKey]}>
              <rect x={x} y={y} width={barWidth} height={barH} rx={2} fill={isLast7 ? color : `${color}55`}>
                <title>{`${d[labelKey]}: ${d[valueKey]}`}</title>
              </rect>
              {(i === 0 || i === data.length - 1 || i % 7 === 0) && (
                <text
                  x={x + barWidth / 2}
                  y={height + 22}
                  textAnchor="middle"
                  fontSize={9}
                  fill="rgba(255,255,255,0.4)"
                  fontFamily="monospace"
                >
                  {String(d[labelKey]).slice(5)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
      <div className="text-xs text-white/50 uppercase tracking-widest mb-2">{label}</div>
      <div className="text-3xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: accent || '#fff' }}>
        {value ?? '—'}
      </div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </div>
  )
}

function LoginGate({ onUnlock }) {
  const [input, setInput] = useState('')
  const [err, setErr] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (input === ANALYTICS_SECRET) {
      sessionStorage.setItem('analytics_key', input)
      onUnlock(input)
    } else {
      setErr(true)
      setTimeout(() => setErr(false), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#152C3D] to-[#07151a]">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full max-w-sm text-center">
        <img src={Logo} alt="Sendrey" className="w-24 mx-auto mb-6 opacity-90" />
        <h1 className="text-lg font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Analytics
        </h1>
        <p className="text-white/50 text-xs mb-6">Enter your access key to continue.</p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Access key"
            className={`bg-white/[0.08] border rounded-xl px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/40
              ${err ? 'border-rose-400/60' : 'border-white/10 focus:border-white/30'}`}
          />
          {err && <p className="text-rose-400 text-xs">Incorrect key.</p>}
          <button
            type="submit"
            className="bg-[#F4C542] text-[#07151a] font-semibold rounded-xl py-3 text-sm hover:opacity-90 transition"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [key, setKey] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [view, setView] = useState('daily')

  useEffect(() => {
    const saved = sessionStorage.getItem('analytics_key')
    if (saved) setKey(saved)
  }, [])

  const fetchStats = useCallback(async (k) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/analytics/stats', {
        headers: { Authorization: `Bearer ${k}` },
      })
      if (res.status === 401) {
        sessionStorage.removeItem('analytics_key')
        setKey(null)
        return
      }
      if (!res.ok) throw new Error('Failed to fetch stats')
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (key) fetchStats(key)
  }, [key, fetchStats])

  if (!key) {
    return (
      <div className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <LoginGate onUnlock={(k) => { setKey(k) }} />
      </div>
    )
  }

  const s = data?.summary
  const today = new Date().toISOString().split('T')[0]

  // For the table: daily rows reversed (today first), only show days up to today
  // i.e. drop any future-dated rows (shouldn't exist, but just in case)
  // and only show rows from today backwards — no empty future rows
  const dailyTableRows = data
    ? [...data.daily]
        .filter(row => row.date <= today)  // only today and past
        .reverse()                          // today first
    : []

  const weeklyTableRows = data
    ? [...data.weekly].reverse()
    : []

  return (
    <div
      className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-gradient-to-b from-[#0d1f2d] to-[#07151a] text-white`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <header className="max-w-5xl mx-auto px-6 pt-8 pb-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          <img src={Logo} alt="Sendrey" className="w-20 object-contain opacity-80" />
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40">Internal</div>
            <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>Analytics</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-white/30 hidden sm:block">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchStats(key)}
            disabled={loading}
            className="text-xs bg-white/[0.08] border border-white/10 rounded-lg px-3 py-2 hover:bg-white/[0.12] transition disabled:opacity-40"
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button
            onClick={() => { sessionStorage.removeItem('analytics_key'); setKey(null) }}
            className="text-xs text-white/40 hover:text-white/70 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {error && (
          <div className="bg-rose-500/15 border border-rose-500/30 rounded-xl px-5 py-3 text-rose-300 text-sm">
            {error}
          </div>
        )}

        <section>
          <h2 className="text-xs uppercase tracking-widest text-white/40 mb-4">Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total visitors" value={s ? s.landing_views.toLocaleString() : '…'} sub="Landing page views" accent="#F4C542" />
            <StatCard label="Waitlist signups" value={s ? s.total_waitlist_signups.toLocaleString() : '…'} sub="Form submissions" accent="#5be59c" />
            <StatCard label="Conversion" value={s ? `${s.conversion_rate_pct}%` : '…'} sub="Visitors → signups" accent="#60c8f5" />
            <StatCard label="Waitlist page" value={s ? s.waitlist_page_views.toLocaleString() : '…'} sub="Form page views" />
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-white/40 mb-4">Today</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Visitors today" value={s ? s.today_views.toLocaleString() : '…'} accent="#F4C542" />
            <StatCard label="Signups today" value={s ? s.today_signups.toLocaleString() : '…'} accent="#5be59c" />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest text-white/40">
              {view === 'daily' ? 'Last 30 Days' : 'Last 12 Weeks'}
            </h2>
            <div className="flex gap-2">
              {['daily', 'weekly'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                    view === v
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'border-white/[0.08] text-white/40 hover:text-white/60'
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
            <div className="text-xs text-white/50 mb-4 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#F4C542]" />
              Page views
            </div>
            {data ? (
              <BarChart
                data={view === 'daily' ? data.daily : data.weekly}
                valueKey="page_views"
                labelKey={view === 'daily' ? 'date' : 'week_start'}
                color="#F4C542"
              />
            ) : (
              <div className="h-24 animate-pulse bg-white/5 rounded-xl" />
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-xs text-white/50 mb-4 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#5be59c]" />
              Waitlist signups
            </div>
            {data ? (
              <BarChart
                data={view === 'daily' ? data.daily : data.weekly}
                valueKey="waitlist_signups"
                labelKey={view === 'daily' ? 'date' : 'week_start'}
                color="#5be59c"
                height={80}
              />
            ) : (
              <div className="h-20 animate-pulse bg-white/5 rounded-xl" />
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-white/40 mb-4">
            {view === 'daily' ? 'Daily Breakdown' : 'Weekly Breakdown'}
          </h2>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left px-5 py-3 text-xs text-white/40 font-medium uppercase tracking-wide">
                    {view === 'daily' ? 'Date' : 'Week of'}
                  </th>
                  <th className="text-right px-5 py-3 text-xs text-white/40 font-medium uppercase tracking-wide">Page Views</th>
                  <th className="text-right px-5 py-3 text-xs text-white/40 font-medium uppercase tracking-wide">Signups</th>
                  <th className="text-right px-5 py-3 text-xs text-white/40 font-medium uppercase tracking-wide">Conv %</th>
                </tr>
              </thead>
              <tbody>
                {data
                  ? (view === 'daily' ? dailyTableRows : weeklyTableRows).map((row, i) => {
                      const dateKey = view === 'daily' ? row.date : row.week_start
                      const conv = row.page_views > 0
                        ? ((row.waitlist_signups / row.page_views) * 100).toFixed(1)
                        : '—'
                      const isToday = view === 'daily' && row.date === today
                      return (
                        <tr
                          key={dateKey}
                          className={`border-b border-white/5 transition ${isToday ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'}`}
                        >
                          <td className="px-5 py-3 text-white/80" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                            {dateKey}
                            {isToday && (
                              <span className="ml-2 text-[10px] bg-yellow-400/15 text-yellow-300 px-1.5 py-0.5 rounded">
                                today
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right text-white/80">{row.page_views.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right text-emerald-400">
                            {row.waitlist_signups > 0 ? row.waitlist_signups : <span className="text-white/20">0</span>}
                          </td>
                          <td className="px-5 py-3 text-right text-white/50 text-xs">
                            {conv !== '—' ? `${conv}%` : <span className="text-white/20">—</span>}
                          </td>
                        </tr>
                      )
                    })
                  : Array.from({ length: 7 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                        {[1, 2, 3, 4].map(j => (
                          <td key={j} className="px-5 py-3">
                            <div className="h-3 bg-white/[0.08] rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs text-white/25 text-center pb-4">Sendrey Analytics · Internal use only</p>
      </main>
    </div>
  )
}