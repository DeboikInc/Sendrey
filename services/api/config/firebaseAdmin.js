const admin = require('firebase-admin');
const path = require('path');

// Path
const serviceAccount = require(path.join(__dirname, 'serviceAccountCredential.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;