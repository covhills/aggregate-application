import React from 'react';
import { IconButton, useColorMode, useColorModeValue } from '@chakra-ui/react';
import { Box } from '@chakra-ui/react';

export const ColorModeToggle = () => {
  const { toggleColorMode } = useColorMode();
  const icon = useColorModeValue('dark_mode', 'light_mode');

  return (
    <IconButton
      aria-label="Toggle color mode"
      icon={<Box as="span" className="material-icons">{icon}</Box>}
      onClick={toggleColorMode}
      variant="ghost"
    />
  );
};
