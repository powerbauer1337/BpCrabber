import React from 'react';
import {
  Box,
  VStack,
  Text,
  Progress,
  IconButton,
  HStack,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { CloseIcon, RepeatIcon } from '@chakra-ui/icons';
import { useAppStore } from '../../stores/app.store';
import { DownloadStatus } from '../../types/download';
import { formatBytes } from '../../utils/format';

export const DownloadManager: React.FC = () => {
  const { downloads, setDownloads } = useAppStore();
  const bg = useColorModeValue('white', 'gray.800');

  const getStatusColor = (status: DownloadStatus) => {
    switch (status) {
      case DownloadStatus.COMPLETED:
        return 'green';
      case DownloadStatus.FAILED:
        return 'red';
      case DownloadStatus.DOWNLOADING:
        return 'blue';
      case DownloadStatus.PAUSED:
        return 'yellow';
      default:
        return 'gray';
    }
  };

  return (
    <VStack spacing={4} w="100%">
      <Text fontSize="xl" fontWeight="bold">
        Downloads
      </Text>

      {downloads.inProgress.map(task => (
        <Box key={task.id} w="100%" p={4} borderWidth="1px" borderRadius="lg" bg={bg}>
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="bold" noOfLines={1}>
              {task.track.name}
            </Text>
            <Badge colorScheme={getStatusColor(task.progress.status)}>{task.progress.status}</Badge>
          </HStack>

          <Progress value={task.progress.progress * 100} size="sm" colorScheme="blue" mb={2} />

          <HStack justify="space-between" fontSize="sm">
            <Text>
              {formatBytes(task.progress.bytesDownloaded)} /{formatBytes(task.progress.totalBytes)}
            </Text>
            <HStack>
              <IconButton
                aria-label="Retry download"
                icon={<RepeatIcon />}
                size="sm"
                isDisabled={task.progress.status !== DownloadStatus.FAILED}
                onClick={() => {
                  /* Handle retry */
                }}
              />
              <IconButton
                aria-label="Cancel download"
                icon={<CloseIcon />}
                size="sm"
                colorScheme="red"
                onClick={() => {
                  /* Handle cancel */
                }}
              />
            </HStack>
          </HStack>
        </Box>
      ))}
    </VStack>
  );
};
