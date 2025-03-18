import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { app } from './config';

// 認証インスタンスを取得
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Googleでサインイン
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

// メールアドレスとパスワードで新規ユーザー登録
export const registerWithEmailAndPassword = async (
  email: string, 
  password: string, 
  displayName: string
) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // ユーザー表示名を設定
    if (displayName) {
      await updateProfile(result.user, {
        displayName: displayName
      });
    }
    return result.user;
  } catch (error) {
    console.error('Email registration error:', error);
    throw error;
  }
};

// メールアドレスとパスワードでログイン
export const loginWithEmailAndPassword = async (
  email: string, 
  password: string
): Promise<User> => {
  try {
    const result = await firebaseSignInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error('Email login error:', error);
    throw error;
  }
};

// パスワードリセットメールを送信
export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

// サインアウト
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// 現在のユーザーを取得
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// 認証状態の変更を監視
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
}; 