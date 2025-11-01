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
  useColorModeValue,
  HStack
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
  admitted: string;
  outreachRep?: string;
  category?: string;
  createdAt: any;
  callInDate?: string;
  privatePay?: boolean;
  insuranceType?: string;
  assignedTo?: string;
  admittedToReferrant?: string;
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
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLeadSource, setFilterLeadSource] = useState('');
  const [filterOutreachRep, setFilterOutreachRep] = useState('');
  const [filterReferralSource, setFilterReferralSource] = useState('');
  const [filterReferralOut, setFilterReferralOut] = useState('');
  const [filterReferralType, setFilterReferralType] = useState('');
  const [filterInsuranceCompany, setFilterInsuranceCompany] = useState('');
  const [filterLevelOfCare, setFilterLevelOfCare] = useState('');
  const [filterReferralSentTo, setFilterReferralSentTo] = useState('');
  const [filterAdmitted, setFilterAdmitted] = useState('');
  const [leadSourceSortField, setLeadSourceSortField] = useState<'total' | 'admitted' | 'conversion' | null>('total');
  const [leadSourceSortDirection, setLeadSourceSortDirection] = useState<'asc' | 'desc'>('desc');
  const [referralSourceSortField, setReferralSourceSortField] = useState<'total' | 'admitted' | 'conversion' | null>('total');
  const [referralSourceSortDirection, setReferralSourceSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAllLeadSources, setShowAllLeadSources] = useState(false);
  const [showAllReferralSources, setShowAllReferralSources] = useState(false);
  const [showAllReferralOut, setShowAllReferralOut] = useState(false);
  const [referralOutSortField, setReferralOutSortField] = useState<'total' | 'admitted' | 'conversion' | null>('total');
  const [referralOutSortDirection, setReferralOutSortDirection] = useState<'asc' | 'desc'>('desc');

  const cardBg = useColorModeValue('white', 'gray.700');
  const statBg = useColorModeValue('blue.50', 'blue.900');

  // Fixed list of lead sources for the dropdown (matching FormPage)
  const LEAD_SOURCE_OPTIONS = [
    'Alumni',
    'Alumni-Readmit',
    'Direct-Internet',
    'Direct-Call Center',
    'Insurance',
    'Employee',
    'Katy Alexander',
    'Tayler Marsh',
    'Joey Price',
    'Jessica Estebane',
    'SBR'
  ];

  // Normalize lead source - fix incorrect values
  // Preserve all lead source values exactly as they appear, only fix spelling of "Jessica Estabane" to "Jessica Estebane"
  const normalizeLeadSource = (leadSource: string | undefined): string => {
    if (!leadSource) return '';
    
    // Fix "Jessica Estabane" to "Jessica Estebane"
    let normalized = leadSource.replace(/Jessica Estabane/gi, 'Jessica Estebane');
    
    return normalized;
  };

  // Normalize referral type - fix "Treament center" to "Treatment Center"
  const normalizeReferralType = (referralType: string | undefined): string => {
    if (!referralType) return '';
    
    // Fix "Treament center" (misspelled) to "Treatment Center" (correct spelling)
    let normalized = referralType.trim();
    // Fix the misspelling "Treament" to "Treatment" - catch all variations with flexible spacing
    // Matches "Treament Center", "Treament center", "TreamentCenter", etc.
    normalized = normalized.replace(/Treament\s*[Cc]enter/gi, 'Treatment Center');
    // Also normalize other case variations to "Treatment Center" for consistency
    normalized = normalized.replace(/treatment\s+center/gi, 'Treatment Center');
    normalized = normalized.replace(/Treatment\s+center/gi, 'Treatment Center');
    
    return normalized;
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  useEffect(() => {
    filterReferrals();
  }, [referrals, startDate, endDate, filterCategory, filterLeadSource, filterOutreachRep, filterReferralSource, filterReferralOut, filterReferralType, filterInsuranceCompany, filterLevelOfCare, filterReferralSentTo, filterAdmitted]);

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
      const data = querySnapshot.docs.map(doc => {
        const referralData = {
          id: doc.id,
          ...doc.data()
        } as ReferralData;
        // Normalize referral type to fix misspelling
        return {
          ...referralData,
          referralType: normalizeReferralType(referralData.referralType)
        };
      });
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
        // Ensure start date is at beginning of day (00:00:00)
        const start = startDate ? new Date(startDate + 'T00:00:00') : null;
        // Ensure end date is at end of day (23:59:59.999)
        const end = endDate ? new Date(endDate + 'T23:59:59.999') : null;

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

    // Category filter
    if (filterCategory) {
      filtered = filtered.filter(ref => ref.category === filterCategory);
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
      filtered = filtered.filter(ref => {
        const source = ref.referralSource || '';
        return source.toLowerCase().includes(filterReferralSource.toLowerCase());
      });
    }

    // Referral Out filter
    if (filterReferralOut) {
      filtered = filtered.filter(ref => ref.referralOut === filterReferralOut);
    }

    // Referral Type filter (normalize both the filter and the data for matching)
    if (filterReferralType) {
      const normalizedFilter = normalizeReferralType(filterReferralType);
      filtered = filtered.filter(ref => {
        const normalizedRefType = normalizeReferralType(ref.referralType);
        return normalizedRefType === normalizedFilter || ref.referralType === filterReferralType;
      });
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
        const admitted = ref.admitted || '';
        // Case-insensitive comparison to handle "YES" vs "Yes" variations
        return admitted.toUpperCase() === filterAdmitted.toUpperCase();
      });
    }

    setFilteredReferrals(filtered);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterCategory('');
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

  // Helper function to escape CSV values
  const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // If value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Helper function to format date for CSV
  const formatDateForCsv = (date: any): string => {
    if (!date) return '';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(dateObj.getTime())) return '';
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return '';
    }
  };

  // Function to convert referral data to CSV
  const convertToCsv = (data: ReferralData[]): string => {
    if (data.length === 0) return '';

    // Define CSV headers
    const headers = [
      'First Name',
      'Last Name',
      'Call in Date',
      'Created Date',
      'Category',
      'Lead Source',
      'Outreach Rep',
      'Referral Source',
      'Referral Out',
      'Referral Type',
      'Insurance Company',
      'Insurance Type',
      'Private Pay',
      'Admitted to Referrant',
      'Admitted',
      'Assigned To',
      'Level of Care',
      'Referral Sent To'
    ];

    // Create CSV rows
    const rows = data.map(referral => [
      escapeCsvValue(referral.firstName || ''),
      escapeCsvValue(referral.lastName || ''),
      escapeCsvValue(referral.callInDate || ''),
      escapeCsvValue(formatDateForCsv(referral.createdAt)),
      escapeCsvValue(referral.category || ''),
      escapeCsvValue(referral.leadSource || ''),
      escapeCsvValue(referral.outreachRep || ''),
      escapeCsvValue(referral.referralSource || ''),
      escapeCsvValue(referral.referralOut || ''),
      escapeCsvValue(referral.referralType || ''),
      escapeCsvValue(referral.insuranceCompany || ''),
      escapeCsvValue(referral.insuranceType || ''),
      escapeCsvValue(referral.privatePay ? 'Yes' : 'No'),
      escapeCsvValue(referral.admittedToReferrant || ''),
      escapeCsvValue(referral.admitted || ''),
      escapeCsvValue(referral.assignedTo || ''),
      escapeCsvValue(referral.levelOfCare || ''),
      escapeCsvValue(referral.referralSentTo || '')
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  };

  // Function to download CSV
  const downloadCsv = (data: ReferralData[], filename: string) => {
    const csv = convertToCsv(data);
    if (!csv) {
      toast({
        title: 'Error',
        description: 'No data to export',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Create blob and download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Success',
      description: `Exported ${data.length} record(s) to ${filename}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Export all referrals
  const handleExportAll = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCsv(referrals, `all-referrals-${timestamp}.csv`);
  };

  // Export filtered referrals
  const handleExportFiltered = () => {
    if (filteredReferrals.length === 0) {
      toast({
        title: 'No Data',
        description: 'No filtered data to export. Apply filters first.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCsv(filteredReferrals, `filtered-referrals-${timestamp}.csv`);
  };

  // Helper function to format date as YYYY-MM-DD
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Quick date range setters
  const setLast7Days = () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    setStartDate(formatDateForInput(sevenDaysAgo));
    setEndDate(formatDateForInput(today));
  };

  const setLast30Days = () => {
    const today = new Date();
    // Set to 30 days ago at 00:00:00
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    // Set to end of today at 23:59:59
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    setStartDate(formatDateForInput(thirtyDaysAgo));
    setEndDate(formatDateForInput(endOfToday));
  };

  const setMonthToDate = () => {
    const today = new Date();
    // Set to start of current month at 00:00:00
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
    // Set to end of today at 23:59:59
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    setStartDate(formatDateForInput(startOfMonth));
    setEndDate(formatDateForInput(endOfToday));
  };

  const setYearToDate = () => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    setStartDate(formatDateForInput(startOfYear));
    setEndDate(formatDateForInput(today));
  };

  // Use fixed list of lead sources for dropdown (matching FormPage)
  const uniqueLeadSources = LEAD_SOURCE_OPTIONS;
  const uniqueOutreachReps = Array.from(new Set(referrals.filter(r => r.leadSource === 'Outreach' && r.outreachRep).map(r => r.outreachRep!))).sort();
  const uniqueReferralSources = Array.from(new Set(referrals.map(r => r.referralSource).filter(Boolean))).sort();
  const uniqueReferralOuts = Array.from(new Set(referrals.map(r => r.referralOut).filter(Boolean))).sort();
  // Get unique referral types, normalize them and ensure misspelled version never appears
  const uniqueReferralTypes = Array.from(
    new Set(
      referrals
        .map(r => normalizeReferralType(r.referralType))
        .filter(Boolean)
        .filter(type => {
          // Remove any variations of the misspelled "Treament center" (should already be normalized, but double-check)
          const lowerType = type.toLowerCase().trim();
          return lowerType !== 'treament center' && !lowerType.includes('treament');
        })
    )
  ).sort();
  const uniqueInsuranceCompanies = Array.from(new Set(referrals.map(r => r.insuranceCompany).filter(Boolean))).sort();
  const uniqueLevelOfCare = Array.from(new Set(referrals.map(r => r.levelOfCare).filter(Boolean))).sort();
  const uniqueReferralSentTo = Array.from(new Set(referrals.map(r => r.referralSentTo).filter(Boolean))).sort();

  // Calculate metrics
  const totalReferrals = filteredReferrals.length;

  const totalAdmitted = filteredReferrals.filter(r => r.admitted === 'YES').length;

  const conversionRate = totalReferrals > 0 ? ((totalAdmitted / totalReferrals) * 100).toFixed(1) : '0';

  // Group by referral source
  const referralSourceStats = filteredReferrals.reduce((acc, ref) => {
    const source = ref.referralSource || 'Unknown';
    if (!acc[source]) {
      acc[source] = { total: 0, admitted: 0 };
    }
    acc[source].total += 1;
    const isAdmitted = ref.admitted === 'YES';
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
    const isAdmitted = ref.admitted === 'YES';
    if (isAdmitted) acc[destination].admitted += 1;
    return acc;
  }, {} as Record<string, { total: number; admitted: number }>);

  // Referrals OUT (who we sent to)
  const referralOutStats = filteredReferrals.reduce((acc, ref) => {
    if (ref.referralOut) {
      const out = ref.referralOut;
      if (!acc[out]) {
        acc[out] = { total: 0, admitted: 0 };
      }
      acc[out].total += 1;
      const isAdmitted = ref.admitted === 'YES';
      if (isAdmitted) acc[out].admitted += 1;
    }
    return acc;
  }, {} as Record<string, { total: number; admitted: number }>);

  // Lead source breakdown
  const leadSourceStats = filteredReferrals.reduce((acc, ref) => {
    const source = ref.leadSource || 'Unknown';
    if (!acc[source]) {
      acc[source] = { total: 0, admitted: 0 };
    }
    acc[source].total += 1;
    const isAdmitted = ref.admitted === 'YES';
    if (isAdmitted) acc[source].admitted += 1;
    return acc;
  }, {} as Record<string, { total: number; admitted: number }>);

  // Sort lead source stats - default to total descending (most to least)
  const sortedLeadSourceStats = Object.entries(leadSourceStats).sort((a, b) => {
    const [sourceA, statsA] = a;
    const [sourceB, statsB] = b;
    let comparison = 0;

    // If no sort field is selected, default to total
    const sortField = leadSourceSortField || 'total';

    if (sortField === 'total') {
      comparison = statsA.total - statsB.total;
    } else if (sortField === 'admitted') {
      comparison = statsA.admitted - statsB.admitted;
    } else if (sortField === 'conversion') {
      const rateA = statsA.total > 0 ? (statsA.admitted / statsA.total) * 100 : 0;
      const rateB = statsB.total > 0 ? (statsB.admitted / statsB.total) * 100 : 0;
      comparison = rateA - rateB;
    }

    return leadSourceSortDirection === 'desc' ? -comparison : comparison;
  });

  const handleLeadSourceSort = (field: 'total' | 'admitted' | 'conversion') => {
    if (leadSourceSortField === field) {
      setLeadSourceSortDirection(leadSourceSortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setLeadSourceSortField(field);
      setLeadSourceSortDirection('desc'); // Default to descending (most to least)
    }
  };

  // Sort referral source stats - default to total descending (most to least)
  const sortedReferralSourceStats = Object.entries(referralSourceStats).sort((a, b) => {
    const [sourceA, statsA] = a;
    const [sourceB, statsB] = b;
    let comparison = 0;

    // If no sort field is selected, default to total
    const sortField = referralSourceSortField || 'total';

    if (sortField === 'total') {
      comparison = statsA.total - statsB.total;
    } else if (sortField === 'admitted') {
      comparison = statsA.admitted - statsB.admitted;
    } else if (sortField === 'conversion') {
      const rateA = statsA.total > 0 ? (statsA.admitted / statsA.total) * 100 : 0;
      const rateB = statsB.total > 0 ? (statsB.admitted / statsB.total) * 100 : 0;
      comparison = rateA - rateB;
    }

    return referralSourceSortDirection === 'desc' ? -comparison : comparison;
  });

  const handleReferralSourceSort = (field: 'total' | 'admitted' | 'conversion') => {
    if (referralSourceSortField === field) {
      setReferralSourceSortDirection(referralSourceSortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setReferralSourceSortField(field);
      setReferralSourceSortDirection('desc'); // Default to descending (most to least)
    }
  };

  // Display first 25 items by default, show "Show More" if there are more than 25
  const MAX_ITEMS_TO_SHOW = 25;
  const displayLeadSources = showAllLeadSources 
    ? sortedLeadSourceStats 
    : sortedLeadSourceStats.slice(0, MAX_ITEMS_TO_SHOW);
  const hasMoreLeadSources = sortedLeadSourceStats.length > MAX_ITEMS_TO_SHOW;

  const displayReferralSources = showAllReferralSources 
    ? sortedReferralSourceStats 
    : sortedReferralSourceStats.slice(0, MAX_ITEMS_TO_SHOW);
  const hasMoreReferralSources = sortedReferralSourceStats.length > MAX_ITEMS_TO_SHOW;

  // Sort referral out stats - default to total descending (most to least)
  const sortedReferralOutStats = Object.entries(referralOutStats).sort((a, b) => {
    const [orgA, statsA] = a;
    const [orgB, statsB] = b;
    let comparison = 0;

    // If no sort field is selected, default to total
    const sortField = referralOutSortField || 'total';

    if (sortField === 'total') {
      comparison = statsA.total - statsB.total;
    } else if (sortField === 'admitted') {
      comparison = statsA.admitted - statsB.admitted;
    } else if (sortField === 'conversion') {
      const rateA = statsA.total > 0 ? (statsA.admitted / statsA.total) * 100 : 0;
      const rateB = statsB.total > 0 ? (statsB.admitted / statsB.total) * 100 : 0;
      comparison = rateA - rateB;
    }

    return referralOutSortDirection === 'desc' ? -comparison : comparison;
  });

  const handleReferralOutSort = (field: 'total' | 'admitted' | 'conversion') => {
    if (referralOutSortField === field) {
      setReferralOutSortDirection(referralOutSortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setReferralOutSortField(field);
      setReferralOutSortDirection('desc'); // Default to descending (most to least)
    }
  };

  const displayReferralOut = showAllReferralOut 
    ? sortedReferralOutStats 
    : sortedReferralOutStats.slice(0, MAX_ITEMS_TO_SHOW);
  const hasMoreReferralOut = sortedReferralOutStats.length > MAX_ITEMS_TO_SHOW;

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
              <CardHeader display="flex" justifyContent="space-between" alignItems="center" p={4}>
                <AccordionButton p={0} flex="1" textAlign="left" _hover={{ bg: 'transparent' }}>
                  <Heading size="md">
                    Filters
                    <AccordionIcon ml={2} />
                  </Heading>
                </AccordionButton>
                <Box display="flex" gap={2} ml={4} onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" onClick={setLast7Days} colorScheme="blue" variant="outline">
                    7 Days
                  </Button>
                  <Button size="sm" onClick={setLast30Days} colorScheme="blue" variant="outline">
                    30 Days
                  </Button>
                  <Button size="sm" onClick={setMonthToDate} colorScheme="blue" variant="outline">
                    MTD
                  </Button>
                  <Button size="sm" onClick={setYearToDate} colorScheme="blue" variant="outline">
                    YTD
                  </Button>
                </Box>
              </CardHeader>
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
                        <FormLabel>Category</FormLabel>
                        <Select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          placeholder="All"
                        >
                          <option value="Base">Base</option>
                          <option value="Outreach">Outreach</option>
                          <option value="Kaiser">Kaiser</option>
                          <option value="Direct">Direct</option>
                          <option value="Union">Union</option>
                        </Select>
                      </FormControl>

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
                        <Input
                          value={filterReferralSource}
                          onChange={(e) => setFilterReferralSource(e.target.value)}
                          placeholder="Enter referral source"
                        />
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
                          <option value="DTX">DTX</option>
                          <option value="RTC">RTC</option>
                          <option value="PHP">PHP</option>
                          <option value="IOP">IOP</option>
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
                          <option value="YES">Yes</option>
                          <option value="NO">No</option>
                          <option value="Pending">Pending</option>
                          <option value="In process">In process</option>
                        </Select>
                      </FormControl>
                    </SimpleGrid>

                    <HStack spacing={2} width="full" justify="space-between" flexWrap="wrap">
                      <Button onClick={clearFilters} colorScheme="gray" size="sm">
                        Clear All Filters
                      </Button>
                      <HStack spacing={2}>
                        <Button 
                          onClick={handleExportAll} 
                          colorScheme="green" 
                          size="sm"
                          leftIcon={<Box as="span" className="material-icons" fontSize="16px">download</Box>}
                        >
                          Export All
                        </Button>
                        <Button 
                          onClick={handleExportFiltered} 
                          colorScheme="blue" 
                          size="sm"
                          leftIcon={<Box as="span" className="material-icons" fontSize="16px">download</Box>}
                          isDisabled={filteredReferrals.length === 0}
                        >
                          Export Filtered ({filteredReferrals.length})
                        </Button>
                      </HStack>
                    </HStack>
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
                    <Th isNumeric>
                      <HStack spacing={1} justify="flex-end" cursor="pointer" onClick={() => handleLeadSourceSort('total')}>
                        <Box>Total Referrals</Box>
                        <Box as="span" className="material-icons" fontSize="16px">
                          {leadSourceSortField === 'total' 
                            ? (leadSourceSortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward')
                            : 'unfold_more'}
                        </Box>
                      </HStack>
                    </Th>
                    <Th isNumeric>
                      <HStack spacing={1} justify="flex-end" cursor="pointer" onClick={() => handleLeadSourceSort('admitted')}>
                        <Box>Admitted</Box>
                        <Box as="span" className="material-icons" fontSize="16px">
                          {leadSourceSortField === 'admitted' 
                            ? (leadSourceSortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward')
                            : 'unfold_more'}
                        </Box>
                      </HStack>
                    </Th>
                    <Th isNumeric>
                      <HStack spacing={1} justify="flex-end" cursor="pointer" onClick={() => handleLeadSourceSort('conversion')}>
                        <Box>Conversion Rate</Box>
                        <Box as="span" className="material-icons" fontSize="16px">
                          {leadSourceSortField === 'conversion' 
                            ? (leadSourceSortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward')
                            : 'unfold_more'}
                        </Box>
                      </HStack>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {displayLeadSources.map(([source, stats]) => (
                    <Tr key={source}>
                      <Td fontWeight="bold">{source}</Td>
                      <Td isNumeric>{stats.total}</Td>
                      <Td isNumeric>{stats.admitted}</Td>
                      <Td isNumeric>{((stats.admitted / stats.total) * 100).toFixed(1)}%</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {hasMoreLeadSources && (
                <Box mt={4} textAlign="center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAllLeadSources(!showAllLeadSources)}
                  >
                    {showAllLeadSources ? 'Show Less' : `Show More (${sortedLeadSourceStats.length - MAX_ITEMS_TO_SHOW} more)`}
                  </Button>
                </Box>
              )}
            </Box>
          </CardBody>
        </Card>

        {/* Inbound Referrals by Source */}
        <Card bg={cardBg} shadow="md">
          <CardHeader>
            <Heading size="md">Inbound Referrals by Source</Heading>
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
                      <Th isNumeric>
                        <HStack spacing={1} justify="flex-end" cursor="pointer" onClick={() => handleReferralSourceSort('total')}>
                          <Box>Total Referrals</Box>
                          <Box as="span" className="material-icons" fontSize="16px">
                            {referralSourceSortField === 'total' 
                              ? (referralSourceSortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward')
                              : 'unfold_more'}
                          </Box>
                        </HStack>
                      </Th>
                      <Th isNumeric>
                        <HStack spacing={1} justify="flex-end" cursor="pointer" onClick={() => handleReferralSourceSort('admitted')}>
                          <Box>Admitted</Box>
                          <Box as="span" className="material-icons" fontSize="16px">
                            {referralSourceSortField === 'admitted' 
                              ? (referralSourceSortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward')
                              : 'unfold_more'}
                          </Box>
                        </HStack>
                      </Th>
                      <Th isNumeric>
                        <HStack spacing={1} justify="flex-end" cursor="pointer" onClick={() => handleReferralSourceSort('conversion')}>
                          <Box>Conversion Rate</Box>
                          <Box as="span" className="material-icons" fontSize="16px">
                            {referralSourceSortField === 'conversion' 
                              ? (referralSourceSortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward')
                              : 'unfold_more'}
                          </Box>
                        </HStack>
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {displayReferralSources.map(([source, stats]) => (
                      <Tr key={source}>
                        <Td fontWeight="bold">{source}</Td>
                        <Td isNumeric>{stats.total}</Td>
                        <Td isNumeric>{stats.admitted}</Td>
                        <Td isNumeric>{((stats.admitted / stats.total) * 100).toFixed(1)}%</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {hasMoreReferralSources && (
                  <Box mt={4} textAlign="center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAllReferralSources(!showAllReferralSources)}
                    >
                      {showAllReferralSources ? 'Show Less' : `Show More (${sortedReferralSourceStats.length - MAX_ITEMS_TO_SHOW} more)`}
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </CardBody>
        </Card>

        {/* Admits by Facility */}
        <Card bg={cardBg} shadow="md">
          <CardHeader>
            <Heading size="md">Admits by Facility</Heading>
          </CardHeader>
          <CardBody>
            {Object.keys(referralSentToStats).length === 0 ? (
              <Text>No facility data available</Text>
            ) : (
              <Box overflowX="auto">
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Facility</Th>
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
                      <Th isNumeric>
                        <HStack spacing={1} justify="flex-end" cursor="pointer" onClick={() => handleReferralOutSort('total')}>
                          <Box>Total Sent</Box>
                          <Box as="span" className="material-icons" fontSize="16px">
                            {referralOutSortField === 'total' 
                              ? (referralOutSortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward')
                              : 'unfold_more'}
                          </Box>
                        </HStack>
                      </Th>
                      <Th isNumeric>
                        <HStack spacing={1} justify="flex-end" cursor="pointer" onClick={() => handleReferralOutSort('admitted')}>
                          <Box>Total Admitted</Box>
                          <Box as="span" className="material-icons" fontSize="16px">
                            {referralOutSortField === 'admitted' 
                              ? (referralOutSortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward')
                              : 'unfold_more'}
                          </Box>
                        </HStack>
                      </Th>
                      <Th isNumeric>
                        <HStack spacing={1} justify="flex-end" cursor="pointer" onClick={() => handleReferralOutSort('conversion')}>
                          <Box>Conversion Rate</Box>
                          <Box as="span" className="material-icons" fontSize="16px">
                            {referralOutSortField === 'conversion' 
                              ? (referralOutSortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward')
                              : 'unfold_more'}
                          </Box>
                        </HStack>
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {displayReferralOut.map(([org, stats]) => (
                      <Tr key={org}>
                        <Td fontWeight="bold">{org}</Td>
                        <Td isNumeric>{stats.total}</Td>
                        <Td isNumeric>{stats.admitted}</Td>
                        <Td isNumeric>{((stats.admitted / stats.total) * 100).toFixed(1)}%</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {hasMoreReferralOut && (
                  <Box mt={4} textAlign="center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAllReferralOut(!showAllReferralOut)}
                    >
                      {showAllReferralOut ? 'Show Less' : `Show More (${sortedReferralOutStats.length - MAX_ITEMS_TO_SHOW} more)`}
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};
