// utils/authCookies.js
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  const isStaging = process.env.NODE_ENV === 'staging';

  let domain;
  if (isProd) {
    domain = '.sendrey.com';
  } else if (isStaging) {
    domain = 'api-staging.sendrey.com';
  } else {
    domain = 'localhost';
  }

  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: isProd || isStaging || false,
    sameSite: isProd || isStaging ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 mins
    path: '/',
    domain,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd || isStaging || false,
    sameSite: isProd || isStaging ? 'none' : 'lax',
    maxAge: parseInt(process.env.SESSION_TTL_MS || 5184000000),
    path: '/',
    domain,
  });
};

module.exports = { setAuthCookies };