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
import {
  AccountDeletionIncompleteError,
  ReauthRequiredError,
} from './accountErrors';

export { AccountDeletionIncompleteError, ReauthRequiredError };

// アカウント削除（利用者自身のデータ消去）。
// 順序: 再認証 → games/teams の全削除 → Auth アカウントの削除。
// データの削除には認証済みであること（ルール）が必要なため Auth は最後に消す。
// 再認証は、サインインからの経過時間にかかわらず必ず最初に行う。Firebase が
// アカウント削除で見るのはこのセッションのトークンの認証時刻で、クライアントの
// 時計や lastSignInTime（他の端末のログインも反映される）では判定できない。
// 再認証が済んでいなければ、データだけ消えてアカウントが残る状態になり得る。

const COLLECTIONS = ['games', 'teams'] as const;
const BATCH_SIZE = 400; // Firestore の 1 バッチ上限(500)より小さくする

export type ReauthMethod = 'google' | 'password' | 'unknown';

export const getReauthMethod = (user: User): ReauthMethod => {
  const providers = (user.providerData ?? []).map((info) => info.providerId);
  if (providers.includes(GoogleAuthProvider.PROVIDER_ID)) return 'google';
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

  await reauthenticate(user, password);
  await deleteOwnedDocuments(user.uid);
  try {
    await deleteUser(user);
  } catch (error) {
    console.error('Account deletion failed after the data was deleted:', error);
    throw new AccountDeletionIncompleteError();
  }
};
