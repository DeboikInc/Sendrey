// app/api/analytics/track/route.js

import { NextResponse } from 'next/server'
import { dbConnect } from '@/app/lib/dbConnect'
import AnalyticsEvent from '@/app/models/AnalyticsEvent'

export async function POST(req) {
    try {
        const { event, page } = await req.json()
        if (!event) return NextResponse.json({ error: 'Missing event' }, { status: 400 })

        await dbConnect()

        await AnalyticsEvent.create({
            event,
            page: page || 'unknown',
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        })

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Analytics track error:', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}