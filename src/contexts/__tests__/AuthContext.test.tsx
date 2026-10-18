import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import {
  signInWithGoogle,
  onAuthStateChange,
} from '../../firebase/authService';

jest.mock('../../firebase/authService', () => ({
  onAuthStateChange: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  loginWithEmailAndPassword: jest.fn(),
  registerWithEmailAndPassword: jest.fn(),
  sendPasswordReset: jest.fn(),
}));

const mockedSignInWithGoogle = signInWithGoogle as jest.Mock;
const mockedOnAuthStateChange = onAuthStateChange as jest.Mock;

describe('AuthContext - signIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedOnAuthStateChange.mockImplementation((callback) => {
      callback(null);
      return jest.fn(); // unsubscribe
    });
  });

  test('signInWithGoogle 成功時は User オブジェクトを返す', async () => {
    const mockUser = { uid: 'test-user-123', email: 'test@example.com' };
    mockedSignInWithGoogle.mockResolvedValueOnce(mockUser);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    let returnedUser;
    await act(async () => {
      returnedUser = await result.current.signIn();
    });

    expect(returnedUser).toBe(mockUser);
  });

  test('signInWithGoogle 失敗時は例外を握りつぶさずに再送出する', async () => {
    const error = {
      code: 'auth/popup-closed-by-user',
      message: 'Popup closed',
    };
    mockedSignInWithGoogle.mockRejectedValueOnce(error);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await expect(result.current.signIn()).rejects.toEqual(error);
    });
  });
});
