import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { getDoc, getDocs, updateDoc } from 'firebase/firestore';
import TeamManager from '../TeamManager';
import { saveGame } from '../../firebase/gameService';
import { getAllTeamStats } from '../../firebase/statsService';
import { Game } from '../../types';

jest.mock('../../firebase/config', () => ({ db: {} }));
jest.mock('../../firebase/authService', () => ({
  getCurrentUser: () => ({ uid: 'owner', email: 'test@example.com' }),
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'owner' } }),
}));
jest.mock('../../firebase/teamService', () => ({
  getUserTeams: async () => [{ id: 'registered' }],
  getTeamById: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

test.each(['all', 'official', 'practice'] as const)(
  '%s: 編集から重複選手を削除し、上書き保存すると通算成績から消える',
  async (filter) => {
    const player = (id: string) => ({
      id,
      name: '同名選手',
      number: '12',
      position: 'P',
      isActive: false,
      order: 0,
    });
    const initial: Game = {
      id: 'game',
      userId: 'owner',
      date: '2026-10-29',
      gameType: filter === 'practice' ? 'practice' : 'official',
      currentInning: 1,
      homeTeam: {
        id: 'registered',
        name: '登録チーム',
        players: [player('canonical'), player('extra')],
        atBats: [
          {
            id: 'ab1',
            playerId: 'canonical',
            result: 'HR',
            inning: 1,
            isTop: false,
            rbi: 2,
            isOut: false,
          },
        ],
      },
      awayTeam: { id: '', name: '相手', players: [], atBats: [] },
      runEvents: [
        {
          id: 'run',
          inning: 1,
          isTop: true,
          runType: 'その他',
          runCount: 1,
          timestamp: 123,
        },
      ],
      outEvents: [
        {
          id: 'out',
          inning: 1,
          isTop: true,
          outType: '牽制アウト',
          timestamp: 456,
        },
      ],
    };
    let stored = initial;
    (getDoc as jest.Mock).mockImplementation(async () => ({
      id: stored.id,
      exists: () => true,
      data: () => stored,
    }));
    (getDocs as jest.Mock).mockImplementation(async () => ({
      docs: [{ id: stored.id, data: () => stored }],
    }));
    (updateDoc as jest.Mock).mockImplementation(async (_ref, payload) => {
      stored = { ...stored, ...payload };
    });
    (updateDoc as jest.Mock).mockClear();
    const before = (await getAllTeamStats(filter))[0];
    expect(before.playerStats.map((p) => p.playerId)).toEqual([
      'canonical',
      'extra',
    ]);
    const Harness = () => {
      const [game, setGame] = React.useState(initial);
      return (
        <>
          <TeamManager
            team={game.homeTeam}
            role="home"
            onTeamUpdate={(homeTeam) =>
              setGame((previous) => ({ ...previous, homeTeam }))
            }
          />
          <button onClick={() => saveGame(game)}>試合を上書き保存</button>
        </>
      );
    };
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={createTheme()}>
        <Harness />
      </ThemeProvider>
    );
    await user.click(
      screen.getAllByRole('button', { name: '選手情報を編集' })[1]
    );
    await user.click(screen.getByRole('button', { name: 'この試合から削除' }));
    await user.click(
      within(
        screen.getByRole('dialog', { name: '選手をこの試合から削除' })
      ).getByRole('button', { name: '削除する' })
    );
    await user.click(
      await screen.findByRole('button', { name: '試合を上書き保存' })
    );
    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
    expect(stored.homeTeam.atBats).toEqual(initial.homeTeam.atBats);
    expect(stored.awayTeam).toEqual(initial.awayTeam);
    expect(stored.runEvents).toEqual(initial.runEvents);
    expect(stored.outEvents).toEqual(initial.outEvents);
    const after = (await getAllTeamStats(filter))[0];
    expect(after.playerStats.map((p) => p.playerId)).toEqual(['canonical']);
    expect(after.playerStats[0]).toEqual(before.playerStats[0]);
    expect({ ...after, playerStats: [] }).toEqual({
      ...before,
      playerStats: [],
    });
    await user.click(
      await screen.findByRole('button', { name: '試合を上書き保存' })
    );
    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(2));
    expect(await getAllTeamStats(filter)).toEqual([after]);
  }
);
