const admin = require('firebase-admin');
const path = require('path');

// Path
const serviceAccount = require(path.join(__dirname, 'sendrey-6f52d-firebase-adminsdk-fbsvc-c45466bf0a.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;