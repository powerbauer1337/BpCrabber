import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress } from '@mui/material';
import { LoadingButton } from '@mui/lab';

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Check login status on mount
    const checkLoginStatus = async () => {
      try {
        const settings = await window.beatport.getSettings();
        if (settings?.username) {
          setUsername(settings.username);
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.error('Failed to check login status:', err);
      } finally {
        setInitializing(false);
      }
    };

    checkLoginStatus();
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      const success = await window.beatport.login(username, password);

      if (success) {
        setIsLoggedIn(true);
        // Save username in settings
        await window.beatport.saveSettings({ username });
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      // Clear settings
      await window.beatport.saveSettings({});
      setIsLoggedIn(false);
      setUsername('');
      setPassword('');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (isLoggedIn) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Logged in as {username}
        </Typography>
        <LoadingButton variant="outlined" color="primary" onClick={handleLogout} loading={loading}>
          Logout
        </LoadingButton>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Login to Beatport
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={e => {
          e.preventDefault();
          handleLogin();
        }}
        noValidate
      >
        <TextField
          fullWidth
          label="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          margin="normal"
          required
          disabled={loading}
          autoComplete="username"
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          margin="normal"
          required
          disabled={loading}
          autoComplete="current-password"
        />

        <LoadingButton
          variant="contained"
          color="primary"
          onClick={handleLogin}
          loading={loading}
          sx={{ mt: 2 }}
          fullWidth
          disabled={!username || !password}
        >
          Login
        </LoadingButton>
      </Box>
    </Box>
  );
};
