import React from 'react';
import { ChakraProvider, Box, Container, HStack, Button, useColorModeValue, VStack, useToast, Image, Spinner, Text } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { FormPage } from './pages/FormPage';
import { AdminPage } from './pages/AdminPage';
import { MetricsPage } from './pages/MetricsPage';
import { SnakeGame } from './pages/SnakeGame';
import { ColorModeToggle } from './components/ColorModeToggle';
import theme from './theme';
import { signOut } from 'firebase/auth';
import { auth } from './config/firebase';

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading...</Text>
        </VStack>
      </Box>
    );
  }

  return <Navigate to={user ? "/form" : "/login"} replace />;
};

const AppHeader = () => {
  const headerBg = useColorModeValue('white', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Success',
        description: 'Logged out successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box bg={headerBg} borderBottom="1px" borderColor={borderColor} shadow="sm">
      <Container maxW="container.xl" py={{ base: 2, md: 4 }}>
        <VStack spacing={{ base: 3, md: 0 }} align="stretch">
          {/* Desktop Layout */}
          <HStack justify="space-between" align="center" display={{ base: 'none', md: 'flex' }}>
            <HStack spacing={4} align="center">
              {/* <Box fontSize="xl" fontWeight="bold">
                Covenant Hills
              </Box> */}
              {user && (
                <HStack spacing={2}>
                  <Button
                    as={Link}
                    to="/form"
                    variant={isActive('/form') ? 'solid' : 'ghost'}
                    colorScheme={isActive('/form') ? 'blue' : 'gray'}
                    size="sm"
                  >
                    New Referral
                  </Button>
                  <Button
                    as={Link}
                    to="/admin"
                    variant={isActive('/admin') ? 'solid' : 'ghost'}
                    colorScheme={isActive('/admin') ? 'blue' : 'gray'}
                    size="sm"
                  >
                    Admin
                  </Button>
                  <Button
                    as={Link}
                    to="/metrics"
                    variant={isActive('/metrics') ? 'solid' : 'ghost'}
                    colorScheme={isActive('/metrics') ? 'blue' : 'gray'}
                    size="sm"
                  >
                    Metrics
                  </Button>
                </HStack>
              )}
            </HStack>
            <HStack spacing={2}>
              <ColorModeToggle />
              {user && (
                <Button
                  onClick={handleLogout}
                  colorScheme="red"
                  variant="ghost"
                  size="sm"
                  leftIcon={<Box as="span" className="material-icons">logout</Box>}
                >
                  Logout
                </Button>
              )}
            </HStack>
          </HStack>

          {/* Mobile Layout */}
          <VStack spacing={3} display={{ base: 'flex', md: 'none' }}>
            <HStack justify="space-between" align="center" width="full">
              {/* <Box fontSize="lg" fontWeight="bold">
                Aggregator App
              </Box> */}
              <HStack spacing={2}>
                <ColorModeToggle />
                {user && (
                  <Button
                    onClick={handleLogout}
                    colorScheme="red"
                    variant="ghost"
                    size="xs"
                  >
                    <Box as="span" className="material-icons">logout</Box>
                  </Button>
                )}
              </HStack>
            </HStack>
            {user && (
              <HStack spacing={1} width="full" justify="center" flexWrap="wrap">
                <Button
                  as={Link}
                  to="/form"
                  variant={isActive('/form') ? 'solid' : 'ghost'}
                  colorScheme={isActive('/form') ? 'blue' : 'gray'}
                  size="xs"
                  fontSize="xs"
                  px={2}
                >
                  New Referral
                </Button>
                <Button
                  as={Link}
                  to="/admin"
                  variant={isActive('/admin') ? 'solid' : 'ghost'}
                  colorScheme={isActive('/admin') ? 'blue' : 'gray'}
                  size="xs"
                  fontSize="xs"
                  px={2}
                >
                  Admin
                </Button>
                <Button
                  as={Link}
                  to="/metrics"
                  variant={isActive('/metrics') ? 'solid' : 'ghost'}
                  colorScheme={isActive('/metrics') ? 'blue' : 'gray'}
                  size="xs"
                  fontSize="xs"
                  px={2}
                >
                  Metrics
                </Button>
              </HStack>
            )}
          </VStack>
        </VStack>
      </Container>
    </Box>
  );
};

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <Router basename="/aggregate-application">
          <AppHeader />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/form"
              element={
                <ProtectedRoute>
                  <FormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/metrics"
              element={
                <ProtectedRoute>
                  <MetricsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/secret-snake"
              element={
                <ProtectedRoute>
                  <SnakeGame />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
