import React, { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  CircularProgress,
  Tooltip,
  Alert,
  Collapse,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  ContentPaste as PasteIcon,
} from '@mui/icons-material';

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
}

interface UrlInputProps {
  onTrackDetected: (track: Track) => void;
}

const UrlInput: React.FC<UrlInputProps> = ({ onTrackDetected }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  const validateUrl = (input: string) => {
    try {
      const urlObj = new URL(input);
      return urlObj.hostname === 'www.beatport.com' && urlObj.pathname.includes('/track/');
    } catch {
      return false;
    }
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value;
    setUrl(input);
    setIsValid(validateUrl(input));
    setError(null);
  };

  const handleClear = () => {
    setUrl('');
    setError(null);
    setIsValid(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setIsValid(validateUrl(text));
      setError(null);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      setError('Failed to paste from clipboard');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValid) {
      setError('Please enter a valid Beatport track URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Send message to main process and wait for response
      window.electron.ipcRenderer.send('beatport:get-track-info', url);

      const handleTrackInfo = (trackInfo: { title: string; artist: string } | null) => {
        if (!trackInfo) {
          throw new Error('Failed to fetch track information');
        }

        onTrackDetected({
          id: new URL(url).pathname.split('/').pop() || Date.now().toString(),
          title: trackInfo.title,
          artist: trackInfo.artist,
          url,
        });

        setUrl('');
        setIsValid(false);
        setIsLoading(false);
      };

      // Listen for one-time response
      window.electron.ipcRenderer.once('beatport:track-info-result', handleTrackInfo);
    } catch (err) {
      console.error('Error fetching track info:', err);
      setError('Failed to fetch track information. Please check the URL and try again.');
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Enter Beatport track URL"
        value={url}
        onChange={handleUrlChange}
        error={!!error}
        disabled={isLoading}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {url && (
                <Tooltip title="Clear">
                  <IconButton edge="end" onClick={handleClear} disabled={isLoading} size="small">
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Paste from clipboard">
                <IconButton edge="end" onClick={handlePaste} disabled={isLoading} size="small">
                  <PasteIcon />
                </IconButton>
              </Tooltip>
              {isLoading && <CircularProgress size={20} sx={{ ml: 1 }} />}
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: isValid ? 'success.main' : 'inherit',
            },
            '&:hover fieldset': {
              borderColor: isValid ? 'success.main' : 'inherit',
            },
            '&.Mui-focused fieldset': {
              borderColor: isValid ? 'success.main' : 'primary.main',
            },
          },
        }}
      />

      <Collapse in={!!error}>
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      </Collapse>
    </Box>
  );
};

export default UrlInput;
