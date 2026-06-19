// app/api/wait-list/route.js

import { NextResponse } from 'next/server'
import { dbConnect } from '@/app/lib/dbConnect'
import mongoose from 'mongoose'

// Inline model — simple enough to not need its own file
const WaitlistSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true },
  source:    { type: String, default: 'notify_me_form' },
  ip:        { type: String, default: 'not known' },
  createdAt: { type: Date, default: Date.now },
})

const Waitlist = mongoose.models.Waitlist || mongoose.model('Waitlist', WaitlistSchema)

export async function POST(request) {
  try {
    const body = await request.json()
    const email = body.email?.trim()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }

    await dbConnect()

    const existing = await Waitlist.findOne({ email })
    if (existing) {
      return NextResponse.json({ message: 'Already on the waitlist!' }, { status: 200 })
    }

    await Waitlist.create({
      email,
      source: 'notify_me_form',
      ip: request.headers.get('x-forwarded-for') || 'not known',
    })

    return NextResponse.json({ message: "Congrats! you've been added to the waitlist!" }, { status: 201 })
  } catch (err) {
    console.error('[waitlist] error:', err.message)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    await dbConnect()
    const count = await Waitlist.countDocuments()
    return NextResponse.json({ count })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}