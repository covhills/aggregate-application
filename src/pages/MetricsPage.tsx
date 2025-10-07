import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Text,
  Spinner,
  useToast,
  FormControl,
  FormLabel,
  Input,
  Button,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Grid,
  GridItem,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

interface ReferralData {
  id: string;
  firstName: string;
  lastName: string;
  leadSource: string;
  referralSource: string;
  referralOut: string;
  referralSentTo: string;
  admitted: boolean;
  createdAt: any;
}

export const MetricsPage = () => {
  const toast = useToast();
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredReferrals, setFilteredReferrals] = useState<ReferralData[]>([]);

  const cardBg = useColorModeValue('white', 'gray.700');
  const statBg = useColorModeValue('blue.50', 'blue.900');

  useEffect(() => {
    fetchReferrals();
  }, []);

  useEffect(() => {
    filterReferrals();
  }, [referrals, startDate, endDate]);

  const fetchReferrals = async () => {
    try {
      const q = query(collection(db, 'referrals'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ReferralData));
      setReferrals(data);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referrals',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterReferrals = () => {
    let filtered = [...referrals];

    if (startDate || endDate) {
      filtered = filtered.filter(ref => {
        if (!ref.createdAt) return false;
        
        const refDate = ref.createdAt.toDate ? ref.createdAt.toDate() : new Date(ref.createdAt);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate + 'T23:59:59') : null;

        if (start && end) {
          return refDate >= start && refDate <= end;
        } else if (start) {
          return refDate >= start;
        } else if (end) {
          return refDate <= end;
        }
        return true;
      });
    }

    setFilteredReferrals(filtered);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  // Calculate metrics
  const totalReferrals = filteredReferrals.length;
  const totalAdmitted = filteredReferrals.filter(r => r.admitted).length;
  const conversionRate = totalReferrals > 0 ? ((totalAdmitted / totalReferrals) * 100).toFixed(1) : '0';

  // Group by referral source
  const referralSourceStats = filteredReferrals.reduce((acc, ref) => {
    const source = ref.referralSource || 'Unknown';
    if (!acc[source]) {
      acc[source] = { total: 0, admitted: 0 };
    }
    acc[source].total += 1;
    if (ref.admitted) acc[source].admitted += 1;
    return acc;
  }, {} as Record<string, { total: number; admitted: number }>);

  // Group referrals sent TO various destinations
  const referralSentToStats = filteredReferrals.reduce((acc, ref) => {
    const destination = ref.referralSentTo || 'Unknown';
    if (!acc[destination]) {
      acc[destination] = { total: 0, admitted: 0 };
    }
    acc[destination].total += 1;
    if (ref.admitted) acc[destination].admitted += 1;
    return acc;
  }, {} as Record<string, { total: number; admitted: number }>);

  // Referrals OUT (who we sent to)
  const referralOutStats = filteredReferrals.reduce((acc, ref) => {
    if (ref.referralOut) {
      const out = ref.referralOut;
      if (!acc[out]) {
        acc[out] = { total: 0 };
      }
      acc[out].total += 1;
    }
    return acc;
  }, {} as Record<string, { total: number }>);

  // Lead source breakdown
  const leadSourceStats = filteredReferrals.reduce((acc, ref) => {
    const source = ref.leadSource || 'Unknown';
    if (!acc[source]) {
      acc[source] = { total: 0, admitted: 0 };
    }
    acc[source].total += 1;
    if (ref.admitted) acc[source].admitted += 1;
    return acc;
  }, {} as Record<string, { total: number; admitted: number }>);

  if (loading) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading metrics...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={6} align="stretch">
        <Heading>Metrics Dashboard</Heading>

        {/* Date Range Filter */}
        <Card bg={cardBg} shadow="md">
          <CardBody>
            <HStack spacing={4} align="end">
              <FormControl maxW="250px">
                <FormLabel>Start Date</FormLabel>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </FormControl>
              <FormControl maxW="250px">
                <FormLabel>End Date</FormLabel>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </FormControl>
              {(startDate || endDate) && (
                <Button onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </HStack>
          </CardBody>
        </Card>

        {/* Overview Stats */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
          <GridItem>
            <Card bg={statBg} shadow="md">
              <CardBody>
                <Stat>
                  <StatLabel>Total Referrals</StatLabel>
                  <StatNumber>{totalReferrals}</StatNumber>
                  <StatHelpText>
                    {startDate || endDate ? 'In selected range' : 'All time'}
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card bg={statBg} shadow="md">
              <CardBody>
                <Stat>
                  <StatLabel>Total Admitted</StatLabel>
                  <StatNumber>{totalAdmitted}</StatNumber>
                  <StatHelpText>
                    {startDate || endDate ? 'In selected range' : 'All time'}
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card bg={statBg} shadow="md">
              <CardBody>
                <Stat>
                  <StatLabel>Conversion Rate</StatLabel>
                  <StatNumber>{conversionRate}%</StatNumber>
                  <StatHelpText>Admitted / Total</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Lead Source Breakdown */}
        <Card bg={cardBg} shadow="md">
          <CardHeader>
            <Heading size="md">Lead Source Breakdown</Heading>
          </CardHeader>
          <CardBody>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Lead Source</Th>
                  <Th isNumeric>Total Referrals</Th>
                  <Th isNumeric>Admitted</Th>
                  <Th isNumeric>Conversion Rate</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(leadSourceStats).map(([source, stats]) => (
                  <Tr key={source}>
                    <Td fontWeight="bold">{source}</Td>
                    <Td isNumeric>{stats.total}</Td>
                    <Td isNumeric>{stats.admitted}</Td>
                    <Td isNumeric>{((stats.admitted / stats.total) * 100).toFixed(1)}%</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>

        {/* Referral Source Stats - Incoming */}
        <Card bg={cardBg} shadow="md">
          <CardHeader>
            <Heading size="md">Referrals FROM Sources (Incoming)</Heading>
          </CardHeader>
          <CardBody>
            {Object.keys(referralSourceStats).length === 0 ? (
              <Text>No referral source data available</Text>
            ) : (
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Source</Th>
                    <Th isNumeric>Total Referrals</Th>
                    <Th isNumeric>Admitted</Th>
                    <Th isNumeric>Conversion Rate</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {Object.entries(referralSourceStats).map(([source, stats]) => (
                    <Tr key={source}>
                      <Td fontWeight="bold">{source}</Td>
                      <Td isNumeric>{stats.total}</Td>
                      <Td isNumeric>{stats.admitted}</Td>
                      <Td isNumeric>{((stats.admitted / stats.total) * 100).toFixed(1)}%</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Referral Sent To Stats */}
        <Card bg={cardBg} shadow="md">
          <CardHeader>
            <Heading size="md">Referrals Sent TO Destinations</Heading>
          </CardHeader>
          <CardBody>
            {Object.keys(referralSentToStats).length === 0 ? (
              <Text>No destination data available</Text>
            ) : (
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Destination</Th>
                    <Th isNumeric>Total Sent</Th>
                    <Th isNumeric>Admitted</Th>
                    <Th isNumeric>Admission Rate</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {Object.entries(referralSentToStats).map(([destination, stats]) => (
                    <Tr key={destination}>
                      <Td fontWeight="bold">{destination}</Td>
                      <Td isNumeric>{stats.total}</Td>
                      <Td isNumeric>{stats.admitted}</Td>
                      <Td isNumeric>{((stats.admitted / stats.total) * 100).toFixed(1)}%</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Referrals OUT */}
        <Card bg={cardBg} shadow="md">
          <CardHeader>
            <Heading size="md">Referrals OUT (Who We Sent To)</Heading>
          </CardHeader>
          <CardBody>
            {Object.keys(referralOutStats).length === 0 ? (
              <Text>No outgoing referral data available</Text>
            ) : (
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Organization</Th>
                    <Th isNumeric>Total Sent</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {Object.entries(referralOutStats).map(([org, stats]) => (
                    <Tr key={org}>
                      <Td fontWeight="bold">{org}</Td>
                      <Td isNumeric>{stats.total}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};
