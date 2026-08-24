import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TeamManager from '../TeamManager';
import { getUserTeams, getTeamById } from '../../firebase/teamService';
import { Team, TeamSetting } from '../../types';

jest.mock('../../firebase/teamService', () => ({
  getUserTeams: jest.fn(),
  getTeamById: jest.fn(),
}));

let mockCurrentUser: { uid: string; email: string } | null = {
  uid: 'user-1',
  email: 'me@example.com',
};
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: mockCurrentUser }),
}));

const mockedGetUserTeams = getUserTeams as jest.MockedFunction<
  typeof getUserTeams
>;
const mockedGetTeamById = getTeamById as jest.MockedFunction<
  typeof getTeamById
>;

const makeTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 'team-1',
  name: '先攻チーム',
  players: [
    {
      id: 'p1',
      name: '選手1',
      number: '1',
      position: 'CF',
      isActive: true,
      order: 1,
    },
  ],
  atBats: [],
  ...overrides,
});

const savedTeam: TeamSetting = {
  id: 'saved-team-1',
  name: '保存済みチーム',
  players: [{ id: 'sp1', name: '保存選手1', number: '9', position: 'P' }],
  userId: 'user-1',
};

const renderTeamManager = (team: Team, onTeamUpdate = jest.fn()) => {
  render(
    <ThemeProvider theme={createTheme()}>
      <TeamManager team={team} onTeamUpdate={onTeamUpdate} />
    </ThemeProvider>
  );
  return { onTeamUpdate };
};

describe('TeamManager - チーム選択導線の統合', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { uid: 'user-1', email: 'me@example.com' };
    mockedGetUserTeams.mockResolvedValue([savedTeam]);
    mockedGetTeamById.mockResolvedValue(savedTeam);
  });

  test('未ログインの場合、チーム一覧を取得せずログインを促すメッセージを表示する', async () => {
    mockCurrentUser = null;
    const user = userEvent.setup();
    renderTeamManager(makeTeam());

    await user.click(screen.getByRole('button', { name: 'チームを選択' }));

    expect(
      await screen.findByText('チームを読み込むにはログインしてください')
    ).toBeInTheDocument();
    expect(mockedGetUserTeams).not.toHaveBeenCalled();
  });

  test('打席が未記録の場合は確認なしで即座にチームを反映する', async () => {
    const user = userEvent.setup();
    const { onTeamUpdate } = renderTeamManager(makeTeam({ atBats: [] }));

    await user.click(screen.getByRole('button', { name: 'チームを選択' }));
    await user.click(await screen.findByText('保存済みチーム'));

    expect(onTeamUpdate).toHaveBeenCalledTimes(1);
    expect(onTeamUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: '保存済みチーム', atBats: [] })
    );
  });

  test('打席が記録済みの場合は確認ダイアログを挟み、キャンセルすると反映しない', async () => {
    const user = userEvent.setup();
    const existingAtBat = {
      id: 'ab1',
      playerId: 'p1',
      inning: 1,
      isTop: true,
      result: 'IH' as const,
      rbi: 0,
      isOut: false,
    };
    const { onTeamUpdate } = renderTeamManager(
      makeTeam({ atBats: [existingAtBat] })
    );

    await user.click(screen.getByRole('button', { name: 'チームを選択' }));
    await user.click(await screen.findByText('保存済みチーム'));

    expect(await screen.findByText('選手を入れ替えます')).toBeInTheDocument();
    expect(onTeamUpdate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(onTeamUpdate).not.toHaveBeenCalled();
  });

  test('打席が記録済みの場合、確認して「入れ替える」を押すと打席データを保持したまま反映する', async () => {
    const user = userEvent.setup();
    const existingAtBat = {
      id: 'ab1',
      playerId: 'p1',
      inning: 1,
      isTop: true,
      result: 'IH' as const,
      rbi: 0,
      isOut: false,
    };
    const { onTeamUpdate } = renderTeamManager(
      makeTeam({ atBats: [existingAtBat] })
    );

    await user.click(screen.getByRole('button', { name: 'チームを選択' }));
    await user.click(await screen.findByText('保存済みチーム'));
    await screen.findByText('選手を入れ替えます');

    await user.click(screen.getByRole('button', { name: '入れ替える' }));

    expect(onTeamUpdate).toHaveBeenCalledTimes(1);
    expect(onTeamUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '保存済みチーム',
        atBats: [existingAtBat],
      })
    );
  });
});
