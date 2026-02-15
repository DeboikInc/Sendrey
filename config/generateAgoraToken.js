const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const APP_ID = "1ee5d2968dfb469aabebb1a1d41581cc";
const APP_CERTIFICATE = "b8cb2587d3724afa818e8dfa3a0e6fbc"; // Get from Agora console

function generateToken(channelName, uid = 0) {
  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600; // 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  return RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );
}

module.exports = { generateToken };