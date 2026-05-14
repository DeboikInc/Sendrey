import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

async function getDb() {
  const url = process.env.DATABASE_URL?.trim() || 'mongodb+srv://sendrey:sendrey@cluster0.6h2uo87.mongodb.net/sendrey_website?retryWrites=true&w=majority';

  if (!url || (!url.startsWith('mongodb://') && !url.startsWith('mongodb+srv://'))) {
    throw new Error('DATABASE_URL is missing or invalid.');
  }

  const client = new MongoClient(url);
  await client.connect();
  return { client, db: client.db('sendrey') };
}

export async function POST(request) {
  let client;
  try {
    const body = await request.json();
    const email = body.email?.trim(); 
    // field is email

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const { client: dbClient, db } = await getDb();
    client = dbClient;

    const collection = db.collection('waitlist');

    const existing = await collection.findOne({ email });
    if (existing) {
      return NextResponse.json({ message: 'Already on the waitlist!' }, { status: 200 });
    }

    await collection.insertOne({
      email,
      source: 'notify_me_form',
      createdAt: new Date(),
      ip: request.headers.get('x-forwarded-for') || 'not known',
    });

    return NextResponse.json({ message: 'Congrats! youve been added to the waitlist!' }, { status: 201 });
  } catch (err) {
    console.error('[waitlist] error:', err.message);
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  } finally {
    if (client) await client.close();
  }
}

export async function GET() {
  let client;
  try {
    const { client: dbClient, db } = await getDb();
    client = dbClient;
    const count = await db.collection('waitlist').countDocuments();
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (client) await client.close();
  }
}