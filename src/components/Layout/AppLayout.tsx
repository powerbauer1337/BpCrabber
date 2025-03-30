import React from 'react';
import { Box, Flex, useColorMode } from '@chakra-ui/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colorMode } = useColorMode();

  return (
    <Flex minH="100vh" bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}>
      <Sidebar />
      <Box flex="1">
        <Header />
        <Box p={4} maxW="1400px" mx="auto">
          {children}
        </Box>
      </Box>
    </Flex>
  );
};
