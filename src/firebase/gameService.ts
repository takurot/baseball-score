import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc,
  where,
  updateDoc,
} from 'firebase/firestore';
import { db } from './config';
import { Game } from '../types';
import { getCurrentUser } from './authService';

const GAMES_COLLECTION = 'games';

// Firestoreのドキュメントサイズ制限（1MB）に対する安全マージンを見た保存許容サイズ
const MAX_GAME_DOCUMENT_SIZE_BYTES = 1_000_000;

// getAllGames で一度に取得する試合数の上限（無制限クエリを避ける）
const MAX_GAMES_PER_PAGE = 200;

// 所有権検証付きで既存の試合データを取得（不存在・他人のデータはエラー）
const requireOwnedGame = async (gameId: string): Promise<Game> => {
  const game = await getGameById(gameId);
  if (!game) {
    throw new Error('データが見つかりません');
  }
  return game;
};

// saveGame / saveGameAsNew で共通の保存用ペイロード生成
// （クローン・所有者情報付与・タイムスタンプ付与・サイズチェックをまとめる）
const buildGameToSave = (
  game: Game,
  user: { uid: string; email: string | null },
  { resetId }: { resetId: boolean }
): Record<string, unknown> => {
  // 保存前にデータを整形（循環参照を避けるため、JSONに変換してから再度パースする）
  const gameClone = JSON.parse(JSON.stringify(game));

  if (resetId) {
    delete gameClone.id;
  }

  const gameToSave = {
    ...gameClone,
    userId: user.uid, // ユーザーIDを追加
    userEmail: user.email, // ユーザーのメールアドレスを追加
    isPublic: game.isPublic ?? false, // 公開状態を追加
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const gameDataSize = new Blob([JSON.stringify(gameToSave)]).size;
  console.log(`Game data size: ${gameDataSize} bytes`);

  if (gameDataSize > MAX_GAME_DOCUMENT_SIZE_BYTES) {
    throw new Error(
      `データサイズが大きすぎます (${Math.round(gameDataSize / 1024)} KB)。1MB以下にしてください。`
    );
  }

  return gameToSave;
};

// 試合データを保存
export const saveGame = async (game: Game): Promise<string> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    const gameToSave = buildGameToSave(game, user, { resetId: false });

    let docRef;

    if (game.id) {
      // 既存のドキュメントを所有権検証してから更新
      await requireOwnedGame(game.id);

      // 既存のドキュメントを更新
      docRef = doc(db, GAMES_COLLECTION, game.id);
      // 作成日時とドキュメントIDは更新対象から除外（作成日時は維持、IDはフィールドとして保存しない）
      const updateData = { ...gameToSave };
      delete updateData.id;
      delete updateData.createdAt;
      await updateDoc(docRef, updateData);
      console.log('Game updated successfully with ID:', game.id);
      return game.id;
    } else {
      // 新しいドキュメントを作成
      docRef = await addDoc(collection(db, GAMES_COLLECTION), gameToSave);
      console.log('Game saved successfully with ID:', docRef.id);
      return docRef.id;
    }
  } catch (error) {
    console.error('Error saving game:', error);
    throw error;
  }
};

// 試合データを新規保存（常に新しいドキュメントとして保存）
export const saveGameAsNew = async (game: Game): Promise<string> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    const gameToSave = buildGameToSave(game, user, { resetId: true });

    // 常に新しいドキュメントを作成
    const docRef = await addDoc(collection(db, GAMES_COLLECTION), gameToSave);
    console.log('Game saved as new with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving game as new:', error);
    throw error;
  }
};

// 全ての試合データを取得（日付順）
export const getAllGames = async (): Promise<Game[]> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    // ユーザーIDでフィルタリングしたクエリを作成
    // 無制限クエリを避けるため、最新 MAX_GAMES_PER_PAGE 件までに制限する
    const q = query(
      collection(db, GAMES_COLLECTION),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(MAX_GAMES_PER_PAGE)
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as Game;
      return { ...data, id: doc.id };
    });
  } catch (error) {
    console.error('Error getting games:', error);
    throw error;
  }
};

// 特定の試合データを取得
// 契約: ドキュメントが存在しない場合と、存在するが自分のデータでない場合の
// どちらも null を返す（他ユーザーへドキュメントの存在有無を漏らさないため
// 区別しない）。それ以外のエラー（ネットワーク等）は throw する
export const getGameById = async (gameId: string): Promise<Game | null> => {
  try {
    const docRef = doc(db, GAMES_COLLECTION, gameId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data() as Game;

    // 自分のデータかチェック
    const user = getCurrentUser();
    if (!user || data.userId !== user.uid) {
      return null;
    }

    return { ...data, id: docSnap.id };
  } catch (error) {
    console.error('Error getting game:', error);
    throw error;
  }
};

// 特定の試合データを取得（パブリックに共有されたゲーム用）
export const getSharedGameById = async (
  gameId: string
): Promise<Game | null> => {
  try {
    const docRef = doc(db, GAMES_COLLECTION, gameId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as Game;

      // 公開設定されているかチェック
      if (!data.isPublic) {
        console.error('This game is not public:', gameId);
        throw new Error('この試合データは公開されていません');
      }

      // 公開ペイロードから所有者の個人情報を除去する
      const publicData = { ...data };
      delete publicData.userId;
      delete publicData.userEmail;

      return { ...publicData, id: docSnap.id };
    } else {
      console.error('Game not found:', gameId);
      return null;
    }
  } catch (error) {
    console.error('Error getting shared game:', error);
    throw error;
  }
};

// 試合データを削除
export const deleteGame = async (gameId: string): Promise<void> => {
  try {
    // 権限チェック
    await requireOwnedGame(gameId);

    const docRef = doc(db, GAMES_COLLECTION, gameId);
    await deleteDoc(docRef);
    console.log('Game deleted successfully with ID:', gameId);
  } catch (error) {
    console.error('Error deleting game:', error);
    throw error;
  }
};

// 試合の公開設定を更新
export const updateGamePublicStatus = async (
  gameId: string,
  isPublic: boolean
): Promise<void> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    // 権限チェック（自分のデータかどうか）
    await requireOwnedGame(gameId);

    const docRef = doc(db, GAMES_COLLECTION, gameId);
    await updateDoc(docRef, {
      isPublic: isPublic,
      updatedAt: serverTimestamp(),
    });

    console.log(`Game public status updated to ${isPublic} for ID:`, gameId);
  } catch (error) {
    console.error('Error updating game public status:', error);
    throw error;
  }
};
