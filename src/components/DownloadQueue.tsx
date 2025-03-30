import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  IconButton,
  Chip,
  Divider,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

interface QueueItem {
  id: string;
  title: string;
  artist: string;
  progress: number;
  status: 'queued' | 'downloading' | 'completed' | 'error' | 'paused';
  error?: string;
}

interface DownloadQueueProps {
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onRemove?: (id: string) => void;
  onClearCompleted?: () => void;
}

export const DownloadQueue: React.FC<DownloadQueueProps> = ({
  onPause,
  onResume,
  onRemove,
  onClearCompleted,
}) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [totalProgress, setTotalProgress] = useState(0);

  useEffect(() => {
    // Subscribe to queue updates from main process
    const handleQueueUpdate = (newQueue: QueueItem[]) => {
      setQueue(newQueue);

      // Calculate total progress
      if (newQueue.length > 0) {
        const total = newQueue.reduce((acc, item) => acc + item.progress, 0) / newQueue.length;
        setTotalProgress(total);
      } else {
        setTotalProgress(0);
      }
    };

    window.electron.ipcRenderer.on('queue:update', handleQueueUpdate);

    return () => {
      window.electron.ipcRenderer.removeListener('queue:update', handleQueueUpdate);
    };
  }, []);

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'paused':
        return 'warning';
      case 'downloading':
        return 'info';
      default:
        return 'default';
    }
  };

  const completedItems = queue.filter(item => item.status === 'completed').length;
  const hasCompletedItems = completedItems > 0;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Download Queue</Typography>
        {hasCompletedItems && (
          <Tooltip title="Clear completed">
            <IconButton size="small" onClick={onClearCompleted}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {queue.length > 0 ? (
        <>
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Overall Progress: {Math.round(totalProgress)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={totalProgress}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <List>
            {queue.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    opacity: item.status === 'completed' ? 0.7 : 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1" noWrap>
                          {item.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={item.status}
                          color={getStatusColor(item.status)}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary" noWrap>
                          {item.artist}
                        </Typography>
                        {item.status === 'downloading' && (
                          <LinearProgress
                            variant="determinate"
                            value={item.progress}
                            sx={{ mt: 1, height: 4, borderRadius: 2 }}
                          />
                        )}
                        {item.error && (
                          <Typography variant="caption" color="error" noWrap>
                            {item.error}
                          </Typography>
                        )}
                      </Box>
                    }
                  />

                  <Stack direction="row" spacing={1}>
                    {item.status === 'downloading' && onPause && (
                      <Tooltip title="Pause">
                        <IconButton size="small" onClick={() => onPause(item.id)}>
                          <PauseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {item.status === 'paused' && onResume && (
                      <Tooltip title="Resume">
                        <IconButton size="small" onClick={() => onResume(item.id)}>
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onRemove && item.status !== 'downloading' && (
                      <Tooltip title="Remove">
                        <IconButton size="small" onClick={() => onRemove(item.id)}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </>
      ) : (
        <Typography color="textSecondary" align="center" py={4}>
          No downloads in queue
        </Typography>
      )}
    </Box>
  );
};
