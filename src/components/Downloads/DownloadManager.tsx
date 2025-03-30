import React from 'react';
import { Box, VStack, Progress, Text } from '@chakra-ui/react';
import { useAppStore } from '../../stores/app.store';
import { DownloadStatus } from '../../types/download';

export const DownloadManager: React.FC = () => {
  const downloads = useAppStore(state => state.downloads);

  return (
    <VStack spacing={4} w="100%">
      {downloads.inProgress.map(task => (
        <Box key={task.id} w="100%" p={4} borderWidth="1px" borderRadius="md">
          <Text>{task.track.name}</Text>
          <Progress value={task.progress.progress * 100} size="sm" colorScheme="blue" />
          <Text fontSize="sm">
            {task.progress.bytesDownloaded} / {task.progress.totalBytes} bytes
          </Text>
        </Box>
      ))}
    </VStack>
  );
};
