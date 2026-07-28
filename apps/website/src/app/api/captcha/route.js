import crypto from "crypto";

const SECRET = "sendrey-captcha-secret";
const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function createCaptchaToken(answer) {
  const payload = JSON.stringify({ answer, exp: Date.now() + TOKEN_TTL_MS });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifyCaptchaToken(token, submittedAnswer) {
  if (!token || typeof token !== "string") return false;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", SECRET)
    .update(payloadB64)
    .digest("base64url");

  if (expectedSignature !== signature) return false;

  try {
    const { answer, exp } = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (Date.now() > exp) return false;
    return parseInt(submittedAnswer, 10) === answer;
  } catch {
    return false;
  }
}

export async function GET() {
  const num1 = Math.floor(Math.random() * 10);
  const num2 = Math.floor(Math.random() * 10);
  const answer = num1 + num2;
  const token = createCaptchaToken(answer);

  return Response.json({ question: `${num1} + ${num2}`, answer, token });
}

export async function POST(req) {
  try {
    const { userAnswer, token } = await req.json();

    if (verifyCaptchaToken(token, userAnswer)) {
      return Response.json({ success: true });
    }
    return Response.json({ success: false, message: "Invalid answer" }, { status: 400 });
  } catch (err) {
    console.error("Captcha verification error:", err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
}