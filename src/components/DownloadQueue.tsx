import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  LinearProgress,
  Button,
  Paper,
  Alert
} from '@mui/material';
import { Delete as DeleteIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { useDownloadStore } from '../stores/downloadStore';
import type { DownloadItem } from '../stores/downloadStore';

const getStatusColor = (status: DownloadItem['status']) => {
  switch (status) {
    case 'completed':
      return 'success.main';
    case 'error':
      return 'error.main';
    case 'downloading':
    case 'tagging':
      return 'primary.main';
    default:
      return 'text.primary';
  }
};

interface DownloadStatus {
  progress: number;
  status: 'idle' | 'downloading';
}

export const DownloadQueue: React.FC = () => {
  const { queue, removeFromQueue, clearCompleted } = useDownloadStore();
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>({
    progress: 0,
    status: 'idle'
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkProgress = async () => {
      try {
        const status = await window.beatport.getDownloadProgress();
        setDownloadStatus(status as DownloadStatus);
      } catch (err) {
        console.error('Error checking progress:', err);
        setError('Failed to get download progress');
      }
    };

    // Check progress every second while downloading
    const interval = setInterval(() => {
      if (downloadStatus.status === 'downloading') {
        checkProgress();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [downloadStatus.status]);

  const handleCancel = async () => {
    try {
      await window.beatport.cancelDownload();
      setDownloadStatus({ progress: 0, status: 'idle' });
    } catch (err) {
      console.error('Error canceling download:', err);
      setError('Failed to cancel download');
    }
  };

  if (downloadStatus.status === 'idle' && !error) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Download Queue
        </Typography>
        <Typography color="textSecondary">
          No active downloads
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Download Queue</Typography>
        <Button
          variant="outlined"
          color="primary"
          onClick={clearCompleted}
          disabled={!queue.some(item => ['completed', 'error'].includes(item.status))}
        >
          Clear Completed
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {downloadStatus.status === 'downloading' && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box flexGrow={1}>
              <Typography variant="subtitle1" gutterBottom>
                Downloading...
              </Typography>
              <LinearProgress
                variant="determinate"
                value={downloadStatus.progress}
                sx={{ height: 8, borderRadius: 1 }}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {downloadStatus.progress}% Complete
              </Typography>
            </Box>
            <IconButton onClick={handleCancel} color="error">
              <CancelIcon />
            </IconButton>
          </Box>
        </Paper>
      )}

      <List>
        {queue.map(item => (
          <ListItem
            key={item.id}
            secondaryAction={
              <IconButton edge="end" onClick={() => removeFromQueue(item.id)}>
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemText
              primary={
                <Typography color={getStatusColor(item.status)}>
                  {item.title} - {item.artist}
                </Typography>
              }
              secondary={
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    {item.error && ` - ${item.error}`}
                  </Typography>
                  {['downloading', 'tagging'].includes(item.status) && (
                    <LinearProgress variant="determinate" value={item.progress} sx={{ mt: 1 }} />
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>

      {queue.length === 0 && (
        <Typography color="text.secondary" textAlign="center">
          No downloads in queue
        </Typography>
      )}
    </Box>
  );
};
