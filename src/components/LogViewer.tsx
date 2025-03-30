import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const newLogs = await window.beatport.getLogs();
        setLogs(newLogs);
      } catch (err) {
        console.error('Error fetching logs:', err);
      }
    };

    // Fetch logs initially and every 5 seconds
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Download Logs
      </Typography>

      <Paper sx={{ maxHeight: 200, overflow: 'auto' }}>
        <List dense>
          {logs.length === 0 ? (
            <ListItem>
              <ListItemText primary="No logs available" />
            </ListItem>
          ) : (
            logs.map((log, index) => (
              <ListItem key={index}>
                <ListItemText primary={log} />
              </ListItem>
            ))
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default LogViewer;
