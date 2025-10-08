import React, { useState, useEffect } from 'react';
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
  Checkbox,
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
  startAfter,
  endBefore,
  limitToLast,
  QueryDocumentSnapshot,
  DocumentData
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
  admitted: boolean;
  createdAt: any;
  createdBy: string;
  outreachRep?: string;
}

export const AdminPage = () => {
  const toast = useToast();
  const [referrals,
    setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<ReferralData | null>(null);
  const [editData, setEditData] = useState<Partial<ReferralData>>({});
  const [sortField, setSortField] = useState<'name' | 'date'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination state
  const [pageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [firstDoc, setFirstDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Filter state
  const [filterProgram, setFilterProgram] = useState('');
  const [filterAdmitted, setFilterAdmitted] = useState('');
  const [filterSentTo, setFilterSentTo] = useState('');
  const [filterLeadSource, setFilterLeadSource] = useState('');
  const [filterReferralSource, setFilterReferralSource] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterInsurance, setFilterInsurance] = useState('');

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const cardBg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    fetchTotalCount();
    fetchReferrals();
  }, []);

  const fetchTotalCount = async () => {
    try {
      const q = query(collection(db, 'referrals'));
      const querySnapshot = await getDocs(q);
      setTotalCount(querySnapshot.size);
    } catch (error) {
      console.error('Error fetching count:', error);
    }
  };

  const fetchReferrals = async (direction?: 'next' | 'prev') => {
    setLoading(true);
    try {
      let q;

      if (direction === 'next' && lastDoc) {
        q = query(
          collection(db, 'referrals'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize)
        );
      } else if (direction === 'prev' && firstDoc) {
        q = query(
          collection(db, 'referrals'),
          orderBy('createdAt', 'desc'),
          endBefore(firstDoc),
          limitToLast(pageSize)
        );
      } else {
        // First page or no direction
        q = query(
          collection(db, 'referrals'),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
        );
      }

      const querySnapshot = await getDocs(q);

      if (querySnapshot.docs.length > 0) {
        setFirstDoc(querySnapshot.docs[0]);
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      } else {
        setFirstDoc(null);
        setLastDoc(null);
      }

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

  const handleDelete = async () => {
    if (!selectedReferral) return;

    try {
      await deleteDoc(doc(db, 'referrals', selectedReferral.id));
      setReferrals(refs => refs.filter(r => r.id !== selectedReferral.id));
      setTotalCount(prev => prev - 1);
      toast({
        title: 'Success',
        description: 'Referral deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onDeleteClose();

      // Refresh if page becomes empty
      if (referrals.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        fetchReferrals();
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
    setSelectedReferral(referral);
    setEditData({ ...referral });
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

    try {
      const docRef = doc(db, 'referrals', selectedReferral.id);
      await updateDoc(docRef, editData);

      setReferrals(refs =>
        refs.map(r => r.id === selectedReferral.id ? { ...r, ...editData } : r)
      );

      toast({
        title: 'Success',
        description: 'Referral updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onEditClose();
      fetchReferrals(); // Refresh to ensure data consistency
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

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.toDate) return date.toDate().toLocaleString();
    return new Date(date).toLocaleString();
  };

  const handleNextPage = async () => {
    if (currentPage * pageSize < totalCount) {
      await fetchReferrals('next');
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = async () => {
    if (currentPage > 1) {
      await fetchReferrals('prev');
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleRefresh = async () => {
    setCurrentPage(1);
    setFirstDoc(null);
    setLastDoc(null);
    await fetchTotalCount();
    await fetchReferrals();
  };

  const handleClearFilters = () => {
    setFilterProgram('');
    setFilterAdmitted('');
    setFilterSentTo('');
    setFilterLeadSource('');
    setFilterReferralSource('');
    setFilterName('');
    setFilterInsurance('');
  };

  const hasActiveFilters = filterProgram || filterAdmitted !== '' || filterSentTo || filterLeadSource || filterReferralSource || filterName || filterInsurance;

  const totalPages = Math.ceil(totalCount / pageSize);
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  // All filters are client-side to avoid Firestore composite index issues
  const filteredReferrals = referrals.filter(ref => {
    if (filterProgram && ref.program !== filterProgram) return false;
    if (filterAdmitted !== '' && ref.admitted !== (filterAdmitted === 'true')) return false;
    if (filterSentTo && ref.referralSentTo !== filterSentTo) return false;
    if (filterLeadSource && ref.leadSource !== filterLeadSource) return false;
    if (filterReferralSource && !ref.referralSource?.toLowerCase().includes(filterReferralSource.toLowerCase())) return false;
    if (filterName) {
      const fullName = `${ref.firstName} ${ref.lastName}`.toLowerCase();
      if (!fullName.includes(filterName.toLowerCase())) return false;
    }
    if (filterInsurance && !ref.insuranceCompany?.toLowerCase().includes(filterInsurance.toLowerCase())) return false;
    return true;
  });

  // Sorting logic
  const sortedReferrals = [...filteredReferrals].sort((a, b) => {
    if (sortField === 'name') {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      if (nameA < nameB) return sortAsc ? -1 : 1;
      if (nameA > nameB) return sortAsc ? 1 : -1;
      return 0;
    } else {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return sortAsc ? dateA - dateB : dateB - dateA;
    }
  });

  if (loading) {
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
                  {hasActiveFilters && (
                    <Button size="sm" onClick={handleClearFilters} variant="ghost">
                      Clear All Filters
                    </Button>
                  )}
                </HStack>

                <Stack direction={{ base: 'column', md: 'row' }} spacing={4} flexWrap="wrap">
                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Name</FormLabel>
                    <Input
                      value={filterName}
                      onChange={e => setFilterName(e.target.value)}
                      size="sm"
                      placeholder="Search..."
                    />
                  </FormControl>

                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Insurance</FormLabel>
                    <Input
                      value={filterInsurance}
                      onChange={e => setFilterInsurance(e.target.value)}
                      size="sm"
                      placeholder="Search..."
                    />
                  </FormControl>

                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Program</FormLabel>
                    <Select
                      value={filterProgram}
                      onChange={e => setFilterProgram(e.target.value)}
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
                      onChange={e => setFilterAdmitted(e.target.value)}
                      size="sm"
                      placeholder="All"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </Select>
                  </FormControl>

                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Sent To</FormLabel>
                    <Select
                      value={filterSentTo}
                      onChange={e => setFilterSentTo(e.target.value)}
                      size="sm"
                      placeholder="All"
                    >
                      <option value="SBR">SBR</option>
                      <option value="Cov hills">Cov hills</option>
                    </Select>
                  </FormControl>

                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Lead Source</FormLabel>
                    <Select
                      value={filterLeadSource}
                      onChange={e => setFilterLeadSource(e.target.value)}
                      size="sm"
                      placeholder="All"
                    >
                      <option value="Insurance">Insurance</option>
                      <option value="Kaiser">Kaiser</option>
                      <option value="Outreach">Outreach</option>
                      <option value="Direct">Direct</option>
                    </Select>
                  </FormControl>

                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Referral Source</FormLabel>
                    <Input
                      value={filterReferralSource}
                      onChange={e => setFilterReferralSource(e.target.value)}
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
                      Filters {hasActiveFilters && `(${[filterProgram, filterAdmitted, filterSentTo, filterLeadSource, filterReferralSource, filterName, filterInsurance].filter(Boolean).length})`}
                    </Heading>
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
                      onChange={e => setFilterName(e.target.value)}
                      size="sm"
                      placeholder="Search..."
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Insurance</FormLabel>
                    <Input
                      value={filterInsurance}
                      onChange={e => setFilterInsurance(e.target.value)}
                      size="sm"
                      placeholder="Search..."
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Program</FormLabel>
                    <Select
                      value={filterProgram}
                      onChange={e => setFilterProgram(e.target.value)}
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
                      onChange={e => setFilterAdmitted(e.target.value)}
                      size="sm"
                      placeholder="All"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Sent To</FormLabel>
                    <Select
                      value={filterSentTo}
                      onChange={e => setFilterSentTo(e.target.value)}
                      size="sm"
                      placeholder="All"
                    >
                      <option value="SBR">SBR</option>
                      <option value="Cov hills">Cov hills</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Lead Source</FormLabel>
                    <Select
                      value={filterLeadSource}
                      onChange={e => setFilterLeadSource(e.target.value)}
                      size="sm"
                      placeholder="All"
                    >
                      <option value="Insurance">Insurance</option>
                      <option value="Kaiser">Kaiser</option>
                      <option value="Outreach">Outreach</option>
                      <option value="Direct">Direct</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Referral Source</FormLabel>
                    <Input
                      value={filterReferralSource}
                      onChange={e => setFilterReferralSource(e.target.value)}
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
                Referrals ({totalCount} total{hasActiveFilters ? `, ${sortedReferrals.length} filtered` : ''})
              </Heading>
              <Text fontSize="sm" color="gray.600">
                Showing {Math.min(startRecord, sortedReferrals.length)}-{Math.min(endRecord, sortedReferrals.length)} of {totalCount}
              </Text>
            </HStack>

            {sortedReferrals.length === 0 ? (
              <Text>No referrals found</Text>
            ) : (
              <>
                <Box width="full" overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Lead Source</Th>
                        <Th>Referral Source</Th>
                        <Th>Program</Th>
                        <Th>Sent To</Th>
                        <Th>Admitted</Th>
                        <Th>Date</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {sortedReferrals.map((referral) => (
                        <Tr key={referral.id}>
                          <Td>{`${referral.firstName} ${referral.lastName}`}</Td>
                          <Td>{referral.leadSource}</Td>
                          <Td>{referral.referralSource || '-'}</Td>
                          <Td>{referral.program || '-'}</Td>
                          <Td>{referral.referralSentTo || '-'}</Td>
                          <Td>
                            <Badge colorScheme={referral.admitted ? 'green' : 'gray'}>
                              {referral.admitted ? 'Yes' : 'No'}
                            </Badge>
                          </Td>
                          <Td>{formatDate(referral.createdAt)}</Td>
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

                {/* Pagination Controls */}
                <HStack width="full" justify="center" spacing={4} pt={4}>
                  <Button
                    onClick={handlePrevPage}
                    isDisabled={currentPage === 1}
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Text fontSize="sm">
                    Page {currentPage} of {totalPages}
                  </Text>
                  <Button
                    onClick={handleNextPage}
                    isDisabled={currentPage >= totalPages}
                    size="sm"
                  >
                    Next
                  </Button>
                </HStack>
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
                    <option value="Insurance">Insurance</option>
                    <option value="Kaiser">Kaiser</option>
                    <option value="Outreach">Outreach</option>
                    <option value="Direct">Direct</option>
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
                    onChange={(e) => setEditData({ ...editData, referralOut: e.target.value })}
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
                  <FormLabel>Program</FormLabel>
                  <Select
                    value={editData.program || ''}
                    onChange={(e) => setEditData({ ...editData, program: e.target.value })}
                    placeholder="Select program"
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
                  <Checkbox
                    isChecked={editData.admitted || false}
                    onChange={(e) => setEditData({ ...editData, admitted: e.target.checked })}
                  >
                    Admitted
                  </Checkbox>
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
                    <Text>{selectedReferral?.outreachRep || '-'}</Text>
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
                <Box>
                  <Text fontWeight="bold">Insurance Company:</Text>
                  <Text>{selectedReferral?.insuranceCompany || '-'}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Program:</Text>
                  <Text>{selectedReferral?.program || '-'}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Referral Sent To:</Text>
                  <Text>{selectedReferral?.referralSentTo || '-'}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Admitted:</Text>
                  <Badge colorScheme={selectedReferral?.admitted ? 'green' : 'gray'}>
                    {selectedReferral?.admitted ? 'Yes' : 'No'}
                  </Badge>
                </Box>
                <Box>
                  <Text fontWeight="bold">Created At:</Text>
                  <Text>{formatDate(selectedReferral?.createdAt)}</Text>
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
