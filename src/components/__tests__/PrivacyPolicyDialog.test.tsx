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
