import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TeamManager from '../TeamManager';
import { getUserTeams, getTeamById } from '../../firebase/teamService';
import { generateDefaultPlayers } from '../../utils/defaultPlayers';
import { axe } from 'jest-axe';
import { Team, TeamSetting } from '../../types';

jest.mock('uuid', () => ({ v4: () => require('crypto').randomUUID() }));

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

const renderTeamManager = (
  team: Team,
  onTeamUpdate = jest.fn(),
  role: 'away' | 'home' = 'away'
) => {
  render(
    <ThemeProvider theme={createTheme()}>
      <TeamManager team={team} role={role} onTeamUpdate={onTeamUpdate} />
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
    const { onTeamUpdate } = renderTeamManager(
      makeTeam({ players: [], atBats: [] })
    );

    await user.click(screen.getByRole('button', { name: 'チームを選択' }));
    await user.click(await screen.findByText('保存済みチーム'));

    expect(onTeamUpdate).toHaveBeenCalledTimes(1);
    expect(onTeamUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: '保存済みチーム', atBats: [] })
    );
  });

  test('新規試合の仮選手9人は登録名簿へ置換し、通算名簿へ混入させない', async () => {
    const user = userEvent.setup();
    const { onTeamUpdate } = renderTeamManager(
      makeTeam({ id: 'unregistered-uuid', players: generateDefaultPlayers() })
    );
    await user.click(screen.getByRole('button', { name: 'チームを選択' }));
    await user.click(await screen.findByText(savedTeam.name));
    expect(onTeamUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: savedTeam.id,
        players: [expect.objectContaining({ id: 'sp1' })],
        atBats: [],
      })
    );
    expect(
      screen.queryByText('登録チームと選手を対応付ける')
    ).not.toBeInTheDocument();
  });

  test('仮選手の名前が編集されていれば打席ゼロでも勝手に破棄しない', async () => {
    const user = userEvent.setup();
    const players = generateDefaultPlayers();
    players[0].name = '編集済み';
    const { onTeamUpdate } = renderTeamManager(makeTeam({ players }));
    await user.click(screen.getByRole('button', { name: 'チームを選択' }));
    await user.click(await screen.findByText(savedTeam.name));
    expect(
      await screen.findByText('登録チームと選手を対応付ける')
    ).toBeInTheDocument();
    expect(onTeamUpdate).not.toHaveBeenCalled();
  });

  test('登録済み名簿は初期値と同名でも確認なしに置換しない', async () => {
    const user = userEvent.setup();
    const { onTeamUpdate } = renderTeamManager(
      makeTeam({ id: savedTeam.id, players: generateDefaultPlayers() })
    );
    await user.click(screen.getByRole('button', { name: 'チームを選択' }));
    await user.click(await screen.findByText(savedTeam.name));
    expect(
      await screen.findByText('登録チームと選手を対応付ける')
    ).toBeInTheDocument();
    expect(onTeamUpdate).not.toHaveBeenCalled();
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

    expect(
      await screen.findByText('登録チームと選手を対応付ける')
    ).toBeInTheDocument();
    expect(onTeamUpdate).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', {
      name: '登録チームと選手を対応付ける',
    });
    expect(
      within(dialog).getByText('別人・未対応として保持')
    ).toBeInTheDocument();
    expect(await axe(dialog)).toHaveNoViolations();

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(onTeamUpdate).not.toHaveBeenCalled();
  });

  test('打席が記録済みの場合、確認して「確認して反映」を押すと打席データを保持したまま反映する', async () => {
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
    await screen.findByText('登録チームと選手を対応付ける');

    await user.click(screen.getByRole('button', { name: '確認して反映' }));

    expect(onTeamUpdate).toHaveBeenCalledTimes(1);
    expect(onTeamUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '保存済みチーム',
        atBats: [existingAtBat],
      })
    );
  });

  test('登録済みチームでも別IDの選手を対応付け、全打席参照を更新できる', async () => {
    const user = userEvent.setup();
    const atBats = [1, 2].map((inning) => ({
      id: `ab${inning}`,
      playerId: 'p1',
      inning,
      isTop: true,
      result: 'HR' as const,
      rbi: 2,
      isOut: false,
    }));
    const { onTeamUpdate } = renderTeamManager(
      makeTeam({ id: savedTeam.id, atBats })
    );
    await user.click(screen.getByRole('button', { name: 'チームを選択' }));
    await user.click(await screen.findByText(savedTeam.name));
    const dialog = await screen.findByRole('dialog', {
      name: '登録チームと選手を対応付ける',
    });
    await user.click(
      within(dialog).getByRole('combobox', { name: '選手1 #1 の対応先' })
    );
    await user.click(
      await screen.findByRole('option', { name: '保存選手1 #9 (sp1)' })
    );
    await user.click(
      within(dialog).getByRole('button', { name: '確認して反映' })
    );
    expect(onTeamUpdate.mock.calls[0][0].atBats).toEqual(
      atBats.map((ab) => ({ ...ab, playerId: 'sp1' }))
    );
    expect(onTeamUpdate.mock.calls[0][0].players).toEqual([
      expect.objectContaining({ id: 'sp1', order: 1, isActive: true }),
    ]);
  });

  test('控えへの切替と復帰で選手・打席が増えない', async () => {
    const user = userEvent.setup();
    const initial = makeTeam();
    const Harness = () => {
      const [team, setTeam] = React.useState(initial);
      return (
        <>
          <TeamManager team={team} role="away" onTeamUpdate={setTeam} />
          <output>{JSON.stringify(team)}</output>
        </>
      );
    };
    render(
      <ThemeProvider theme={createTheme()}>
        <Harness />
      </ThemeProvider>
    );
    await user.click(screen.getByRole('button', { name: '控えに' }));
    await user.click(screen.getByRole('button', { name: '出場させる' }));
    expect(JSON.parse(screen.getByRole('status').textContent || '{}')).toEqual(
      initial
    );
  });

  test('チーム名が空の場合、roleに応じたデフォルトチーム名が見出しにフォールバック表示される', () => {
    const { rerender } = render(
      <ThemeProvider theme={createTheme()}>
        <TeamManager
          team={makeTeam({ name: '' })}
          role="away"
          onTeamUpdate={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      screen.getByRole('heading', { level: 5, name: '先攻チーム' })
    ).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={createTheme()}>
        <TeamManager
          team={makeTeam({ name: '   ' })}
          role="home"
          onTeamUpdate={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      screen.getByRole('heading', { level: 5, name: '後攻チーム' })
    ).toBeInTheDocument();
  });
});

