
guard clicking accross all buttons
# npx cap sync after every npm run build
npx cap run android

prembly

Re-verification — before a high-value payout or after a flagged login, take a fresh selfie, call Face Comparison against your stored reference photo (from the original document_w_face response). Cheap, no OCR/lookup needed again.

Duplicate identity detection — index documentNumber (and/or a hash of the face embedding if Prembly exposes one — check, most vendors don't return raw embeddings, just match scores) so you can flag if the same ID number or an obviously-matching face shows up across multiple accounts. Classic multi-accounting fraud pattern for delivery/errand platforms — someone banned as a runner tries to re-register.

Audit trail for disputes — if a runner or customer disputes an action tied to their identity ("that wasn't me"), you have the original verification artifact and confidence score to reference, plus your backoffice agent's manual decision if it went through review.

Ongoing risk scoring — low-confidence-but-approved accounts could get a lighter "watch" flag your fraud logic weighs alongside other signals (device fingerprint, IP changes, order patterns) rather than treating KYC as a one-time gate.