import React from 'react';
import { Box, Flex, IconButton, useColorMode, Button, Text } from '@chakra-ui/react';
import { MoonIcon, SunIcon, SettingsIcon } from '@chakra-ui/icons';
import { useAppStore } from '../../stores/app.store';

export const Header: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { auth, setAuth } = useAppStore();

  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      py={4}
      px={6}
      borderBottomWidth="1px"
      bg={colorMode === 'dark' ? 'gray.800' : 'white'}
    >
      <Text fontSize="xl" fontWeight="bold">
        Beatport Downloader
      </Text>

      <Flex align="center" gap={4}>
        <IconButton
          aria-label="Toggle color mode"
          icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
          onClick={toggleColorMode}
        />
        <IconButton
          aria-label="Settings"
          icon={<SettingsIcon />}
          onClick={() => {
            /* Open settings */
          }}
        />
        {auth.isAuthenticated ? (
          <Button onClick={() => setAuth({ ...auth, isAuthenticated: false })}>Logout</Button>
        ) : (
          <Button
            colorScheme="blue"
            onClick={() => {
              /* Handle login */
            }}
          >
            Login
          </Button>
        )}
      </Flex>
    </Flex>
  );
};
