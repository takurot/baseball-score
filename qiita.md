# 少年野球のスコアをつけるWebアプリを React + Firebase で作ってみた

## はじめに

少年野球の試合でスコアをつけるとき、紙のスコアブックでは天候や保管の問題があり、既存のスコアアプリは少年野球のルールに合わなかったり、使いにくかったりする課題がありました。そこで、ReactとFirebaseを活用し、少年野球に特化したスコア管理アプリを開発しました。

このアプリは特に以下のポイントにこだわっています：
- 初めての人でも直感的に操作できるシンプルなUI
- スマートフォンでの使いやすさを重視したモバイルファーストデザイン
- チーム内でのデータ共有による協力的なスコア管理
- 少年野球特有のルール（投球数制限、全員打撃など）への対応

![アプリのスクリーンショット](https://example.com/screenshot.png)

## 主な機能

### 1. スコア管理
- リアルタイムでのスコア更新（他の端末と同期）
- 打席ごとの詳細な記録（ヒット、アウト、四球など）
- イニングごとのスコア表示と集計
- 選手の打率や防御率などの統計情報の自動計算

### 2. チーム管理
- 複数チームの登録と管理（複数チームの監督・コーチ向け）
- 選手名簿の管理（背番号、守備位置など）
- チームごとの試合履歴表示と季節ごとの成績管理

### 3. 試合管理
- 試合スケジュールの管理とカレンダー表示
- 試合結果の記録と保存（対戦相手、会場情報なども含む）
- 過去の試合データの参照と分析

### 4. レスポンシブデザイン
- モバイルフレンドリーなUI（片手操作も考慮）
- 画面サイズに応じた最適な表示（スマホ、タブレット、PC）
- タッチ操作に最適化されたインターフェース（大きなボタン、ドラッグ操作対応）

### 5. 認証とデータシェア
- Googleアカウントでのログイン（保護者や監督のアカウントで簡単利用）
- チームごとのデータ共有（監督、コーチ、保護者間で情報共有）
- 権限に基づいたアクセス制御（閲覧のみ、編集可能などの権限設定）

## 技術スタック

### フロントエンド
- **React 18**: 最新のReactを採用し、Concurrent Modeの恩恵を受けています
- **TypeScript**: 型安全なコードで堅牢なアプリケーション開発
- **Material-UI v5**: モダンでレスポンシブなUIコンポーネント
- **React Router v6**: SPA（シングルページアプリケーション）のルーティング

### バックエンド（Firebase）
- **Firestore**: NoSQLデータベースでリアルタイムデータ同期
- **Authentication**: 安全な認証処理とユーザー管理
- **Hosting**: 高速なウェブホスティング
- **Analytics**: ユーザー行動の分析と改善
- **Cloud Functions**: サーバーレスバックエンド処理（集計処理など）

## デモと使用方法

実際に動くデモは[こちら](https://baseball-score-18c48.web.app)で確認できます。

基本的な使用方法：
1. Googleアカウントでログイン
2. チームを作成または既存チームに参加
3. 新規試合を作成し、メンバーを登録
4. スコアをつけながら試合進行
5. 試合終了後、自動で集計された統計データを確認

## 開発の試行錯誤

### 1. データ構造の設計
最初は単純な構造で始めましたが、スコアの詳細な記録や選手情報を組み合わせる必要があり、設計を見直しました：

```typescript
// 最初の設計（単純すぎて問題があった）
interface Game {
  date: string;
  score: number;
  players: string[];
}

// 改善後の設計
interface Game {
  id: string;
  date: string;
  homeTeam: Team;
  awayTeam: Team;
  innings: Inning[];
  status: GameStatus;
  venue?: string;
  weather?: Weather;
  temperature?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Inning {
  inningNumber: number;
  isTop: boolean;
  atBats: AtBat[];
  runs: number;
  hits: number;
  errors: number;
  leftOnBase: number;
}

// 打席データの詳細な情報
interface AtBat {
  batterId: string;
  pitcherId: string;
  result: AtBatResult;
  position?: FieldPosition;
  pitchCount?: number;
  runners?: Runner[];
  notes?: string;
}
```

特に苦労したのは、試合途中での選手交代や守備位置の変更をどう表現するかという点でした。最終的には各イニングごとに出場選手情報を持つ設計に落ち着きました。

### 2. Google認証の実装
ユーザー認証を実装する際、以下のような工夫を行いました：

```typescript
// Firebase認証の設定
const auth = getAuth();
const provider = new GoogleAuthProvider();

// カスタムフックでログイン処理をカプセル化
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ログイン処理
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // ユーザー情報をFirestoreに保存
      await setDoc(doc(db, 'users', user.uid), {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp()
      }, { merge: true }); // 既存データを保持するためにmergeオプション
      
      return user;
    } catch (error) {
      console.error('認証エラー:', error);
      throw error;
    }
  };

  // ログアウト処理
  const signOut = () => auth.signOut();

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  return { user, loading, signInWithGoogle, signOut };
};
```

認証状態を監視し、アプリ全体で利用できるようにカスタムフックを作成したことで、コンポーネント内での認証処理が簡潔になりました。

### 3. データシェア機能
チームデータの共有を実現するため、以下のような設計を行いました：

```typescript
interface Team {
  id: string;
  name: string;
  members: {
    userId: string;
    role: 'admin' | 'coach' | 'scorekeeper' | 'viewer';
    joinedAt: Timestamp;
  }[];
  settings: {
    allowMemberEdit: boolean;
    allowMemberView: boolean;
    shareStatsPublicly: boolean;
    inningCount: number; // 少年野球は通常6イニング
    enforceSubstitutionRules: boolean; // 全員出場ルールの適用
  };
  players: Player[];
  season?: string;
}

// チームメンバーの追加（招待機能）
const inviteTeamMember = async (teamId: string, email: string, role: string) => {
  try {
    // 招待トークンの生成
    const token = Math.random().toString(36).substring(2, 15);
    
    // 招待情報の保存
    await setDoc(doc(db, 'invitations', token), {
      teamId,
      email,
      role,
      expires: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 1週間有効
      createdAt: serverTimestamp()
    });
    
    // メール送信機能（Cloud Functionsで実装）
    await sendInvitationEmail(email, token);
    
    return token;
  } catch (error) {
    console.error('招待エラー:', error);
    throw error;
  }
};
```

チームメンバーには複数の権限レベルを設定し、監督やコーチ、単にスコアを記録する人、閲覧のみの保護者など、様々なユーザーに対応できるようにしました。また、招待機能を実装することで、チームへの参加をセキュアに管理できるようにしました。

### 4. パフォーマンス最適化
大量のデータを扱う際のパフォーマンス問題に取り組みました：

- **Firestoreのクエリ最適化**：必要なデータのみを取得するクエリ設計
  ```typescript
  // 試合一覧取得の最適化例
  const getRecentGames = async (teamId: string, limit = 10) => {
    const gamesRef = collection(db, 'games');
    const q = query(
      gamesRef,
      where('teamId', '==', teamId),
      orderBy('date', 'desc'),
      limit(limit)
    );
    return getDocs(q);
  };
  ```

- **データのキャッシュ戦略**：React Query を活用したキャッシュ管理
  ```typescript
  // React Queryを使ったキャッシング
  const { data: games, isLoading } = useQuery(
    ['games', teamId],
    () => getRecentGames(teamId),
    {
      staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
      cacheTime: 60 * 60 * 1000 // 1時間キャッシュを保持
    }
  );
  ```

- **リアルタイム更新の効率化**：必要な部分だけリアルタイム更新する仕組み
  ```typescript
  // 現在の試合データだけリアルタイム監視
  useEffect(() => {
    if (!currentGameId) return;
    
    const gameRef = doc(db, 'games', currentGameId);
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        setGameData(doc.data() as Game);
      }
    });
    
    return () => unsubscribe();
  }, [currentGameId]);
  ```

### 5. モバイル対応
スマートフォンでの使用を考慮し、UIを改善しました。特に打席サマリーの表示を工夫しました：

```typescript
// モバイル対応前（従来の表形式）
<Table>
  <TableHead>
    <TableRow>
      <TableCell>イニング</TableCell>
      <TableCell>1</TableCell>
      <TableCell>2</TableCell>
      <TableCell>3</TableCell>
      <TableCell>4</TableCell>
      <TableCell>5</TableCell>
      <TableCell>6</TableCell>
      <TableCell>計</TableCell>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow>
      <TableCell>{homeTeam.name}</TableCell>
      {innings.map((inning) => (
        <TableCell key={inning.id}>{inning.homeScore}</TableCell>
      ))}
      <TableCell>{totalHomeScore}</TableCell>
    </TableRow>
    <TableRow>
      <TableCell>{awayTeam.name}</TableCell>
      {innings.map((inning) => (
        <TableCell key={inning.id}>{inning.awayScore}</TableCell>
      ))}
      <TableCell>{totalAwayScore}</TableCell>
    </TableRow>
  </TableBody>
</Table>

// モバイル対応後（レスポンシブデザイン）
<Box>
  {/* 大画面では従来の表形式 */}
  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
    <Table>
      {/* 従来のテーブル内容 */}
    </Table>
  </Box>
  
  {/* モバイル向けのカード形式表示 */}
  <Box sx={{ display: { xs: 'block', md: 'none' } }}>
    <Typography variant="h6" sx={{ mb: 2 }}>
      {homeTeam.name} vs {awayTeam.name}
    </Typography>
    
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
      <Typography variant="h4">{totalHomeScore}</Typography>
      <Typography variant="h5">-</Typography>
      <Typography variant="h4">{totalAwayScore}</Typography>
    </Box>
    
    {innings.map((inning, index) => (
      <Card key={index} sx={{ mb: 2, p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          第{index + 1}回
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Box>
            <Typography>{homeTeam.name}: {inning.homeScore}</Typography>
            <Typography variant="caption">安打: {inning.homeHits}</Typography>
          </Box>
          <Box>
            <Typography>{awayTeam.name}: {inning.awayScore}</Typography>
            <Typography variant="caption">安打: {inning.awayHits}</Typography>
          </Box>
        </Box>
      </Card>
    ))}
  </Box>
</Box>
```

画面サイズによって表示を切り替えることで、どのデバイスでも見やすい表示を実現しました。特にスマートフォンでは、カード形式の表示が好評でした。

### 6. エラーハンドリング
ユーザー体験を向上させるため、エラーハンドリングを強化しました：

```typescript
// グローバルなエラーハンドリング
const ErrorBoundary = ({ children }) => {
  const [error, setError] = useState<Error | null>(null);
  
  // 予期せぬエラーをキャッチ
  useEffect(() => {
    const handler = (error: ErrorEvent) => {
      console.error('Uncaught error:', error);
      setError(error.error);
      // エラーログをFirebase Analyticsに送信
      logEvent(analytics, 'app_error', {
        error_message: error.message,
        error_stack: error.error?.stack
      });
    };
    
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);
  
  // Firestore操作のエラーハンドリング例
  const handleSaveGame = async (gameData: GameData) => {
    try {
      setIsSaving(true);
      await saveGameToFirestore(gameData);
      showSuccessMessage('試合データを保存しました');
    } catch (error) {
      console.error('保存エラー:', error);
      showErrorMessage(`データの保存に失敗しました: ${error.message}`);
      // オフライン時のデータ保存
      if (!navigator.onLine) {
        saveToLocalStorage('pendingGames', gameData);
        showInfoMessage('オフラインモードで保存しました。オンラインに戻ると自動で同期します。');
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          エラーが発生しました
        </Typography>
        <Typography>{error.message}</Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          アプリを再読み込み
        </Button>
      </Box>
    );
  }
  
  return children;
};
```

ネットワークエラーやデータの不整合など、様々なエラーに対処する仕組みを実装しました。特にオフライン時の対応を強化し、ユーザーがデータを失わないようにしました。

## セキュリティ対策

### 1. 環境変数の管理
- 機密情報（APIキーなど）を環境変数として `.env` ファイルで管理
- 本番環境、開発環境で異なる設定を `.env.production`と`.env.development`で分離
- `.env` ファイルをGitの管理から除外（`.gitignore`に追加）

```
# .env.example（実際の値は含まない例示ファイル）
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
# 以下省略
```

### 2. Firebaseセキュリティルール
Firestoreとストレージに厳格なセキュリティルールを設定：

```javascript
// Firestoreセキュリティルール
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーデータは本人のみアクセス可能
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // チームデータはチームメンバーのみアクセス可能
    match /teams/{teamId} {
      allow read: if request.auth != null && exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
      allow write: if request.auth != null && 
                   exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)) &&
                   get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['admin', 'coach'];
    }
    
    // 試合データはチームメンバーのみアクセス可能（閲覧と編集で権限分離）
    match /games/{gameId} {
      allow read: if request.auth != null && 
                  exists(/databases/$(database)/documents/teams/$(resource.data.teamId)/members/$(request.auth.uid));
      allow write: if request.auth != null && 
                   exists(/databases/$(database)/documents/teams/$(resource.data.teamId)/members/$(request.auth.uid)) &&
                   get(/databases/$(database)/documents/teams/$(resource.data.teamId)/members/$(request.auth.uid)).data.role in ['admin', 'coach', 'scorekeeper'];
    }
  }
}
```

### 3. 認証と認可
- Google認証による安全なログイン
- 細かい権限管理（チーム内での役割ごとの権限設定）
- JWT（JSON Web Token）を使った安全なAPIアクセス

## アプリケーションのスクリーンショット

### ダッシュボード
![ダッシュボード](https://example.com/dashboard.png)

### 試合記録画面
![試合記録](https://example.com/game_recording.png)

### チーム管理画面
![チーム管理](https://example.com/team_management.png)

## 今後の改善点

### 1. 機能拡張
- チーム統計の詳細化（シーズン通算成績、対戦相手別成績など）
- 選手個人の成績分析（打率推移グラフ、得意な投手タイプなど）
- 対戦相手分析（過去の対戦結果、相手チームの強みと弱みなど）
- チーム間のデータ共有機能の強化（公式戦データの共有など）
- 打席・投球ごとの詳細な記録機能（球種、コースなど）

### 2. UI/UX改善
- ダークモード対応（目の疲れを軽減、バッテリー消費も抑制）
- カスタマイズ可能なテーマ（チームカラーに合わせた色設定など）
- アニメーションの追加（スコア変更時の視覚効果など）
- チーム管理画面の改善（ドラッグ&ドロップによる打順変更など）
- オフライン時のユーザー体験向上（PWA化）

### 3. パフォーマンス
- オフライン対応の強化（ServiceWorkerを活用したフル機能オフラインモード）
- データのプリフェッチ（次の試合のデータを先に読み込むなど）
- キャッシュ戦略の最適化（不要なリアルタイム更新の削減）
- Firestore読み書き回数の最適化（コスト削減）

## まとめ

このプロジェクトを通じて、以下の点を学びました：

- React + TypeScriptでの堅牢なアプリケーション開発
- Firebaseを活用したサーバーレスバックエンド設計
- モバイルファーストのUI/UX設計プロセス
- セキュリティを考慮した開発プラクティス
- チーム開発におけるデータ共有と権限管理の重要性

特に、少年野球の現場からのフィードバックを取り入れながら改善を重ねたことで、実用的なアプリケーションに成長させることができました。

## 参考リンク

- [GitHubリポジトリ](https://github.com/takurot/baseball-score)
- [デモアプリケーション](https://baseball-score-18c48.web.app)
- [Firebase公式ドキュメント](https://firebase.google.com/docs)
- [Material-UI公式ドキュメント](https://mui.com/)

## 技術的な詳細

### プロジェクト構造
```
src/
  ├── components/     # UIコンポーネント
  │   ├── game/       # 試合関連コンポーネント
  │   ├── team/       # チーム関連コンポーネント
  │   ├── player/     # 選手関連コンポーネント
  │   ├── common/     # 共通コンポーネント
  │   └── layouts/    # レイアウトコンポーネント
  ├── hooks/         # カスタムフック
  ├── firebase/      # Firebase設定
  ├── context/       # Reactコンテキスト
  ├── types/         # 型定義
  ├── utils/         # ユーティリティ関数
  ├── pages/         # ページコンポーネント
  └── App.tsx        # メインアプリケーション
```

### 主要なコンポーネント
- `GameManager`: 試合管理（試合作成、編集、削除）
- `TeamManager`: チーム管理（選手登録、役割設定）
- `AtBatSummaryTable`: 打席サマリーテーブル（打撃結果の視覚化）
- `GameList`: 試合一覧（カレンダーやリスト表示）
- `AuthProvider`: 認証管理（ログイン状態の管理）
- `TeamProvider`: チームデータ管理（現在のチームコンテキスト）
- `ScoreBoard`: スコアボード（リアルタイム更新）
- `PlayerStats`: 選手成績（統計データの表示）

## 最後に

このアプリケーションは、少年野球のスコア管理をデジタル化し、監督、コーチ、保護者間でのデータ共有を容易にすることで、チームマネジメントを効率化します。特にスマートフォンでの使いやすさを重視し、試合中でも素早くスコアを記録できるインターフェースを実現しました。

今後も現場の声を聞きながら機能を拡充し、より多くの少年野球チームに喜んでいただけるアプリケーションに育てていきたいと考えています。

ご質問やフィードバックがありましたら、お気軽にコメントください。また、GitHubでのコントリビューションも歓迎しています。 