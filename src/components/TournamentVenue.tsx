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
}) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      mb: 2,
      cursor: isSharedMode ? 'default' : 'pointer',
    }}
    onClick={!isSharedMode ? onClick : undefined}
  >
    <Typography variant="subtitle1" align="center">
      {tournament ? tournament : isSharedMode ? '' : '大会名をクリックして設定'}
      {venue && ` @ ${venue}`}
    </Typography>
  </Box>
);

export default TournamentVenue;
