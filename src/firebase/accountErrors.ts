// Firebase に依存しないエラー定義（画面側から Firebase の初期化を引き込まないため分離）

export class ReauthRequiredError extends Error {
  constructor() {
    super('再認証のためパスワードの入力が必要です');
    this.name = 'ReauthRequiredError';
    Object.setPrototypeOf(this, ReauthRequiredError.prototype);
  }
}

// データは削除したが、Auth アカウントの削除が完了しなかった
export class AccountDeletionIncompleteError extends Error {
  constructor() {
    super(
      'データは削除済みですが、アカウントの削除が完了していません。もう一度ログインして、アカウントの削除をやり直してください'
    );
    this.name = 'AccountDeletionIncompleteError';
    Object.setPrototypeOf(this, AccountDeletionIncompleteError.prototype);
  }
}
