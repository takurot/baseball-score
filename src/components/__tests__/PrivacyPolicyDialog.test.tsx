import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import PrivacyPolicyDialog from '../PrivacyPolicyDialog';
import { PRIVACY_POLICY_SECTIONS } from '../../content/privacyPolicy';

describe('PrivacyPolicyDialog', () => {
  test('公開データの範囲と選手の個人情報の扱いを説明する', () => {
    render(<PrivacyPolicyDialog open onClose={jest.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'プライバシーポリシー' });
    for (const section of PRIVACY_POLICY_SECTIONS) {
      expect(
        screen.getByRole('heading', { name: section.title })
      ).toBeInTheDocument();
    }
    expect(dialog).toHaveTextContent('URLを知っている人は');
    expect(dialog).toHaveTextContent('選手の氏名・背番号');
    expect(dialog).toHaveTextContent('未成年');
    expect(dialog).toHaveTextContent('非公開に戻せます');
    expect(dialog).toHaveTextContent('メールアドレス');
  });

  test('公開されるデータを実態どおりに説明し、実装と異なる断定をしない', () => {
    render(<PrivacyPolicyDialog open onClose={jest.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'プライバシーポリシー' });
    // 公開されるのは試合データ全体（メモ等の自由記入欄を含む）
    expect(dialog).toHaveTextContent('自由記入欄');
    expect(dialog).toHaveTextContent('チーム名');
    expect(dialog).toHaveTextContent('内部ID');
    // メールアドレスは「新たに保存しない」。旧データの消去方法にも触れる
    expect(dialog).toHaveTextContent('新たに保存しません');
    expect(dialog).toHaveTextContent('以前に保存された');
    // 一覧で探せない、という断定は実装（ルール）に依存するため書かない
    expect(dialog).not.toHaveTextContent('一覧には表示されません');
  });

  test('利用状況の計測（Google アナリティクス）で送る情報と送らない情報を説明する', () => {
    render(<PrivacyPolicyDialog open onClose={jest.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'プライバシーポリシー' });
    expect(
      screen.getByRole('heading', { name: '5. 利用状況の計測' })
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Google アナリティクス');
    expect(dialog).toHaveTextContent(
      'チーム名・選手名・試合のタイトル・球場・大会名・メールアドレスは送信しません'
    );
    expect(dialog).toHaveTextContent('Cookie');
    expect(dialog).toHaveTextContent('ブロック');
  });

  test('自分のデータを削除する方法と、消える範囲を説明する', () => {
    render(<PrivacyPolicyDialog open onClose={jest.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'プライバシーポリシー' });
    expect(
      screen.getByRole('heading', { name: '6. データの削除' })
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent('ユーザーメニューの「アカウントを削除」');
    expect(dialog).toHaveTextContent('取り消せません');
    expect(dialog).toHaveTextContent('共有リンク');
  });

  test('閉じるボタンで onClose を呼ぶ', async () => {
    const onClose = jest.fn();
    render(<PrivacyPolicyDialog open onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: '閉じる' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('閉じているときは何も描画しない', () => {
    render(<PrivacyPolicyDialog open={false} onClose={jest.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('重大なアクセシビリティ違反がない', async () => {
    render(<PrivacyPolicyDialog open onClose={jest.fn()} />);
    // `region` はページ全体を対象にするルールで、ダイアログ単体では判定できない
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } })
    ).toHaveNoViolations();
  });
});
