import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth';
import {
  collection,
  getDocs,
  limit,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { getCurrentUser } from './authService';

// アカウント削除（利用者自身のデータ消去）。
// 順序: 再認証 → games/teams の全削除 → Auth アカウントの削除。
// データの削除には認証済みであること（ルール）が必要なため Auth は最後に消す。
// 再認証を先に行うので、再認証に失敗してもデータだけ消えた状態にはならない。

const COLLECTIONS = ['games', 'teams'] as const;
const BATCH_SIZE = 400; // Firestore の 1 バッチ上限(500)より小さくする

// Firebase は、直近のサインインから一定時間が過ぎると機密操作に再認証を要求する
const RECENT_LOGIN_WINDOW_MS = 5 * 60 * 1000;

export type ReauthMethod = 'google' | 'password' | 'unknown';

export class ReauthRequiredError extends Error {
  constructor() {
    super('再認証のためパスワードの入力が必要です');
    this.name = 'ReauthRequiredError';
  }
}

export const needsReauthentication = (user: User): boolean => {
  const lastSignIn = Date.parse(user.metadata.lastSignInTime ?? '');
  return (
    Number.isNaN(lastSignIn) || Date.now() - lastSignIn > RECENT_LOGIN_WINDOW_MS
  );
};

export const getReauthMethod = (user: User): ReauthMethod => {
  const providers = user.providerData.map((info) => info.providerId);
  if (providers.includes('google.com')) return 'google';
  if (providers.includes('password')) return 'password';
  return 'unknown';
};

const reauthenticate = async (user: User, password?: string) => {
  const method = getReauthMethod(user);
  if (method === 'google') {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    return;
  }
  if (method === 'password') {
    if (!password || !user.email) throw new ReauthRequiredError();
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, password)
    );
    return;
  }
  throw new Error('このログイン方法ではアカウントを削除できません');
};

// 自分の uid の文書だけを、1 バッチずつ空になるまで削除する
const deleteOwnedDocuments = async (uid: string) => {
  for (const name of COLLECTIONS) {
    for (;;) {
      const snapshot = await getDocs(
        query(
          collection(db, name),
          where('userId', '==', uid),
          limit(BATCH_SIZE)
        )
      );
      if (snapshot.empty) break;
      const batch = writeBatch(db);
      snapshot.docs.forEach((document) => batch.delete(document.ref));
      await batch.commit();
    }
  }
};

export const deleteAccount = async ({
  password,
}: { password?: string } = {}): Promise<void> => {
  const user = getCurrentUser();
  if (!user) throw new Error('ログインが必要です');

  if (needsReauthentication(user)) {
    await reauthenticate(user, password);
  }
  await deleteOwnedDocuments(user.uid);
  await deleteUser(user);
};
