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
} from '@chakra-ui/react';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
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
}

export const AdminPage = () => {
  const toast = useToast();
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<ReferralData | null>(null);
  const [editData, setEditData] = useState<Partial<ReferralData>>({});
  const [sortField, setSortField] = useState<'name' | 'date'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const cardBg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const q = query(collection(db, 'referrals'), orderBy('createdAt', 'desc'));
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

  // Sorting logic
  const sortedReferrals = [...referrals].sort((a, b) => {
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
        <HStack width="full" justify="space-between">
          <Heading>Admin Dashboard</Heading>
          <HStack spacing={4}>
            <Select
              value={sortField}
              onChange={e => setSortField(e.target.value as 'name' | 'date')}
              maxW="200px"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
            </Select>
            <Button size="md" onClick={() => setSortAsc(a => !a)}>
              {sortAsc ? 'Asc' : 'Desc'}
            </Button>
            <Button onClick={fetchReferrals} size="md">
              Refresh
            </Button>
          </HStack>
        </HStack>

        <Box width="full" p={6} borderWidth={1} borderRadius={8} boxShadow="lg" bg={cardBg}>
          <VStack spacing={4}>
            <HStack width="full" justify="space-between">
              <Heading size="md">Referrals ({sortedReferrals.length})</Heading>
            </HStack>

            {sortedReferrals.length === 0 ? (
              <Text>No referrals found</Text>
            ) : (
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
