// Firebase Auth のエラーコードを画面表示用の日本語メッセージへ変換する
// 呼び出し側は文脈ごとに異なるメッセージ（コード→文言）とフォールバックを渡す
//
// このモジュールは意図的に firebase/auth や ./firebase/authService に依存しない。
// 依存すると、単に文言変換をしたいだけの呼び出し元（例: Login.tsx）まで
// Firebase Auth SDK の実初期化（getAuth(app)）を import グラフに引き込んでしまい、
// Firebase の環境変数が設定されていないテスト環境（CI 等）で
// `FirebaseError: Firebase: Error (auth/invalid-api-key)` によりテストスイートが
// 読み込み時点で失敗する原因になる。
export const getAuthErrorMessage = (
  error: unknown,
  messages: Partial<Record<string, string>>,
  fallback: string
): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    const code = (error as { code: string }).code;
    return messages[code] ?? fallback;
  }
  return fallback;
};
