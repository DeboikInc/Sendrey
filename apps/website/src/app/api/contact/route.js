import { NextResponse } from "next/server";
import { verifyCaptchaToken } from "../captcha/route";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ELASTIC_EMAIL_ENDPOINT = "https://api.elasticemail.com/v4/emails/transactional";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendViaElasticEmail({ name, email, message }) {
  const res = await fetch(ELASTIC_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ElasticEmail-ApiKey": process.env.ELASTIC_EMAIL_API_KEY,
    },
    body: JSON.stringify({
      Recipients: {
        To: [process.env.CONTACT_TO_EMAIL || "support@sendrey.com"],
      },
      Content: {
        From: `Sendrey Website <${process.env.ELASTIC_EMAIL_FROM}>`,
        ReplyTo: email,
        Subject: `New contact form message from ${name}`,
        Body: [
          {
            ContentType: "HTML",
            Charset: "utf-8",
            Content: `
              <p><strong>Name:</strong> ${escapeHtml(name)}</p>
              <p><strong>Email:</strong> ${escapeHtml(email)}</p>
              <p><strong>Message:</strong></p>
              <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
            `,
          },
          {
            ContentType: "PlainText",
            Charset: "utf-8",
            Content: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Elastic Email request failed (${res.status}): ${errBody}`);
  }

  return res.json();
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, message, captchaToken, captchaAnswer } = body || {};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (message.trim().length > 5000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  if (!captchaToken || !captchaAnswer) {
    return NextResponse.json({ error: "Captcha verification is required." }, { status: 400 });
  }

  if (!verifyCaptchaToken(captchaToken, captchaAnswer)) {
    return NextResponse.json(
      { error: "Captcha verification failed. Please try again." },
      { status: 400 }
    );
  }

  try {
    await sendViaElasticEmail({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact email send error:", err);
    return NextResponse.json(
      { error: "Could not send your message right now. Please try again shortly." },
      { status: 500 }
    );
  }
}