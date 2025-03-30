import React, { useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  Stack,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface LoginResponse {
  success: boolean;
  error?: string;
}

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await window.beatport.login(username, password);
      if (result.success) {
        setIsLoggedIn(true);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const result = await window.beatport.logout();
      if (result.success) {
        setIsLoggedIn(false);
        setUsername('');
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoggedIn) {
    return (
      <Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography>Logged in as {username}</Typography>
          <LoadingButton
            variant="outlined"
            color="secondary"
            onClick={handleLogout}
            loading={isLoading}
          >
            Logout
          </LoadingButton>
        </Stack>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        Login to Beatport
      </Typography>
      <Stack spacing={2}>
        <TextField
          label="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          fullWidth
          required
          disabled={isLoading}
          size="small"
        />
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          required
          disabled={isLoading}
          size="small"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Box>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={isLoading}
            disabled={!username || !password}
          >
            Login
          </LoadingButton>
        </Box>
      </Stack>
    </Box>
  );
};
