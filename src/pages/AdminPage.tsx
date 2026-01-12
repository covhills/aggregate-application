import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  HStack,
  VStack,
  Stack,
  useToast,
  IconButton,
  Text,
  Spinner,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
  FormControl,
  FormLabel,
  Select,
  Badge,
  useColorModeValue,
  Card,
  CardBody,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface ReferralData {
  id: string;
  firstName: string;
  lastName: string;
  leadSource: string;
  referralSource: string;
  referralOut: string;
  insuranceCompany: string;
  program: string;
  referralSentTo: string;
  admitted: string;
  createdAt: any;
  createdBy: string;
  outreachRep?: string;
  category?: string;
  admittedToReferrant?: string;
  assignedTo?: string;
  callInDate?: string;
}

export const AdminPage = () => {
  const toast = useToast();
  const [referrals,
    setReferrals] = useState<ReferralData[]>([]);
  const [allReferrals, setAllReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<ReferralData | null>(null);
  const [editData, setEditData] = useState<Partial<ReferralData>>({});
  const [sortField, setSortField] = useState<'name' | 'date'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Data state
  const [isFiltered, setIsFiltered] = useState(false);

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterAdmitted, setFilterAdmitted] = useState('');
  const [filterSentTo, setFilterSentTo] = useState('');
  const [filterLeadSource, setFilterLeadSource] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterReferralSource, setFilterReferralSource] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterInsurance, setFilterInsurance] = useState('');

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const cardBg = useColorModeValue('white', 'gray.700');

  // Normalize outreach rep name to fix spelling
  const normalizeOutreachRep = (name: string | undefined): string => {
    if (!name) return '';
    // Fix "Jessica Estabane" to "Jessica Estebane"
    return name.replace(/Jessica Estabane/gi, 'Jessica Estebane');
  };

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

  // Valid lead sources - used for validation
  const VALID_LEAD_SOURCES = LEAD_SOURCE_OPTIONS;

  // Normalize lead source - fix incorrect values
  const normalizeLeadSource = (leadSource: string | undefined): string => {
    if (!leadSource) return '';
    
    // Fix "Jessica Estabane" to "Jessica Estebane"
    let normalized = leadSource.replace(/Jessica Estabane/gi, 'Jessica Estebane');
    
    return normalized;
  };

  // Normalize referral data to fix spelling issues
  const normalizeReferralData = (data: ReferralData): ReferralData => {
    return {
      ...data,
      leadSource: normalizeLeadSource(data.leadSource),
      outreachRep: data.outreachRep ? normalizeOutreachRep(data.outreachRep) : data.outreachRep,
      referralSentTo: normalizeReferralSentTo(data.referralSentTo),
    };
  };

  // Normalize referral sent to - fix "COV" and variations to "Cov Hills"
  const normalizeReferralSentTo = (referralSentTo: string | undefined): string | undefined => {
    if (!referralSentTo) return referralSentTo;
    
    let normalized = referralSentTo.trim();
    // Normalize "COV" and variations to "Cov Hills"
    // Matches "COV", "Cov", "cov", "Cov hills", "cov hills", etc.
    if (/^cov\s*hills?$/i.test(normalized) || normalized.toUpperCase() === 'COV') {
      return 'Cov Hills';
    }
    
    return normalized;
  };

  useEffect(() => {
    fetchReferrals();
  }, []);


  const fetchAllReferralsWithFilters = async (
    activeStartDate = startDate,
    activeEndDate = endDate,
    activeProgram = filterProgram,
    activeAdmitted = filterAdmitted,
    activeSentTo = filterSentTo,
    activeLeadSource = filterLeadSource,
    activeCategory = filterCategory,
    activeReferralSource = filterReferralSource,
    activeName = filterName,
    activeInsurance = filterInsurance
  ) => {
    setDataLoading(true);
    try {
      // Fetch all referrals and filter client-side to avoid Firestore index issues
      // This ensures filters work correctly regardless of composite index availability
      let q = query(collection(db, 'referrals'), orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => {
        const referralData = {
          id: doc.id,
          ...doc.data()
        } as ReferralData;
        return normalizeReferralData(referralData);
      });

      // Apply all filters client-side for reliable filtering
      let filteredData = data;

      // Filter by date range - use callInDate if available, otherwise fall back to createdAt
      if (activeStartDate || activeEndDate) {
        filteredData = filteredData.filter(ref => {
          // Prefer callInDate, fall back to createdAt if callInDate is not available
          let refDate: Date | null = null;
          
          if (ref.callInDate) {
            // callInDate is stored as YYYY-MM-DD string
            refDate = new Date(ref.callInDate + 'T00:00:00');
          } else if (ref.createdAt) {
            refDate = ref.createdAt.toDate ? ref.createdAt.toDate() : new Date(ref.createdAt);
          }
          
          if (!refDate || isNaN(refDate.getTime())) return false;

          // Ensure start date is at beginning of day (00:00:00)
          const start = activeStartDate ? new Date(activeStartDate + 'T00:00:00') : null;
          // Ensure end date is at end of day (23:59:59.999)
          const end = activeEndDate ? new Date(activeEndDate + 'T23:59:59.999') : null;

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

      // Filter by program
      if (activeProgram) {
        filteredData = filteredData.filter(ref => ref.program === activeProgram);
      }

      // Filter by admitted
      if (activeAdmitted !== '') {
        filteredData = filteredData.filter(ref => ref.admitted === activeAdmitted);
      }

      // Filter by sent to
      if (activeSentTo) {
        const normalizedFilter = normalizeReferralSentTo(activeSentTo);
        filteredData = filteredData.filter(ref => {
          const normalizedRefSentTo = normalizeReferralSentTo(ref.referralSentTo);
          return normalizedRefSentTo === normalizedFilter || ref.referralSentTo === activeSentTo;
        });
      }

      // Filter by lead source (with normalization)
      if (activeLeadSource) {
        const normalizedFilter = normalizeLeadSource(activeLeadSource);
        filteredData = filteredData.filter(ref => {
          const normalizedRefLeadSource = normalizeLeadSource(ref.leadSource);
          return normalizedRefLeadSource === normalizedFilter || ref.leadSource === activeLeadSource;
        });
      }

      // Filter by category
      if (activeCategory) {
        filteredData = filteredData.filter(ref => ref.category === activeCategory);
      }

      // Filter by referral source (text search)
      if (activeReferralSource) {
        filteredData = filteredData.filter(ref =>
          ref.referralSource?.toLowerCase().includes(activeReferralSource.toLowerCase())
        );
      }

      // Filter by name (text search)
      if (activeName) {
        filteredData = filteredData.filter(ref => {
          const fullName = `${ref.firstName} ${ref.lastName}`.toLowerCase();
          return fullName.includes(activeName.toLowerCase());
        });
      }

      // Filter by insurance (text search)
      if (activeInsurance) {
        filteredData = filteredData.filter(ref =>
          ref.insuranceCompany?.toLowerCase().includes(activeInsurance.toLowerCase())
        );
      }

      setAllReferrals(filteredData);
      setIsFiltered(true);

      // Show ALL filtered results without pagination
      setReferrals(filteredData);

    } catch (error) {
      console.error('Error fetching filtered referrals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load filtered referrals',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDataLoading(false);
    }
  };

  const fetchReferrals = async () => {
    if (initialLoad) {
      setLoading(true);
    } else {
      setDataLoading(true);
    }

    try {
      // Get only the most recent 20 results
      const q = query(
        collection(db, 'referrals'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => {
        const referralData = {
          id: doc.id,
          ...doc.data()
        } as ReferralData;
        return normalizeReferralData(referralData);
      });

      setReferrals(data);
      setInitialLoad(false);
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
      setDataLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedReferral) return;

    try {
      await deleteDoc(doc(db, 'referrals', selectedReferral.id));
      setReferrals(refs => refs.filter(r => r.id !== selectedReferral.id));
      toast({
        title: 'Success',
        description: 'Referral deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onDeleteClose();

      // Refresh data
      if (isFiltered) {
        await fetchAllReferralsWithFilters();
      } else {
        await fetchReferrals();
      }
    } catch (error) {
      console.error('Error deleting referral:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete referral',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEdit = (referral: ReferralData) => {
    const normalizedReferral = normalizeReferralData(referral);
    setSelectedReferral(normalizedReferral);
    setEditData({ ...normalizedReferral });
    onEditOpen();
  };

  const handleUpdate = async () => {
    if (!selectedReferral || !editData) return;

    if (editData.leadSource === 'Outreach' && !editData.outreachRep) {
      toast({
        title: 'Error',
        description: 'Outreach Rep is required when Lead Source is Outreach',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Clear admittedToReferrant if referralOut is empty
    const updateData = { ...editData };
    if (!updateData.referralOut) {
      updateData.admittedToReferrant = '';
    }

    // Normalize outreach rep name before saving
    if (updateData.outreachRep) {
      updateData.outreachRep = normalizeOutreachRep(updateData.outreachRep);
    }

    // Normalize lead source before saving (fix any incorrect values)
    if (updateData.leadSource) {
      updateData.leadSource = normalizeLeadSource(updateData.leadSource);
    }

    try {
      const docRef = doc(db, 'referrals', selectedReferral.id);
      await updateDoc(docRef, updateData);

      setReferrals(refs =>
        refs.map(r => r.id === selectedReferral.id ? { ...r, ...updateData } : r)
      );

      toast({
        title: 'Success',
        description: 'Referral updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onEditClose();
      // Refresh to ensure data consistency
      if (isFiltered) {
        await fetchAllReferralsWithFilters();
      } else {
        await fetchReferrals();
      }
    } catch (error) {
      console.error('Error updating referral:', error);
      toast({
        title: 'Error',
        description: 'Failed to update referral',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleView = (referral: ReferralData) => {
    setSelectedReferral(referral);
    onViewOpen();
  };

  const handleDeleteClick = (referral: ReferralData) => {
    setSelectedReferral(referral);
    onDeleteOpen();
  };

  const formatDate = (callInDate: string | undefined, createdAt: any) => {
    // Prefer callInDate if available, otherwise use createdAt
    if (callInDate) {
      try {
        const date = new Date(callInDate + 'T00:00:00');
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
        }
      } catch (e) {
        // Fall through to createdAt
      }
    }
    
    // Fall back to createdAt
    if (!createdAt) return 'N/A';
    if (createdAt.toDate) return createdAt.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return new Date(createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Helper function to format date as YYYY-MM-DD
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Quick date range setters
  const setLast7Days = async () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const newStartDate = formatDateForInput(sevenDaysAgo);
    const newEndDate = formatDateForInput(today);
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    await handleFilterChange({ startDate: newStartDate, endDate: newEndDate });
  };

  const setLast30Days = async () => {
    const today = new Date();
    // Set to 30 days ago at 00:00:00
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    // Set to end of today at 23:59:59
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const newStartDate = formatDateForInput(thirtyDaysAgo);
    const newEndDate = formatDateForInput(endOfToday);
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    await handleFilterChange({ startDate: newStartDate, endDate: newEndDate });
  };

  const setMonthToDate = async () => {
    const today = new Date();
    // Set to start of current month at 00:00:00
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
    // Set to end of today at 23:59:59
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const newStartDate = formatDateForInput(startOfMonth);
    const newEndDate = formatDateForInput(endOfToday);
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    await handleFilterChange({ startDate: newStartDate, endDate: newEndDate });
  };

  const setYearToDate = async () => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const newStartDate = formatDateForInput(startOfYear);
    const newEndDate = formatDateForInput(today);
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    await handleFilterChange({ startDate: newStartDate, endDate: newEndDate });
  };


  const handleRefresh = async () => {
    if (isFiltered) {
      await fetchAllReferralsWithFilters();
    } else {
      await fetchReferrals();
    }
  };

  const handleClearFilters = async () => {
    setStartDate('');
    setEndDate('');
    setFilterProgram('');
    setFilterAdmitted('');
    setFilterSentTo('');
    setFilterLeadSource('');
    setFilterCategory('');
    setFilterReferralSource('');
    setFilterName('');
    setFilterInsurance('');
    setIsFiltered(false);
    setAllReferrals([]);
    await fetchReferrals();
  };

  const hasActiveFilters = startDate || endDate || filterProgram || filterAdmitted !== '' || filterSentTo || filterLeadSource || filterCategory || filterReferralSource || filterName || filterInsurance;

  // Filter change handlers that trigger database queries
  // Accept optional filter values to use immediately instead of waiting for state update
  const handleFilterChange = async (newFilters?: {
    startDate?: string;
    endDate?: string;
    program?: string;
    admitted?: string;
    sentTo?: string;
    leadSource?: string;
    category?: string;
    referralSource?: string;
    name?: string;
    insurance?: string;
  }) => {
    // Use provided new values or fall back to current state
    const activeStartDate = newFilters?.startDate !== undefined ? newFilters.startDate : startDate;
    const activeEndDate = newFilters?.endDate !== undefined ? newFilters.endDate : endDate;
    const activeProgram = newFilters?.program !== undefined ? newFilters.program : filterProgram;
    const activeAdmitted = newFilters?.admitted !== undefined ? newFilters.admitted : filterAdmitted;
    const activeSentTo = newFilters?.sentTo !== undefined ? newFilters.sentTo : filterSentTo;
    const activeLeadSource = newFilters?.leadSource !== undefined ? newFilters.leadSource : filterLeadSource;
    const activeCategory = newFilters?.category !== undefined ? newFilters.category : filterCategory;
    const activeReferralSource = newFilters?.referralSource !== undefined ? newFilters.referralSource : filterReferralSource;
    const activeName = newFilters?.name !== undefined ? newFilters.name : filterName;
    const activeInsurance = newFilters?.insurance !== undefined ? newFilters.insurance : filterInsurance;

    const hasActive = activeStartDate || activeEndDate || activeProgram || activeAdmitted !== '' || activeSentTo || activeLeadSource || activeCategory || activeReferralSource || activeName || activeInsurance;

    if (hasActive) {
      await fetchAllReferralsWithFilters(
        activeStartDate,
        activeEndDate,
        activeProgram,
        activeAdmitted,
        activeSentTo,
        activeLeadSource,
        activeCategory,
        activeReferralSource,
        activeName,
        activeInsurance
      );
    } else {
      setIsFiltered(false);
      setAllReferrals([]);
      await fetchReferrals();
    }
  };

  // Debounced filter change for text inputs - accepts current values to avoid stale state
  const debouncedFilterChange = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (values?: { name?: string; referralSource?: string; insurance?: string }) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          // Use the passed values or current state
          const activeName = values?.name !== undefined ? values.name : filterName;
          const activeReferralSource = values?.referralSource !== undefined ? values.referralSource : filterReferralSource;
          const activeInsurance = values?.insurance !== undefined ? values.insurance : filterInsurance;
          
          // Check if all search fields are empty
          const allSearchFieldsEmpty = (!activeName || activeName === '') && 
                                       (!activeReferralSource || activeReferralSource === '') && 
                                       (!activeInsurance || activeInsurance === '');
          
          // Check if there are any other active filters (date, dropdowns, etc.)
          const hasOtherFilters = startDate || endDate || filterProgram || filterAdmitted !== '' || filterSentTo || filterLeadSource || filterCategory;
          
          // If all search fields are empty and no other filters are active, reset to Recent Referrals
          if (allSearchFieldsEmpty && !hasOtherFilters) {
            setIsFiltered(false);
            setAllReferrals([]);
            fetchReferrals();
          } else {
            handleFilterChange(values);
          }
        }, 500);
      };
    })(),
    [filterName, filterReferralSource, filterInsurance, startDate, endDate, filterProgram, filterAdmitted, filterSentTo, filterLeadSource, filterCategory]
  );

  // Immediate filter change for when fields are cleared - accepts current values to avoid stale state
  const immediateFilterChange = useCallback((values?: { name?: string; referralSource?: string; insurance?: string }) => {
    // Use the passed values or current state
    const activeName = values?.name !== undefined ? values.name : filterName;
    const activeReferralSource = values?.referralSource !== undefined ? values.referralSource : filterReferralSource;
    const activeInsurance = values?.insurance !== undefined ? values.insurance : filterInsurance;
    
    // Check if all search fields are empty
    const allSearchFieldsEmpty = (!activeName || activeName === '') && 
                                 (!activeReferralSource || activeReferralSource === '') && 
                                 (!activeInsurance || activeInsurance === '');
    
    // Check if there are any other active filters (date, dropdowns, etc.)
    const hasOtherFilters = startDate || endDate || filterProgram || filterAdmitted !== '' || filterSentTo || filterLeadSource || filterCategory;
    
    // If all search fields are empty and no other filters are active, reset to Recent Referrals
    if (allSearchFieldsEmpty && !hasOtherFilters) {
      setIsFiltered(false);
      setAllReferrals([]);
      fetchReferrals();
    } else {
      handleFilterChange(values);
    }
  }, [filterName, filterReferralSource, filterInsurance, startDate, endDate, filterProgram, filterAdmitted, filterSentTo, filterLeadSource, filterCategory]);


  // Get the data to display (filtered or unfiltered)
  const displayData = isFiltered ? allReferrals : referrals;

  // Sorting logic
  const sortedReferrals = [...displayData].sort((a, b) => {
    if (sortField === 'name') {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      if (nameA < nameB) return sortAsc ? -1 : 1;
      if (nameA > nameB) return sortAsc ? 1 : -1;
      return 0;
    } else {
      // Use callInDate if available, otherwise fall back to createdAt
      let dateA: Date;
      if (a.callInDate) {
        dateA = new Date(a.callInDate + 'T00:00:00');
        if (isNaN(dateA.getTime())) {
          dateA = a.createdAt?.toDate?.() || new Date(0);
        }
      } else {
        dateA = a.createdAt?.toDate?.() || new Date(0);
      }
      
      let dateB: Date;
      if (b.callInDate) {
        dateB = new Date(b.callInDate + 'T00:00:00');
        if (isNaN(dateB.getTime())) {
          dateB = b.createdAt?.toDate?.() || new Date(0);
        }
      } else {
        dateB = b.createdAt?.toDate?.() || new Date(0);
      }
      
      return sortAsc ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    }
  });

  if (loading && initialLoad) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading referrals...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={6}>
        {/* Filters - Desktop: Card, Mobile: Accordion */}
        <Box width="full" display={{ base: 'none', md: 'block' }}>
          <Card width="full" bg={cardBg} shadow="md">
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack width="full" justify="space-between">
                  <Heading size="sm">Filters</Heading>
                  <HStack spacing={2}>
                    <Box display="flex" gap={2} onClick={(e) => e.stopPropagation()}>
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
                    {hasActiveFilters && (
                      <Button size="sm" onClick={handleClearFilters} variant="ghost">
                        Clear All Filters
                      </Button>
                    )}
                  </HStack>
                </HStack>

                <Stack direction={{ base: 'column', md: 'row' }} spacing={4} flexWrap="wrap">
                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Name</FormLabel>
                    <Input
                      value={filterName}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setFilterName(newValue);
                        if (newValue === '') {
                          immediateFilterChange({ name: '' });
                        } else {
                          debouncedFilterChange({ name: newValue });
                        }
                      }}
                      size="sm"
                      placeholder="Search..."
                    />
                  </FormControl>

                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Insurance</FormLabel>
                    <Input
                      value={filterInsurance}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setFilterInsurance(newValue);
                        if (newValue === '') {
                          immediateFilterChange({ insurance: '' });
                        } else {
                          debouncedFilterChange({ insurance: newValue });
                        }
                      }}
                      size="sm"
                      placeholder="Search..."
                    />
                  </FormControl>

                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Level of Care</FormLabel>
                    <Select
                      value={filterProgram}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setFilterProgram(newValue);
                        await handleFilterChange({ program: newValue });
                      }}
                      size="sm"
                      placeholder="All"
                    >
                      <option value="DTX">DTX</option>
                      <option value="RTC">RTC</option>
                      <option value="PHP">PHP</option>
                      <option value="IOP">IOP</option>
                    </Select>
                  </FormControl>

                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Admitted</FormLabel>
                    <Select
                      value={filterAdmitted}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setFilterAdmitted(newValue);
                        await handleFilterChange({ admitted: newValue });
                      }}
                      size="sm"
                      placeholder="All"
                    >
                      <option value="YES">Yes</option>
                      <option value="NO">No</option>
                      <option value="Pending">Pending</option>
                      <option value="In process">In process</option>
                    </Select>
                  </FormControl>

                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Lead sent to</FormLabel>
                    <Select
                      value={filterSentTo}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setFilterSentTo(newValue);
                        await handleFilterChange({ sentTo: newValue });
                      }}
                      size="sm"
                      placeholder="All"
                    >
                      <option value="SBR">SBR</option>
                      <option value="Cov Hills">Cov Hills</option>
                    </Select>
                  </FormControl>

                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Category</FormLabel>
                    <Select
                      value={filterCategory}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setFilterCategory(newValue);
                        await handleFilterChange({ category: newValue });
                      }}
                      size="sm"
                      placeholder="All"
                    >
                      <option value="Base">Base</option>
                      <option value="Outreach">Outreach</option>
                      <option value="Kaiser">Kaiser</option>
                      <option value="Direct">Direct</option>
                      <option value="Union">Union</option>
                    </Select>
                  </FormControl>

                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Lead Source</FormLabel>
                    <Select
                      value={filterLeadSource}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setFilterLeadSource(newValue);
                        await handleFilterChange({ leadSource: newValue });
                      }}
                      size="sm"
                      placeholder="All"
                    >
                      {LEAD_SOURCE_OPTIONS.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Referral Source</FormLabel>
                    <Input
                      value={filterReferralSource}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setFilterReferralSource(newValue);
                        if (newValue === '') {
                          immediateFilterChange({ referralSource: '' });
                        } else {
                          debouncedFilterChange({ referralSource: newValue });
                        }
                      }}
                      size="sm"
                      placeholder="Search..."
                    />
                  </FormControl>
                </Stack>
              </VStack>
            </CardBody>
          </Card>
        </Box>

        {/* Filters - Mobile Accordion */}
        <Box width="full" display={{ base: 'block', md: 'none' }}>
          <Accordion allowToggle>
            <AccordionItem border="1px" borderRadius="md" borderColor="gray.200" bg={cardBg}>
              <AccordionButton>
                <Box flex="1" textAlign="left">
                  <HStack justify="space-between" width="full" pr={2}>
                    <Heading size="sm">
                      Filters {hasActiveFilters && `(${[startDate, endDate, filterProgram, filterAdmitted, filterSentTo, filterLeadSource, filterCategory, filterReferralSource, filterName, filterInsurance].filter(Boolean).length})`}
                    </Heading>
                    <Box display="flex" gap={2} onClick={(e) => e.stopPropagation()}>
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
                  </HStack>
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                <VStack spacing={4} align="stretch">
                  {hasActiveFilters && (
                    <Button size="sm" onClick={handleClearFilters} variant="ghost" width="full">
                      Clear All Filters
                    </Button>
                  )}

                  <FormControl>
                    <FormLabel fontSize="sm">Name</FormLabel>
                    <Input
                      value={filterName}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setFilterName(newValue);
                        if (newValue === '') {
                          immediateFilterChange({ name: '' });
                        } else {
                          debouncedFilterChange({ name: newValue });
                        }
                      }}
                      size="sm"
                      placeholder="Search..."
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Insurance</FormLabel>
                    <Input
                      value={filterInsurance}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setFilterInsurance(newValue);
                        if (newValue === '') {
                          immediateFilterChange({ insurance: '' });
                        } else {
                          debouncedFilterChange({ insurance: newValue });
                        }
                      }}
                      size="sm"
                      placeholder="Search..."
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Level of Care</FormLabel>
                    <Select
                      value={filterProgram}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setFilterProgram(newValue);
                        await handleFilterChange({ program: newValue });
                      }}
                      size="sm"
                      placeholder="All"
                    >
                      <option value="DTX">DTX</option>
                      <option value="RTC">RTC</option>
                      <option value="PHP">PHP</option>
                      <option value="IOP">IOP</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Admitted</FormLabel>
                    <Select
                      value={filterAdmitted}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setFilterAdmitted(newValue);
                        await handleFilterChange({ admitted: newValue });
                      }}
                      size="sm"
                      placeholder="All"
                    >
                      <option value="YES">Yes</option>
                      <option value="NO">No</option>
                      <option value="Pending">Pending</option>
                      <option value="In process">In process</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Lead sent to</FormLabel>
                    <Select
                      value={filterSentTo}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setFilterSentTo(newValue);
                        await handleFilterChange({ sentTo: newValue });
                      }}
                      size="sm"
                      placeholder="All"
                    >
                      <option value="SBR">SBR</option>
                      <option value="Cov Hills">Cov Hills</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Category</FormLabel>
                    <Select
                      value={filterCategory}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setFilterCategory(newValue);
                        await handleFilterChange({ category: newValue });
                      }}
                      size="sm"
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
                    <FormLabel fontSize="sm">Lead Source</FormLabel>
                    <Select
                      value={filterLeadSource}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setFilterLeadSource(newValue);
                        await handleFilterChange({ leadSource: newValue });
                      }}
                      size="sm"
                      placeholder="All"
                    >
                      {LEAD_SOURCE_OPTIONS.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Referral Source</FormLabel>
                    <Input
                      value={filterReferralSource}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setFilterReferralSource(newValue);
                        if (newValue === '') {
                          immediateFilterChange({ referralSource: '' });
                        } else {
                          debouncedFilterChange({ referralSource: newValue });
                        }
                      }}
                      size="sm"
                      placeholder="Search..."
                    />
                  </FormControl>
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </Box>

        {/* Sort and Actions */}
        <HStack width="full" justify="space-between">
          <HStack spacing={4} display={{ base: 'none', md: 'flex' }}>
            <Select
              value={sortField}
              onChange={e => setSortField(e.target.value as 'name' | 'date')}
              maxW="200px"
              size="sm"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
            </Select>
            <Button size="sm" onClick={() => setSortAsc(a => !a)}>
              {sortAsc ? 'Asc' : 'Desc'}
            </Button>
          </HStack>
          <Button onClick={handleRefresh} size="sm" ml="auto">
            Refresh
          </Button>
        </HStack>

        <Box width="full" p={6} borderWidth={1} borderRadius={8} boxShadow="lg" bg={cardBg}>
          <VStack spacing={4}>
            <HStack width="full" justify="space-between" flexWrap="wrap">
              <Heading size="md">
                {isFiltered ? `Filtered Results (${sortedReferrals.length})` : `Recent Referrals (${sortedReferrals.length})`}
              </Heading>
              {isFiltered && (
                <Text fontSize="sm" color="gray.600">
                  Showing all matching results
                </Text>
              )}
            </HStack>

            {dataLoading ? (
              <VStack spacing={4} py={8}>
                <Spinner size="lg" />
                <Text>Loading filtered results...</Text>
              </VStack>
            ) : sortedReferrals.length === 0 ? (
              <Text>No referrals found</Text>
            ) : (
              <>
                <Box width="full" overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Category</Th>
                        <Th>Lead Source</Th>
                        <Th>Referral Source</Th>
                        <Th>Lead sent to</Th>
                        <Th>Admitted</Th>
                        <Th>Admitted to Referrant</Th>
                        <Th>Date</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {sortedReferrals.map((referral) => (
                        <Tr key={referral.id}>
                          <Td>{`${referral.firstName} ${referral.lastName}`}</Td>
                          <Td>{referral.category || '-'}</Td>
                          <Td>{referral.leadSource}</Td>
                          <Td>{referral.referralSource || '-'}</Td>
                          <Td>{referral.referralSentTo || '-'}</Td>
                          <Td>
                            <Badge colorScheme={referral.admitted === 'YES' ? 'green' : referral.admitted === 'NO' ? 'red' : 'yellow'}>
                              {referral.admitted || 'Not set'}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge colorScheme={referral.admittedToReferrant === 'YES' ? 'green' : referral.admittedToReferrant === 'NO' ? 'red' : referral.admittedToReferrant === 'Pending' ? 'yellow' : referral.admittedToReferrant === 'Returned to Referent' ? 'blue' : 'gray'}>
                              {referral.admittedToReferrant || '-'}
                            </Badge>
                          </Td>
                          <Td>{formatDate(referral.callInDate, referral.createdAt)}</Td>
                          <Td>
                            <HStack spacing={2}>
                              <IconButton
                                aria-label="View"
                                icon={<Box as="span" className="material-icons">visibility</Box>}
                                size="sm"
                                colorScheme="blue"
                                onClick={() => handleView(referral)}
                              />
                              <IconButton
                                aria-label="Edit"
                                icon={<Box as="span" className="material-icons">edit</Box>}
                                size="sm"
                                colorScheme="blue"
                                onClick={() => handleEdit(referral)}
                              />
                              <IconButton
                                aria-label="Delete"
                                icon={<Box as="span" className="material-icons">delete</Box>}
                                size="sm"
                                colorScheme="red"
                                onClick={() => handleDeleteClick(referral)}
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>

              </>
            )}
          </VStack>
        </Box>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          isOpen={isDeleteOpen}
          leastDestructiveRef={cancelRef}
          onClose={onDeleteClose}
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Delete Referral
              </AlertDialogHeader>
              <AlertDialogBody>
                Are you sure you want to delete the referral for {selectedReferral?.firstName} {selectedReferral?.lastName}?
                This action cannot be undone.
              </AlertDialogBody>
              <AlertDialogFooter>
                <Button ref={cancelRef} onClick={onDeleteClose}>
                  Cancel
                </Button>
                <Button colorScheme="red" onClick={handleDelete} ml={3}>
                  Delete
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>

        {/* Edit Modal */}
        <Modal isOpen={isEditOpen} onClose={onEditClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Edit Referral</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <HStack spacing={4} width="full">
                  <FormControl isRequired>
                    <FormLabel>First Name</FormLabel>
                    <Input
                      value={editData.firstName || ''}
                      onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Last Name</FormLabel>
                    <Input
                      value={editData.lastName || ''}
                      onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                    />
                  </FormControl>
                </HStack>

                <FormControl isRequired>
                  <FormLabel>Lead Source</FormLabel>
                  <Select
                    value={editData.leadSource || ''}
                    onChange={(e) => setEditData({ ...editData, leadSource: e.target.value })}
                  >
                    {LEAD_SOURCE_OPTIONS.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </Select>
                </FormControl>

                {editData.leadSource === 'Outreach' && (
                  <FormControl isRequired>
                    <FormLabel>Outreach Rep</FormLabel>
                    <Input
                      value={editData.outreachRep || ''}
                      onChange={(e) => setEditData({ ...editData, outreachRep: e.target.value })}
                    />
                  </FormControl>
                )}

                <FormControl>
                  <FormLabel>Referral Source</FormLabel>
                  <Input
                    value={editData.referralSource || ''}
                    onChange={(e) => setEditData({ ...editData, referralSource: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Referral Out</FormLabel>
                  <Input
                    value={editData.referralOut || ''}
                    onChange={(e) => {
                      const updated = { ...editData, referralOut: e.target.value };
                      // Clear admittedToReferrant if referralOut is being cleared
                      if (!e.target.value) {
                        updated.admittedToReferrant = '';
                      }
                      setEditData(updated);
                    }}
                  />
                </FormControl>

                {editData.referralOut && (
                  <FormControl>
                    <FormLabel>Admitted to Referrant</FormLabel>
                    <Select
                      value={editData.admittedToReferrant || ''}
                      onChange={(e) => setEditData({ ...editData, admittedToReferrant: e.target.value })}
                      placeholder="Select status"
                    >
                      <option value="YES">Yes</option>
                      <option value="NO">No</option>
                      <option value="Pending">Pending</option>
                    </Select>
                  </FormControl>
                )}

                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <Input
                    value={editData.category || ''}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Insurance Company</FormLabel>
                  <Input
                    value={editData.insuranceCompany || ''}
                    onChange={(e) => setEditData({ ...editData, insuranceCompany: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Level of Care</FormLabel>
                  <Select
                    value={editData.program || ''}
                    onChange={(e) => setEditData({ ...editData, program: e.target.value })}
                    placeholder="Select level of care"
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
                    value={editData.referralSentTo || ''}
                    onChange={(e) => setEditData({ ...editData, referralSentTo: e.target.value })}
                    placeholder="Select destination"
                  >
                    <option value="SBR">SBR</option>
                    <option value="Cov hills">Cov hills</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Admitted</FormLabel>
                  <Select
                    value={editData.admitted || ''}
                    onChange={(e) => setEditData({ ...editData, admitted: e.target.value })}
                    placeholder="Select status"
                  >
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                    <option value="Pending">Pending</option>
                    <option value="In process">In process</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Assigned To</FormLabel>
                  <Input
                    value={editData.assignedTo || ''}
                    onChange={(e) => setEditData({ ...editData, assignedTo: e.target.value })}
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button mr={3} onClick={onEditClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleUpdate}>
                Update
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* View Modal */}
        <Modal isOpen={isViewOpen} onClose={onViewClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>View Referral</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold">Name:</Text>
                  <Text>{selectedReferral?.firstName} {selectedReferral?.lastName}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Lead Source:</Text>
                  <Text>{selectedReferral?.leadSource}</Text>
                </Box>
                {selectedReferral?.leadSource === 'Outreach' && (
                  <Box>
                    <Text fontWeight="bold">Outreach Rep:</Text>
                    <Text>{normalizeOutreachRep(selectedReferral?.outreachRep) || '-'}</Text>
                  </Box>
                )}
                <Box>
                  <Text fontWeight="bold">Referral Source:</Text>
                  <Text>{selectedReferral?.referralSource || '-'}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Referral Out:</Text>
                  <Text>{selectedReferral?.referralOut || '-'}</Text>
                </Box>
                {selectedReferral?.referralOut && (
                  <Box>
                    <Text fontWeight="bold">Admitted to Referrant:</Text>
                    <Text>{selectedReferral?.admittedToReferrant || '-'}</Text>
                  </Box>
                )}
                <Box>
                  <Text fontWeight="bold">Category:</Text>
                  <Text>{selectedReferral?.category || '-'}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Insurance Company:</Text>
                  <Text>{selectedReferral?.insuranceCompany || '-'}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Level of Care:</Text>
                  <Text>{selectedReferral?.program || '-'}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Referral Sent To:</Text>
                  <Text>{selectedReferral?.referralSentTo || '-'}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Admitted:</Text>
                  <Badge colorScheme={selectedReferral?.admitted === 'YES' ? 'green' : selectedReferral?.admitted === 'NO' ? 'red' : 'yellow'}>
                    {selectedReferral?.admitted || 'Not set'}
                  </Badge>
                </Box>
                <Box>
                  <Text fontWeight="bold">Assigned To:</Text>
                  <Text>{selectedReferral?.assignedTo || '-'}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Call in Date:</Text>
                  <Text>{formatDate(selectedReferral?.callInDate, selectedReferral?.createdAt)}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Created By:</Text>
                  <Text>{selectedReferral?.createdBy}</Text>
                </Box>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={onViewClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  );
};
