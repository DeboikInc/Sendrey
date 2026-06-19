import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyC3mfmOxYuYKEqOknxD9Gj1c87uA84PCf4",
    authDomain: "sendrey-6f52d.firebaseapp.com",
    projectId: "sendrey-6f52d",
    storageBucket: "sendrey-6f52d.firebasestorage.app",
    messagingSenderId: "614208198291",
    appId: "1:614208198291:web:7bc336ca0828e7744d5f66",
    measurementId: "G-LTLJNR3FXL"
};

const app = initializeApp(firebaseConfig);

let messagingInstance = null;

export const getMessagingIfSupported = async () => {
    if (messagingInstance) return messagingInstance;
    console.log('[Firebase] checking isSupported...');
    const supported = await isSupported();
    console.log('[Firebase] isSupported result:', supported);
    if (!supported) return null;
    messagingInstance = getMessaging(app);
    console.log('[Firebase] messaging instance created:', messagingInstance);
    return messagingInstance;
};


export { getToken, onMessage };
export default app;