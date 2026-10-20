import React from 'react';
import nodeCrypto from 'crypto';
import { render, screen } from '@testing-library/react';
import { axe } from '../../test/axe';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TeamList from '../TeamList';
import { getUserTeams } from '../../firebase/teamService';
import { useAuth } from '../../contexts/AuthContext';
import { TeamSetting } from '../../types';

// jsdom 環境における Web Crypto の polyfill
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: (nodeCrypto as any).webcrypto ?? {
      randomUUID: () => '00000000-0000-0000-0000-000000000000',
      getRandomValues: (arr: any) => nodeCrypto.randomBytes(arr.length),
    },
    configurable: true,
  });
} else if (typeof globalThis.crypto.getRandomValues === 'undefined') {
  Object.defineProperty(globalThis.crypto, 'getRandomValues', {
    value: (arr: any) => nodeCrypto.randomBytes(arr.length),
    configurable: true,
  });
}

jest.mock('../../firebase/teamService', () => ({
  getUserTeams: jest.fn(),
  createTeam: jest.fn(),
  updateTeam: jest.fn(),
  deleteTeam: jest.fn(),
  addPlayerToTeam: jest.fn(),
  updatePlayerInTeam: jest.fn(),
  removePlayerFromTeam: jest.fn(),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockedGetUserTeams = getUserTeams as jest.MockedFunction<
  typeof getUserTeams
>;
const mockedUseAuth = useAuth as jest.Mock;

const mockTeams: TeamSetting[] = [
  {
    id: 'team-1',
    name: 'ライオンズ',
    userId: 'user-1',
    userEmail: 'user1@example.com',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    players: [
      {
        id: 'player-1',
        name: '山田 太郎',
        number: '1',
        position: '投手',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
  },
];

describe('TeamList accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      currentUser: { uid: 'user-1', email: 'user1@example.com' },
    });
    mockedGetUserTeams.mockResolvedValue(mockTeams);
  });

  test('has no axe violations on initial load', async () => {
    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <TeamList />
      </ThemeProvider>
    );

    expect(await screen.findByText('ライオンズ')).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
