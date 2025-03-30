import React, { useEffect, useState } from 'react';
import { Alert, AlertTitle, Button, Snackbar } from '@mui/material';

export const UpdateNotification: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [version, setVersion] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const { available, version: newVersion } = await window.beatport.checkForUpdates();
        setUpdateAvailable(available);
        setVersion(newVersion);
        setOpen(available);
      } catch (err) {
        console.error('Error checking for updates:', err);
      }
    };

    // Check for updates on component mount and every hour
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <Snackbar open={open} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <Alert
        severity="info"
        onClose={handleClose}
        sx={{ width: '100%' }}
        action={
          <Button color="inherit" size="small" onClick={handleClose}>
            Dismiss
          </Button>
        }
      >
        <AlertTitle>Update Available</AlertTitle>A new version ({version}) of Beatport Downloader is
        available. Please download and install the latest version to get new features and bug fixes.
      </Alert>
    </Snackbar>
  );
};
