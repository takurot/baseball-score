import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebaseの設定
// 注意: 実際のプロジェクトでは環境変数を使用することをお勧めします
// 以下の設定は公開リポジトリにプッシュする前に環境変数に移動してください
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDontOGt0RK-u0GNT3W_7tRuoUoT3Vp2Bs",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "baseball-score-18c48.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "baseball-score-18c48",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "baseball-score-18c48.appspot.com",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "59797454931",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:59797454931:web:f1f1dbaaed60119a7dc6a6",
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-ZV8C2TRPLK"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ローカル開発環境の場合、Firestoreエミュレーターに接続
if (window.location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('Using Firestore emulator');
}

export { db, app }; 