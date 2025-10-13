import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
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
  Select,
  SimpleGrid,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../config/firebase';

interface ReferralData {
  id: string;
  firstName: string;
  lastName: string;
  leadSource: string;
  referralSource: string;
  referralOut: string;
  referralType: string;
  referralSentTo: string;
  insuranceCompany: string;
  levelOfCare: string;
  admitted: string | boolean;
  outreachRep?: string;
  createdAt: any;
}

export const MetricsPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredReferrals, setFilteredReferrals] = useState<ReferralData[]>([]);
  const keySequenceRef = useRef<string>('');

  // Additional filters
  const [filterLeadSource, setFilterLeadSource] = useState('');
  const [filterOutreachRep, setFilterOutreachRep] = useState('');
  const [filterReferralSource, setFilterReferralSource] = useState('');
  const [filterReferralOut, setFilterReferralOut] = useState('');
  const [filterReferralType, setFilterReferralType] = useState('');
  const [filterInsuranceCompany, setFilterInsuranceCompany] = useState('');
  const [filterLevelOfCare, setFilterLevelOfCare] = useState('');
  const [filterReferralSentTo, setFilterReferralSentTo] = useState('');
  const [filterAdmitted, setFilterAdmitted] = useState('');

  const cardBg = useColorModeValue('white', 'gray.700');
  const statBg = useColorModeValue('blue.50', 'blue.900');

  useEffect(() => {
    fetchReferrals();
  }, []);

  useEffect(() => {
    filterReferrals();
  }, [referrals, startDate, endDate, filterLeadSource, filterOutreachRep, filterReferralSource, filterReferralOut, filterReferralType, filterInsuranceCompany, filterLevelOfCare, filterReferralSentTo, filterAdmitted]);

  // Easter egg: detect "gitgud" sequence
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      keySequenceRef.current += e.key.toLowerCase();

      // Keep only last 6 characters
      if (keySequenceRef.current.length > 6) {
        keySequenceRef.current = keySequenceRef.current.slice(-6);
      }

      // Check for "gitgud"
      if (keySequenceRef.current.includes('gitgud')) {
        keySequenceRef.current = '';
        navigate('/secret-snake');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

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

    // Date range filter
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

    // Lead Source filter
    if (filterLeadSource) {
      filtered = filtered.filter(ref => ref.leadSource === filterLeadSource);
    }

    // Outreach Rep filter (only when Lead Source is Outreach)
    if (filterOutreachRep) {
      filtered = filtered.filter(ref => ref.outreachRep === filterOutreachRep);
    }

    // Referral Source filter
    if (filterReferralSource) {
      filtered = filtered.filter(ref => ref.referralSource === filterReferralSource);
    }

    // Referral Out filter
    if (filterReferralOut) {
      filtered = filtered.filter(ref => ref.referralOut === filterReferralOut);
    }

    // Referral Type filter
    if (filterReferralType) {
      filtered = filtered.filter(ref => ref.referralType === filterReferralType);
    }

    // Insurance Company filter
    if (filterInsuranceCompany) {
      filtered = filtered.filter(ref => ref.insuranceCompany === filterInsuranceCompany);
    }

    // Level of Care filter
    if (filterLevelOfCare) {
      filtered = filtered.filter(ref => ref.levelOfCare === filterLevelOfCare);
    }

    // Referral Sent To filter
    if (filterReferralSentTo) {
      filtered = filtered.filter(ref => ref.referralSentTo === filterReferralSentTo);
    }

    // Admitted filter
    if (filterAdmitted) {
      filtered = filtered.filter(ref => {
        const admitted = typeof ref.admitted === 'string' ? ref.admitted : (ref.admitted ? 'Yes' : 'No');
        return admitted === filterAdmitted;
      });
    }

    setFilteredReferrals(filtered);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterLeadSource('');
    setFilterOutreachRep('');
    setFilterReferralSource('');
    setFilterReferralOut('');
    setFilterReferralType('');
    setFilterInsuranceCompany('');
    setFilterLevelOfCare('');
    setFilterReferralSentTo('');
    setFilterAdmitted('');
  };

  // Get unique values for filters
  const uniqueLeadSources = Array.from(new Set(referrals.map(r => r.leadSource).filter(Boolean))).sort();
  const uniqueOutreachReps = Array.from(new Set(referrals.filter(r => r.leadSource === 'Outreach' && r.outreachRep).map(r => r.outreachRep!))).sort();
  const uniqueReferralSources = Array.from(new Set(referrals.map(r => r.referralSource).filter(Boolean))).sort();
  const uniqueReferralOuts = Array.from(new Set(referrals.map(r => r.referralOut).filter(Boolean))).sort();
  const uniqueReferralTypes = Array.from(new Set(referrals.map(r => r.referralType).filter(Boolean))).sort();
  const uniqueInsuranceCompanies = Array.from(new Set(referrals.map(r => r.insuranceCompany).filter(Boolean))).sort();
  const uniqueLevelOfCare = Array.from(new Set(referrals.map(r => r.levelOfCare).filter(Boolean))).sort();
  const uniqueReferralSentTo = Array.from(new Set(referrals.map(r => r.referralSentTo).filter(Boolean))).sort();

  // Calculate metrics
  const totalReferrals = filteredReferrals.length;
  const totalAdmitted = filteredReferrals.filter(r => {
    if (typeof r.admitted === 'string') {
      return r.admitted === 'Yes';
    }
    return r.admitted === true;
  }).length;
  const conversionRate = totalReferrals > 0 ? ((totalAdmitted / totalReferrals) * 100).toFixed(1) : '0';

  // Group by referral source
  const referralSourceStats = filteredReferrals.reduce((acc, ref) => {
    const source = ref.referralSource || 'Unknown';
    if (!acc[source]) {
      acc[source] = { total: 0, admitted: 0 };
    }
    acc[source].total += 1;
    const isAdmitted = typeof ref.admitted === 'string' ? ref.admitted === 'Yes' : ref.admitted === true;
    if (isAdmitted) acc[source].admitted += 1;
    return acc;
  }, {} as Record<string, { total: number; admitted: number }>);

  // Group referrals sent TO various destinations
  const referralSentToStats = filteredReferrals.reduce((acc, ref) => {
    const destination = ref.referralSentTo || 'Unknown';
    if (!acc[destination]) {
      acc[destination] = { total: 0, admitted: 0 };
    }
    acc[destination].total += 1;
    const isAdmitted = typeof ref.admitted === 'string' ? ref.admitted === 'Yes' : ref.admitted === true;
    if (isAdmitted) acc[destination].admitted += 1;
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
    const isAdmitted = typeof ref.admitted === 'string' ? ref.admitted === 'Yes' : ref.admitted === true;
    if (isAdmitted) acc[source].admitted += 1;
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

        {/* Filters */}
        <Accordion allowToggle defaultIndex={[0]}>
          <AccordionItem border="none">
            <Card bg={cardBg} shadow="md">
              <AccordionButton p={0} _hover={{ bg: 'transparent' }}>
                <CardHeader flex="1" textAlign="left">
                  <Heading size="md">
                    Filters
                    <AccordionIcon ml={2} />
                  </Heading>
                </CardHeader>
              </AccordionButton>
              <AccordionPanel pb={4}>
                <CardBody pt={0}>
                  <VStack spacing={4} align="stretch">
                    {/* Date Range */}
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Start Date</FormLabel>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>End Date</FormLabel>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </FormControl>
                    </SimpleGrid>

                    {/* Additional Filters */}
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Lead Source</FormLabel>
                        <Select
                          value={filterLeadSource}
                          onChange={(e) => setFilterLeadSource(e.target.value)}
                          placeholder="All"
                        >
                          {uniqueLeadSources.map(source => (
                            <option key={source} value={source}>{source}</option>
                          ))}
                        </Select>
                      </FormControl>

                      {filterLeadSource === 'Outreach' && uniqueOutreachReps.length > 0 && (
                        <FormControl>
                          <FormLabel>Outreach Rep</FormLabel>
                          <Select
                            value={filterOutreachRep}
                            onChange={(e) => setFilterOutreachRep(e.target.value)}
                            placeholder="All"
                          >
                            {uniqueOutreachReps.map(rep => (
                              <option key={rep} value={rep}>{rep}</option>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      <FormControl>
                        <FormLabel>Referral Source</FormLabel>
                        <Select
                          value={filterReferralSource}
                          onChange={(e) => setFilterReferralSource(e.target.value)}
                          placeholder="All"
                        >
                          {uniqueReferralSources.map(source => (
                            <option key={source} value={source}>{source}</option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Referral Out</FormLabel>
                        <Select
                          value={filterReferralOut}
                          onChange={(e) => setFilterReferralOut(e.target.value)}
                          placeholder="All"
                        >
                          {uniqueReferralOuts.map(out => (
                            <option key={out} value={out}>{out}</option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Referral Type</FormLabel>
                        <Select
                          value={filterReferralType}
                          onChange={(e) => setFilterReferralType(e.target.value)}
                          placeholder="All"
                        >
                          {uniqueReferralTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Insurance Company</FormLabel>
                        <Select
                          value={filterInsuranceCompany}
                          onChange={(e) => setFilterInsuranceCompany(e.target.value)}
                          placeholder="All"
                        >
                          {uniqueInsuranceCompanies.map(company => (
                            <option key={company} value={company}>{company}</option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Level of Care</FormLabel>
                        <Select
                          value={filterLevelOfCare}
                          onChange={(e) => setFilterLevelOfCare(e.target.value)}
                          placeholder="All"
                        >
                          {uniqueLevelOfCare.map(level => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Referral Sent To</FormLabel>
                        <Select
                          value={filterReferralSentTo}
                          onChange={(e) => setFilterReferralSentTo(e.target.value)}
                          placeholder="All"
                        >
                          {uniqueReferralSentTo.map(dest => (
                            <option key={dest} value={dest}>{dest}</option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Admitted</FormLabel>
                        <Select
                          value={filterAdmitted}
                          onChange={(e) => setFilterAdmitted(e.target.value)}
                          placeholder="All"
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                          <option value="Pending">Pending</option>
                          <option value="In process">In process</option>
                        </Select>
                      </FormControl>
                    </SimpleGrid>

                    <Button onClick={clearFilters} colorScheme="gray" size="sm" alignSelf="flex-start">
                      Clear All Filters
                    </Button>
                  </VStack>
                </CardBody>
              </AccordionPanel>
            </Card>
          </AccordionItem>
        </Accordion>

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
            <Box overflowX="auto">
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
            </Box>
          </CardBody>
        </Card>

        {/* Referral Source Stats - Incoming */}
        <Card bg={cardBg} shadow="md">
          <CardHeader>
            <Heading size="md">Referrals FROM Sources</Heading>
          </CardHeader>
          <CardBody>
            {Object.keys(referralSourceStats).length === 0 ? (
              <Text>No referral source data available</Text>
            ) : (
              <Box overflowX="auto">
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
              </Box>
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
              <Box overflowX="auto">
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
              </Box>
            )}
          </CardBody>
        </Card>

        {/* Referrals OUT */}
        <Card bg={cardBg} shadow="md">
          <CardHeader>
            <Heading size="md">Referrals OUT</Heading>
          </CardHeader>
          <CardBody>
            {Object.keys(referralOutStats).length === 0 ? (
              <Text>No outgoing referral data available</Text>
            ) : (
              <Box overflowX="auto">
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
              </Box>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};
