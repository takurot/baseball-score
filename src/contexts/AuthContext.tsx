import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  onAuthStateChange,
  signInWithGoogle,
  signOut,
  loginWithEmailAndPassword,
  registerWithEmailAndPassword,
  sendPasswordReset,
} from '../firebase/authService';

// Contextの型定義
interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  signIn: () => Promise<User | null>;
  logOut: () => Promise<void>;
  loginWithEmailAndPassword: (email: string, password: string) => Promise<User>;
  registerWithEmailAndPassword: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<User>;
  sendPasswordReset: (email: string) => Promise<void>;
}

// デフォルト値
const defaultAuthContext: AuthContextType = {
  currentUser: null,
  isLoading: true,
  signIn: async () => null,
  logOut: async () => {},
  loginWithEmailAndPassword: async () => {
    throw new Error('Not implemented');
  },
  registerWithEmailAndPassword: async () => {
    throw new Error('Not implemented');
  },
  sendPasswordReset: async () => {
    throw new Error('Not implemented');
  },
};

// Context作成
const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// カスタムフック
export const useAuth = () => useContext(AuthContext);

// ProviderコンポーネントのProps
interface AuthProviderProps {
  children: React.ReactNode;
}

// Providerコンポーネント
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Firebase Authの認証状態を監視
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    // クリーンアップ関数
    return unsubscribe;
  }, []);

  // Googleでサインイン
  const signIn = async (): Promise<User | null> => {
    try {
      const user = await signInWithGoogle();
      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      return null;
    }
  };

  // サインアウト
  const logOut = async (): Promise<void> => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // コンテキスト値
  const value: AuthContextType = {
    currentUser,
    isLoading,
    signIn,
    logOut,
    loginWithEmailAndPassword,
    registerWithEmailAndPassword,
    sendPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
