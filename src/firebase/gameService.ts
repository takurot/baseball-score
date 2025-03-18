import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  orderBy,
  serverTimestamp,
  deleteDoc,
  where
} from 'firebase/firestore';
import { db } from './config';
import { Game } from '../types';
import { getCurrentUser } from './authService';

const GAMES_COLLECTION = 'games';

// 試合データを保存
export const saveGame = async (game: Game): Promise<string> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    // 保存前にデータを整形（循環参照を避けるため、JSONに変換してから再度パースする）
    const gameClone = JSON.parse(JSON.stringify(game));
    
    // タイムスタンプを追加
    const gameToSave = {
      ...gameClone,
      userId: user.uid, // ユーザーIDを追加
      userEmail: user.email, // ユーザーのメールアドレスを追加
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // データサイズをチェック
    const gameDataSize = new Blob([JSON.stringify(gameToSave)]).size;
    console.log(`Game data size: ${gameDataSize} bytes`);
    
    // Firestoreのドキュメントサイズ制限は1MB
    if (gameDataSize > 1000000) {
      throw new Error(`データサイズが大きすぎます (${Math.round(gameDataSize/1024)} KB)。1MB以下にしてください。`);
    }
    
    // 保存処理
    const docRef = await addDoc(collection(db, GAMES_COLLECTION), gameToSave);
    console.log('Game saved successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving game:', error);
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
    const q = query(
      collection(db, GAMES_COLLECTION), 
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as Game;
      return { ...data, id: doc.id };
    });
  } catch (error) {
    console.error('Error getting games:', error);
    throw error;
  }
};

// 特定の試合データを取得
export const getGameById = async (gameId: string): Promise<Game | null> => {
  try {
    const docRef = doc(db, GAMES_COLLECTION, gameId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as Game;
      
      // 自分のデータかチェック
      const user = getCurrentUser();
      if (!user || data.userId !== user.uid) {
        throw new Error('このデータにアクセスする権限がありません');
      }
      
      return { ...data, id: docSnap.id };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting game:', error);
    throw error;
  }
};

// 試合データを削除
export const deleteGame = async (gameId: string): Promise<void> => {
  try {
    // 権限チェック
    const game = await getGameById(gameId);
    if (!game) {
      throw new Error('データが見つかりません');
    }
    
    const docRef = doc(db, GAMES_COLLECTION, gameId);
    await deleteDoc(docRef);
    console.log('Game deleted successfully with ID:', gameId);
  } catch (error) {
    console.error('Error deleting game:', error);
    throw error;
  }
}; 