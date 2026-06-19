// models/AnalyticsEvent.js

import mongoose from 'mongoose'

const AnalyticsEventSchema = new mongoose.Schema(
  {
    event: { type: String, required: true },     // 'page_view' | 'waitlist_signup'
    page:  { type: String, default: 'unknown' }, // 'landing' | 'waitlist'
    date:  { type: String, required: true },     // 'YYYY-MM-DD' — for fast grouping
  },
  { timestamps: true } 
)

// Indexes for fast aggregation queries
AnalyticsEventSchema.index({ event: 1, date: 1 })
AnalyticsEventSchema.index({ date: 1 })

export default mongoose.models.AnalyticsEvent
  || mongoose.model('AnalyticsEvent', AnalyticsEventSchema)