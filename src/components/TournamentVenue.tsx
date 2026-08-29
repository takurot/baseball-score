import React from 'react';
import { Box, Typography } from '@mui/material';

interface Props {
  tournament?: string;
  venue?: string;
  isSharedMode?: boolean;
  onClick?: () => void;
}

const TournamentVenue: React.FC<Props> = ({
  tournament,
  venue,
  isSharedMode,
  onClick,
}) => {
  const isClickable = !isSharedMode && Boolean(onClick);

  const displayText = (() => {
    if (tournament) {
      return venue ? `${tournament} @ ${venue}` : tournament;
    }
    if (venue) {
      return venue;
    }
    return isSharedMode ? '' : '大会名をクリックして設定';
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
      <Typography variant="subtitle1" align="center">
        {displayText}
      </Typography>
    </Box>
  );
};

export default TournamentVenue;
