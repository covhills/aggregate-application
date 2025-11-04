import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
  Card,
  CardBody,
  useColorModeValue,
  Heading,
  Textarea,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  HStack,
  Spinner,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Stack,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface ReferentContactData {
  id?: string;
  referralPartner: string;
  referralRep: string;
  referralContactInfo: string;
  referentEmail: string;
  createdAt?: any;
  createdBy?: string;
}

export const ReferentContactsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [contacts, setContacts] = useState<ReferentContactData[]>([]);
  const [allContacts, setAllContacts] = useState<ReferentContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [selectedContact, setSelectedContact] = useState<ReferentContactData | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // Filter states
  const [filterReferralPartner, setFilterReferralPartner] = useState('');
  const [filterReferralRep, setFilterReferralRep] = useState('');

  const [formData, setFormData] = useState<ReferentContactData>({
    referralPartner: '',
    referralRep: '',
    referralContactInfo: '',
    referentEmail: '',
  });

  const cardBg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'referrant-contacts'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ReferentContactData));
      setAllContacts(data);
      applyFilters(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referent contacts',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (dataToFilter: ReferentContactData[]) => {
    let filtered = [...dataToFilter];

    // Filter by Referral Partner
    if (filterReferralPartner) {
      filtered = filtered.filter(contact => {
        const partner = contact.referralPartner || '';
        return partner.toLowerCase().includes(filterReferralPartner.toLowerCase());
      });
    }

    // Filter by Referral Rep
    if (filterReferralRep) {
      filtered = filtered.filter(contact => {
        const rep = contact.referralRep || '';
        return rep.toLowerCase().includes(filterReferralRep.toLowerCase());
      });
    }

    setContacts(filtered);
  };

  useEffect(() => {
    if (allContacts.length > 0 || filterReferralPartner || filterReferralRep) {
      applyFilters(allContacts);
    }
  }, [filterReferralPartner, filterReferralRep, allContacts]);

  const handleChange = (field: keyof ReferentContactData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.referralPartner || !formData.referralRep || !formData.referralContactInfo) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoading(true);

      await addDoc(collection(db, 'referrant-contacts'), {
        referralPartner: formData.referralPartner,
        referralRep: formData.referralRep,
        referralContactInfo: formData.referralContactInfo,
        referentEmail: formData.referentEmail,
        createdAt: serverTimestamp(),
        createdBy: user?.email || 'unknown',
      });

      toast({
        title: 'Success',
        description: 'Referent contact created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Reset form and close modal
      setFormData({
        referralPartner: '',
        referralRep: '',
        referralContactInfo: '',
        referentEmail: '',
      });
      onClose();
      
      // Refresh contacts list
      fetchContacts();
    } catch (error) {
      console.error('Error creating referent contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to create referent contact',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (contact: ReferentContactData) => {
    setSelectedContact(contact);
    setFormData({
      referralPartner: contact.referralPartner || '',
      referralRep: contact.referralRep || '',
      referralContactInfo: contact.referralContactInfo || '',
      referentEmail: contact.referentEmail || '',
    });
    onEditOpen();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedContact || !selectedContact.id) return;

    if (!formData.referralPartner || !formData.referralRep || !formData.referralContactInfo) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoading(true);

      const docRef = doc(db, 'referrant-contacts', selectedContact.id);
      await updateDoc(docRef, {
        referralPartner: formData.referralPartner,
        referralRep: formData.referralRep,
        referralContactInfo: formData.referralContactInfo,
        referentEmail: formData.referentEmail,
      });

      toast({
        title: 'Success',
        description: 'Referent contact updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onEditClose();
      
      // Refresh contacts list
      fetchContacts();
    } catch (error) {
      console.error('Error updating referent contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to update referent contact',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (contact: ReferentContactData) => {
    setSelectedContact(contact);
    onDeleteOpen();
  };

  const handleDelete = async () => {
    if (!selectedContact || !selectedContact.id) return;

    try {
      await deleteDoc(doc(db, 'referrant-contacts', selectedContact.id));
      
      toast({
        title: 'Success',
        description: 'Referent contact deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onDeleteClose();
      
      // Refresh contacts list
      fetchContacts();
    } catch (error) {
      console.error('Error deleting referent contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete referent contact',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.toDate) return date.toDate().toLocaleString();
    return new Date(date).toLocaleString();
  };

  const handleModalClose = () => {
    setFormData({
      referralPartner: '',
      referralRep: '',
      referralContactInfo: '',
      referentEmail: '',
    });
    setSelectedContact(null);
    onClose();
  };

  const handleEditModalClose = () => {
    setFormData({
      referralPartner: '',
      referralRep: '',
      referralContactInfo: '',
      referentEmail: '',
    });
    setSelectedContact(null);
    onEditClose();
  };

  const clearFilters = () => {
    setFilterReferralPartner('');
    setFilterReferralRep('');
  };

  const hasActiveFilters = filterReferralPartner || filterReferralRep;

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
                    <Button size="sm" onClick={clearFilters} variant="ghost">
                      Clear All Filters
                    </Button>
                  )}
                </HStack>

                <Stack direction={{ base: 'column', md: 'row' }} spacing={4} flexWrap="wrap">
                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Referral Partner</FormLabel>
                    <Input
                      value={filterReferralPartner}
                      onChange={(e) => setFilterReferralPartner(e.target.value)}
                      size="sm"
                      placeholder="Search..."
                    />
                  </FormControl>

                  <FormControl maxW={{ base: 'full', md: '200px' }}>
                    <FormLabel fontSize="sm">Referral Rep</FormLabel>
                    <Input
                      value={filterReferralRep}
                      onChange={(e) => setFilterReferralRep(e.target.value)}
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
                      Filters {hasActiveFilters && `(${[filterReferralPartner, filterReferralRep].filter(Boolean).length})`}
                    </Heading>
                  </HStack>
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                <VStack spacing={4} align="stretch">
                  {hasActiveFilters && (
                    <Button size="sm" onClick={clearFilters} variant="ghost" width="full">
                      Clear All Filters
                    </Button>
                  )}

                  <FormControl>
                    <FormLabel fontSize="sm">Referral Partner</FormLabel>
                    <Input
                      value={filterReferralPartner}
                      onChange={(e) => setFilterReferralPartner(e.target.value)}
                      size="sm"
                      placeholder="Search..."
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Referral Rep</FormLabel>
                    <Input
                      value={filterReferralRep}
                      onChange={(e) => setFilterReferralRep(e.target.value)}
                      size="sm"
                      placeholder="Search..."
                    />
                  </FormControl>
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </Box>

        <Card width="full" bg={cardBg} shadow="lg">
          <CardBody>
            <HStack justify="space-between" mb={6}>
              <Heading size="md">Referent Contacts</Heading>
              <Button
                onClick={onOpen}
                colorScheme="blue"
                leftIcon={<Box as="span" className="material-icons">add</Box>}
              >
                Add New Contact
              </Button>
            </HStack>

            {loading ? (
              <VStack spacing={4} py={8}>
                <Spinner size="lg" />
                <Text>Loading contacts...</Text>
              </VStack>
            ) : contacts.length === 0 ? (
              <Text>No referent contacts found</Text>
            ) : (
              <Box width="full" overflowX="auto">
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Referral Partner</Th>
                      <Th>Referral Rep</Th>
                      <Th>Referent Email</Th>
                      <Th>Contact Info</Th>
                      <Th>Created Date</Th>
                      <Th>Created By</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {contacts.map((contact) => (
                      <Tr key={contact.id}>
                        <Td fontWeight="medium">{contact.referralPartner}</Td>
                        <Td>{contact.referralRep}</Td>
                        <Td>{contact.referentEmail || '-'}</Td>
                        <Td>
                          <Box maxW="400px">
                            <Text noOfLines={3}>
                              {contact.referralContactInfo}
                            </Text>
                          </Box>
                        </Td>
                        <Td>{formatDate(contact.createdAt)}</Td>
                        <Td>{contact.createdBy || 'Unknown'}</Td>
                        <Td>
                          <HStack spacing={2}>
                            <IconButton
                              aria-label="Edit"
                              icon={<Box as="span" className="material-icons">edit</Box>}
                              size="sm"
                              colorScheme="blue"
                              onClick={() => handleEdit(contact)}
                            />
                            <IconButton
                              aria-label="Delete"
                              icon={<Box as="span" className="material-icons">delete</Box>}
                              size="sm"
                              colorScheme="red"
                              onClick={() => handleDeleteClick(contact)}
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </CardBody>
        </Card>
      </VStack>

      {/* Add Contact Modal */}
      <Modal isOpen={isOpen} onClose={handleModalClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Referent Contact</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Referral Partner</FormLabel>
                  <Input
                    value={formData.referralPartner}
                    onChange={(e) => handleChange('referralPartner', e.target.value)}
                    placeholder="Enter referral partner"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Referral Rep</FormLabel>
                  <Input
                    value={formData.referralRep}
                    onChange={(e) => handleChange('referralRep', e.target.value)}
                    placeholder="Enter referral rep"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Referent Email</FormLabel>
                  <Input
                    type="email"
                    value={formData.referentEmail}
                    onChange={(e) => handleChange('referentEmail', e.target.value)}
                    placeholder="Enter referent email"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Referral Contact Info</FormLabel>
                  <Textarea
                    value={formData.referralContactInfo}
                    onChange={(e) => handleChange('referralContactInfo', e.target.value)}
                    placeholder="Enter referral contact information"
                    rows={4}
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={handleModalClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isLoading}
                leftIcon={<Box as="span" className="material-icons">save</Box>}
              >
                Save Contact
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Edit Contact Modal */}
      <Modal isOpen={isEditOpen} onClose={handleEditModalClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Referent Contact</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleUpdate}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Referral Partner</FormLabel>
                  <Input
                    value={formData.referralPartner}
                    onChange={(e) => handleChange('referralPartner', e.target.value)}
                    placeholder="Enter referral partner"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Referral Rep</FormLabel>
                  <Input
                    value={formData.referralRep}
                    onChange={(e) => handleChange('referralRep', e.target.value)}
                    placeholder="Enter referral rep"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Referent Email</FormLabel>
                  <Input
                    type="email"
                    value={formData.referentEmail}
                    onChange={(e) => handleChange('referentEmail', e.target.value)}
                    placeholder="Enter referent email"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Referral Contact Info</FormLabel>
                  <Textarea
                    value={formData.referralContactInfo}
                    onChange={(e) => handleChange('referralContactInfo', e.target.value)}
                    placeholder="Enter referral contact information"
                    rows={4}
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={handleEditModalClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isLoading}
                leftIcon={<Box as="span" className="material-icons">save</Box>}
              >
                Update Contact
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Referent Contact
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete the contact for {selectedContact?.referralPartner} - {selectedContact?.referralRep}?
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
    </Container>
  );
};
