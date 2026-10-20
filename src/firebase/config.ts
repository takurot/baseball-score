import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase Hosting 環境（*.web.app, *.firebaseapp.com 等）では現在のホスト名を
// authDomain として使用することで、iOS Safari等のITP（クロスサイトストレージ遮断による
// missing initial state エラー）を防止する。
export const getAuthDomain = (): string | undefined => {
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname
  ) {
    const hostname = window.location.hostname;
    if (
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      (hostname.endsWith('.web.app') ||
        hostname.endsWith('.firebaseapp.com') ||
        process.env.REACT_APP_USE_CURRENT_ORIGIN_FOR_AUTH === 'true')
    ) {
      return hostname;
    }
  }
  return process.env.REACT_APP_FIREBASE_AUTH_DOMAIN;
};

// Firebaseの設定
// 環境変数から設定情報を読み込む
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: getAuthDomain(),
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// 環境変数が設定されているか確認
const checkEnvVariables = () => {
  const requiredVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(
      `警告: 以下の環境変数が設定されていません: ${missingVars.join(', ')}`
    );
    console.warn(
      'Firebase機能が正しく動作しない可能性があります。.envファイルで設定してください。'
    );
  }
};

// 環境変数チェック
checkEnvVariables();

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ローカル開発環境の場合、Firestoreエミュレーターに接続
if (window.location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('Using Firestore emulator');
}

export { db, app };
