import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Avatar, 
  Menu, 
  MenuItem, 
  Divider,
  CircularProgress,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const UserProfile: React.FC = () => {
  const { currentUser, logOut } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const open = Boolean(anchorEl);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logOut();
      handleClose();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  // 表示名を短く調整
  const displayName = currentUser.displayName || currentUser.email || '';
  const shortName = isMobile 
    ? displayName.split('@')[0]?.substring(0, 8) + (displayName.length > 8 ? '...' : '')
    : displayName;

  return (
    <Box>
      <Button
        onClick={handleClick}
        sx={{ 
          borderRadius: '24px',
          px: isMobile ? 0.5 : 1,
          minWidth: 0,
          textTransform: 'none',
          color: 'inherit'
        }}
      >
        <Avatar 
          src={currentUser.photoURL || undefined} 
          alt={currentUser.displayName || ''}
          sx={{ 
            width: isMobile ? 24 : 32, 
            height: isMobile ? 24 : 32, 
            mr: isMobile ? 0.5 : 1 
          }}
        />
        {!isMobile && (
          <Typography 
            variant="body2" 
            noWrap 
            sx={{ 
              maxWidth: { xs: '60px', sm: '120px', md: '200px' } 
            }}
          >
            {shortName}
          </Typography>
        )}
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1">
            {currentUser.displayName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            {currentUser.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem 
          onClick={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              ログアウト中...
            </>
          ) : 'ログアウト'}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default UserProfile; 