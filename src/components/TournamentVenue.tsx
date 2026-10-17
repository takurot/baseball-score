import React from 'react';
import { Box, Typography } from '@mui/material';
import { GameType } from '../types';
import { getGameTypeLabel } from '../utils/gameType';

interface Props {
  tournament?: string;
  venue?: string;
  gameType?: GameType;
  isSharedMode?: boolean;
  onClick?: () => void;
}

const TournamentVenue: React.FC<Props> = ({
  tournament,
  venue,
  gameType,
  isSharedMode,
  onClick,
}) => {
  const isClickable = !isSharedMode && Boolean(onClick);

  const mainText = (() => {
    if (tournament) {
      return venue ? `${tournament} @ ${venue}` : tournament;
    }
    if (venue) {
      return venue;
    }
    return isClickable ? '大会名をクリックして設定' : '';
  })();

  const typeLabel = gameType ? `[${getGameTypeLabel(gameType)}]` : '';

  const displayText = (() => {
    if (typeLabel && mainText) {
      return `${typeLabel} ${mainText}`;
    }
    return mainText || typeLabel;
  })();

  return (
    <Box
      component={isClickable ? 'button' : 'div'}
      type={isClickable ? 'button' : undefined}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        mb: 2,
        cursor: isClickable ? 'pointer' : 'default',
        background: 'none',
        border: 0,
        p: 0,
        font: 'inherit',
        color: 'inherit',
        width: '100%',
      }}
      onClick={isClickable ? onClick : undefined}
    >
      <Typography
        variant="subtitle1"
        align="center"
        component={isClickable ? 'span' : 'p'}
      >
        {displayText}
      </Typography>
    </Box>
  );
};

export default TournamentVenue;
