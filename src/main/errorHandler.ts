import { app, dialog } from 'electron';
import { logger } from '@electron/utils/logger';

export function setupErrorHandlers() {
  // Handle uncaught exceptions in the main process
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);

    dialog.showErrorBox(
      'Application Error',
      'An unexpected error occurred. The application will now close.\n\n' +
        'Error details have been logged.'
    );

    app.quit();
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('Unhandled Rejection:', error);
  });

  // Handle renderer process crashes
  app.on('render-process-gone', (event, webContents, details) => {
    logger.error('Renderer Process Crashed', {
      reason: details.reason,
      exitCode: details.exitCode,
    });

    dialog.showErrorBox(
      'Application Error',
      'The application window has crashed. Please restart the application.\n\n' +
        `Reason: ${details.reason}`
    );
  });

  // Handle GPU process crashes
  app.on('child-process-gone', (event, details) => {
    if (details.type === 'GPU') {
      logger.error('GPU Process Crashed', {
        reason: details.reason,
        exitCode: details.exitCode,
      });

      dialog.showErrorBox(
        'Graphics Error',
        'The graphics system has encountered an error. The application may not display correctly.\n\n' +
          'Please restart the application.'
      );
    } else {
      logger.error('Child Process Crashed', {
        type: details.type,
        reason: details.reason,
        exitCode: details.exitCode,
      });
    }
  });
}
