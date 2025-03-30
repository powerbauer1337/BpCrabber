import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DownloadProgress, DownloadComplete } from '../types/electron';

interface DownloadItem {
  url: string;
  progress: number;
  status: 'downloading' | 'completed' | 'error';
  error?: string;
}

export const DownloadQueue: React.FC = () => {
  const [downloads, setDownloads] = useState<Record<string, DownloadItem>>({});

  useEffect(() => {
    const progressCleanup = window.beatport.onDownloadProgress((progress: DownloadProgress) => {
      setDownloads(prev => ({
        ...prev,
        [progress.url]: {
          url: progress.url,
          progress: progress.progress,
          status: 'downloading',
        },
      }));
    });

    const completeCleanup = window.beatport.onDownloadComplete((result: DownloadComplete) => {
      setDownloads(prev => ({
        ...prev,
        [result.url]: {
          url: result.url,
          progress: result.success ? 100 : prev[result.url]?.progress || 0,
          status: result.success ? 'completed' : 'error',
          error: result.error,
        },
      }));
    });

    return () => {
      progressCleanup();
      completeCleanup();
    };
  }, []);

  const removeDownload = (url: string) => {
    setDownloads(prev => {
      const { [url]: removed, ...rest } = prev;
      return rest;
    });
  };

  const clearCompleted = () => {
    setDownloads(prev => {
      const filtered = Object.entries(prev).reduce(
        (acc, [url, item]) => {
          if (item.status !== 'completed') {
            acc[url] = item;
          }
          return acc;
        },
        {} as Record<string, DownloadItem>
      );
      return filtered;
    });
  };

  const hasCompleted = Object.values(downloads).some(item => item.status === 'completed');
  const downloadCount = Object.keys(downloads).length;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Downloads ({downloadCount})
        </Typography>
        {hasCompleted && (
          <Tooltip title="Clear completed">
            <IconButton onClick={clearCompleted} size="small">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      {downloadCount === 0 ? (
        <Typography color="text.secondary" align="center">
          No active downloads
        </Typography>
      ) : (
        <List
          dense
          sx={{
            maxHeight: 300,
            overflow: 'auto',
            bgcolor: 'background.paper',
            borderRadius: 1,
          }}
        >
          {Object.entries(downloads).map(([url, item]) => (
            <ListItem
              key={url}
              secondaryAction={
                item.status !== 'downloading' && (
                  <Tooltip title="Remove from queue">
                    <IconButton edge="end" size="small" onClick={() => removeDownload(url)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                )
              }
            >
              <ListItemText
                primary={url}
                secondary={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                    {item.status === 'downloading' && (
                      <LinearProgress
                        variant="determinate"
                        value={item.progress}
                        sx={{ height: 4, borderRadius: 1 }}
                      />
                    )}
                    <Typography
                      variant="caption"
                      color={
                        item.status === 'completed'
                          ? 'success.main'
                          : item.status === 'error'
                            ? 'error.main'
                            : 'text.secondary'
                      }
                    >
                      {item.status === 'downloading'
                        ? `Downloading... ${item.progress}%`
                        : item.status === 'completed'
                          ? 'Completed'
                          : item.error || 'Error'}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};
