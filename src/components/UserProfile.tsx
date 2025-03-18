import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Avatar, 
  Menu, 
  MenuItem, 
  Divider,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const UserProfile: React.FC = () => {
  const { currentUser, logOut } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const open = Boolean(anchorEl);

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

  return (
    <Box>
      <Button
        onClick={handleClick}
        sx={{ 
          borderRadius: '24px',
          px: 1,
          textTransform: 'none',
          color: 'inherit'
        }}
      >
        <Avatar 
          src={currentUser.photoURL || undefined} 
          alt={currentUser.displayName || ''}
          sx={{ width: 32, height: 32, mr: 1 }}
        />
        <Typography variant="body2">
          {currentUser.displayName || currentUser.email}
        </Typography>
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
          <Typography variant="body2" color="text.secondary">
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