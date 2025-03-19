import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebaseの設定
// 注意: 実際のプロジェクトでは環境変数を使用することをお勧めします
// 以下の設定は公開リポジトリにプッシュする前に環境変数に移動してください
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "***REMOVED***",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "***REMOVED***",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "***REMOVED***",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "***REMOVED***.appspot.com",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "***REMOVED***",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:***REMOVED***:web:f1f1dbaaed60119a7dc6a6",
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "***REMOVED***"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firebase Analyticsの初期化
// ブラウザ環境でのみAnalyticsを初期化（SSRなどでエラーを避けるため）
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
    console.log('Firebase Analytics initialized');
}

// ローカル開発環境の場合、Firestoreエミュレーターに接続
if (window.location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('Using Firestore emulator');
}

export { db, app, analytics }; 