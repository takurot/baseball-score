import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from './config';
import { TeamSetting, PlayerSetting } from '../types';
import { getCurrentUser } from './authService';

const TEAMS_COLLECTION = 'teams';

// 所有権検証付きでトランザクションスナップショットからチームデータを取得
const requireOwnedTeamFromSnapshot = (
  teamSnap: { exists: () => boolean; data: () => unknown },
  user: { uid: string }
): TeamSetting => {
  if (!teamSnap.exists()) {
    throw new Error('チームデータが見つかりません');
  }

  const team = teamSnap.data() as TeamSetting;
  if (team.userId !== user.uid) {
    throw new Error('このデータを編集する権限がありません');
  }

  return team;
};

// チームデータを保存（新規作成）
export const createTeam = async (
  team: Omit<
    TeamSetting,
    'id' | 'userId' | 'userEmail' | 'createdAt' | 'updatedAt'
  >
): Promise<string> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    // 保存前にデータを整形
    const teamToSave = {
      ...team,
      userId: user.uid,
      userEmail: user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // 保存処理
    const docRef = await addDoc(collection(db, TEAMS_COLLECTION), teamToSave);
    console.log('Team saved successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving team:', error);
    throw error;
  }
};

// チームデータを更新
export const updateTeam = async (
  teamId: string,
  teamData: Partial<TeamSetting>
): Promise<void> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    // 権限チェック
    const teamSnap = await getDoc(doc(db, TEAMS_COLLECTION, teamId));
    requireOwnedTeamFromSnapshot(teamSnap, user);

    // 更新データを準備（保護フィールドは上書きしない）
    const updateData = {
      ...teamData,
      updatedAt: serverTimestamp(),
    } as Record<string, unknown>;
    delete updateData.id;
    delete updateData.userId;
    delete updateData.userEmail;
    delete updateData.createdAt;

    // 更新処理
    const teamRef = doc(db, TEAMS_COLLECTION, teamId);
    await updateDoc(teamRef, updateData);
    console.log('Team updated successfully with ID:', teamId);
  } catch (error) {
    console.error('Error updating team:', error);
    throw error;
  }
};

// チームデータを削除
export const deleteTeam = async (teamId: string): Promise<void> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    // 権限チェック
    const team = await getTeamById(teamId);
    if (!team) {
      throw new Error('チームデータが見つかりません');
    }

    if (team.userId !== user.uid) {
      throw new Error('このデータを削除する権限がありません');
    }

    // 削除処理
    const teamRef = doc(db, TEAMS_COLLECTION, teamId);
    await deleteDoc(teamRef);
    console.log('Team deleted successfully with ID:', teamId);
  } catch (error) {
    console.error('Error deleting team:', error);
    throw error;
  }
};

// チームデータを取得（単一）
export const getTeamById = async (
  teamId: string
): Promise<TeamSetting | null> => {
  try {
    const docRef = doc(db, TEAMS_COLLECTION, teamId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as TeamSetting;
      return { ...data, id: docSnap.id };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting team:', error);
    throw error;
  }
};

// ユーザーの全チームデータを取得
export const getUserTeams = async (): Promise<TeamSetting[]> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    // ユーザーIDでフィルタリングしたクエリを作成
    const q = query(
      collection(db, TEAMS_COLLECTION),
      where('userId', '==', user.uid),
      orderBy('name', 'asc')
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as TeamSetting;
      return { ...data, id: doc.id };
    });
  } catch (error) {
    console.error('Error getting teams:', error);
    throw error;
  }
};

// 選手データをチームに追加
export const addPlayerToTeam = async (
  teamId: string,
  player: Omit<PlayerSetting, 'id' | 'createdAt'>
): Promise<void> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    // トランザクション内で読み取り・権限チェック・書き込みを一貫させる
    const teamRef = doc(db, TEAMS_COLLECTION, teamId);
    await runTransaction(db, async (transaction) => {
      const teamSnap = await transaction.get(teamRef);
      const team = requireOwnedTeamFromSnapshot(teamSnap, user);

      // 新しい選手データを準備
      const newPlayer: PlayerSetting = {
        ...player,
        id: crypto.randomUUID(), // クライアントサイドでIDを生成
        createdAt: new Date().toISOString(), // サーバータイムスタンプの代わりに現在時刻を文字列で保存
      };

      // 既存の選手リストに追加
      transaction.update(teamRef, {
        players: [...team.players, newPlayer],
        updatedAt: serverTimestamp(),
      });
    });
    console.log('Player added to team successfully');
  } catch (error) {
    console.error('Error adding player to team:', error);
    throw error;
  }
};

// チームから選手データを削除
export const removePlayerFromTeam = async (
  teamId: string,
  playerId: string
): Promise<void> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    // トランザクション内で読み取り・権限チェック・書き込みを一貫させる
    const teamRef = doc(db, TEAMS_COLLECTION, teamId);
    await runTransaction(db, async (transaction) => {
      const teamSnap = await transaction.get(teamRef);
      const team = requireOwnedTeamFromSnapshot(teamSnap, user);

      // 選手を除外
      const updatedPlayers = team.players.filter(
        (player) => player.id !== playerId
      );

      transaction.update(teamRef, {
        players: updatedPlayers,
        updatedAt: serverTimestamp(),
      });
    });
    console.log('Player removed from team successfully');
  } catch (error) {
    console.error('Error removing player from team:', error);
    throw error;
  }
};

// チーム内の選手データを更新
export const updatePlayerInTeam = async (
  teamId: string,
  playerId: string,
  playerData: Partial<Omit<PlayerSetting, 'id' | 'createdAt'>>
): Promise<void> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    // トランザクション内で読み取り・権限チェック・書き込みを一貫させる
    const teamRef = doc(db, TEAMS_COLLECTION, teamId);
    await runTransaction(db, async (transaction) => {
      const teamSnap = await transaction.get(teamRef);
      const team = requireOwnedTeamFromSnapshot(teamSnap, user);

      // 選手データを更新
      const updatedPlayers = team.players.map((player) => {
        if (player.id === playerId) {
          return { ...player, ...playerData };
        }
        return player;
      });

      transaction.update(teamRef, {
        players: updatedPlayers,
        updatedAt: serverTimestamp(),
      });
    });
    console.log('Player updated in team successfully');
  } catch (error) {
    console.error('Error updating player in team:', error);
    throw error;
  }
};
