import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, Tabs, Tab } from '@mui/material';
import { axe } from '../../test/axe';
import { getTeamTabLabel } from '../../utils/teamTabUtils';

describe('TeamTabs a11y', () => {
  it('チーム名未設定時のチーム選択タブでアクセシビリティ違反がない', async () => {
    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={0} onChange={jest.fn()} aria-label="チーム選択タブ">
            <Tab
              label={getTeamTabLabel('', '先攻')}
              id="team-tab-0"
              aria-controls="team-tabpanel-0"
            />
            <Tab
              label={getTeamTabLabel('', '後攻')}
              id="team-tab-1"
              aria-controls="team-tabpanel-1"
            />
          </Tabs>
        </Box>
        <Box role="tabpanel" id="team-tabpanel-0" aria-labelledby="team-tab-0">
          先攻チームのコンテンツ
        </Box>
      </ThemeProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('チーム名設定済みのチーム選択タブでアクセシビリティ違反がない', async () => {
    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={0} onChange={jest.fn()} aria-label="チーム選択タブ">
            <Tab
              label={getTeamTabLabel('豊郷中央', '先攻')}
              id="team-tab-0"
              aria-controls="team-tabpanel-0"
            />
            <Tab
              label={getTeamTabLabel('ライオンズ', '後攻')}
              id="team-tab-1"
              aria-controls="team-tabpanel-1"
            />
          </Tabs>
        </Box>
        <Box role="tabpanel" id="team-tabpanel-0" aria-labelledby="team-tab-0">
          豊郷中央のコンテンツ
        </Box>
      </ThemeProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
