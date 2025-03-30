import React from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';
import { create } from 'zustand';

interface NotificationState {
  open: boolean;
  message: string;
  title?: string;
  type: 'success' | 'error' | 'info' | 'warning';
  autoHideDuration?: number;
}

interface NotificationStore {
  notification: NotificationState | null;
  showNotification: (notification: Omit<NotificationState, 'open'>) => void;
  hideNotification: () => void;
}

const useNotificationStore = create<NotificationStore>()(set => ({
  notification: null,
  showNotification: notification => set({ notification: { ...notification, open: true } }),
  hideNotification: () =>
    set(state =>
      state.notification ? { notification: { ...state.notification, open: false } } : state
    ),
}));

export const useNotifications = () => {
  const { showNotification } = useNotificationStore();

  const showError = React.useCallback(
    (message: string, title?: string) => {
      showNotification({
        message,
        title,
        type: 'error',
        autoHideDuration: 6000,
      });
    },
    [showNotification]
  );

  const showSuccess = React.useCallback(
    (message: string, title?: string) => {
      showNotification({
        message,
        title,
        type: 'success',
        autoHideDuration: 4000,
      });
    },
    [showNotification]
  );

  const showInfo = React.useCallback(
    (message: string, title?: string) => {
      showNotification({
        message,
        title,
        type: 'info',
        autoHideDuration: 4000,
      });
    },
    [showNotification]
  );

  const showWarning = React.useCallback(
    (message: string, title?: string) => {
      showNotification({
        message,
        title,
        type: 'warning',
        autoHideDuration: 5000,
      });
    },
    [showNotification]
  );

  return {
    showError,
    showSuccess,
    showInfo,
    showWarning,
  };
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notification, hideNotification } = useNotificationStore();

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    hideNotification();
  };

  return (
    <>
      {children}
      <Snackbar
        open={notification?.open ?? false}
        autoHideDuration={notification?.autoHideDuration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClose}
          severity={notification?.type}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification?.title && <AlertTitle>{notification.title}</AlertTitle>}
          {notification?.message}
        </Alert>
      </Snackbar>
    </>
  );
};
