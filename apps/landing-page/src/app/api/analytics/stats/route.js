// app/api/analytics/stats/route.js

import { NextResponse } from 'next/server'
import { dbConnect } from '@/app/lib/dbConnect'
import AnalyticsEvent from '@/app/models/AnalyticsEvent'

const ANALYTICS_SECRET = process.env.NEXT_PUBLIC_ANALYTICS_SECRET;

function getWeekStart(dateStr) {
    const d = new Date(dateStr)
    const day = d.getDay() // 0 = Sunday
    d.setDate(d.getDate() - day)
    return d.toISOString().split('T')[0]
}

export async function GET(req) {
    const authHeader = req.headers.get('authorization') || ''
    if (authHeader.replace('Bearer ', '') !== ANALYTICS_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const today = new Date().toISOString().split('T')[0]

    // --- Aggregation pipeline: group by date + event ---
    const byDateAndEvent = await AnalyticsEvent.aggregate([
        {
            $group: {
                _id: { date: '$date', event: '$event' },
                count: { $sum: 1 },
            },
        },
        { $sort: { '_id.date': 1 } },
    ])

    // Build a map: date -> { page_views, waitlist_signups }
    const dayMap = {}
    for (const row of byDateAndEvent) {
        const { date, event } = row._id
        if (!dayMap[date]) dayMap[date] = { date, page_views: 0, waitlist_signups: 0 }
        if (event === 'page_view') dayMap[date].page_views += row.count
        if (event === 'waitlist_signup') dayMap[date].waitlist_signups += row.count
    }

    // Fill last 30 days (including zero-days)
    const last30 = []
    for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        last30.push(dayMap[dateStr] || { date: dateStr, page_views: 0, waitlist_signups: 0 })
    }

    // Weekly rollup
    const weekMap = {}
    for (const [date, val] of Object.entries(dayMap)) {
        const week = getWeekStart(date)
        if (!weekMap[week]) weekMap[week] = { week_start: week, page_views: 0, waitlist_signups: 0 }
        weekMap[week].page_views += val.page_views
        weekMap[week].waitlist_signups += val.waitlist_signups
    }
    const weekly = Object.values(weekMap)
        .sort((a, b) => a.week_start.localeCompare(b.week_start))
        .slice(-12)

    // Totals (single aggregation)
    const totals = await AnalyticsEvent.aggregate([
        {
            $group: {
                _id: { event: '$event', page: '$page' },
                count: { $sum: 1 },
            },
        },
    ])

    let totalPageViews = 0
    let landingViews = 0
    let waitlistPageViews = 0
    let totalWaitlistSignups = 0

    for (const t of totals) {
        const { event, page } = t._id
        if (event === 'page_view') {
            totalPageViews += t.count
            if (page === 'landing') landingViews += t.count
            if (page === 'waitlist') waitlistPageViews += t.count
        }
        if (event === 'waitlist_signup') totalWaitlistSignups += t.count
    }

    const todayData = dayMap[today] || { page_views: 0, waitlist_signups: 0 }

    return NextResponse.json({
        summary: {
            total_page_views: totalPageViews,
            total_waitlist_signups: totalWaitlistSignups,
            landing_views: landingViews,
            waitlist_page_views: waitlistPageViews,
            conversion_rate_pct: landingViews > 0
                ? ((totalWaitlistSignups / landingViews) * 100).toFixed(1)
                : '0.0',
            today_views: todayData.page_views,
            today_signups: todayData.waitlist_signups,
        },
        daily: last30,
        weekly,
    })
}