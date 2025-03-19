import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebaseの設定
// 環境変数から設定情報を読み込む
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// 環境変数が設定されているか確認
const checkEnvVariables = () => {
    const requiredVars = [
        'REACT_APP_FIREBASE_API_KEY',
        'REACT_APP_FIREBASE_AUTH_DOMAIN',
        'REACT_APP_FIREBASE_PROJECT_ID',
        'REACT_APP_FIREBASE_STORAGE_BUCKET',
        'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
        'REACT_APP_FIREBASE_APP_ID'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.warn(`警告: 以下の環境変数が設定されていません: ${missingVars.join(', ')}`);
        console.warn('Firebase機能が正しく動作しない可能性があります。.envファイルで設定してください。');
    }
};

// 環境変数チェック
checkEnvVariables();

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