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
  updateProfile,
} from 'firebase/auth';
import { app } from './config';
// getAuthErrorMessage は firebase/auth に依存しない純粋な文言変換ロジックのため
// 別モジュールに切り出してある。呼び出し元の互換性のためここで再エクスポートする。
import { getAuthErrorMessage } from '../utils/authErrorMessage';

// 認証インスタンスを取得
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// エラーをログに記録したうえで再送出する（各関数の catch を単純化するための共通処理）
const logAndRethrow = (context: string, error: unknown): never => {
  console.error(context, error);
  throw error;
};

export { getAuthErrorMessage };

// Googleでサインイン
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    return logAndRethrow('Google sign in error:', error);
  }
};

// メールアドレスとパスワードで新規ユーザー登録
export const registerWithEmailAndPassword = async (
  email: string,
  password: string,
  displayName: string
): Promise<User> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // ユーザー表示名を設定
    if (displayName) {
      await updateProfile(result.user, {
        displayName: displayName,
      });
      // updateProfile 後は onAuthStateChanged が再fire されず、
      // auth.currentUser / 呼び出し元が受け取る user が displayName: null の
      // ままになるため、明示的に最新情報を再取得する
      await result.user.reload();
    }
    return result.user;
  } catch (error) {
    return logAndRethrow('Email registration error:', error);
  }
};

// メールアドレスとパスワードでログイン
export const loginWithEmailAndPassword = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const result = await firebaseSignInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return result.user;
  } catch (error) {
    return logAndRethrow('Email login error:', error);
  }
};

// パスワードリセットメールを送信
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    logAndRethrow('Password reset error:', error);
  }
};

// サインアウト
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    logAndRethrow('Sign out error:', error);
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
