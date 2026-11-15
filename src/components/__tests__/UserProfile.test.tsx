import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserProfile from '../UserProfile';
import { useAuth } from '../../contexts/AuthContext';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

describe('UserProfile', () => {
  test('ユーザーメニューからプライバシーポリシーを開ける', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: {
        displayName: '山田',
        email: 'a@example.com',
        photoURL: null,
      },
      logOut: jest.fn(),
    });
    const user = userEvent.setup();
    render(<UserProfile />);

    await user.click(screen.getByRole('button'));
    await user.click(
      await screen.findByRole('menuitem', { name: 'プライバシーポリシー' })
    );

    expect(
      await screen.findByRole('dialog', { name: 'プライバシーポリシー' })
    ).toBeInTheDocument();
  });
});