describe('TeamManager - 試合名簿からの選手削除', () => {
  const originalMatchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });
  beforeEach(() => jest.clearAllMocks());
  const player = (id: string, isActive: boolean) => ({
    id,
    name: '重複選手',
    number: '12',
    position: 'P',
    order: 0,
    isActive,
  });
  const atBat = {
    id: 'ab-keep',
    playerId: 'registered',
    inning: 1,
    isTop: true,
    result: 'HR' as const,
    rbi: 2,
    isOut: false,
  };

  test.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])(
    '打席のない選手だけを確認して削除し、同名の登録選手・打席を保持する (active=%s, mobile=%s)',
    async (active, mobile) => {
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: mobile,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
      const user = userEvent.setup();
      const registered = player('registered', true);
      const extra = player('extra', active);
      const team = makeTeam({ players: [registered, extra], atBats: [atBat] });
      const { onTeamUpdate } = renderTeamManager(team);
      const target = screen.getAllByRole('button', {
        name: '選手情報を編集',
      })[1];
      await user.click(target);
      await user.click(
        screen.getByRole('button', { name: 'この試合から削除' })
      );
      const dialog = await screen.findByRole('dialog', {
        name: '選手をこの試合から削除',
      });
      expect(dialog).toHaveTextContent('重複選手');
      expect(dialog).toHaveTextContent('12');
      expect(dialog).toHaveTextContent('選手ID: extra');
      expect(onTeamUpdate).not.toHaveBeenCalled();
      expect(await axe(dialog)).toHaveNoViolations();
      await user.click(
        within(dialog).getByRole('button', { name: '削除する' })
      );
      expect(onTeamUpdate).toHaveBeenCalledTimes(1);
      expect(onTeamUpdate).toHaveBeenCalledWith({
        ...team,
        players: [registered],
      });
      expect(team.players).toEqual([registered, extra]);
      expect(mockedGetTeamById).not.toHaveBeenCalled();
    }
  );

  test('削除のキャンセルでは名簿も打席も変更しない', async () => {
    const user = userEvent.setup();
    const { onTeamUpdate } = renderTeamManager(makeTeam());
    await user.click(screen.getByRole('button', { name: '選手情報を編集' }));
    await user.click(screen.getByRole('button', { name: 'この試合から削除' }));
    const dialog = await screen.findByRole('dialog', {
      name: '選手をこの試合から削除',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'キャンセル' })
    );
    expect(onTeamUpdate).not.toHaveBeenCalled();
    expect(
      await screen.findByRole('dialog', { name: '選手情報を編集' })
    ).toBeInTheDocument();
  });

  test('新しい選手の追加ダイアログには削除を表示しない', async () => {
    const user = userEvent.setup();
    renderTeamManager(makeTeam());
    await user.click(screen.getByRole('button', { name: '選手を追加' }));
    expect(
      screen.getByRole('dialog', { name: '新しい選手を追加' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'この試合から削除' })
    ).not.toBeInTheDocument();
  });
});

test('打席のある選手は削除を止め、対応付けを案内する', async () => {
  const user = userEvent.setup();
  const team = makeTeam({
    atBats: [
      {
        id: 'ab1',
        playerId: 'p1',
        inning: 1,
        isTop: true,
        result: 'HR',
        rbi: 2,
        isOut: false,
      },
    ],
  });
  const { onTeamUpdate } = renderTeamManager(team);
  await user.click(screen.getByRole('button', { name: '選手情報を編集' }));
  await user.click(screen.getByRole('button', { name: 'この試合から削除' }));
  const dialog = screen.getByRole('dialog', { name: '選手をこの試合から削除' });
  expect(within(dialog).getByRole('alert')).toHaveTextContent(
    '打席記録が1件あるため削除できません'
  );
  expect(dialog).toHaveTextContent('登録選手へ対応付ける');
  const remove = within(dialog).getByRole('button', { name: '削除する' });
  expect(remove).toBeDisabled();
  expect(onTeamUpdate).not.toHaveBeenCalled();
});
