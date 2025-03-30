import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { Cancel as CancelIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { DownloadProgress, DownloadResult, TrackInfo } from '../../shared/ipc/types';

interface Download {
  url: string;
  progress: number;
  trackInfo: TrackInfo;
  status: 'downloading' | 'completed' | 'error';
  error?: string;
}

export function DownloadManager() {
  const [downloads, setDownloads] = useState<Record<string, Download>>({});

  useEffect(() => {
    // Set up IPC listeners
    const progressHandler = (progress: DownloadProgress) => {
      setDownloads(prev => ({
        ...prev,
        [progress.url]: {
          ...prev[progress.url],
          ...progress,
          status: 'downloading',
        },
      }));
    };

    const completeHandler = (result: DownloadResult) => {
      if (result.success) {
        setDownloads(prev => ({
          ...prev,
          [result.url]: {
            ...prev[result.url],
            status: 'completed',
            progress: 100,
          },
        }));
      }
    };

    const errorHandler = (error: { url: string; error: string }) => {
      setDownloads(prev => ({
        ...prev,
        [error.url]: {
          ...prev[error.url],
          status: 'error',
          error: error.error,
        },
      }));
    };

    // Register listeners
    window.electron.onDownloadProgress(progressHandler);
    window.electron.onDownloadComplete(completeHandler);
    window.electron.onDownloadError(errorHandler);

    // Cleanup listeners
    return () => {
      // Note: In a real implementation, we would need to properly remove the listeners
    };
  }, []);

  const handleCancelDownload = async (url: string) => {
    try {
      await window.electron.cancelDownload(url);
      setDownloads(prev => {
        const newDownloads = { ...prev };
        delete newDownloads[url];
        return newDownloads;
      });
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto', p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Downloads
      </Typography>
      <List>
        {Object.entries(downloads).map(([url, download]) => (
          <ListItem key={url} component={Card} sx={{ mb: 1, width: '100%' }}>
            <CardContent sx={{ width: '100%', p: '8px !important' }}>
              <ListItemText
                primary={download.trackInfo.title}
                secondary={download.trackInfo.artist}
              />
              {download.status === 'downloading' && (
                <Box sx={{ width: '100%', mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={download.progress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" color="text.secondary" align="right">
                    {Math.round(download.progress)}%
                  </Typography>
                </Box>
              )}
              {download.status === 'error' && (
                <Typography color="error" variant="body2">
                  {download.error}
                </Typography>
              )}
              <ListItemSecondaryAction>
                {download.status === 'downloading' ? (
                  <IconButton
                    edge="end"
                    aria-label="cancel"
                    onClick={() => handleCancelDownload(url)}
                    color="error"
                  >
                    <CancelIcon />
                  </IconButton>
                ) : download.status === 'completed' ? (
                  <IconButton edge="end" aria-label="completed" color="success">
                    <CheckCircleIcon />
                  </IconButton>
                ) : null}
              </ListItemSecondaryAction>
            </CardContent>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
