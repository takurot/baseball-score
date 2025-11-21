import React, { useId } from 'react';
import {
  Paper,
  PaperProps,
  Stack,
  Typography,
  Box,
  TypographyProps,
} from '@mui/material';

interface SectionCardProps extends PaperProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  titleVariant?: TypographyProps['variant'];
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  actions,
  children,
  titleVariant = 'subtitle1',
  sx,
  ...paperProps
}) => {
  const headingId = useId();

  return (
    <Paper
      component="section"
      aria-labelledby={headingId}
      elevation={1}
      {...paperProps}
      sx={{
        p: { xs: 2, sm: 3 },
        mb: 3,
        ...sx,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Typography
          id={headingId}
          component="h2"
          variant={titleVariant}
          fontWeight={600}
        >
          {title}
        </Typography>
        {actions ? (
          <Box
            sx={{
              width: { xs: '100%', sm: 'auto' },
              display: 'flex',
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
            }}
          >
            {actions}
          </Box>
        ) : null}
      </Stack>
      <Box sx={{ mt: 2 }}>{children}</Box>
    </Paper>
  );
};

export default SectionCard;
