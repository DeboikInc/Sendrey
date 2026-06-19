// lib/dbConnect.js
// Reuse connection across hot reloads in dev

import mongoose from 'mongoose'

const MONGODB_URI=process.env.DATABASE_URL?.trim() || 'mongodb+srv://sendrey:sendrey@cluster0.6h2uo87.mongodb.net/sendrey_website?retryWrites=true&w=majority';

if (!MONGODB_URI) throw new Error('Please define DATABASE_URL in .env.local')

let cached = global._mongoose

if (!cached) {
  cached = global._mongoose = { conn: null, promise: null }
}

export async function dbConnect() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then(m => m)
  }

  cached.conn = await cached.promise
  return cached.conn
}